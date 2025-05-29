/**
 * @description 科大讯飞语音识别配置项
 * https://console.xfyun.cn/services/iat
 */
export interface XunFeiRecorderOptions {
  /**
   * @description 应用 APPID（必填），由科大讯飞开放平台申请获得
   */
  APPID: string

  /**
   * @description 应用的 APISecret（必填），用于生成签名鉴权字符串，确保通信安全
   */
  APISecret: string

  /**
   * @description 应用的 APIKey（必填），与 APISecret 搭配使用
   */
  APIKey: string

  /**
   * @description WebSocket 接口地址，默认使用科大讯飞提供的识别地址
   * @example "wss://iat-api.xfyun.cn/v2/iat"
   */
  url: string

  /**
   * @description WebSocket 连接的 Host 地址，与 url 配套使用
   * @example "iat-api.xfyun.cn"
   */
  host: string
}

/**
 * @description 科大讯飞语音合成配置项
 * https://console.xfyun.cn/services/tts
 */
export interface XunFeiSpeechSynthesisOptions extends XunFeiRecorderOptions {

}
