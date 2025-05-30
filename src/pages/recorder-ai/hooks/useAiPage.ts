import { aiModelList, setAiContent } from '@/pages/ai/const'

export default function useAiPage(height: string) {
  const {
    chatSSEClientRef,
    modelName,
    loading,
    content,
    isAiMessageEnd,
    isStreaming,
    startChat,
    stopChat,
    onStart,
    onError,
    onSuccess,
    onFinish,
  } = useAi(aiModelList[1])
  const replyForm = ref({ content: '你是谁', role: 'user' })
  const currentModel = computed(() => aiModelList.find(item => item.name === modelName.value))
  // watch(() => replyForm.value.content, (val) => {
  //   if (val && val.trim() !== '') {
  //     bgUrl.value = `/static/images/aiPageBg.gif?t=${Date.now()}`
  //   }
  //   else {
  //     bgUrl.value = `/static/images/aiPageBg-quiet.png`
  //   }
  //   console.log('bgUrl', bgUrl.value)
  // }, { immediate: true })
  /**
   * ai 页面内容样式
   * ${getStatusBarHeight() + NAV_BAR_HEIGHT + 1}px 顶部导航栏高度 + 1px 底部安全区域高度
   * 120rox 底部发送按钮高度
   */
  const aiPageContent = computed(() => {
    return {
      'min-height': `calc(100vh - ${height} - 120rpx)`,
    }
  })
  const aiScrollView = computed(() => {
    return {
      height: `calc(100vh - ${height} - 120rpx - 40rpx)`,
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
  const popupRef = ref<any>(null)

  function handleToggle() {
    popupVisible.value = true
    console.log('toggle')
  }
  /**
   * @description 复制内容
   */
  function handleCopy(str: string) {
    uni.setClipboardData({
      data: str,
      success: () => {
        showToastSuccess('复制成功')
      },
    })
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
    const last = content.value[content.value.length - 1]

    if (!replyForm.value.content && !last?.isRecordingPlaceholder) {
      return showToast('请输入内容')
    }

    if (!replyForm.value.content.trim() && !last?.isRecordingPlaceholder) {
      return showToastError('请输入问题')
    }
    if (loading.value) {
      return showToast('请等待上个回答完成')
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
    aiScrollView,
    aiCurrentIndex,
    chatSSEClientRef,
    modelName,
    currentModel,
    loading,
    /** ai返回的结果 */
    content,
    isAiMessageEnd,
    isStreaming,
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
