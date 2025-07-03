<script setup lang="ts">
import type { Video } from '@uni-helper/uni-app-types'
import { defineEmits, onMounted, onUnmounted, ref } from 'vue'
import type DomVideoPlayer from '@/components/DomVideoPlayer/DomVideoPlayer.vue'

const emit = defineEmits(['onTrigger'])
const { handleMultiClick } = useMultiClickTrigger({
  targetCount: 2,
  onTrigger: onRecorder,
})

function onRecorder() {
  // router.replace('/pages/recorder-ai/index')
  emit('onTrigger')
}
/** 视频文件 */
const videoLists = computed(() => {
  if (isApp) {
    return [
      '/static/video/screensaver-1.mp4',
    ]
  }
  else {
    return [
      `${STATIC_URL}/kezai/video/screensaver-1.mp4`,
      `${STATIC_URL}/kezai/video/screensaver-2.mp4`,
      `${STATIC_URL}/kezai/video/screensaver-3.mp4`,
      `${STATIC_URL}/kezai/video/screensaver-4.mp4`,
      `${STATIC_URL}/kezai/video/screensaver-5.mp4`,
    ]
  }
})

// 当前播放的视频索引
const currentVideoIndex = ref(0)
// 当前播放的视频路径
const currentVideoSrc = ref(toRaw(videoLists.value[0]))
// 视频播放器引用
const videoRef = ref<Video | null>(null)
const DomVideoPlayerRef = ref<InstanceType<typeof DomVideoPlayer>>()
const isScreensaver = defineModel('show', {
  type: Boolean,
  default: true,
})
// 随机选择视频（排除当前视频）
function getRandomVideo(excludeIndex: number): number {
  const availableVideos = videoLists.value.filter((_, index) => index !== excludeIndex)
  const randomVideo = availableVideos[Math.floor(Math.random() * availableVideos.length)]
  return videoLists.value.indexOf(randomVideo)
}

// 切换到下一个随机视频
function playNextVideo() {
  const nextIndex = getRandomVideo(currentVideoIndex.value)
  currentVideoIndex.value = nextIndex
  // currentVideoSrc.value = videoLists.value[nextIndex]

  // 重新加载视频
  if (videoRef.value) {
    videoRef.value.onLoad?.()
    videoRef.value.play?.()
  }
}

// 初始化第一个随机视频
function initRandomVideo() {
  const randomIndex = Math.floor(Math.random() * videoLists.value.length)
  currentVideoIndex.value = randomIndex
  // currentVideoSrc.value = videoLists.value[randomIndex]
}

// 视频播放完成事件处理
function onVideoEnded() {
  playNextVideo()
}

// 视频播放错误事件处理
function onVideoError() {
  console.error('视频播放出错，切换到下一个视频')
  playNextVideo()
}

onMounted(() => {
  initRandomVideo()
})

watch(isScreensaver, (newVal) => {
  if (!newVal) {
    console.log('停止播放视频')
    videoRef.value?.pause?.()
  }
})

onUnmounted(() => {
  // 清理视频播放器
  // if (videoRef.value) {
  //   videoRef.value.pause()
  // }
})
</script>

<template>
  <view v-if="isScreensaver" class="w-[100vw] h-[100vh] flex-center bg-#f9f4f7 screensaver-wrapper" :class="{ 'off-screen': !isScreensaver }">
    <DomVideoPlayer
      ref="DomVideoPlayerRef"
      :src="`${STATIC_URL}/kezai/video/screensaver-1.mp4`"
      autoplay
      :is-loading="true"
      loop
      controls
      poster="/static/images/aiPageBg-quiet.png"
      muted
    />

    <cover-view
      class="absolute top-0 left-0 w-full h-full z-[10]"
      @click="handleMultiClick"
    >
      <!-- 可放提示、按钮等内容 -->
    </cover-view>
  </view>
</template>

<style lang="scss">
.screensaver-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
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
