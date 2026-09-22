"""告警严重级别分档与静默时段处理（纯逻辑模块）。

- 每条告警先按统一规则折算为 0~10 的数值分数，再按同一套分级标准（可配置下限）重新分档；
- 静默时段内同类告警只保留第一次（标注“静默中”），时段结束后同类告警恢复展示；
- 配置保存前做严格校验，严重级别填错或静默起止颠倒均判为不合格，不允许保存。
"""
import re
import time
from datetime import datetime

# 固定四档，顺序即由高到低
LEVEL_ORDER = ["critical", "high", "medium", "low"]
LEVEL_DEFAULT_LABEL = {"critical": "紧急", "high": "严重", "medium": "中等", "low": "轻微"}

DEFAULT_GRADES = [
    {"level": "critical", "label": "紧急", "min": 8.0},
    {"level": "high", "label": "严重", "min": 5.0},
    {"level": "medium", "label": "中等", "min": 2.0},
    {"level": "low", "label": "轻微", "min": 0.0},
]
DEFAULT_SILENCES = []

_TIME_RE = re.compile(r"^([01]?\d|2[0-3]):([0-5]?\d)(?::([0-5]?\d))?$")
_NUM_RE = re.compile(r"-?\d+(?:\.\d+)?")
_FALLBACK_SCORE = {"critical": 9.0, "high": 6.0, "medium": 3.0, "low": 1.0}


def default_config():
    return {"grades": [dict(g) for g in DEFAULT_GRADES], "silences": [dict(s) for s in DEFAULT_SILENCES]}


def parse_hms(value):
    """把 HH:MM 或 HH:MM:SS 解析为 (当日秒数, 规范化字符串)，不合法返回 (None, None)。"""
    if not isinstance(value, str):
        return None, None
    m = _TIME_RE.match(value.strip())
    if not m:
        return None, None
    hh, mm, ss = int(m.group(1)), int(m.group(2)), int(m.group(3) or 0)
    sec = hh * 3600 + mm * 60 + ss
    return sec, f"{hh:02d}:{mm:02d}:{ss:02d}"


def _is_number(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool) and v == v and v not in (float("inf"), float("-inf"))


