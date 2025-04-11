import { aiModelList, setAiContent } from '@/pages/ai/const'

export default function useAiPage(height: string) {
  const {
    chatSSEClientRef,
    modelName,
    loading,
    content,
    startChat,
    stopChat,
    onStart,
    onError,
    onSuccess,
    onFinish,
  } = useAi(aiModelList[0])
  /**
   * ai 页面内容样式
   * ${getStatusBarHeight() + NAV_BAR_HEIGHT + 1}px 顶部导航栏高度 + 1px 底部安全区域高度
   * 120rox 底部发送按钮高度
   */
  const aiPageContent = computed(() => {
    return {
      height: `calc(100vh - ${height} -  120rpx)`,
      backgroundImage: `url(/static/images/aiPageBg.gif)`,
      backgroundPosition: 'center -50rpx',
      backgroundRepeat: 'no-repeat',
      backgroundSize: '80%', // 缩小背景图
    }
  })
  const popupVisible = ref(false)

  /** 模型名字列表 */
  const aiNameList = aiModelList.map(item => item.name || '')
  /** ai模型实例列表 */
  const aiModelInstanceList = aiModelList.map((item) => {
    return { ...item, messages: [] }
  })
  const aiCurrentIndex = ref(0)
  const replyForm = ref({ content: '', role: 'user' })
  const popupRef = ref<any>(null)

  function handleToggle() {
    popupVisible.value = true
    console.log('toggle')
  }

  /**
   * 切换 AI 模型
   */
  function handleChangeAiModel(index: number) {
    aiCurrentIndex.value = index
    popupVisible.value = false
  }
  /**
   * 发送消息
   */
  function handleSendMsg() {
    if (!replyForm.value.content) {
      return showToast('请输入内容')
    }

    if (loading.value) {
      return showToast('请等待上个回答完成')
    }

    if (!replyForm.value.content.trim()) {
      return showToastError('请输入问题')
    }
    const last = content.value[content.value.length - 1]
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
    // const sendText = setAiContent({
    //   type: 'send',
    //   msg: replyForm.value.content,
    //   modeName: modelName.value || '',
    // })
    // content.value?.push(sendText)
    // 添加AI的临时占位消息
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
    aiCurrentIndex,
    chatSSEClientRef,
    modelName,
    loading,
    /** ai返回的结果 */
    content,
    handleToggle,
    handleChangeAiModel,
    startChat,
    stopChat,
    onStart,
    onError,
    onSuccess,
    onFinish,
    handleSendMsg,
    setAiContent,
  }
}
