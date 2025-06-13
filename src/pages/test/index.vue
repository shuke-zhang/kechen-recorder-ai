<route lang="json">
  {
    "style": { "navigationBarTitleText": "测试页面" }
  }
  </route>

<script setup lang="ts">
import { ref } from 'vue'
import { io } from 'socket.io-client'
import { Base64 } from 'js-base64'
import CryptoJS from 'crypto-js'

const APPID = 'f9b52f87'
const APISecret = 'ZDVkYzU5YmFhZmNlODVkM2RlNDMyNDhl'
const APIKey = '287ae449056d33e0f4995f480737564a'
const url = 'wss://iat-api.xfyun.cn/v2/iat'
const host = 'iat-api.xfyun.cn'
function getWebSocketUrl(): string | Error {
  const date = (new Date() as any).toGMTString()

  const missingKeys: string[] = []

  if (!url)
    missingKeys.push('url')
  if (!host)
    missingKeys.push('host')
  if (!APIKey)
    missingKeys.push('APIKey')
  if (!APISecret)
    missingKeys.push('APISecret')
  if (!APPID)
    missingKeys.push('APPID')

  if (missingKeys.length > 0) {
    return new Error(`以下字段缺失：${missingKeys.join(', ')}`)
  }

  const originStr = `host: ${host}\ndate: ${date}\nGET /v2/iat HTTP/1.1`
  const sha = CryptoJS.HmacSHA256(originStr, APISecret)
  const signature = CryptoJS.enc.Base64.stringify(sha)
  const auth = `api_key="${APIKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`
  const authorization = Base64.encode(auth)

  return `${url}?authorization=${encodeURIComponent(authorization)}&date=${encodeURIComponent(date)}&host=${encodeURIComponent(host)}`
}
// 连接地址
const socketUrl = 'ws://192.168.3.22:8765'

// 状态管理
const ioStatus = ref('未连接') // socket.io-client 状态
const uniStatus = ref('未连接') // uni.connectSocket 状态
const ioSocket = ref() // 缓存 socket.io 实例
const uniSocket = ref() // 缓存 uni socket 实例

// socket.io-client 连接
function socketInit() {
  ioStatus.value = '连接中...'
  const url = getWebSocketUrl() as string
  console.log(url)

  const socket = io(url, {
    transports: ['websocket'], // ✅ WebSocket 协议
    timeout: 5000, // 超时时间
  })

  ioSocket.value = socket

  socket.on('connect', () => {
    console.log('✅ 已连接到服务端-io', socket.id)
    ioStatus.value = `已连接：${socket.id}`
    socket.emit('chat', '你好服务器~')
  })

  socket.on('reply', (msg) => {
    console.log('📨 服务器回复:', msg)
  })

  socket.on('connect_error', (err) => {
    console.error('❌ 连接失败-io:', err)
    ioStatus.value = '连接失败'
  })

  socket.on('connect_timeout', (err) => {
    console.error('⏱️ 连接超时-io', err)
    ioStatus.value = '连接超时'
  })

  socket.on('error', (err) => {
    console.error('🚨 通信错误-io:', err)
    ioStatus.value = '通信错误'
  })

  socket.on('disconnect', (reason) => {
    console.warn('🔌 已断开连接-io:', reason)
    ioStatus.value = `断开连接：${reason}`
  })
}

// uni.connectSocket 连接
function uniSocketInit() {
  const url = getWebSocketUrl() as string

  uniStatus.value = '连接中...'
  const socket = uni.connectSocket({
    url: socketUrl, // ✅ WebSocket 协议
    success: () => {
      console.log('uni.connectSocket 初始化成功')
    },
    fail: (err) => {
      console.error('❌ 初始化失败-uni', err)
      uniStatus.value = '连接失败'
    },
  })

  uniSocket.value = socket

  socket.onOpen(() => {
    console.log('✅ WebSocket 连接已打开-uni')
    uniStatus.value = '已连接'
  })

  socket.onMessage((res) => {
    console.log('📨 收到服务器消息-uni:', res.data)
  })

  socket.onError((err) => {
    console.error('❌ WebSocket 错误-uni:', err)
    uniStatus.value = '通信错误'
  })

  socket.onClose(() => {
    console.log('🔌 WebSocket 连接已关闭-uni')
    uniStatus.value = '断开连接'
  })
}

function handleRequest() {
  uni.request({
    url: 'http://192.168.3.22:5000',
    method: 'GET',
  }).then((res) => {
    console.log(`成功：${res.data}`)
  }).catch((err) => {
    console.log(`失败：${err}`)
  })
}
</script>

<template>
  <view class="audioPlay p-40rpx">
    <button type="primary" @click="socketInit">
      连接 socket.io-client
    </button>
    <text class="block mt-10rpx color-gray">
      状态：{{ ioStatus }}
    </text>

    <button class="mt-40rpx" type="primary" @click="uniSocketInit">
      连接 uni.connectSocket
    </button>
    <text class="block mt-10rpx color-gray">
      状态：{{ uniStatus }}
    </text>

    <button class="mt-40rpx" type="primary" @click="handleRequest">
      测试接口
    </button>
  </view>
</template>

  <style scoped>
  .color-gray {
  color: #888;
}
</style>
