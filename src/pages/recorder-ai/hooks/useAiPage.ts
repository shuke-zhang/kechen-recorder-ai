import type { AiMessage } from '@/hooks'
import { aiModelList, setAiContent } from '@/pages/ai/const'

export default function useAiPage(height: string) {
  const replyForm = ref({ content: '', role: 'user' })
  const popupVisible = ref(false)
  const popupRef = ref<any>(null)

  const aiNameList = aiModelList.map(item => item.name || '')
  const aiModelInstanceList = aiModelList.map(item => ({ ...item, messages: [] }))

  const aiCurrentIndex = ref(0)
  const aiInited = ref(false)

  const aiPageContent = computed(() => ({
    'min-height': `calc(100vh - ${height} - 120rpx)`,
  }))
  const aiScrollView = computed(() => ({
    height: `calc(100vh - ${height} - 120rpx - 40rpx)`,
  }))
  const modelName = computed(() => aiModelList[aiCurrentIndex.value]?.name || '')
  const currentModel = computed(() => aiModelList[aiCurrentIndex.value])

  // 动态挂载 useAi 的返回值
  const chatSSEClientRef = ref()
  const loading = ref(false)
  const content = ref<AiMessage[]>([])
  const isAiMessageEnd = ref(false)
  const isStreaming = ref(false)
  const chatSSEClientShow = ref(false)
  let startChat = () => {}
  let stopChat = () => {}
  let onStart = () => {}
  let onError: (err: Error | string) => void = () => {}
  const onSuccess = ref<(msg: string) => void>(() => {})
  const onFinish = ref<() => void>(() => {})

  function init() {
    const model = aiModelList[aiCurrentIndex.value]
    if (!model)
      return

    const aiHooks = useAi(model, chatSSEClientRef.value)
    chatSSEClientRef.value = aiHooks.chatSSEClientRef

    startChat = aiHooks.startChat
    stopChat = aiHooks.stopChat
    onStart = aiHooks.onStart
    onError = aiHooks.onError
    onSuccess.value = aiHooks.onSuccess
    onFinish.value = aiHooks.onFinish
    loading.value = aiHooks.loading.value
    // content.value = aiHooks.content.value
    isAiMessageEnd.value = aiHooks.isAiMessageEnd.value
    isStreaming.value = aiHooks.isStreaming.value
    aiInited.value = true
    chatSSEClientShow.value = true

    watch(() => loading.value, (val) => {
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

  function handleToggle() {
    popupVisible.value = true
  }

  function handleCopy(str: string) {
    uni.setClipboardData({
      data: str,
      success: () => {
        showToastSuccess('复制成功')
      },
    })
  }

  function handleChangeAiModel(model: string) {
    const index = aiModelList.findIndex(item => item.name === model)

    if (index === -1) {
      console.warn(`找不到模型名 ${model}，handleChangeAiModel 被跳过`)
      return
    }

    aiCurrentIndex.value = index

    if (!aiInited.value) {
      init()
    }

    popupVisible.value = false
  }

  function handleSendMsg() {
    const last = content.value[content.value.length - 1]
    if (!replyForm.value.content && !last?.isRecordingPlaceholder) {
      return showToast('请输入内容')
    }
    if (!replyForm.value.content.trim() && !last?.isRecordingPlaceholder) {
      return showToastError('请输入问题')
    }

    if (last?.isRecordingPlaceholder) {
      last.content = replyForm.value.content
      delete last.isRecordingPlaceholder
    }
    else {
      const sendText = setAiContent({
        type: 'send',
        msg: replyForm.value.content,
        modeName: modelName.value || '',
      })

      content.value.push(sendText)
    }

    replyForm.value.content = ''
    content.value.push({
      role: 'assistant',
      content: '',
      streaming: true,
    })
    startChat()
  }
  return {
    replyForm,
    popupRef,
    aiNameList,
    aiModelInstanceList,
    popupVisible,
    aiPageContent,
    aiScrollView,
    aiCurrentIndex,
    chatSSEClientRef,
    modelName,
    currentModel,
    loading,
    content,
    isAiMessageEnd,
    isStreaming,
    chatSSEClientShow,
    handleToggle,
    handleChangeAiModel,
    startChat,
    stopChat,
    onStart,
    onError,
    onSuccess,
    onFinish,
    handleSendMsg,
    handleCopy,
    setAiContent,
  }
}