def validate_config(config):
    """校验配置，返回 {valid, errors, warnings, normalized}。不合格时 normalized 为 None。"""
    errors = []
    warnings = []
    config = config if isinstance(config, dict) else {}

    # ---- 严重级别分档 ----
    raw_grades = config.get("grades")
    grades = []
    if not isinstance(raw_grades, list) or len(raw_grades) != len(LEVEL_ORDER):
        errors.append({"field": "grades", "message": f"分级标准必须包含且仅包含 {len(LEVEL_ORDER)} 档（critical/high/medium/low）", "value": raw_grades})
    else:
        for idx, item in enumerate(raw_grades):
            expect = LEVEL_ORDER[idx]
            where = f"分级[{idx + 1}]{expect}"
            if not isinstance(item, dict):
                errors.append({"field": f"grades[{idx}]", "message": f"{where}：格式不正确", "value": item})
                continue
            level = item.get("level", expect)
            if level != expect:
                errors.append({"field": f"grades[{idx}].level", "message": f"{where}：档位标识必须为 {expect}，不能改名或调换顺序", "value": level})
            label = str(item.get("label", "")).strip()
            if not label:
                errors.append({"field": f"grades[{idx}].label", "message": f"{where}：显示名称不能为空", "value": item.get("label")})
            mn = item.get("min")
            if not _is_number(mn):
                errors.append({"field": f"grades[{idx}].min", "message": f"{where}：分数下限必须是数字", "value": mn})
            else:
                grades.append({"level": expect, "label": label or LEVEL_DEFAULT_LABEL[expect], "min": round(float(mn), 2)})

        if len(grades) == len(LEVEL_ORDER):
            for idx in range(len(grades) - 1):
                if grades[idx]["min"] <= grades[idx + 1]["min"]:
                    errors.append({
                        "field": f"grades[{idx + 1}].min",
                        "message": f"分级 {grades[idx]['level']} 下限 {grades[idx]['min']} 必须严格高于下一档 {grades[idx + 1]['level']} 下限 {grades[idx + 1]['min']}",
                        "value": grades[idx + 1]["min"],
                    })
            if grades[-1]["min"] > 0:
                warnings.append({"field": f"grades[{len(grades) - 1}].min", "message": f"最低档 {grades[-1]['level']} 下限为 {grades[-1]['min']}，低于该分数的告警仍会归入最低档"})

    # ---- 静默时段 ----
    raw_silences = config.get("silences", [])
    silences = []
    if not isinstance(raw_silences, list):
        errors.append({"field": "silences", "message": "静默时段必须是列表", "value": raw_silences})
    else:
        seen_ranges = {}
        for idx, item in enumerate(raw_silences):
            where = f"静默时段[{idx + 1}]"
            if not isinstance(item, dict):
                errors.append({"field": f"silences[{idx}]", "message": f"{where}：格式不正确", "value": item})
                continue
            start_sec, start_norm = parse_hms(item.get("start", ""))
            end_sec, end_norm = parse_hms(item.get("end", ""))
            if start_sec is None:
                errors.append({"field": f"silences[{idx}].start", "message": f"{where}：开始时间必须为 HH:MM:SS 格式", "value": item.get("start")})
            if end_sec is None:
                errors.append({"field": f"silences[{idx}].end", "message": f"{where}：结束时间必须为 HH:MM:SS 格式", "value": item.get("end")})
            if start_sec is not None and end_sec is not None and start_sec >= end_sec:
                errors.append({"field": f"silences[{idx}].end", "message": f"{where}：开始 {start_norm} 必须早于结束 {end_norm}（起止时间颠倒或相等）", "value": item.get("end")})
            scope = str(item.get("scope", "") or "").strip()
            if start_sec is not None and end_sec is not None and start_sec < end_sec:
                sig = (start_sec, end_sec, scope)
                if sig in seen_ranges:
                    warnings.append({"field": f"silences[{idx}]", "message": f"{where} 与第 {seen_ranges[sig] + 1} 条完全重复，保留一条即可"})
                else:
                    seen_ranges[sig] = idx
                silences.append({
                    "id": item.get("id") if isinstance(item.get("id"), int) else idx + 1,
                    "start": start_norm,
                    "end": end_norm,
                    "startSec": start_sec,
                    "endSec": end_sec,
                    "scope": scope,
                })

    valid = not errors
    return {
        "valid": valid,
        "errors": errors,
        "warnings": warnings,
        "normalized": {"grades": grades, "silences": silences} if valid and len(grades) == len(LEVEL_ORDER) else None,
    }


def alert_score(alert):
    """把一条（可能是历史回填的）告警折算为 0~10 的数值分数。"""
    score = alert.get("score")
    if _is_number(score):
        return max(0.0, min(10.0, float(score)))
    msg = str(alert.get("message", ""))
    nums = _NUM_RE.findall(msg)
    if "3-sigma" in msg and len(nums) >= 2:
        return max(0.0, min(10.0, max(float(nums[0]) * 2.0, float(nums[1]))))
    if "ERROR" in msg and "阈值" in msg and len(nums) >= 3:
        # 窗口起点、ERROR 条数、阈值
        cnt, thr = float(nums[-2]), max(float(nums[-1]), 1.0)
        return max(0.0, min(10.0, 3.0 * cnt / thr))
    if "日志量" in msg and "阈值" in msg and len(nums) >= 2:
        cnt, thr = float(nums[-1]), 1.0
        # 旧版消息里没有阈值，仅做兜底
        return max(0.0, min(10.0, 3.0 * cnt / max(thr, 200.0)))
    return _FALLBACK_SCORE.get(str(alert.get("severity", "")), 1.0)


def _fingerprint(alert):
    fp = alert.get("fingerprint")
    if isinstance(fp, str) and fp:
        return fp
    # 数字（窗口号/条数/分数）归一化后，规则名+模板相同即为同类告警
    return f"{alert.get('ruleName', '')}:{_NUM_RE.sub('#', str(alert.get('message', '')))}"


def _time_sec(alert):
    ts = alert.get("timeSec")
    if _is_number(ts):
        return int(ts) % 86400
    sec, _ = parse_hms(str(alert.get("timestamp", "")))
    return sec if sec is not None else 0


def classify(score, grades):
    """按可配置下限由高到低命中第一档。"""
    for g in grades:
        if score >= g["min"]:
            return g
    return grades[-1]


