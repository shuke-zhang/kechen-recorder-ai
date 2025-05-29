<route lang="json">
 {
      "style": { "navigationBarTitleText": "测试页面" }
 }
</route>

<script setup lang="ts">
import SpeechSynthesisCore from '../recorder-ai/xunfei/speech-synthesis-core'
import { SpeechSynthesisDoubao } from '../recorder-ai/doubao/speech-synthesis-doubao'
import { doubaoSpeechSynthesis } from '@/api/audio'
import type StreamPlayer from '@/components/StreamPlayer/StreamPlayer.vue'

const currBuffer = ref<ArrayBuffer >()
const streamPlayerRef = ref<InstanceType<typeof StreamPlayer> | null>(null)
const SpeechSynthesis = new SpeechSynthesisCore({
  APPID: 'f9b52f87',
  APISecret: 'ZDVkYzU5YmFhZmNlODVkM2RlNDMyNDhl',
  APIKey: '287ae449056d33e0f4995f480737564a',
  url: 'wss://tts-api.xfyun.cn/v2/tts',
  host: 'tts-api.xfyun.cn',
})

const APPID = '3810425215'
const AccessToken = 'mHT8sdy_o3wVHNSIw9jfJqCawEu0Aq5s'
const SecretKey = 'WcH7__6VXDbmzKbXaNkLt9PN9kFCyFy0'
const host = 'openapi.xf-yun.com'

const SpeechSynthesisDoubaoCore = new SpeechSynthesisDoubao({
  APPID,
  AccessToken,
  SecretKey,
  host,
})
SpeechSynthesisDoubaoCore.on('audio', (res: ArrayBuffer) => {
  currBuffer.value = res
})

SpeechSynthesis.on('audio', (res: ArrayBuffer) => {
  currBuffer.value = res
})
const text = '今天天气特别好，阳光暖洋洋的，天蓝得像洗过一样，风也不大，吹在脸上挺舒服的，整个人都觉得特别轻松愉快，特别适合出去走走。'

function sendTextApi() {
  doubaoSpeechSynthesis(text).then((res) => {
    console.log(res)
    currBuffer.value = res.data.audio_data as any
  }).catch((err) => {
    console.log(err)
  })
}

function xunfeiSend() {
  // SpeechSynthesis.convertTextToSpeech(text)
  SpeechSynthesisDoubaoCore.sendTextStream(text)
}
</script>

<template>
  <view class="audioPlay">
    <button class="mt-40rpx" type="primary" @click="sendTextApi">
      点击api
    </button>

    <button class="mt-40rpx" type="primary" @click="xunfeiSend">
      点击-讯飞
    </button>
    <!-- 音频播放组件 -->
    <StreamPlayer
      ref="streamPlayerRef"
      :stream="currBuffer"
      :curr-buffer="currBuffer"
    />
  </view>
</template>
