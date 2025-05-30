<!-- eslint-disable ts/ban-ts-comment -->
<!-- eslint-disable import/no-duplicates -->
 <!-- #ifdef APP-PLUS -->
<script module="recorderCore" lang="renderjs">
// @ts-ignore
import Recorder from 'recorder-core'
import 'recorder-core/src/extensions/buffer_stream.player.js'

import RecordApp from 'recorder-core/src/app-support/app'
// import '../../../../uni_modules/Recorder-UniCore/app-uni-support.js'
import '../../../uni_modules/Recorder-UniCore/app-uni-support.js'
import 'recorder-core/src/engine/pcm'
import 'recorder-core/src/extensions/waveview'
// @ts-ignore

export default {
  data() {
    return {
    }
  },

  mounted() {
    // App的renderjs必须调用的函数，传入当前模块this
    RecordApp.UniRenderjsRegister(this)
  },
  methods: {
    // 这里定义的方法，在逻辑层中可通过 RecordApp.UniWebViewVueCall(this,'this.xxxFunc()') 直接调用
    // 调用逻辑层的方法，请直接用 this.$ownerInstance.callMethod("xxxFunc",{args}) 调用，二进制数据需转成base64来传递
  },
}
</script>
<!-- #endif -->

<script setup lang='ts'>
// eslint-disable-next-line import/first, import/order
import type StreamPlayer from '@/components/StreamPlayer/StreamPlayer.vue'

// eslint-disable-next-line import/first, import/order
import { NAV_BAR_HEIGHT, getStatusBarHeight } from '@/components/nav-bar/nav-bar'
// eslint-disable-next-line import/first, import/no-named-default, import/no-duplicates
import { default as RecorderInstance } from 'recorder-core'
// eslint-disable-next-line import/first, import/no-named-default, import/no-duplicates
import { default as RecordAppInstance } from 'recorder-core/src/app-support/app'
// eslint-disable-next-line import/first
import RecorderInput from './recorder-input.vue'
// eslint-disable-next-line import/first
import useRecorder from './hooks/useRecorder'
// eslint-disable-next-line import/first
import useAiPage from './hooks/useAiPage'
// eslint-disable-next-line import/first
import useAutoScroll from './hooks/useAutoScroll'
// eslint-disable-next-line import/first
import SpeechSynthesisCore from './xunfei/speech-synthesis-core'
// eslint-disable-next-line import/first
import { useMultiClickTrigger } from '@/hooks'
// eslint-disable-next-line import/first
import { doubaoSpeechSynthesis } from '@/api/audio'
// eslint-disable-next-line import/first, import/no-duplicates
import '../../../uni_modules/Recorder-UniCore/app-uni-support.js'
/** 需要编译成微信小程序时，引入微信小程序支持文件 */
// #ifdef MP-WEIXIN
// eslint-disable-next-line import/first
import 'recorder-core/src/app-support/app-miniProgram-wx-support.js'
// #endif

// #ifdef H5 || MP-WEIXIN
// eslint-disable-next-line import/first, import/no-duplicates
import 'recorder-core/src/engine/pcm'
// eslint-disable-next-line import/first, import/no-duplicates
import 'recorder-core/src/extensions/waveview'
// #endif
const vueInstance = getCurrentInstance()?.proxy as any // 必须定义到最外面，getCurrentInstance得到的就是当前实例this
const pageHeight = computed(() => {
  return `${getStatusBarHeight() + NAV_BAR_HEIGHT + 1}px`
})
/**
 * 音频是否正在播放
 */
const isStreamPlaying = ref(false)
const router = useRouter()
/**
 * 音频播放组件实例
 */
const streamPlayerRef = ref<InstanceType<typeof StreamPlayer>>()
const { handleMultiClick } = useMultiClickTrigger({
  onTrigger: () => {
    if (__DEV__) {
      router.push('/pages/test/index')
    }
  },
})
const {
  chatSSEClientRef,
  loading,
  content,
  isAiMessageEnd,
  modelName,
  currentModel,
  replyForm,
  popupVisible,
  aiPageContent,
  aiScrollView,
  aiNameList,
  aiCurrentIndex,
  onStart,
  onError,
  onSuccess,
  onFinish,
  handleChangeAiModel,
  handleSendMsg,
  handleCopy,
  setAiContent,
} = useAiPage(pageHeight.value)

