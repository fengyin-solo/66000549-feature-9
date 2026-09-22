import re, math, time, random, copy
from typing import Optional, List, Dict, Any
from collections import defaultdict, Counter
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:  # numpy 仅在统计分析时需要，导入失败不影响配置校验等纯逻辑
    import numpy as np
except ImportError:  # pragma: no cover
    np = None

app = FastAPI(title="Log Anomaly Detector")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ---------------------------------------------------------------------------
# 可配置的告警分级标准与静默时段
# ---------------------------------------------------------------------------
SEVERITY_KEYS = ["critical", "high", "medium", "low"]  # 同一套分级标准，顺序即严重程度由高到低

DEFAULT_CONFIG: Dict[str, Any] = {
    "tiers": [
        {"key": "critical", "label": "紧急", "min": 4.0},
        {"key": "high",     "label": "高",   "min": 2.5},
        {"key": "medium",   "label": "中",   "min": 1.0},
        {"key": "low",      "label": "低",   "min": 0.0},
    ],
    "silences": []
}

# 服务端当前生效配置（内存保存）
ALERT_CONFIG = copy.deepcopy(DEFAULT_CONFIG)

TIME_RE = re.compile(r"^(\d{2}):(\d{2}):(\d{2})$")


def _time_to_seconds(value: str):
    """HH:MM:SS -> 当日秒数；格式非法返回 None"""
    if not isinstance(value, str):
        return None
    m = TIME_RE.match(value.strip())
    if not m:
        return None
    hh, mm, ss = (int(x) for x in m.groups())
    if hh > 23 or mm > 59 or ss > 59:
        return None
    return hh * 3600 + mm * 60 + ss


def _seconds_to_time(sec: int) -> str:
    sec = int(sec) % 86400
    return f"{sec // 3600:02d}:{(sec % 3600) // 60:02d}:{sec % 60:02d}"


def validate_config(config: Dict[str, Any]) -> List[str]:
    """校验分级标准与静默时段，返回不合格项说明列表（空列表表示通过）"""
    errors: List[str] = []
    tiers = config.get("tiers") if isinstance(config, dict) else None
    if not isinstance(tiers, list) or not tiers:
        return ["分级标准不能为空，且必须包含 critical/high/medium/low 四档"]

    # --- 严重级别校验 ---
    seen = set()
    by_key: Dict[str, Dict[str, Any]] = {}
    for i, tier in enumerate(tiers):
        if not isinstance(tier, dict):
            errors.append(f"第{i + 1}个分级不是合法对象")
            continue
        key = tier.get("key")
        raw_min = tier.get("min")
        if key not in SEVERITY_KEYS:
            errors.append(f"严重级别填错：'{key}' 不是合法档位，只允许 critical/high/medium/low")
            continue
        if key in seen:
            errors.append(f"严重级别填错：'{key}' 档位重复配置")
            continue
        seen.add(key)
        if isinstance(raw_min, bool) or not isinstance(raw_min, (int, float)):
            errors.append(f"严重级别填错：'{key}' 的阈值必须是数字，当前为 {raw_min!r}")
            continue
        by_key[key] = tier

    missing = [k for k in SEVERITY_KEYS if k not in by_key]
    if missing:
        errors.append(f"分级标准缺少档位：{', '.join(missing)}")

    if all(k in by_key for k in SEVERITY_KEYS):
        low_min = by_key["low"]["min"]
        if low_min != 0:
            errors.append(f"严重级别填错：最低档 low 的阈值必须为 0（兜底盘），当前为 {low_min}")
        prev = None
        for key in ["low", "medium", "high", "critical"]:
            cur = by_key[key]["min"]
            if prev is not None and not (prev[1] < cur):
                errors.append(
                    f"严重级别填错：{prev[0]} 的阈值({prev[1]}) 必须小于 {key} 的阈值({cur})，分档边界不允许相等或颠倒"
                )
            prev = (key, cur)

    # --- 静默时段校验 ---
    silences = config.get("silences", [])
    if not isinstance(silences, list):
        errors.append("静默时段必须是列表")
        return errors
    for i, rule in enumerate(silences):
        if not isinstance(rule, dict):
            errors.append(f"静默时段第{i + 1}条不是合法对象")
            continue
        name = str(rule.get("name", "")).strip()
        target = str(rule.get("target", "")).strip()
        start = rule.get("startTime", "")
        end = rule.get("endTime", "")
        prefix = f"静默时段'{name or '第' + str(i + 1) + '条'}'"
        if not name:
            errors.append(f"{prefix}：名称不能为空")
        if not target:
            errors.append(f"{prefix}：必须指定适用的同类告警（规则名或全部告警）")
        start_sec = _time_to_seconds(start) if isinstance(start, str) else None
        end_sec = _time_to_seconds(end) if isinstance(end, str) else None
        if start_sec is None:
            errors.append(f"{prefix}：起始时间格式错误，应为 HH:MM:SS，当前为 {start!r}")
        if end_sec is None:
            errors.append(f"{prefix}：结束时间格式错误，应为 HH:MM:SS，当前为 {end!r}")
        if start_sec is not None and end_sec is not None and start_sec >= end_sec:
            errors.append(f"{prefix}：起止时间颠倒（{start} ≥ {end}），起始必须早于结束")
    return errors


