// 假设 Header 和 Optional 是你自定义的接口，可以根据需要补充
import type { Header } from './header '
import type { Optional } from './optional '

export class DoubaoResponse {
  header: Header
  optional: Optional
  payload: Uint8Array | null
  payload_json: string | null

  constructor(header: Header, optional: Optional) {
    this.header = header
    this.optional = optional
    this.payload = null
    this.payload_json = null
  }

  toString(): string {
    return '[object Response]'
  }
}
