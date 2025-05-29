import { SimpleTextEncoder } from './simple-text-encoder'

export class Optional {
  event: number
  sessionId: string | null
  errorCode: number
  connectionId: string | null
  response_meta_json: string | null
  sequence: number | null

  constructor({
    event = 0, // EVENT_NONE
    sessionId = null,
    sequence = null,
  }: {
    event?: number
    sessionId?: string | null
    sequence?: number | null
  } = {}) {
    this.event = event
    this.sessionId = sessionId
    this.errorCode = 0
    this.connectionId = null
    this.response_meta_json = null
    this.sequence = sequence
  }

  /** 将对象编码为 Uint8Array 字节数组 */
  asBytes(): Uint8Array {
    const bytes: number[] = []

    // 添加事件字段（4字节，带符号）
    if (this.event !== 0) {
      bytes.push(...this.intToBytes(this.event, 4))
    }

    // 添加 sessionId 长度和内容
    if (this.sessionId !== null) {
      const encoder = new SimpleTextEncoder()
      const sessionBytes = encoder.encode(this.sessionId)
      bytes.push(...this.intToBytes(sessionBytes.length, 4)) // 长度（4字节）
      bytes.push(...sessionBytes) // 内容
    }

    // 添加序列号（4字节）
    if (this.sequence !== null) {
      bytes.push(...this.intToBytes(this.sequence, 4))
    }

    return new Uint8Array(bytes)
  }

  /** 辅助函数：将整数转换为大端格式字节数组 */
  private intToBytes(value: number, byteSize: number): number[] {
    const result: number[] = []
    const max = 2 ** (byteSize * 8 - 1)
    const signed = value < 0
    let v = signed ? (max * 2 + value) : value
    for (let i = byteSize - 1; i >= 0; i--) {
      result[i] = v & 0xFF
      v >>= 8
    }
    return result
  }
}
