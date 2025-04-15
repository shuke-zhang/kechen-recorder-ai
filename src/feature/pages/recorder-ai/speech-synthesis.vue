<route lang="json">
  {
       "style": { "navigationBarTitleText": "语音合成"}
  }
</route>

<script setup lang="ts">
import SpeechSynthesisCore from './xunfei/speech-synthesis-core'

const speechSynthesis = new SpeechSynthesisCore({
  APPID: 'f9b52f87',
  APISecret: 'ZDVkYzU5YmFhZmNlODVkM2RlNDMyNDhl',
  APIKey: '287ae449056d33e0f4995f480737564a',
  url: 'wss://tts-api.xfyun.cn/v2/tts',
  host: 'tts-api.xfyun.cn',
})
</script>

<template>
  <view class="container">
    <button type="primary" @click="speechSynthesis.synthesizeText('你就是个大傻春')">
      测试连接websocket
    </button>

    <button type="primary" class="mt-20rpx">
      开始转化
    </button>
  </view>
</template>

<style  lang="scss">
</style>
