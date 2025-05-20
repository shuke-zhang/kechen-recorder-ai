/**
 * 豆包语音合成配置项 - https://www.volcengine.com/docs/6561/1329505
 */
export interface DoubaoRecorderOptions {
/**
 * @description 应用 APPID（必填）
 */
  APPID: string

  /**
   * @description SecretKey 控制台获取
   */
  SecretKey: string

  /**
   * @description AccessToken 控制台获取
   */
  AccessToken: string

  /**
   * @description WebSocket 接口地址，默认使用科大讯飞提供的识别地址
   */
  url: string

  /**
   * @description WebSocket 连接的 Host 地址，与 url 配套使用
   * @example "iat-api.xfyun.cn"
   */
  host: string
  /**
   * @description 发音人 https://www.volcengine.com/docs/6561/1257544
   */
  speaker?: string
}

/**
 * 豆包语音合成 class传入的配置项
 */
export interface DoubaoSpeechSynthesisOptions extends DoubaoRecorderOptions {

}
/**
 * @description MessageType 类型
 * @warn 是否包含Event number
 */
export enum MessageTypeModel {
  /**
   *  Full-client request - 是 - 完整请求体，用于触发服务端session初始化
   * Message type specific flags 标识 - 0b0100
   */
  '0b0001',
  /**
   * Full-server response - 是 - TTS：前端信息、文本音频混合数据等（Serialization=JSON）
   * Message type specific flags 标识 - 0b0100
   */
  '0b1001',
  /**
   * Audio-only response - 是 - 仅音频数据（Serialization=Binary）
   * Message type specific flags 标识 - 0b0100
   */
  '0b1011',
  /**
   *  Error information - 是 - 错误信息（Serialization=JSON）
   * Message type specific flags 标识 - None
   */
  '0b1111',
}
