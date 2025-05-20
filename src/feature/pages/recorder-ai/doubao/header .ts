export class Header {
  protocol_version: number
  header_size: number
  message_type: number
  message_type_specific_flags: number
  serial_method: number
  compression_type: number
  reserved_data: number

  constructor({
    protocol_version = 0b0001, // 协议版本，默认 1
    header_size = 0b0001, // 头部长度，默认 1
    message_type = 0, // 消息类型，高4位
    message_type_specific_flags = 0, // 消息标志位，低4位
    serial_method = 0b0000, // 序列化方式
    compression_type = 0b0000, // 压缩方式
    reserved_data = 0, // 保留字段
  } = {}) {
    this.protocol_version = protocol_version
    this.header_size = header_size
    this.message_type = message_type
    this.message_type_specific_flags = message_type_specific_flags
    this.serial_method = serial_method
    this.compression_type = compression_type
    this.reserved_data = reserved_data
  }

  /** 转换为 Uint8Array 字节数组 */
  asBytes(): Uint8Array {
    return new Uint8Array([
      (this.protocol_version << 4) | this.header_size, // 第1字节
      (this.message_type << 4) | this.message_type_specific_flags, // 第2字节
      (this.serial_method << 4) | this.compression_type, // 第3字节
      this.reserved_data, // 第4字节
    ])
  }
}
