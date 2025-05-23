<route lang="json">
 {
      "style": { "navigationBarTitleText": "测试页面" }
 }
</route>

<script setup lang="ts">
import SpeechSynthesisCore from '../recorder-ai/xunfei/speech-synthesis-core'
import type StreamPlayer from '@/components/StreamPlayer/StreamPlayer.vue'
import { request } from '@/utils/request'

const currBuffer = ref<ArrayBuffer >()
const streamPlayerRef = ref<InstanceType<typeof StreamPlayer> | null>(null)
const SpeechSynthesis = new SpeechSynthesisCore({
  APPID: 'f9b52f87',
  APISecret: 'ZDVkYzU5YmFhZmNlODVkM2RlNDMyNDhl',
  APIKey: '287ae449056d33e0f4995f480737564a',
  url: 'wss://tts-api.xfyun.cn/v2/tts',
  host: 'tts-api.xfyun.cn',
})

SpeechSynthesis.on('audio', (res: ArrayBuffer) => {
  currBuffer.value = res
})
const text = '今天天气特别好，阳光暖洋洋的，天蓝得像洗过一样，风也不大，吹在脸上挺舒服的，整个人都觉得特别轻松愉快，特别适合出去走走。'

function sendTextApi() {
  return request.post({
    url: '/tts/json',
    data: {
      text,
    },
    withToken: false,
    getResponse: true,
  },
  ).then((res: any) => {
    const audio_data = res.data.audio_data
    currBuffer.value = audio_data
  })
}

function xunfeiSend() {
  SpeechSynthesis.convertTextToSpeech(text)
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
