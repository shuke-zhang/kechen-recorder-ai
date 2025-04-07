<route lang="json">
 {
      "style": { "navigationBarTitleText": "测试页面" }
 }
</route>

<script setup lang="ts">
import XunfeiRecorder from './xunfei/xunfei-recorder'
import { useXunFeiWebSocket } from './xunfei-websocket'

const sss = new XunfeiRecorder({
  APPID: 'f9b52f87',
  APISecret: 'ZDVkYzU5YmFhZmNlODVkM2RlNDMyNDhl',
  APIKey: '287ae449056d33e0f4995f480737564a',
  url: 'wss://iat-api.xfyun.cn/v2/iat',
  host: 'iat-api.xfyun.cn',
}, onTextChanged)
const text = ref('')
function onTextChanged(data: string) {
  text.value = data
}

// 开始录音
function startRecord() {
  console.log('页面点击录音开始')
  text.value = ''
  sss.start()
  sss.on('log', (msg: string) => {
    console.log(msg)
  })
}

// 停止录音
function endRecord() {
  console.log('页面点击录音结束')
  text.value = ''
  sss.stop()
}

const { handleSocketStart, handleSocketStop } = useXunFeiWebSocket()
</script>

<template>
  <view class="audioPlay">
    <button type="primary" class="mt-100rpx" @click="startRecord">
      开始录音
    </button>
    <button type="primary" class="mt-100rpx" @click="endRecord">
      停止录音
    </button>

    <button type="primary" class="mt-100rpx" @click="handleSocketStart">
      socket连接测试
    </button>

    <button type="primary" class="mt-100rpx" @click="handleSocketStop">
      socket连接关闭
    </button>

    <view class="mt-100rpx card flex flex-col">
      <text>
        识别结果：
      </text>
      <text class="text-primary">
        {{ text }}
      </text>
    </view>
  </view>
</template>
