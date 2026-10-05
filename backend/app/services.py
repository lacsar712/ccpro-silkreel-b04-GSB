"""缫丝盆门槛：标成已缫完须最近一次汤温落在 38～42℃；盆笔记落库须过字数与渡口规矩。"""

from app.models import Basin

MIN_TEMP = 38.0
MAX_TEMP = 42.0

NOTE_MIN_HANZI = 8
NOTE_MAX_HANZI = 40
NOTE_REQUIRED_PHRASE = "东津渡"


class RuleError(ValueError):
    pass


def latest_temp(basin: Basin) -> float | None:
    if not basin.readings:
        return None
    latest = max(basin.readings, key=lambda r: r.taken_at)
    return latest.water_temp_c


def assert_can_set_status(basin: Basin, new_status: str) -> None:
    allowed = {Basin.STATUS_SOAKING, Basin.STATUS_REELING, Basin.STATUS_REELED}
    if new_status not in allowed:
        raise RuleError(f"无效状态：{new_status}")
    if new_status != Basin.STATUS_REELED:
        return
    temp = latest_temp(basin)
    if temp is None:
        raise RuleError("该盆尚无汤温记录，不能标已缫完")
    if temp < MIN_TEMP or temp > MAX_TEMP:
        raise RuleError(
            f"最近汤温 {temp}℃ 不在 {MIN_TEMP:.0f}～{MAX_TEMP:.0f}℃，不能标已缫完"
        )


def count_hanzi(text: str) -> int:
    """只数汉字，标点、数字、字母都不算。"""
    return sum(1 for ch in text if "一" <= ch <= "鿿")  # U+4E00–U+9FFF


def assert_valid_note(text: str) -> None:
    """盆笔记落库门槛：8～40 个汉字且正文须含「东津渡」，缺一样整笔打回。"""
    body = text or ""
    hanzi = count_hanzi(body)
    if hanzi < NOTE_MIN_HANZI or hanzi > NOTE_MAX_HANZI:
        raise RuleError(
            f"盆笔记须为 {NOTE_MIN_HANZI}～{NOTE_MAX_HANZI} 个汉字，当前 {hanzi} 字，整笔打回"
        )
    if NOTE_REQUIRED_PHRASE not in body:
        raise RuleError(f"盆笔记正文须含「{NOTE_REQUIRED_PHRASE}」，整笔打回")