const {
  textRes,
  isFocus,
  iseRecorderTouchStart,
  isRecorderClose,
  isRunning,
  isFirstVisit,
  showRecordingButton,
  recReq,
  handleRecorderClose,
  handleShowRecorder,
  handleRecorderTouchStart,
  handleRecorderTouchEnd,
  handleRecorderConfirm,
} = useRecorder({
  RecordApp: RecordAppInstance,
  Recorder: RecorderInstance,
  vueInstance,
})

const {
  scrollTop,
  handleScroll,
  resetAndScrollToBottom,
  initHeights,
  scrollToBottom,
  scrolltolower,
} = useAutoScroll({
  contentList: content,
  vueInstance,
  scrollViewSelector: '.scroll-view',
  scrollContentSelector: '.scroll-content',
  immediate: true,
})

/**
 * 初始化语音合成
 */
const SpeechSynthesis = new SpeechSynthesisCore({
  APPID: 'f9b52f87',
  APISecret: 'ZDVkYzU5YmFhZmNlODVkM2RlNDMyNDhl',
  APIKey: '287ae449056d33e0f4995f480737564a',
  url: 'wss://tts-api.xfyun.cn/v2/tts',
  host: 'tts-api.xfyun.cn',
})
SpeechSynthesis.on('audio', (res: ArrayBuffer) => {
  currBuffer.value = res
})

const scrollViewRef = ref(null)
const animatedDots = ref('')
let dotTimer: NodeJS.Timeout | null = null
const currentIndex = ref<number | null>(null)
const currBuffer = ref()
const isAudioPlaying = ref(false)
const tempBuffers = ref<{ audio_data: string, text: string }[]>([])
const tempFormattedTexts = ref<string[]>([])
const streamData = ref<{
  text: string
  buffer: string
  id: number
}>()
/**
 * 是否自动播放
 */
const isAutoPlayAiMessage = ref(true)
// 全局变量存储格式化器实例和当前处理的消息索引
let textFormatter: ReturnType<typeof createTextFormatter> | null = null
let lastProcessedIndex: number | null = null
/**
 * ai内容自动播放音频
 */
async function autoPlayAiMessage(text: string, index: number) {
  if (!isAutoPlayAiMessage.value)
    return
  if (!text || text.trim() === '')
    return
  // 如果正在播放，停止当前播放
  if (isStreamPlaying.value) {
    streamPlayerRef.value?.onStreamStop()
  }
  // 设置当前播放的消息索引
  currentIndex.value = index

  // 如果是新的消息，重置格式化器
  if (!textFormatter || currentIndex.value !== lastProcessedIndex) {
    textFormatter = createTextFormatter()
    lastProcessedIndex = currentIndex.value
  }
  // 开始语音合成并播放
  // SpeechSynthesis.convertTextToSpeech(text)
  // const formatter = createTextFormatter()
  const longText = textFormatter.processText(text)

  // 处理文本 下面是对接后端的音频 采用接口的方式
  if (longText.length > 0) {
    tempFormattedTexts.value.push(longText)

    // console.log(`longText`, longText)
    doubaoSpeechSynthesis({
      text: longText,
      id: tempFormattedTexts.value.findIndex(t => t === longText) || 0,
    }).then((res) => {
      const { audio_data, text, id } = res.data
      streamData.value = {
        buffer: audio_data,
        text,
        id,
      }
      console.log('streamData.value ', streamData.value)
      // ai返回的消息结束了
      if (isAiMessageEnd.value) {
        tempFormattedTexts.value = []
      }
      isAudioPlaying.value = true
    }).catch((error) => {
      console.log(error, '错误')
    })
  }

  isStreamPlaying.value = true
}
/**
 * 发送消息确认按钮
 */
