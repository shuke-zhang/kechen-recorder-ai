import type { AiOptionsModel } from '@/model/ai'
import { setAiContent } from '@/pages/ai/const'

export interface AiMessage extends AiModel.AiRequestMessagesModel {
  /**
   * @description 是否是流式传输中的临时消息
   */
  streaming?: boolean
  /**
   * @description 判断是否是语音识别的加载状态
   */
  isRecordingPlaceholder?: boolean
}
export function useAi(options: AiOptionsModel, chatSSEClientRef: AiModel.GaoChatSSEClientInstance) {
  // const optionsParams = {
  //   'deepseek-r1': options.params,
  //   'doubao': options.params,
  //   '通义千问': options.params,
  //   '智谱清言': options.params,
  // }
  /**
   * @description 模型名称
   * deepseek-r1'
   * doubao'
   * 通义千问'
   * 智谱清言'
   */
  const modelName = ref(options.name)
  /**
   * @description 聊天内容s
   */
  const content = ref<AiMessage[]>([])

  /**
   * ai返回的消息是否结束了
   */
  const isAiMessageEnd = ref(false)
  /**
   * @description 聊天内容开始到结束
   * 开始 true
   * 结束 false
   */
  const isStreaming = ref(false)
  let lastFinishPromise: Promise<void> = Promise.resolve()
  let onFinishLock: Promise<void> = Promise.resolve()
  /**
   * 发送消息
   */
  /**
   * @description GaoChatSSEClient组件实例
   */
  // const chatSSEClientRef = ref<AiModel.GaoChatSSEClientInstance>()

  /**
   * @description ai请求loading
   */
  const loading = ref(false)

  /**
   * @description ai聊天请求错误的错误信息
   */
  const error = ref()
  /**
   * @description ai聊天请求成功的返回内容
   */
  const message = ref('')
  let onFinishResolver: (() => void) | null = null
  /**
   *  @description 开始聊天
   */
  async function startChat() {
    await lastFinishPromise
    await onFinishLock
    loading.value = true
    if (!content.value) {
      return showToast('请先输入聊天内容')
    }
    isAiMessageEnd.value = false
    console.log(loading.value, 'startChat')

    return chatSSEClientRef?.startChat({
      url: options.baseURL,
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
      },
      response_format: {
        type: 'json_object',
      },
      body: {
        messages: content.value ? content.value.filter(item => item.content) : [],
        stream: true,
        model: options.model as AiModel.AIMODELTYPE,

      },
    })
  }

  /**
   *  @description 停止聊天
   */
  function stopChat(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log('触发----------------stopChat')

        loading.value = false
        isAiMessageEnd.value = true
        isStreaming.value = false
        const lastIndex = content.value.length - 1
        if (content.value[lastIndex]?.streaming && content.value[lastIndex].content) {
        // 移除流式标记并格式化内容
          const finalContent = {
            ...content.value[lastIndex],
            content: content.value[lastIndex].content,
            streaming: undefined,
          }
          content.value.splice(lastIndex, 1, finalContent)
        }

        chatSSEClientRef?.stopChat?.()
        resolve()
      }
      catch (error) {
        reject(error)
      }
    })
  }

  /**
   * @description 聊天请求开始的回调
   */
  function onStart() {
    loading.value = true
  }
  /**
   * @description ai聊天请求错误的回调
   */
  function onError(err: Error | string) {
    console.log('出错啦', err)
    error.value = err
  }
  /**
   * @description ai聊天请求成功的回调
   * @param msg 聊天内容
   */
  function onSuccess(msg: string) {
    // #ifdef MP-WEIXIN
    const { content: streamContent } = wxExtractStreamContent(msg)
    // message.value += streamContent
    hotUpdate(streamContent)
    // #endif

    // #ifdef APP || APP-PLUS || H5
    if (msg.includes('DONE')) {
      // 主动将 DONE 传递出去，方便做ai消息结束的判断
      // 用于需要在最后一条消息的时候立即做某些事儿
      isAiMessageEnd.value = true
      return hotUpdate(' ')
    }
    const { content: appContent } = appExtractStreamContent(msg)
    hotUpdate(appContent)
    // #endif
  }
  /**
   * @description 聊天请求结束的回调
   */
  function onFinish(): Promise<void> {
    onFinishLock = new Promise((resolve) => {
      onFinishResolver = resolve
    })

    lastFinishPromise = (async () => {
      try {
        console.log('触发onFinish-----------------------------------')
        loading.value = false
        isStreaming.value = false

        const lastIndex = content.value.length - 1
        if (content.value[lastIndex]?.streaming && content.value[lastIndex].content) {
          const finalContent = {
            ...content.value[lastIndex],
            content: content.value[lastIndex].content,
            streaming: undefined,
          }
          content.value.splice(lastIndex, 1, finalContent)
        }
      }
      finally {
        onFinishResolver?.()
      }
    })()

    return lastFinishPromise
  }

  function hotUpdate(acceptMsg: string) {
    isStreaming.value = true
    // 寻找最后一个消息的位置
    const lastIndex = content.value.length - 1

    // 确保存在进行中的AI消息
    if (lastIndex < 0 || content.value[lastIndex].role !== 'assistant') {
      const text = setAiContent({
        modeName: modelName.value || '',
        type: 'accept',
        msg: acceptMsg,
        streaming: true,
      })

      content.value.push(text)
    }
    else {
      const newContent = [...content.value]
      newContent[lastIndex] = {
        ...newContent[lastIndex],
        content: newContent[lastIndex].content + acceptMsg,
      }
      content.value = newContent // 通过数组替换触发更新
    }
  }

  function resetAi() {
    console.log('重置ai---resetAi')

    content.value = []
    isAiMessageEnd.value = false
    isStreaming.value = false
  }

  return {
    loading,
    chatSSEClientRef,
    modelName,
    content,
    isAiMessageEnd,
    isStreaming,
    message,
    startChat,
    stopChat,
    onStart,
    onError,
    onSuccess,
    onFinish,
    hotUpdate,
    resetAi,
  }
}
/**
 * 微信小程序专用 - 格式化流数据
 */
