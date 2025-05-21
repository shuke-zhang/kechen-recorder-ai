export class SimpleTextEncoder {
  encode(str: string): Uint8Array {
    const utf8: number[] = []
    for (let i = 0; i < str.length; i++) {
      const charcode = str.charCodeAt(i)

      if (charcode < 0x80) {
        utf8.push(charcode)
      }
      else if (charcode < 0x800) {
        utf8.push(0xC0 | (charcode >> 6))
        utf8.push(0x80 | (charcode & 0x3F))
      }
      else if (charcode < 0xD800 || charcode >= 0xE000) {
        utf8.push(0xE0 | (charcode >> 12))
        utf8.push(0x80 | ((charcode >> 6) & 0x3F))
        utf8.push(0x80 | (charcode & 0x3F))
      }
      else {
        // 处理 surrogate pair（代理对），用于编码 emoji 等字符
        i++
        const surrogatePair = 0x10000 + (((charcode & 0x3FF) << 10) | (str.charCodeAt(i) & 0x3FF))
        utf8.push(0xF0 | (surrogatePair >> 18))
        utf8.push(0x80 | ((surrogatePair >> 12) & 0x3F))
        utf8.push(0x80 | ((surrogatePair >> 6) & 0x3F))
        utf8.push(0x80 | (surrogatePair & 0x3F))
      }
    }
    return new Uint8Array(utf8)
  }
}
