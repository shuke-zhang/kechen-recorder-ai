<route lang="json" type="page">
  {
    "style": { "navigationBarTitleText": "测试页面" }
  }
</route>

<script setup lang="ts">
import chatVideo from '@/pages/recorder-ai/components/chat-video.vue'

const chatVideoRef = ref()
const isSilence = ref(false)
</script>

<template>
  <button @click="isSilence = !isSilence">
    点击切换视频url
  </button>

  <view class="size-300rpx">
    <chat-video ref="chatVideoRef" v-model:silence="isSilence" />
  </view>
</template>

<style>

</style>
