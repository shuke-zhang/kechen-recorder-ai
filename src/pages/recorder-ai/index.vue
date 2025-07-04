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

<!-- eslint-disable import/first, import/order, import/no-named-default,import/no-duplicates -->
<script setup lang='ts'>
import type StreamPlayer from '@/components/StreamPlayer/StreamPlayer.vue'
import { NAV_BAR_HEIGHT, getStatusBarHeight } from '@/components/nav-bar/nav-bar'
import { default as RecorderInstance } from 'recorder-core'
import { default as RecordAppInstance } from 'recorder-core/src/app-support/app'
import { useTextFormatter } from './hooks/useTextFormatter'
import RecorderInputAuto from './recorder-input-auto.vue'
import useRecorder from './hooks/useRecorder'
import useAiPage from './hooks/useAiPage'
import useAutoScroll from './hooks/useAutoScroll'
import { useAiCall } from '@/store/modules/ai-call'
import { doubaoSpeechSynthesisFormat } from '@/api/audio'
import '../../../uni_modules/Recorder-UniCore/app-uni-support.js'
import screensaver from './components/screensaver.vue'
/** 需要编译成微信小程序时，引入微信小程序支持文件 */
// #ifdef MP-WEIXIN
import 'recorder-core/src/app-support/app-miniProgram-wx-support.js'
// #endif

// #ifdef H5 || MP-WEIXIN
import 'recorder-core/src/engine/pcm'
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
const router = useRouter<{
  modelName: string
}>()

const aiCall = useAiCall()
/** 主要用于初进页面的语音播报 默认需要两秒后变为true 解决播放器需要初始化的2秒左右的bug */
const initialLoadPending = ref(false)
/**
 * 音频播放组件实例
 */
const streamPlayerRef = ref<InstanceType<typeof StreamPlayer>>()
// const { handleMultiClick } = useMultiClickTrigger({
//   onTrigger: () => {
//     router.push('/pages/test/index', { id: 123 })
//   },
// })