def apply_config(alerts, config):
    """对原始告警统一重新分档并套用静默规则。

    返回 (处理后的告警列表, 统计信息)。列表与图表均以此输出为唯一数据源。
    """
    grades = config["grades"]
    silences = sorted(config.get("silences", []), key=lambda s: (s["startSec"], s["endSec"]))

    ordered = sorted(enumerate(alerts), key=lambda p: (int(p[1].get("windowIndex", 0) or 0), p[0]))
    kept = []
    seen = {}          # (静默时段序号, 指纹) -> 该时段内保留的首条告警
    suppressed_total = 0

    for _, raw in ordered:
        a = dict(raw)
        score = round(alert_score(a), 2)
        grade = classify(score, grades)
        a["score"] = score
        a["severity"] = grade["level"]
        a["severityLabel"] = grade["label"]
        a["silenced"] = bool(a.get("silenced", False))
        a["suppressedCount"] = 0
        a.setdefault("silenceWindowId", None)
        a.setdefault("silenceRange", "")

        tsec = _time_sec(a)
        fp = _fingerprint(a)
        for si, sw in enumerate(silences):
            scope_match = not sw["scope"] or sw["scope"] == str(a.get("ruleName", ""))
            if scope_match and sw["startSec"] <= tsec < sw["endSec"]:
                key = (si, fp)
                if key in seen:
                    seen[key]["suppressedCount"] += 1
                    suppressed_total += 1
                else:
                    a["silenced"] = True
                    a["silenceWindowId"] = sw["id"]
                    a["silenceRange"] = f"{sw['start']}–{sw['end']}"
                    seen[key] = a
                    kept.append(a)
                break
        else:
            kept.append(a)

    by_severity = {lv: 0 for lv in LEVEL_ORDER}
    silenced_count = 0
    for new_id, a in enumerate(kept, start=1):
        a["id"] = new_id
        by_severity[a["severity"]] += 1
        if a["silenced"]:
            silenced_count += 1

    stats = {
        "totalRaw": len(alerts),
        "kept": len(kept),
        "suppressed": suppressed_total,
        "silencedFirsts": silenced_count,
        "bySeverity": by_severity,
    }
    return kept, stats


def describe_config(config, validation=None, scope=None, stats=None):
    """生成人类可读的说明文字，必须包含严重级别校验结果。"""
    lines = []
    validation = validation or {"valid": True, "errors": [], "warnings": []}

    if validation["errors"]:
        lines.append("保存被拒绝，配置未生效。不合格项：")
        for i, e in enumerate(validation["errors"], start=1):
            lines.append(f"  {i}. [{e['field']}] {e['message']}（当前值：{e.get('value')!r}）")
        lines.append("")
        lines.append("分级校验：不合格，请修正上述严重级别后重新保存。")
        if any(str(e["field"]).startswith("silences") for e in validation["errors"]):
            lines.append("静默时段校验：不合格（存在起止颠倒或时间格式错误）。")
        return "\n".join(lines)

    grades = config["grades"]
    chain = " ＞ ".join(f"{g['level']} {g['label']} ≥ {g['min']}" for g in grades)
    lines.append(f"分级校验：合格（{len(grades)}/{len(LEVEL_ORDER)} 档）：{chain}")

    silences = config.get("silences", [])
    if silences:
        lines.append(f"静默时段：{len(silences)} 条，校验合格：")
        for i, sw in enumerate(silences, start=1):
            scope_txt = f"仅规则「{sw['scope']}」" if sw["scope"] else "全部规则"
            lines.append(f"  {i}. {sw['start']}–{sw['end']}（{scope_txt}）")
    else:
        lines.append("静默时段：0 条，校验合格（当前不静默任何告警）。")

    for w in validation.get("warnings", []):
        lines.append(f"提示：[{w['field']}] {w['message']}")

    if scope == "subsequent":
        lines.append("生效范围：仅后续告警；已有告警条目保持原分档不变。")
    elif scope == "backfill" and stats is not None:
        lines.append(
            f"生效范围：已回填已有条目——原始告警 {stats['totalRaw']} 条，"
            f"保留 {stats['kept']} 条（含静默期首条 {stats['silencedFirsts']} 条，已标注“静默中”），"
            f"折叠静默期内重复告警 {stats['suppressed']} 条；告警列表与各图表面板按同一结果刷新。"
        )
    return "\n".join(lines)
