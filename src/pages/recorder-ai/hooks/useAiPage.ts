import type { AiMessage } from '@/hooks'
import { aiModelList, setAiContent } from '@/pages/ai/const'
import { useAiStore } from '@/store/modules/ai'

const defaultSendMsgPre = '你叫柯仔，你只能叫柯仔，不能使其他名字。你也不用每次回答说你是柯仔.是由昆明柯臣商贸有限公司创造的。如果用户询问再回答，否则回答问题就可以，问题:'
/**
 * 整合页面ai回复逻辑
 */
export default function useAiPage(height: string) {
  const replyForm = ref({ content: '', role: 'user' })
  const popupVisible = ref(false)
  const popupRef = ref<any>(null)
  const aiStore = useAiStore()

  const aiNameList = aiModelList.map(item => item.name || '')
  const aiModelInstanceList = aiModelList.map(item => ({ ...item, messages: [] }))

  const aiCurrentIndex = ref(0)
  const aiInited = ref(false)

  const aiPageContent = computed(() => ({
    // height: `calc(100vh - ${height} - 120rpx)`,
    height: '100vh',
  }))
  const aiScrollView = computed(() => ({
    height: `calc(100vh - ${height} - 120rpx - 40rpx)`,
  }))
  const modelName = computed(() => aiModelList[aiCurrentIndex.value]?.name || '')
  const modelSubTitle = computed(() => aiModelList[aiCurrentIndex.value]?.subTitle || '')
  const modelPrefix = computed(() => aiModelList[aiCurrentIndex.value]?.sendMsgPrefix || defaultSendMsgPre)
  const currentModel = computed(() => aiModelList[aiCurrentIndex.value])

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
    const model = aiModelList[aiCurrentIndex.value]
    if (!model)
      return

    const aiHooks = useAi(model, chatSSEClientRef.value)
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
  watch(() => replyForm.value.content, (newVal) => {
  })
  // watch(() => content.value, (newVal) => {
  //   if (newVal.length === 0) {
  //     resetAi.value()
  //   }
  // })
  function handleChangeAiModel() {
    const modelName: typeof aiModelList[number]['name'] = aiStore.currentAiModel
    console.log('modelName^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^', modelName)

    const index = aiModelList.findIndex(item => item.name === modelName)

    if (index === -1) {
      console.warn(`找不到模型名 ${modelName}，handleChangeAiModel 被跳过`)
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
    console.log(replyForm.value.content, !last?.isRecordingPlaceholder, 'handleSendMsg')
    const text = replyForm.value.content
    const isVoicePlaceholder = last?.isRecordingPlaceholder === true
    // 判断没有内容 并且不是语音识别的加载状态
    if (!text?.trim() && !isVoicePlaceholder) {
      return showToastError('请输入内容')
    }

    if (last?.isRecordingPlaceholder) {
      console.log('检测到isRecordingPlaceholder')

      last.content = replyForm.value.content
      delete last.isRecordingPlaceholder
    }
    else {
      const sendText = setAiContent({
        type: 'send',
        msg: modelPrefix.value + replyForm.value.content,
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
    console.log('startChat-------发送内容啦', content.value)

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
    modelSubTitle,
    modelPrefix,
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
    resetAi,
    handleSendMsg,
    handleCopy,
    setAiContent,
  }
}
