export class SimpleTextDecoder {
  decode(bytes: Uint8Array): string {
    let result = ''
    let i = 0

    while (i < bytes.length) {
      const byte1 = bytes[i++]

      if (byte1 < 0x80) {
        result += String.fromCharCode(byte1)
      }
      else if (byte1 >= 0xC0 && byte1 < 0xE0) {
        const byte2 = bytes[i++]
        result += String.fromCharCode(((byte1 & 0x1F) << 6) | (byte2 & 0x3F))
      }
      else if (byte1 >= 0xE0 && byte1 < 0xF0) {
        const byte2 = bytes[i++]
        const byte3 = bytes[i++]
        result += String.fromCharCode(
          ((byte1 & 0x0F) << 12)
          | ((byte2 & 0x3F) << 6)
          | (byte3 & 0x3F),
        )
      }
      else if (byte1 >= 0xF0) {
        const byte2 = bytes[i++]
        const byte3 = bytes[i++]
        const byte4 = bytes[i++]
        const codepoint
          = ((byte1 & 0x07) << 18)
            | ((byte2 & 0x3F) << 12)
            | ((byte3 & 0x3F) << 6)
            | (byte4 & 0x3F)
        const offset = codepoint - 0x10000
        const lead = 0xD800 + (offset >> 10)
        const trail = 0xDC00 + (offset & 0x3FF)
        result += String.fromCharCode(lead, trail)
      }
    }

    return result
  }
}
