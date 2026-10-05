// 盆笔记规矩，与后端 app/services.py 保持同一套：
// 汉字数 8～40，正文必须出现「东津渡」。缺字或缺这四个字整笔打回。
export const NOTE_MIN_HANZI = 8;
export const NOTE_MAX_HANZI = 40;
export const NOTE_REQUIRED_PHRASE = "东津渡";

export function hanziCount(text) {
  let n = 0;
  for (const ch of text || "") {
    const code = ch.codePointAt(0);
    // CJK 统一表意文字区间，标点/数字/拉丁字母不计
    if (code >= 0x4e00 && code <= 0x9fff) n += 1;
  }
  return n;
}

// 返回错误文案；合格返回 ""。抽屉与专页共用，任何一边都不允许放过短笔记。
export function noteError(text) {
  const count = hanziCount(text);
  if (count === 0) return "笔记为空，按缺字打回";
  if (count < NOTE_MIN_HANZI)
    return `汉字不足 ${NOTE_MIN_HANZI} 字（当前 ${count} 字），笔记打回`;
  if (count > NOTE_MAX_HANZI)
    return `汉字超过 ${NOTE_MAX_HANZI} 字（当前 ${count} 字），笔记打回`;
  if (!(text || "").includes(NOTE_REQUIRED_PHRASE))
    return "正文必须出现「东津渡」，缺这四个字整笔打回";
  return "";
}