def normalize_config(config: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """合并默认值并规范化字段"""
    cfg = copy.deepcopy(DEFAULT_CONFIG)
    if not isinstance(config, dict):
        return cfg
    if isinstance(config.get("tiers"), list):
        tiers = []
        for tier in config["tiers"]:
            if isinstance(tier, dict) and tier.get("key") in SEVERITY_KEYS:
                default_tier = next(t for t in DEFAULT_CONFIG["tiers"] if t["key"] == tier["key"])
                tiers.append({
                    "key": tier["key"],
                    "label": str(tier.get("label") or default_tier["label"]),
                    "min": float(tier.get("min", default_tier["min"]))
                })
        # 按标准顺序输出
        present = {t["key"]: t for t in tiers}
        if len(present) == len(SEVERITY_KEYS):
            cfg["tiers"] = [present[k] for k in SEVERITY_KEYS[::-1]]  # critical -> low
    if isinstance(config.get("silences"), list):
        cfg["silences"] = [
            {
                "id": int(r.get("id") or idx + 1),
                "name": str(r.get("name", "")),
                "target": str(r.get("target", "")),
                "startTime": str(r.get("startTime", "")),
                "endTime": str(r.get("endTime", "")),
                "enabled": bool(r.get("enabled", True))
            }
            for idx, r in enumerate(config["silences"]) if isinstance(r, dict)
        ]
    return cfg


def classify_severity(score: float, tiers: List[Dict[str, Any]]) -> str:
    """按同一套分级标准把统一分数归入档位"""
    for tier in sorted(tiers, key=lambda t: t["min"], reverse=True):
        if score >= tier["min"]:
            return tier["key"]
    return "low"


def apply_silences(alerts: List[Dict[str, Any]], silences: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    静默期内的同类(ruleName)重复告警只保留第一次并标记 silenced(静默中)，
    其余打上 suppressed 标记（前端折叠但不删除，便于回填时恢复）；
    静默结束后的同类告警正常展示。
    """
    enabled = sorted(
        [r for r in silences if r.get("enabled", True)],
        key=lambda r: r.get("startTime", "")
    )
    seen: set = set()
    for alert in sorted(alerts, key=lambda a: (a.get("timestamp", ""), a.get("id", 0))):
        ts = alert.get("timestamp", "")
        match = next(
            (r for r in enabled
             if (r.get("target") == "__ALL__" or r.get("target") == alert.get("ruleName"))
             and r.get("startTime", "") <= ts <= r.get("endTime", "")),
            None
        )
        if match is None:
            continue
        key = (match.get("id"), alert.get("ruleName"))
        if key in seen:
            alert["suppressed"] = True
        else:
            seen.add(key)
            alert["silenced"] = True
            alert["silenceRule"] = match.get("name", "")
    return alerts


LOG_TEMPLATES = {
    "nginx": {
        "pattern": r'(?P<timestamp>\S+ \+\d{4}) (?P<source>\S+) (?P<level>\w+) (?P<message>.+)',
        "generator": lambda: {
            "timestamp": f"{random.randint(1,28):02d}/{'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split()[random.randint(0,11)]}/{2024}:{random.randint(0,23):02d}:{random.randint(0,59):02d}:{random.randint(0,59):02d} +0000",
            "source": random.choice(["nginx", "api-gateway", "load-balancer"]),
            "level": random.choices(["INFO", "WARN", "ERROR", "DEBUG"], weights=[50, 15, 5, 30])[0],
            "message": random.choice([
                'GET /api/users 200 0.032s', 'POST /api/orders 201 0.145s', 'GET /api/products 304 0.008s',
                'GET /static/main.js 200 0.002s', 'POST /api/login 401 0.023s', 'GET /admin 403 0.005s',
                'GET /api/health 200 0.001s', 'GET /api/orders?page=2 200 0.056s', 'connection timeout upstream',
                'SSL handshake failed', 'worker process exited on signal 9', 'upstream server unavailable'
            ])
        }
    },
    "apache": {
        "pattern": r'\[(?P<timestamp>[^\]]+)\] \[(?P<level>\w+)\] \[(?P<source>\S+)\] (?P<message>.+)',
        "generator": lambda: {
            "timestamp": f"{'Sun Mon Tue Wed Thu Fri Sat'.split()[random.randint(0,6)]} {'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split()[random.randint(0,11)]} {random.randint(1,28):02d} {random.randint(0,23):02d}:{random.randint(0,59):02d}:{random.randint(0,59):02d} {2024}",
            "source": random.choice(["httpd", "mod_ssl", "mod_rewrite"]),
            "level": random.choices(["notice", "warn", "error", "info"], weights=[40, 15, 5, 40])[0],
            "message": random.choice(["server configured", "caught SIGTERM", "resuming normal ops", "request exceeded limit",
                        "file does not exist", "client denied by server", "Invalid method in request"])
        }
    },
    "json_app": {
        "pattern": None,
        "generator": lambda: {
            "timestamp": f"{2024}-{random.randint(1,12):02d}-{random.randint(1,28):02d}T{random.randint(0,23):02d}:{random.randint(0,59):02d}:{random.randint(0,59):02d}.{random.randint(0,999):03d}Z",
            "source": random.choice(["user-service", "order-service", "payment-service", "auth-service"]),
            "level": random.choices(["INFO", "WARN", "ERROR", "DEBUG"], weights=[45, 20, 5, 30])[0],
            "message": random.choice([
                'User login successful user_id=10' + str(random.randint(100, 999)),
                'Order created order_id=ORD-' + str(random.randint(10000, 99999)),
                'Payment processed amount=' + str(random.randint(10, 999)),
                'Database connection pool exhausted',
                'Cache miss for key user_session_' + str(random.randint(100, 999)),
                'Circuit breaker opened for service payment',
                'Request latency exceeds threshold 5000ms',
                'NullPointerException at com.app.controller.UserController.getProfile'
            ])
        }
    },
    "custom": {
        "pattern": None,
        "generator": lambda: {
            "timestamp": str(int(time.time() - random.randint(0, 86400))),
            "source": random.choice(["cron", "systemd", "kernel", "docker"]),
            "level": random.choices(["info", "warning", "error", "debug"], weights=[40, 20, 5, 35])[0],
            "message": random.choice(["OOM killer invoked", "disk usage above 90%", "container restarted", "NTP sync lost",
                        "process oom_score_adj=500", "firewall rule updated", "mount point not found"])
        }
    }
}


class GenerateRequest(BaseModel):
    type: str = "nginx"
    count: int = 1000
    config: Optional[dict] = None


class DetectRequest(BaseModel):
    logs: list
    rules: list = []
    query: str = ""
    config: Optional[dict] = None


class TierModel(BaseModel):
    key: str
    label: str = ""
    min: float


class SilenceModel(BaseModel):
    id: Optional[int] = None
    name: str
    target: str
    startTime: str
    endTime: str
    enabled: bool = True


class AlertConfigModel(BaseModel):
    tiers: List[TierModel]
    silences: List[SilenceModel] = []


@app.get("/api/alert-config")
def get_alert_config():
    return ALERT_CONFIG


@app.put("/api/alert-config")
def save_alert_config(cfg: AlertConfigModel):
    payload = cfg.model_dump()
    errors = validate_config(payload)
    if errors:
        # 严重级别或静默时段不合格：不允许保存，并逐项指出
        raise HTTPException(status_code=422, detail={"message": "配置校验未通过，未保存", "errors": errors})
    normalized = normalize_config(payload)
    ALERT_CONFIG.clear()
    ALERT_CONFIG.update(normalized)
    return {"ok": True, "config": ALERT_CONFIG}


@app.post("/api/generate")
def generate_logs(req: GenerateRequest):
    tmpl = LOG_TEMPLATES.get(req.type, LOG_TEMPLATES["nginx"])
    logs = []
    for i in range(req.count):
        entry = tmpl["generator"]()
        logs.append({
            "id": i + 1,
            "timestamp": entry["timestamp"],
            "level": entry["level"],
            "source": entry["source"],
            "message": entry["message"],
            "raw": f"[{entry['timestamp']}] [{entry['level']}] [{entry['source']}] {entry['message']}"
        })
    # 生成即带默认告警规则，便于在分级/静默配置下直接看到告警
    default_rules = [
        {"name": "高频ERROR", "type": "level", "threshold": 1, "enabled": True},
        {"name": "异常流量", "type": "count", "threshold": 200, "enabled": True},
    ]
    return analyze_logs(logs, default_rules, "", req.config)


@app.post("/api/detect")
def detect_anomalies(req: DetectRequest):
    return analyze_logs(req.logs, req.rules, req.query, req.config)


def _resolve_config(config: Optional[dict]):
    if isinstance(config, dict) and not validate_config(config):
        return normalize_config(config)
    return ALERT_CONFIG


def analyze_logs(logs_data, rules, query, config=None):
    cfg = _resolve_config(config)
    tiers = cfg["tiers"]
    silences = cfg["silences"]

    logs = logs_data
    n = len(logs)

    # Time windows (1min each for demonstration)
    window_size = 20
    windows = []
    for i in range(0, n, window_size):
        chunk = logs[i:i + window_size]
        levels = Counter(l["level"] for l in chunk)
        sources = Counter(l["source"] for l in chunk)
        windows.append({
            "start": i, "end": min(i + window_size, n),
            "count": len(chunk),
            "levels": dict(levels),
            "sources": dict(sources)
        })

    # 3-sigma + IQR anomaly detection
    counts = [w["count"] for w in windows]
    mean = float(np.mean(counts)) if counts else 0.0
    std = float(np.std(counts)) if len(counts) > 1 else 1.0
    q1 = float(np.percentile(counts, 25)) if len(counts) > 3 else mean - std
    q3 = float(np.percentile(counts, 75)) if len(counts) > 3 else mean + std
    iqr = q3 - q1 if q3 > q1 else 1.0

    anomalies = []
    for i, w in enumerate(windows):
        sigma_score = abs(w["count"] - mean) / max(std, 1e-5)
        iqr_low = q1 - 1.5 * iqr
        iqr_high = q3 + 1.5 * iqr
        iqr_score = 0.0
        if w["count"] < iqr_low or w["count"] > iqr_high:
            iqr_score = min(10.0, abs(w["count"] - (mean)) / max(iqr, 1e-5))
        anomalies.append({
            "windowIndex": i,
            "sigmaScore": round(sigma_score, 2),
            "iqrScore": round(iqr_score, 2),
            "isAnomaly": sigma_score > 2.5 or iqr_score > 3.0,
            "timestamp": logs[i * window_size]["timestamp"] if i * window_size < len(logs) else ""
        })

    # 用窗口序号映射到一天内的时刻，使静默时段(HH:MM:SS)可判定
    window_count = max(len(windows), 1)
    seconds_per_window = 86400.0 / window_count

    def window_time(i):
        return _seconds_to_time(int(i * seconds_per_window))

    # 所有告警先得到统一分数，再按同一套分级标准分档
    raw_alerts = []

    def add_alert(rule_name, score, message, window_index):
        raw_alerts.append({
            "id": len(raw_alerts) + 1,
            "ruleName": rule_name,
            "score": round(float(score), 2),
            "message": message,
            "windowIndex": window_index,
            "timestamp": window_time(window_index),
        })

    # Alert rules
    for rule in rules:
        if not isinstance(rule, dict):
            continue
        threshold = rule.get("threshold", 5)
        try:
            threshold = float(threshold)
        except (TypeError, ValueError):
            threshold = 5.0
        for wi, w in enumerate(windows):
            error_count = w["levels"].get("ERROR", 0)
            if rule.get("type") == "level" and error_count > threshold:
                # 统一分数：超出阈值越多分数越高（恰好达阈≈1，翻倍≈2，4倍≈4…）
                score = error_count / max(threshold, 1.0)
                add_alert(
                    rule.get("name", "高频ERROR"), score,
                    f"窗口{w['start']}内ERROR日志{error_count}条超过阈值{rule.get('threshold',5)}",
                    wi
                )
            count_threshold = rule.get("threshold", 200)
            try:
                count_threshold = float(count_threshold)
            except (TypeError, ValueError):
                count_threshold = 200.0
            if rule.get("type") == "count" and w["count"] > count_threshold:
                score = w["count"] / max(count_threshold, 1.0)
                add_alert(
                    rule.get("name", "异常流量"), score,
                    f"窗口{w['start']}日志量{w['count']}超过阈值",
                    wi
                )

    # Full-text search with TF-IDF
    if query:
        query_terms = query.lower().split()
        scored = []
        for log in logs:
            raw_lower = log["raw"].lower()
            score = sum(1 for t in query_terms if t in raw_lower)
            if score > 0:
                scored.append((score, log))
        logs = [l for _, l in sorted(scored, key=lambda x: x[0], reverse=True)]

    # Add non-rule alerts for high anomaly windows
    for a in anomalies:
        if a["isAnomaly"]:
            score = max(a["sigmaScore"], a["iqrScore"])
            add_alert(
                "统计异常检测", score,
                f"窗口{a['windowIndex']}: 3-sigma={a['sigmaScore']}, IQR={a['iqrScore']}",
                a["windowIndex"]
            )

    # 统一分档 + 静默处理（先截断，保证与前端在同一份数据上重算结果一致）
    alerts = []
    for raw in raw_alerts[:100]:
        alert = dict(raw)
        alert["severity"] = classify_severity(raw["score"], tiers)
        alert["silenced"] = False
        alert["suppressed"] = False
        alert["silenceRule"] = None
        alerts.append(alert)
    apply_silences(alerts, silences)

    return {
        "logs": logs[:200],
        "windows": windows,
        "anomalies": anomalies,
        "alerts": alerts,
        "totalLogs": n,
        "alertConfig": cfg
    }
