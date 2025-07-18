<route lang="json" type="page">
  {
    "style": { "navigationBarTitleText": "测试页面" }
  }
</route>

<script setup lang="ts">
import chatVideo from '@/pages/recorder-ai/components/chat-video.vue'

const chatVideoRef = ref()
const isShow = ref(false)
</script>

<template>
  <audio-wave
    status="playing"
    :color="COLOR_PRIMARY"
    :bar-width="6"
    :bar-max-height="24"
    :gap="4"
  />
  <text selectable class="font-size-28rpx!">
    首先判断 用户消息临时加载状态 如果是则代表是语音识别消息 否则展示已经添加进去的消息
  </text>

  <button @click="isShow = true">
    点击显示
  </button>

  <view v-if="isShow" class="size-300rpx">
    <chat-video ref="chatVideoRef" />
  </view>
</template>

<style>

</style>
