"""缫丝盆门槛：标成已缫完须最近一次汤温落在 38～42℃。

盆笔记另有落库闸门：汉字数 8～40，且正文必须出现「东津渡」。
抽屉改笔记与专页存笔记共用本规矩，缺字或缺这四个字整笔打回，
绝不先入库再改字。
"""

from app.models import Basin

MIN_TEMP = 38.0
MAX_TEMP = 42.0

NOTE_REQUIRED_PHRASE = "东津渡"
NOTE_MIN_HANZI = 8
NOTE_MAX_HANZI = 40


class RuleError(ValueError):
    pass


def hanzi_count(text: str) -> int:
    """数汉字（CJK 统一表意文字）个数，标点、数字、拉丁字母不计。"""
    return sum(1 for ch in (text or "") if "一" <= ch <= "鿿")


def validate_note(text: str) -> None:
    """落库前的唯一笔记闸门，抽屉与专页都必须经过这里。"""
    count = hanzi_count(text)
    if count == 0:
        raise RuleError("笔记为空，按缺字打回")
    if count < NOTE_MIN_HANZI:
        raise RuleError(
            f"汉字不足 {NOTE_MIN_HANZI} 字（当前 {count} 字），笔记打回"
        )
    if count > NOTE_MAX_HANZI:
        raise RuleError(
            f"汉字超过 {NOTE_MAX_HANZI} 字（当前 {count} 字），笔记打回"
        )
    if NOTE_REQUIRED_PHRASE not in text:
        raise RuleError("正文必须出现「东津渡」，缺这四个字整笔打回")


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