const {
  chatSSEClientRef,
  content,
  isAiMessageEnd,
  loading,
  modelName,
  modelSubTitle,
  modelPrefix,
  currentModel,
  replyForm,
  aiPageContent,
  onSuccess,
  onFinish,
  resetAi,
  stopChat,
  onStart,
  onError,
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

const { processText, textReset } = useTextFormatter()

const scrollViewRef = ref(null)
const animatedDots = ref('')
let dotTimer: NodeJS.Timeout | null = null
const currentIndex = ref<number | null>(null)
const isAudioPlaying = ref(false) // 音频播放真正的开始
const tempBuffers = ref<{ audio_data: string, text: string }[]>([])
const tempFormattedTexts = ref<string[]>([])
const streamData = ref<{
  text: string
  buffer: string
  id: number
}>()
// 是否切换到新的消息进行播放
const isSwitchingNewMessage = ref(false)
/** 控制屏保 */
const isScreensaver = ref(true)
/**
 * 是否自动播放
 */
const isAutoPlayAiMessage = ref(true)
// 全局变量存储格式化器实例和当前处理的消息索引
let lastProcessedIndex: number | null = null
/** 代表当点击了音频小图标时 ，如果此时ai消息还没回复完音频也在播放时为true 否则为false 主要是用于判断ai回复中点击了音频图标后不再需要自动播放 */
const hasUserInterruptedAutoPlay = ref(false)
const lastAiMsgEnd = ref(false)
/** 无操作逻辑 */
const idleTimeout = ref< ReturnType<typeof setTimeout> | null>(null)
const IDLE_DELAY = 10000 // 5秒
const canStartIdleTimer = computed(() => {
  return !isStreamPlaying.value && !loading.value
})

/** 重置定时器 */
function resetIdleTimer() {
  // 若不能启动 idleTimer（因为正在播放或AI正在回复），就清除定时器并返回
  if (isScreensaver.value) {
    console.log('屏保中，不重置定时器')

    return
  }
  console.log('监听到用户操作，重置定时器')

  if (!canStartIdleTimer.value) {
    if (idleTimeout.value)
      clearTimeout(idleTimeout.value)
    return
  }

  // 启动 idle timer
  if (idleTimeout.value)
    clearTimeout(idleTimeout.value)

  idleTimeout.value = setTimeout(() => {
    stopAll()
    isScreensaver.value = true
    // 清空所有内容
    streamData.value = {
      text: '',
      buffer: '',
      id: 0,
    }
    content.value = []
    resetAi.value()
    replyForm.value = { content: '', role: 'user' }
  }, IDLE_DELAY)
}

/** 发送消息确认按钮 */
function onConfirm() {
  resetIdleTimer()
  handleConfirm()
}

/**
 * ai内容自动播放音频
 */
async function autoPlayAiMessage(_text: string, index: number) {
  //
  // if (!isAutoPlayAiMessage.value || hasUserInterruptedAutoPlay.value)
  if (!isAutoPlayAiMessage.value) {
    return
  }

  // if (!isApp)
  //   return
  // 设置当前播放的消息索引
  currentIndex.value = index

  // 如果是新的消息，重置格式化器
  if (currentIndex.value !== lastProcessedIndex) {
    textReset()
    lastProcessedIndex = currentIndex.value
  }
  // 开始语音合成并播放
  const longText = processText({
    text: _text,
    isFullText: false,
    forceFlush: isAiMessageEnd.value,
  })

  // 处理文本 下面是对接后端的音频 采用接口的方式
  if (longText.length > 0) {
    tempFormattedTexts.value.push(longText)

    //  判断是不是新的ai消息
    if (tempFormattedTexts.value.findIndex(t => t === longText) === 0 && !isAiMessageEnd.value) {
      streamPlayerRef.value?.onStreamStop()
    }

    doubaoSpeechSynthesisFormat({
      text: longText,
      id: tempFormattedTexts.value.findIndex(t => t === longText) || 0,
    }, tempFormattedTexts.value.findIndex(t => t === longText) === 0).then((res) => {
      const { audio_buffer, text, id } = res
      streamData.value = {
        buffer: audio_buffer,
        text,
        id,
      }
      // ai返回的消息结束了
      if (isAiMessageEnd.value) {
        tempFormattedTexts.value = []
        hasUserInterruptedAutoPlay.value = false
      }
    }).catch((error) => {
      isStreamPlaying.value = false
      isAudioPlaying.value = false
      console.log(error, '错误')
    })
  }
  isStreamPlaying.value = true
}

/**
 * 屏保触发事件
 */
async function onScreensaverTrigger() {
  isScreensaver.value = false
  resetIdleTimer()
  console.log('进入操作页面')

  if (initialLoadPending.value) {
    streamData.value = {
      buffer: aiCall.callAudioData.audioData,
      text: aiCall.callAudioData.text,
      id: aiCall.callAudioData.id,
    }
    console.log('初始化晚餐播放视频', streamData.value)
  }
  else {
    // 等待 initialLoadPending 为 true 再继续
    try {
      await waitUntil(() => initialLoadPending.value)
      streamData.value = {
        buffer: aiCall.callAudioData.audioData,
        text: aiCall.callAudioData.text,
        id: aiCall.callAudioData.id,
      }
      console.log('等待初始化完成啦')
    }
    catch (e) {
      console.error('等待 initialLoadPending 超时', e)
    }
  }

  handleTouchStart()
}

function waitUntil(conditionFn: () => boolean, interval = 50, timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const timer = setInterval(() => {
      if (conditionFn()) {
        clearInterval(timer)
        resolve()
      }
      else if (Date.now() - start > timeout) {
        clearInterval(timer)
        reject(new Error('waitUntil 超时'))
      }
    }, interval)
  })
}

function userMsgFormat(prefix: string, text: string, isFormat = true) {
  if (!isFormat)
    return text
  const index = text.indexOf(prefix)
  if (index === -1)
    return text // 没有前缀就返回原内容
  return text.slice(index + prefix.length)
}

/**
 * 发送消息确认按钮
 */