export function wxExtractStreamContent(data: string): { content: string, reasoningContent: string, id: string } {
  if (!data) {
    return { content: '', reasoningContent: '', id: '' }
  }

  // 处理每一行并提取信息
  const result = data
    .split('\n') // 按行分割
    .filter((line: string) => line.startsWith('data:')) // 只保留以 'data:' 开头的行
    .map((line: string) => line.replace(/^data:\s*/, '')) // 移除 'data:' 和首尾空格
    .filter((jsonStr: string) => jsonStr !== '[DONE]') // 排除 '[DONE]' 的行 表示结束
    .map((jsonStr: string) => {
      try {
        const obj = JSON.parse(jsonStr)
        const delta = obj.choices?.[0]?.delta || {}
        return {
          content: delta.content || '',
          reasoningContent: delta.reasoning_content || '',
          id: obj.id || '',
        }
      }
      catch (e) {
        console.error('JSON 解析失败:', jsonStr, e)
        return { content: '', reasoningContent: '', id: '' } // 保持与原错误处理一致
      }
    })
    // 合并所有块的信息
    .reduce(
      (acc, curr) => {
        acc.content += curr.content
        acc.reasoningContent += curr.reasoningContent
        // 仅保留第一个非空的 id
        if (curr.id && !acc.id) {
          acc.id = curr.id
        }
        return acc
      },
      { content: '', reasoningContent: '', id: '' },
    )

  // 对最终内容做格式化处理

  return result
}

/**
 * @description app专用 - 格式化流数据
 * @param data 流数据 - {"choices":[{"delta":{"content":"我可以","role":"assistant"},"index":0}],"created":1741223276,"id":"021741223274929ff303ac16ece080358e099ce5c58d82c6d6863","model":"deepseek-r1-250120","service_tier":"default","object":"chat.completion.chunk","usage":null}
 */
export function appExtractStreamContent(data: any): { content: string, reasoningContent: string, id: string } {
  if (!data) {
    return { content: '', reasoningContent: '', id: '' }
  }
  const ss = '1'
  ss.includes

  const obj = JSON.parse(data)
  const delta = obj.choices[0].delta || {}
  const content = delta.content || ''
  const reasoningContent = delta.reasoning_content || ''
  const id = obj.id || ''

  return {
    content,
    reasoningContent,
    id,
  }
}
