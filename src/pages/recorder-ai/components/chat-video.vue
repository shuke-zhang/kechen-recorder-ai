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

const isSilence = defineModel('silence', {
  type: Boolean,
  default: false,
})
// 当前播放的视频索引
const currentVideoIndex = ref(0)

const sayVideoSrc = `${STATIC_URL}/kezai/video/compression/say-1.mp4`
// 当前播放的视频地址
const currentVideoSrc = ref('')
/** 视频文件 */
const videoLists = ref([
  `${STATIC_URL}/kezai/video/compression/wait-1.mp4`,
  `${STATIC_URL}/kezai/video/compression/wait-2.mp4`,
])

function initRandomVideo() {
  let nextIndex = currentVideoIndex.value
  const total = videoLists.value.length

  if (total <= 1) {
    currentVideoSrc.value = videoLists.value[0] || ''
    return
  }

  // 保证新的视频索引与当前不一样
  while (nextIndex === currentVideoIndex.value) {
    nextIndex = Math.floor(Math.random() * total)
  }

  currentVideoIndex.value = nextIndex
  currentVideoSrc.value = videoLists.value[nextIndex]
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

  if (isSilence.value) {
    initRandomVideo()
    nextTick(() => {
      // 如果是静默模式，继续播放随机视频
      DomVideoPlayerRef.value?.play?.()
    })
  }
  else {
    currentVideoSrc.value = sayVideoSrc
    nextTick(() => {
      // 非静默模式直接播放视频
      DomVideoPlayerRef.value?.play?.()
    })
  }
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

watch(() => isSilence.value, (newVal) => {
  console.log('isSilence changed:', newVal)

  if (newVal) {
    initRandomVideo()
    isAutoPlay.value = true

    nextTick(() => {
      // 如果是静默模式，继续播放随机视频
      DomVideoPlayerRef.value?.play?.()
    })
  }
  else {
    currentVideoSrc.value = sayVideoSrc
    isAutoPlay.value = false
    nextTick(() => {
      // 如果是静默模式，继续播放随机视频
      DomVideoPlayerRef.value?.reset?.()
    })
  }
}, {
  immediate: true,
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
      :poster="`${STATIC_URL}/kezai/cover.png.png`"
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
