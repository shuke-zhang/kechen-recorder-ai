<route lang="json">
 {
      "style": { "navigationBarTitleText": "测试页面" }
 }
</route>

<script setup lang="ts">
import { SpeechSynthesisDoubao } from '../recorder-ai/doubao/speech-synthesis-doubao'

const APPID = '3810425215'
const AccessToken = 'mHT8sdy_o3wVHNSIw9jfJqCawEu0Aq5s'
const SecretKey = 'WcH7__6VXDbmzKbXaNkLt9PN9kFCyFy0'
const url = 'wss://openapi.xf-yun.com/v1/private/s453a306'
const host = 'openapi.xf-yun.com'
const speechSynthesisDoubaoCore = new SpeechSynthesisDoubao({
  APPID,
  AccessToken,
  SecretKey,
  url,
  host,
})
speechSynthesisDoubaoCore.on('log', (e) => {
  console.log(e)
})
speechSynthesisDoubaoCore.on('test', (e) => {
  console.log(e)
})
speechSynthesisDoubaoCore.on('audio', (e) => {
  console.log(e)
})
</script>

<template>
  <view class="audioPlay">
    测试页面-{{ speechSynthesisDoubaoCore }}
    <button @click="speechSynthesisDoubaoCore.synthesizeSpeechStream">
      点击
    </button>
  </view>
</template>
