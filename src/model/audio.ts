export interface DoubaoAudioModel {
  /**
   * 音频数据，base64编码
   */
  audio_data: string
  /**
   * 音频格式，目前支持mp3
   */
  encoding: string
  /**
   * 音色
   */
  voice_type: string
  /**
   * 语音合成的文本
   */
  text: string
  /**
   *  是否成功
   */
  success: boolean
}
