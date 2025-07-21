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
// 当前播放的视频地址
const currentVideoSrc = ref('')
/** 视频文件 */
const videoLists = ref([
  `${STATIC_URL}/kezai/video/screensaver-1.mp4`,
  `${STATIC_URL}/kezai/video/screensaver-2.mp4`,
  `${STATIC_URL}/kezai/video/screensaver-3.mp4`,
  `${STATIC_URL}/kezai/video/screensaver-4.mp4`,
  `${STATIC_URL}/kezai/video/screensaver-5.mp4`,
])

function initRandomVideo() {
  const randomIndex = Math.floor(Math.random() * videoLists.value.length)
  currentVideoIndex.value = randomIndex
  currentVideoSrc.value = videoLists.value[randomIndex]
  console.log('初始化随机视频:', currentVideoSrc.value)
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
      DomVideoPlayerRef.value?.play?.()
    })
  }
  else {
    currentVideoSrc.value = `${STATIC_URL}/kezai/video/ai-chat-2.mp4`
    nextTick(() => {
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
  }
  else {
    currentVideoSrc.value = `${STATIC_URL}/kezai/video/ai-chat-2.mp4`
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
      autoplay
      :is-loading="false"
      :controls="false"
      :poster="`${STATIC_URL}/kezai/aiPageBg-quiet.png`"
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
