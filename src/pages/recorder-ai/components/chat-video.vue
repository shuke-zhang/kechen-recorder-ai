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
      :src="`${STATIC_URL}/kezai/video/ai-chat-2.mp4`"
      autoplay
      :is-loading="true"
      loop
      :controls="false"
      poster="/static/images/aiPageBg-quiet.png"
      muted
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
