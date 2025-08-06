<script setup lang="ts">
import type DomVideoPlayer from '@/components/DomVideoPlayer/DomVideoPlayer.vue'

const props = defineProps<{
  /**
   * 是否重置播放器
   */
  isReset?: boolean
  /**
   * 是否继续播放
   */
  isPlay?: boolean
}>()
const isSilence = defineModel('silence', {
  type: Boolean,
  default: false,
})

// 视频播放器引用
const DomVideoPlayerRef = ref<InstanceType<typeof DomVideoPlayer>>()

const isAutoPlay = defineModel('play', {
  type: Boolean,
  default: true,
})

const isChatVideo = defineModel('show', {
  type: Boolean,
  default: true,
})

// 当前播放的视频索引
const currentVideoIndex = ref(0)

const sayVideoSrc = `${STATIC_URL}/kezai/video/compression/say-1.mp4`
// 当前播放的视频地址
const currentVideoSrc = ref('')
/** 说话视频文件 */
const speakingVideoLists = ref<string[]>([sayVideoSrc])
/** 静默视频文件 */
const waitingVideoLists = ref<string[]>([])

const httpWaitingVideoLists = [
  `${STATIC_URL}/kezai/video/compression/wait-1.mp4`,
  `${STATIC_URL}/kezai/video/compression/wait-2.mp4`,
  `${STATIC_URL}/kezai/video/compression/wait-3.mp4`,
  `${STATIC_URL}/kezai/video/compression/wait-4.mp4`,
  `${STATIC_URL}/kezai/video/compression/wait-5.mp4`,
]
const httpSpeakingVideoLists = [
  `${STATIC_URL}/kezai/video/compression/say-1.mp4`,
]
const { localWaitingVideoList, localSpeakingVideoList, localVideoStatus, initFolder } = useLocalPlayVideo(
  isSilence.value ? httpWaitingVideoLists : httpSpeakingVideoLists,
  isSilence.value ? 'waiting' : 'speaking',
)

/**
 * 获取视频源列表：优先本地视频，其次使用网络视频
 */
async function initVideoSource() {
  if (localVideoStatus.value === 'uninitialized') {
    console.log('⚙️ 正在初始化本地视频目录...')
    await initFolder()
  }

  if (localVideoStatus.value === 'has') {
    console.log('🎬 使用本地视频')
    waitingVideoLists.value = localWaitingVideoList.value.length > 0 ? localWaitingVideoList.value : httpWaitingVideoLists
    speakingVideoLists.value = localSpeakingVideoList.value && localSpeakingVideoList.value.length > 0 ? localSpeakingVideoList.value : httpSpeakingVideoLists
  }
  else {
    console.log('🌐 使用网络视频')
    waitingVideoLists.value = httpWaitingVideoLists
    speakingVideoLists.value = httpSpeakingVideoLists
  }
}

/**
 * 播放随机视频（不重复当前）
 */
async function playRandomVideo() {
  await initVideoSource()

  const list = isSilence.value ? waitingVideoLists.value : speakingVideoLists.value

  if (!list || list.length === 0) {
    console.warn('⚠️ 无可播放视频')
    return
  }

  let nextIndex = currentVideoIndex.value
  const total = list.length

  if (total === 1) {
    nextIndex = 0
  }
  else {
    while (nextIndex === currentVideoIndex.value) {
      nextIndex = Math.floor(Math.random() * total)
    }
  }

  currentVideoIndex.value = nextIndex
  currentVideoSrc.value = list[nextIndex]
  console.log('📺 切换播放地址:', currentVideoSrc.value)
}

/**
 * 重置视频播放器状态
 */
function handleReset() {
  if (DomVideoPlayerRef.value) {
    DomVideoPlayerRef.value.reset()
  }
}
/**
 * 重置后继续播放视频
 */
function handlePlay() {
  if (DomVideoPlayerRef.value) {
    DomVideoPlayerRef.value.play()
  }
}

/**
 * 视频播放完成
 */
function handleEnded() {
  console.error('视频播放完成', isSilence.value)
  playRandomVideo()
}

watch(
  () => props.isReset,
  (val) => {
    if (val) {
      handleReset()
    }
  },
  { immediate: true },
)
watch(
  () => props.isPlay,
  (val) => {
    if (val) {
      handlePlay()
    }
  },
  { immediate: true },
)
watch(
  () => isSilence.value,
  (val) => {
    if (val) {
      console.log('切换到静默视频')
    }
    else {
      console.log('切换到说话视频')
    }
    playRandomVideo()
  },
  { immediate: true },
)

onMounted(() => {
  playRandomVideo()
})

defineExpose({
  /**
   * 重置视频播放器状态
   */
  handleReset,
  /**
   * 重置后继续播放视频
   */
  handlePlay,
})
</script>

<template>
  <view class="size-full flex-center bg-#fdf9f6 " :class="{ 'off-screen': !isChatVideo }">
    <DomVideoPlayer
      ref="DomVideoPlayerRef"
      :src="currentVideoSrc"
      :autoplay="isAutoPlay"
      :is-loading="false"
      :controls="false"
      object-fit="fill"
      :poster="`${STATIC_URL}/kezai/cover.png`"
      muted
      @ended="handleEnded"
    />
  </view>
</template>

<style lang="scss">
.chat-video-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 999; // 或适当值
  transition: transform 0.4s ease;
}

.off-screen {
  transform: translateX(-10000px); // 也可用 translateY(10000px)
  position: absolute;
  z-index: -9999;
  pointer-events: none;
  opacity: 0;
}
</style>
