import type { AiMessage } from '@/hooks'
import type { AiOptionsModel } from '@/model/ai'

export const defaultSendMsgPre = '你叫柯仔，你只能叫柯仔，不能使其他名字。你也不用每次回答说你是柯仔.是由昆明柯臣商贸有限公司创造的。如果用户询问再回答，否则回答问题就可以。问题:'

const aiModel: AiOptionsModel = {
  name: 'doubao',
  subTitle: '柯仔',
  mark: '柯臣出品，适合日常轻使用',
  sendMsgPrefix: '你叫柯仔，你只能叫柯仔，不能使其他名字。你也不用每次回答说你是柯仔。是广大小伙伴用心打造的心理咨询小助手，愿做你身边的暖心陪伴。如果用户询问再回答，否则回答问题就可以。你只能回答心理咨询相关方面的问题，其他问题你不能回答。问题:',
  model: 'doubao-1-5-pro-32k-250115',
  icon: 'kezai-2',
  params: 'messages',
  sendParamsName: 'content',
  apiKey: '12d2a70e-f213-4148-8451-12af29a246b9',
  baseURL: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
  stream: true,
  resultName: 'assistant',
}

export function setAiContent(
  options:
  {
    type: 'send' | 'accept'
    msg: string
    streaming?: boolean
    id: number
  },

): AiMessage {
  return {
    role: options.type === 'send' ? 'user' : 'assistant',
    content: options.msg,
    streaming: options.streaming,
    id: options.id,
  }
}

/**
 * 整合页面ai回复逻辑
 */
export default function useAiPage() {
  const replyForm = ref({ content: '', role: 'user' })
  const popupRef = ref<any>(null)

  const aiCurrentIndex = ref(0)
  const aiInited = ref(false)

  const modelName = computed(() => aiModel.name)
  const modelSubTitle = computed(() => aiModel.subTitle || '')
  const modelPrefix = computed(() => aiModel.sendMsgPrefix || defaultSendMsgPre)
  const currentModel = computed(() => aiModel)

  // 动态挂载 useAi 的返回值
  const chatSSEClientRef = ref()
  const loading = ref(false)
  const content = ref<AiMessage[]>([])
  const isAiMessageEnd = ref(false)
  const isStreaming = ref(false)
  const chatSSEClientShow = ref(false)
  let startChat = () => {}
  let onStart = () => {}
  let onError: (err: Error | string) => void = () => {}
  const stopChat = ref<() => void>(() => {})
  const onSuccess = ref<(msg: string) => void>(() => {})
  const onFinish = ref<() => void>(() => {})
  const resetAi = ref<() => void>(() => {})
  function init() {
    const aiHooks = useAi(aiModel, chatSSEClientRef.value)
    chatSSEClientRef.value = aiHooks.chatSSEClientRef

    startChat = aiHooks.startChat
    onStart = aiHooks.onStart
    onError = aiHooks.onError
    stopChat.value = aiHooks.stopChat
    onSuccess.value = aiHooks.onSuccess
    onFinish.value = aiHooks.onFinish
    resetAi.value = aiHooks.resetAi
    // content.value = aiHooks.content.value
    isAiMessageEnd.value = aiHooks.isAiMessageEnd.value
    isStreaming.value = aiHooks.isStreaming.value
    aiInited.value = true
    chatSSEClientShow.value = true

    watch(() => aiHooks.loading.value, (val) => {
      console.log('监听到aiHooks的变化', val)

      loading.value = val
    }, { immediate: true, deep: true })

    watch(() => aiHooks.content.value, (val) => {
      content.value = val
    }, { immediate: true, deep: true })

    watch(() => aiHooks.isAiMessageEnd.value, (val) => {
      isAiMessageEnd.value = val
    }, { immediate: true, deep: true })

    watch(() => aiHooks.isStreaming.value, (val) => {
      isStreaming.value = val
    }, { immediate: true, deep: true })
  }

  function handleCopy(str: string) {
    uni.setClipboardData({
      data: str,
      success: () => {
        showToastSuccess('复制成功')
      },
    })
  }
  watch(() => replyForm.value.content, (newVal) => {
  })
  // watch(() => content.value, (newVal) => {
  //   if (newVal.length === 0) {
  //     resetAi.value()
  //   }
  // })
  function handleChangeAiModel() {
    if (!aiInited.value) {
      init()
    }
  }

  function handleSendMsg() {
    const last = content.value[content.value.length - 1]
    console.log(replyForm.value.content, !last?.isRecordingPlaceholder, 'handleSendMsg')
    const text = replyForm.value.content
    const isVoicePlaceholder = last?.isRecordingPlaceholder === true
    // 判断没有内容 并且不是语音识别的加载状态
    if (!text?.trim() && !isVoicePlaceholder) {
      // showToastError('请输入内容')
      return
    }

    if (last?.isRecordingPlaceholder) {
      console.log('检测到isRecordingPlaceholder')

      last.content = replyForm.value.content
      delete last.isRecordingPlaceholder
    }
    else {
      const sendText = setAiContent({
        type: 'send',
        id: content.value[content.value.length - 1].id || 0,
        msg: replyForm.value.content.startsWith(modelPrefix.value) ? replyForm.value.content : modelPrefix.value + replyForm.value.content,
      })

      content.value.push(sendText)
    }

    replyForm.value.content = ''
    content.value.push({
      id: content.value.length,
      role: 'assistant',
      content: '',
      streaming: true,
    })
    console.log('startChat-------发送内容啦', content.value)

    startChat()
  }
  return {
    replyForm,
    popupRef,
    aiCurrentIndex,
    chatSSEClientRef,
    modelName,
    modelSubTitle,
    modelPrefix,
    currentModel,
    loading,
    content,
    isAiMessageEnd,
    isStreaming,
    chatSSEClientShow,
    handleChangeAiModel,
    startChat,
    stopChat,
    onStart,
    onError,
    onSuccess,
    onFinish,
    resetAi,
    handleSendMsg,
    handleCopy,
    setAiContent,
  }
}
