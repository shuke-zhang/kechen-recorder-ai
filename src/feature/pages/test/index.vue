<route lang="json">
 {
      "style": { "navigationBarTitleText": "测试页面" }
 }
</route>

<script setup lang="ts">
import { SpeechSynthesisDoubao } from '../recorder-ai/doubao/speech-synthesis-doubao'
import type StreamPlayer from '@/components/StreamPlayer/StreamPlayer.vue'

const currBuffer = ref<ArrayBuffer >()
const streamPlayerRef = ref<InstanceType<typeof StreamPlayer> | null>(null)
const text = ref('今天是个好日子')

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
speechSynthesisDoubaoCore.on('audio', (res) => {
  currBuffer.value = res
})
const encoder = new TextEncoder()
const bytes = encoder.encode('123456')
console.log(bytes, 'bytes')
console.log(123456789)

function send(test: string) {
  speechSynthesisDoubaoCore.sendTextStream(
    test,
  )
}
function test() {
  console.log('测试', text.value)
}
</script>

<template>
  <view class="audioPlay">
    测试页面-{{ speechSynthesisDoubaoCore }}
    <button type="primary" @click="send(text)">
      点击
    </button>
    <button class="mt-40rpx" type="primary" @click="test">
      测试
    </button>
    <!-- 音频播放组件 -->
    <StreamPlayer
      ref="streamPlayerRef"
      :stream="currBuffer"
      :curr-buffer="currBuffer"
    />
  </view>
</template>