function handleConfirm() {
  tempBuffers.value = []
  handleSendMsg()
}
// 创建文本格式化器
function createTextFormatter() {
  let buffer = '' // 累加的文字缓冲区
  let lastProcessedText = '' // 上次处理的完整文本，用于计算增量

  const punctuationMarks = ['，', '。', '！', '；', '？'] // 目标标点符号

  // 检查是否包含标点符号
  function containsPunctuation(text: string): { hasPunctuation: boolean, index: number, punctuation: string } {
    for (let i = 0; i < text.length; i++) {
      if (punctuationMarks.includes(text[i])) {
        return { hasPunctuation: true, index: i, punctuation: text[i] }
      }
    }
    return { hasPunctuation: false, index: -1, punctuation: '' }
  }

  // 处理文本片段 - 传入的是完整的累积文本
  function processText(fullText: string): string {
    // 计算增量文本
    let incrementalText = ''
    if (fullText.length > lastProcessedText.length && fullText.startsWith(lastProcessedText)) {
      incrementalText = fullText.substring(lastProcessedText.length)
    }
    else if (fullText !== lastProcessedText) {
      // 如果不是增量更新，重置缓冲区并处理全新文本
      buffer = ''
      incrementalText = fullText
    }
    else {
      // 文本没有变化，返回空数组
      return ''
    }

    lastProcessedText = fullText

    let results = ''
    buffer += incrementalText

    while (buffer.length > 0) {
      const punctuationInfo = containsPunctuation(buffer)

      if (punctuationInfo.hasPunctuation) {
        // 找到标点符号
        const textWithPunctuation = buffer.substring(0, punctuationInfo.index + 1)
        const textLength = textWithPunctuation.replace(/[^\u4E00-\u9FA5\w]/g, '').length // 只计算中文和字母数字

        if (punctuationInfo.punctuation === '。' || textLength >= 5) {
          results = textWithPunctuation
          buffer = buffer.substring(punctuationInfo.index + 1)
        }
        else {
          // 不满足5个字，继续寻找下一个标点符号
          const remainingText = buffer.substring(punctuationInfo.index + 1)
          const nextPunctuationInfo = containsPunctuation(remainingText)

          if (nextPunctuationInfo.hasPunctuation) {
            // 找到下一个标点符号
            const fullText = buffer.substring(0, punctuationInfo.index + 1 + nextPunctuationInfo.index + 1)
            results = fullText
            buffer = buffer.substring(punctuationInfo.index + 1 + nextPunctuationInfo.index + 1)
          }
          else {
            // 没有找到下一个标点符号，保持在缓冲区等待更多文本
            break
          }
        }
      }
      else {
        // 没有标点符号
        const textLength = buffer.replace(/[^\u4E00-\u9FA5\w]/g, '').length

        if (textLength >= 20) {
          // 达到20个字，直接返回前20个有效字符对应的原文
          let charCount = 0
          let cutIndex = 0

          for (let i = 0; i < buffer.length; i++) {
            if (/[\u4E00-\u9FA5\w]/.test(buffer[i])) {
              charCount++
              if (charCount === 20) {
                cutIndex = i + 1
                break
              }
            }
          }

          if (cutIndex > 0) {
            results = buffer.substring(0, cutIndex)
            buffer = buffer.substring(cutIndex)
          }
          else {
            break
          }
        }
        else {
          // 既没有标点符号也不足20个字，等待更多文本
          break
        }
      }
    }

    return results
  }

  // 获取剩余缓冲区内容（用于流结束时）
  function flush(): string[] {
    const results: string[] = []
    if (buffer.trim()) {
      results.push(buffer)
      buffer = ''
    }
    return results
  }

  // 重置格式化器
  function reset() {
    buffer = ''
    lastProcessedText = ''
  }

  return {
    processText,
    flush,
    reset,
    getBuffer: () => buffer,
  }
}