async function handleConfirm() {
  streamPlayerRef.value?.onStreamStop()
  tempFormattedTexts.value = []
  tempBuffers.value = []
  removeEmptyMessagesByRole('assistant') // 移除assistant角色的空消息

  //  点击时如果ai消息没有返回完 ，并且正在播放，直接停止
  if ((!isAiMessageEnd.value && loading.value) || isStreamPlaying.value) {
    await stopAll()
    // 停止音频播放
    handleSendMsg()
    return
  }

  handleSendMsg()
}

const startTime = ref(0)
const handleTouchStart = debounce(() => {
  console.log('🟢 开始录音')
  removeEmptyMessagesByRole('assistant')
  startTime.value = Date.now()
  stopAll()
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
}, 300)

/**
 * ai消息点击语音
 * @warning 由于语音点击之后播放音频会有延迟， 所以在这儿直接设置状态
 */
const handleRecorder = debounce((text: string, index: number) => {
  // 如果 AI 消息还在回复中，标记用户中断自动播放
  if (!isAiMessageEnd.value) {
    hasUserInterruptedAutoPlay.value = true
  }
  // 当前已经在播放此条消息
  if (currentIndex.value === index && isStreamPlaying.value) {
    console.log('🟡 再次点击同一条，执行停止')
    streamPlayerRef.value?.onStreamStop()
    currentIndex.value = null
    isStreamPlaying.value = false
    return
  }

  // 如果正在播放且是新的消息，先停止当前播放
  if (currentIndex.value !== null && isStreamPlaying.value) {
    isSwitchingNewMessage.value = true
    console.log('🔴 切换新消息，先停止已播放的消息')
    streamPlayerRef.value?.onStreamStop()
    isStreamPlaying.value = false
  }

  // ✅ 开始新的播放
  console.log('🟢 开始播放新消息')
  isStreamPlaying.value = true
  currentIndex.value = index

  const longTexts = processText({
    text,
    isFullText: true,
  })

  longTexts.forEach((longText, i) => {
    if (longText.trim().length > 0) {
      doubaoSpeechSynthesisFormat({
        text: longText,
        id: i,
      }).then((res) => {
        const { audio_buffer, text, id } = res
        streamData.value = {
          buffer: audio_buffer,
          text,
          id,
        }
      }).catch((e) => {
        console.log('点击时捕获到错误', e)
        isStreamPlaying.value = false
        currentIndex.value = null
      })
    }
  })
}, 500)

/**
 * 语音播放真正的开始
 */
function onStreamPlayStart() {
  isAudioPlaying.value = true
  // 防止由于播放器停止时触发延迟，所以这儿也要设置状态
  isStreamPlaying.value = true
}

/**
 * 语音播放结束
 */
function onStreamPlayEnd() {
  /**
   * 这儿使用  isSwitchingNewMessage 来控制立即更新 isStreamPlaying 的状态的
   * 已知当我前几切换新的消息播放时 ， 会触发该函数，此时会关闭 isStreamPlaying 的状态
   * 此时 isSwitchingNewMessage 的状态就不是在我点击后立即触发了，而是在音频播放时才触发，这会造成观看上的延迟
   * 所以在这儿使用 isSwitchingNewMessage 来控制立即更新 isStreamPlaying 的状态的
   */
  if (isSwitchingNewMessage.value) {
    isSwitchingNewMessage.value = false
  }
  else {
    isStreamPlaying.value = false
    currentIndex.value = null
  }
  isAudioPlaying.value = false
}
/**
 * 语音播放停止
 */
function onStreamStop() {
  isStreamPlaying.value = false
  isAudioPlaying.value = false
  currentIndex.value = null
}

/**
 * 根据角色类型删除最后一条消息
 */
function removeEmptyMessagesByRole(type: string) {
  for (let i = content.value.length - 1; i >= 0; i--) {
    const item = content.value[i]
    const raw = item.content
    const text = Array.isArray(raw) ? raw[0]?.text ?? '' : raw ?? ''

    const isEmpty = typeof text === 'string' && text.trim() === ''
    if (item.role === type && isEmpty) {
      content.value.splice(i, 1)
    }
  }
}

