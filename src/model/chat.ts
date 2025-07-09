/**
 * 聊天记录模主要用用户新增
 */
export interface ChatHistoryModel {
  /** AI 语音输出音频地址 */
  assistantAudio: string

  /** AI 输出音频生成时间 */
  assistantAudioTime: string

  /** AI 文本输出内容 */
  assistantOutput: string

  /** AI 输出文本生成时间 */
  assistantOutputTime: string

  /** 提示创建时间 */
  createdTime: string

  /** 提示记录主键 ID */
  id: number

  /** 记录更新时间 */
  updatedTime: string

  /** 用户语音音频地址 */
  userAudio: string

  /** 用户语音上传时间 */
  userAudioTime: string

  /** 用户文本输入内容 */
  userInput: string

  /** 用户文本输入时间 */
  userInputTime: string
}
