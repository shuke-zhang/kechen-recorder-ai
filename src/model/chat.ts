/**
 * 聊天记录模主要用用户新增
 */
export interface ChatHistoryModel {
  /**
   * 用户语音音频地址 - 用户上传的音频地址
   */
  userAudio: string

  /**
   * 用户语音上传时间 - 用户上传音频的时间
   */
  userAudioTime: string

  /**
   * 用户文本输入内容 - 用户输入的文本
   */
  userInput: string

  /**
   * 用户文本输入时间 - 用户输入文本的时间
   */
  userInputTime: string
  /**
   * AI 语音输出音频地址 - 将ai音频上传的地址
   */
  assistantAudio: string

  /**
   * AI 输出音频生成时间 - 最后一次音频生成的时间
   */
  assistantAudioTime: string

  /**
   * AI 文本输出内容 - 流式文本
   */
  assistantOutput: string

  /**
   * AI 输出文本生成时间 - 记录文本返回的第一帧的时间
   */
  assistantOutputTime: string

  /**
   * 提示创建时间
   */
  createdTime: string

  /**
   * 提示记录主键 ID
   */
  id: number

  /**
   * 记录更新时间
   */
  updatedTime: string

}

export interface UploadFileModel {
  /** 提示信息 */
  msg: string
  /** 文件名称 */
  fileName: string
  /** 状态码 */
  code: string
  /** 新文件名称 */
  newFileName: string
  /** 文件上传成功的资质 */
  url: string
  /** 原始文件名称 */
  originalFilename: string
}