async function stopAll() {
  console.log('🚫 强制关闭所有逻辑')
  // 停止ai回复的消息
  await stopChat.value()
  // 停止音频播放
  await streamPlayerRef.value?.onStreamStop()
  currentIndex.value = null
  // 重置格式化器
  textReset()
  // 重置播放状态
  isStreamPlaying.value = false
  // 重置音频播放真正的状态
  isAudioPlaying.value = false
}
/** 跳转到设置页面 */
// function handleToSetting() {
//   router.replace('/pages/mine/index')
// }
watch([isStreamPlaying, loading], ([isPlaying, isLoading]) => {
  if (!isPlaying || !isLoading) {
    // 都结束了才开始倒计时
    resetIdleTimer()
  }
  else {
    // 任意一个是true，就清掉已有定时器
    if (idleTimeout.value)
      clearTimeout(idleTimeout.value)
  }
})
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
      if (lastMessage?.role === 'assistant' && lastMessage?.streaming) {
        // 自动播放
        autoPlayAiMessage(lastMessage.content as string || ' ', content.value.length - 1)
      }
    }
  },
)

watch(() => isAiMessageEnd.value, (newVal) => {
  if (newVal) {
    lastAiMsgEnd.value = true
    tempFormattedTexts.value = []
    hasUserInterruptedAutoPlay.value = false
  }
})

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

/** 语音识别结果返回 - 可以添加识别  */
watch(() => textRes.value, async (newVal) => {
  await nextTick() // 确保视图更新完成
  replyForm.value.content = modelPrefix.value + newVal as string
})

watch(() => replyForm.value.content, (newVal) => {
  resetIdleTimer()
})