function handleTouchStart() {
  if (loading.value) {
    return showToast('请等待上个回答完成')
  }

  textRes.value = ''
  handleRecorderTouchStart()
  // 开始录音，插入一个临时消息（占位）
  const sendText = setAiContent({
    type: 'send',
    msg: '', // 空消息作为占位
    modeName: modelName.value || '',
  })
  sendText.isRecordingPlaceholder = true // ✅ 标记占位消息

  content.value?.push(sendText)
  nextTick(() => {
    resetAndScrollToBottom()
  })
}

function handleTouchEnd() {
  handleRecorderTouchEnd().then(async () => {
    if (isRecorderClose.value) {
      // 用户上滑取消
      removeLastUserMessage('user')
    }
    else {
      // 用户正常抬起
      if (textRes.value && textRes.value.trim() !== '') {
        // 有识别结果才发送
        const lastIndex = content.value.length - 1
        if (content.value[lastIndex]?.role === 'user') {
          content.value[lastIndex].content = textRes.value
        }
        handleConfirm()
        await nextTick()
        resetAndScrollToBottom() // 强制滚动到底部
      }
      else {
        console.log('无识别结果，删除最后一条占位消息')
        removeLastUserMessage('user')
      }
    }
  }).finally(() => {
    iseRecorderTouchStart.value = false
  })
}

/**
 * ai消息点击语音
 * @warning 由于语音点击之后播放音频会有延迟， 所以在这儿直接设置状态
 */
const handleRecorder = debounce((text: string, index: number) => {
  console.log('点击语音按钮')

  // 当前已经在播放此条消息
  if (currentIndex.value === index && isStreamPlaying.value) {
    console.log('🟡 再次点击同一条，执行停止')
    streamPlayerRef.value?.onStreamStop()
    currentIndex.value = null
    return
  }

  // 切换了消息
  if (isStreamPlaying.value) {
    console.log('🟥 切换消息播放，先停止')
    streamPlayerRef.value?.onStreamStop()
  }

  // ✅ 开始新的播放
  console.log('🟢 开始播放新消息')
  currentIndex.value = index
  isStreamPlaying.value = true
  doubaoSpeechSynthesis({
    text,
    id: 0,
  }).then((res) => {
    console.log('接口请求成功')
    const { audio_data, text, id } = res.data
    streamData.value = {
      buffer: audio_data,
      text,
      id,
    }
  })
}, 500)

/**
 * 语音播放真正的开始
 */
function onStreamPlayStart() {
  isAudioPlaying.value = true
}

/**
 * 语音播放结束
 */
function onStreamPlayEnd() {
  isStreamPlaying.value = false
  isAudioPlaying.value = false
}
/**
 * 语音播放停止
 */
function onStreamStop() {
  isStreamPlaying.value = false
  isAudioPlaying.value = false
}

/**
 * 根据角色类型删除最后一条消息
 */
function removeLastUserMessage(type: string) {
  const lastIndex = [...content.value].reverse().findIndex(item => item.role === type)
  if (lastIndex !== -1) {
    const realIndex = content.value.length - 1 - lastIndex
    content.value.splice(realIndex, 1)
  }
}

function handleClearContent() {
  if (content.value.length === 0) {
    return showToast('当前对话为空')
  }
  if (loading.value) {
    return showToast('请等待回答完成, 再清空对话')
  }

  showModal('是否清空对话？').then(() => {
    content.value = []
    // 停止播放
    if (isStreamPlaying.value) {
      SpeechSynthesis.stop()
      streamPlayerRef.value?.onStreamStop()
    }
    // 重置格式化器
    if (textFormatter) {
      textFormatter.reset()
    }
  })
}

// 添加一个监听最后一条消息内容的变化（对于流式输出非常有用）
watch(
  () => content.value[content.value.length - 1]?.content,
  () => {
    if (content.value.length > 0) {
      nextTick(() => {
        scrollToBottom()
      })
      // 检查最后一条消息是否是AI的回复
      const lastMessage = content.value[content.value.length - 1]
      // console.log('内容变化ai回复', lastMessage)
      if (lastMessage?.role === 'assistant' && lastMessage?.streaming) {
        // 自动播放
        autoPlayAiMessage(lastMessage.content || '', content.value.length - 1)
      }
    }
  },
)