onMounted(() => {
  (vueInstance as any).isMounted = true
  RecordAppInstance.UniPageOnShow(vueInstance)
  recReq().then((res) => {
    isFirstVisit.value = false
    setTimeout(() => {
      initialLoadPending.value = true
    }, 1500)
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

router.ready(() => {
  handleChangeAiModel()
})
</script>

<template>
  <view @touchstart="resetIdleTimer" @touchmove="resetIdleTimer" @touchend="resetIdleTimer" @click="resetIdleTimer" @scroll="resetIdleTimer">
    <!-- <nav-bar :show-back="false">
      <template #left>
        <view>
          <icon-font :name="isAutoPlayAiMessage ? 'sound' : 'mute'" :color="isAutoPlayAiMessage ? COLOR_PRIMARY : ''" size="40" class="ml-20rpx" @click="handleAutoPlayAiMessage" />
        </view>
      </template>

      <template #right>
        <view class="flex  pr-50rpx">
          <icon-font name="setting" color="#000" size="40" @click="handleToSetting" />
        </view>
      </template>

      <text @click="handleMultiClick">
        柯仔AI
      </text>
    </nav-bar> -->

    <!-- 流式流式ai消息 -->
    <GaoChatSSEClient
      ref="chatSSEClientRef"
      @on-open="onStart"
      @on-error="onError"
      @on-message="onSuccess && onSuccess?.($event)"
      @on-finish="onFinish"
    />

    <!-- 音频播放组件 -->
    <!-- #ifdef APP-PLUS -->
    <StreamPlayer
      ref="streamPlayerRef"
      :stream-data="streamData"
      @on-stream-play-start="onStreamPlayStart"
      @on-stream-play-end="onStreamPlayEnd"
      @on-stream-stop="onStreamStop"
    />
    <!-- #endif -->

    <!-- <view v-show="!isScreensaver"> -->
    <view v-show="true">
      <view :style="aiPageContent">
        <view
          class="w-full  pointer-events-none"
          :style="{ height: 'calc(100% - 200rpx)' }"
        >
          <image
            :src="(isStreamPlaying && isAudioPlaying) ? '/static/images/aiPageBg.gif' : '/static/images/aiPageBg-quiet.png'"
            mode="aspectFit"
            class="size-100%"
          />
        </view>

        <view class="h-20% pb-120rpx">
          <scroll-view
            ref="scrollViewRef"
            scroll-y
            :scroll-top="scrollTop"
            class=" scroll-view pr-20rpx pl-20rpx  h-full"
            :scroll-with-animation="true"
            @scroll="handleScroll"
            @scrolltolower="scrolltolower"
          >
            <view class="scroll-content">
              <!--  content.length === 0 -->
              <view v-if="false" class="h-full flex justify-end flex-col items-center ">
                <view>
                  <image
                    class="ai-img"
                    :src="`/static/images/ai-logo/${currentModel?.icon}.png`"
                    mode="aspectFill"
                  />
                </view>
                <view class="font-size-60rpx mt-20rpx">
                  我是{{ modelSubTitle }}
                </view>
                <view class="mt-20rpx w-80%">
                  我可以帮你搜索、答疑、写作、请在下方输入你的内容~
                </view>
              </view>

              <view v-for="(msg, index) in content" :key="index" class="py-16rpx">
                <!-- 用户消息 -->
                <view v-if="msg.role === 'user'" class=" flex  flex-justify-end opacity-60">
                  <view class="message-bubble p-32rpx border-rd-16rpx   bg-#07c160 color-white max-w-80%">
                    <text selectable>
                      <!-- 首先判断 用户消息临时加载状态 如果是则代表是语音识别消息 否则展示已经添加进去的消息 -->
                      {{
                        msg.isRecordingPlaceholder
                          ? (textRes || '') + (isRunning && textRes ? animatedDots : '')
                          : Array.isArray(msg.content)
                            ? userMsgFormat(modelPrefix, (msg.content as any)[0].text, true)
                            : userMsgFormat(modelPrefix, msg.content || '', true)
                      }}
                    </text>
                    <!-- 流式加载动画 -->
                    <view v-if="msg.isRecordingPlaceholder && !textRes" class="flex-center">
                      <uni-load-more icon-type="auto" status="loading" :show-text="false" />
                    </view>
                  </view>
                </view>

                <!-- AI消息（含加载状态） -->
                <view v-if="msg.role === 'assistant'" class="flex justify-start opacity-60">
                  <Icon-font name="zhipu" class="mt-20rpx mr-10rpx" />
                  <view class="flex mt-16rpx mb-16rpx flex-justify-start bg-#ffffff color-#333333 max-w-80% border-rd-16rpx">
                    <view
                      class="message-bubble  p-32rpx border-rd-16rpx w-100%"
                      :class="[msg.streaming && !(msg.content && msg.content!.length) ? 'flex-center w-120rpx h-120rpx ' : '']"
                    >
                      <view v-if="msg.content">
                        <UaMarkdown :source="`${msg.content}`" :show-line="false" />

                        <view class="h-2rpx  bg-black-3 my-10rpx" />

                        <view class="flex items-center justify-end ">
                          <view class="border-rd-16rpx size-60rpx bg-#e8ecf5 flex-center" @click="handleCopy(msg.content as string)">
                            <icon-font name="copy" :color="COLOR_PRIMARY" :size="28" />
                          </view>
                          <view class="border-rd-16rpx size-60rpx  bg-#e8ecf5 flex-center  ml-20rpx" @click="handleRecorder(msg.content as string, index)">
                            <audio-wave v-if="isStreamPlaying && currentIndex === index" status="playing" :color="COLOR_PRIMARY" />
                            <icon-font v-else name="sound" :color="COLOR_PRIMARY" :size="28" />
                          </view>
                        </view>
                      </view>
                      <!-- 流式加载动画 -->
                      <view v-if=" msg.streaming && !(msg.content && msg.content!.length)" class="flex-center">
                        <uni-load-more icon-type="auto" status="loading" :show-text="false" />
                      </view>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>
      </view>

      <!-- 统一输入框 -->
      <RecorderInputAuto
        v-model:model-value="replyForm.content"
        v-model:focus="isFocus"
        v-model:show-recording-button="showRecordingButton"
        placeholder="请输入您的问题..."
        btn-text="发送"
        @confirm="onConfirm"
      />
    </view>

    <!-- 屏保 -->
    <!-- <screensaver v-model:show="isScreensaver" @on-trigger="onScreensaverTrigger" /> -->
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

<route lang="json" pages="home">
  {
       "style": { "navigationBarTitleText": "录音","navigationStyle": "custom" }
  }
</route>