watch(
  content.value,
  () => {
    nextTick(() => {
      scrollToBottom()
    })
  },
  { deep: true },
)

// 监听语音识别开始和结束
watch(() => isRunning.value, (val: boolean) => {
  if (val) {
    animatedDots.value = '.'
    dotTimer = setInterval(() => {
      animatedDots.value = animatedDots.value.length >= 3 ? '.' : `${animatedDots.value}.`
    }, 500)
  }
  else {
    if (dotTimer)
      clearInterval(dotTimer)
    dotTimer = null
    animatedDots.value = ''
  }
})

watch(() => textRes.value, async (newVal) => {
  await nextTick() // 确保视图更新完成
  replyForm.value.content = newVal as string
})

onMounted(() => {
  (vueInstance as any).isMounted = true
  RecordAppInstance.UniPageOnShow(vueInstance)
  recReq().then((res) => {
    console.log(res, '请求权限允许')
    isFirstVisit.value = false
  }).catch((err) => {
    showToastError(err)
    console.log(err, '请求权限拒绝')
  })

  initHeights()
})

onShow(() => {
  if ((vueInstance as any)?.isMounted) {
    RecordAppInstance.UniPageOnShow(vueInstance)
  }
})
</script>

<template>
  <view>
    <nav-bar :show-back="false">
      <template #right>
        <icon-font :name="isAutoPlayAiMessage ? 'sound' : 'mute'" :color="isAutoPlayAiMessage ? COLOR_PRIMARY : ''" size="40" @click="isAutoPlayAiMessage = !isAutoPlayAiMessage" />
      </template>

      <template #left>
        <icon-font name="clear" color="#E95655" size="40" @click="handleClearContent" />
      </template>
      <text @click="handleMultiClick">
        柯仔AI
      </text>
    </nav-bar>

    <!-- 流式流式ai消息 -->
    <GaoChatSSEClient
      ref="chatSSEClientRef"
      @on-open="onStart"
      @on-error="onError"
      @on-message="onSuccess"
      @on-finish="onFinish"
    />

    <!-- 音频播放组件 -->
    <StreamPlayer
      ref="streamPlayerRef"
      :stream-data="streamData"
      @on-stream-play-start="onStreamPlayStart"
      @on-stream-play-end="onStreamPlayEnd"
      @on-stream-stop="onStreamStop"
    />

    <view :style="aiPageContent">
      <view
        class="absolute top-0 left-0 w-full h-full z-0 flex justify-center pointer-events-none"
        :style="{ 'padding-top': pageHeight }"
      >
        <image
          :src="(isStreamPlaying && isAudioPlaying) ? '/static/images/aiPageBg.gif' : '/static/images/aiPageBg-quiet.png'"
          mode="aspectFit"
          class="aiPageBg-img"
        />
      </view>

      <scroll-view
        ref="scrollViewRef"
        scroll-y
        :scroll-top="scrollTop"
        class=" scroll-view pr-20rpx pl-20rpx  block h-full"
        :scroll-with-animation="true"
        :style="aiScrollView"
        @scroll="handleScroll"
        @scrolltolower="scrolltolower"
      >
        <view class="scroll-content">
          <view v-if="content.length === 0" class="h-full flex justify-end flex-col items-center pb-200rpx pt-500rpx">
            <view>
              <image
                class="ai-img"
                :src="`/static/images/${currentModel?.icon}.png`"
                mode="aspectFill"
              />
            </view>
            <view class="font-size-60rpx mt-20rpx">
              我是{{ modelName }}
            </view>
            <view class="mt-20rpx w-80%">
              我可以帮你搜索、答疑、写作、请在下方输入你的内容~
            </view>
          </view>

          <view v-for="(msg, index) in content" :key="index" class="py-16rpx">
            <!-- 用户消息 -->
            <view v-if="msg.role === 'user'" class=" flex  flex-justify-end opacity-60">
              <view class="message-bubble p-32rpx border-rd-16rpx   bg-#07c160 color-white max-w-80%">
                <text>
                  {{
                    msg.isRecordingPlaceholder
                      ? (textRes || '') + (isRunning && textRes ? animatedDots : '')
                      : Array.isArray(msg.content)
                        ? msg.content[0].text
                        : msg.content
                  }}
                </text>
                <!-- 流式加载动画 -->
                <view v-if="msg.isRecordingPlaceholder && !textRes" class="flex-center">
                  <uni-load-more icon-type="auto" status="loading" :show-text="false" />
                </view>
              </view>
            </view>

            <!-- AI消息（含加载状态） -->
            <view v-else class="flex justify-start opacity-60">
              <Icon-font name="zhipu" class="mt-20rpx mr-10rpx" />
              <view class="flex mt-16rpx mb-16rpx flex-justify-start bg-#ffffff color-#333333 max-w-80% border-rd-16rpx">
                <view
                  class="message-bubble  p-32rpx border-rd-16rpx w-100%"
                  :class="[msg.streaming && !(msg.content && msg.content.length) ? 'flex-center w-120rpx h-120rpx ' : '']"
                >
                  <view v-if="msg.content">
                    <UaMarkdown :source="msg.content" :show-line="false" />
                    <view class="h-2rpx  bg-black-3 my-10rpx" />

                    <view class="flex items-center justify-end ">
                      <view class="border-rd-16rpx size-60rpx bg-#e8ecf5 flex-center" @click="handleCopy(msg.content)">
                        <icon-font name="copy" :color="COLOR_PRIMARY" :size="28" />
                      </view>
                      <view class="border-rd-16rpx size-60rpx  bg-#e8ecf5 flex-center  ml-20rpx" @click="handleRecorder(msg.content, index)">
                        <audio-wave v-if="isStreamPlaying && currentIndex === index" :color="COLOR_PRIMARY" />
                        <icon-font v-else name="sound" :color="COLOR_PRIMARY" :size="28" />
                      </view>
                    </view>
                  </view>
                  <!-- 流式加载动画 -->
                  <view v-if=" msg.streaming && !(msg.content && msg.content.length)" class="flex-center">
                    <uni-load-more icon-type="auto" status="loading" :show-text="false" />
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 统一输入框 -->
    <RecorderInput
      v-model:model-value="replyForm.content"
      v-model:focus="isFocus"
      v-model:show-recording-button="showRecordingButton"
      placeholder="请输入您的问题..."
      is-offset
      class="flex-1"
      btn-text="发送"
      :is-disabled-recorder="loading"
      @recorder-close="handleRecorderClose"
      @show-recorder="handleShowRecorder"
      @recorder-touch-start="handleTouchStart"
      @recorder-touch-end="handleTouchEnd"
      @recorder-confirm="handleRecorderConfirm"
      @confirm="handleConfirm "
    />

    <popup v-model="popupVisible" type="left" :is-mask-click="false">
      <view class="bg-#fff w-400rpx h-100vh py-140rpx px-32rpx">
        <view class="flex flex-1 justify-end mb-60rpx w-full" @click="popupVisible = false">
          <icon-font name="close" size="48" />
        </view>

        <view
          v-for="(item, index) in aiNameList"
          :key="index"
          class="h-80rpx flex justify-between items-center px-16rpx"
          :class="[aiCurrentIndex === index ? 'bg-primary text-white' : '']"
          @click="handleChangeAiModel(index)"
        >
          <text>
            {{ item }}
          </text>
          <icon-font name="right" />
        </view>
      </view>
    </popup>
  </view>
</template>

<style lang="scss">
.message-bubble {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.ai-img {
  width: 160rpx;
  height: 160rpx;
}
</style>

<route lang="json" type="home">
  {
       "style": { "navigationBarTitleText": "录音","navigationStyle": "custom" }
  }
</route>
