<route lang="json" type="page">
{
  "style": { "navigationBarTitleText": "音频测试页面" }
}
</route>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { audio1, audio2 } from './audio'

const plugin = uni.requireNativePlugin('plugin_shuke')

// === 播放状态 ===
const autoPlay = ref(true)
const queueSize = ref(0)
const currentId = ref<number | null>(null)
const progress = ref(0)
const isRunning = ref(false)

// === 音频任务列表 ===
const audioList = ref([
  { id: 1, text: '测试音频1', base64: audio1 },
  { id: 2, text: '测试音频2', base64: audio2 },
])

let currentIndex = 0

/**
 * ✅ 注册插件事件监听
 */
function registerPluginListener() {
  console.log('🛰️ [前端] 注册插件事件监听...')
  try {
    plugin.onEvent((res: any) => {
      // 统一解析格式
      const msg = typeof res === 'string' ? JSON.parse(res) : res
      const event = msg?.event
      const data = msg?.data || {}

      console.log('📡 [前端收到插件事件] =>', msg)

      switch (event) {
        case 'onReady':
          console.log('✅ 插件通道已建立')
          break
        case 'onTaskAdded':
          queueSize.value = data.queueSize ?? queueSize.value
          console.log(`📝 新任务加入 id=${data.id} 队列=${data.queueSize}`)
          break
        case 'onStart':
          currentId.value = data.id ?? null
          progress.value = 0
          uni.showToast({ title: `▶️ 播放开始 ID=${data.id}`, icon: 'none' })
          break
        case 'onProgress':
          progress.value = data.progress ?? 0
          break
        case 'onComplete':
          uni.showToast({ title: `✅ 播放完成 ID=${data.id}`, icon: 'none' })
          if (autoPlay.value)
            addNextAudio()
          break
        case 'onQueueEmpty':
          uni.showToast({ title: '所有任务播放完成 ✅', icon: 'none' })
          isRunning.value = false
          break
        case 'onError':
          uni.showToast({ title: `❌ 播放出错：${data.msg || '未知错误'}`, icon: 'error' })
          break
        case 'onStop':
          console.log('⏹️ 播放停止')
          break
        default:
          console.log(`⚙️ 其他事件: ${event}`, data)
      }
    })
  }
  catch (err) {
    console.error('注册插件事件失败:', err)
  }
}

/**
 * ✅ 添加下一个音频任务
 */
function addNextAudio() {
  if (currentIndex >= audioList.value.length) {
    console.log('✅ 所有音频已添加完毕')
    return
  }
  const item = audioList.value[currentIndex]
  currentIndex++
  console.log(`📥 添加任务 id=${item.id}`)
  plugin.addTask(String(item.id), item.base64, 16000, 1)
}

/**
 * ✅ 启动播放流程
 */
function startPlayProcess() {
  if (isRunning.value)
    return
  isRunning.value = true
  queueSize.value = 0
  currentId.value = null
  progress.value = 0
  currentIndex = 0

  setTimeout(() => {
    console.log('🎬 [前端] 启动播放...')
    plugin.setAutoPlay(autoPlay.value)
    for (const item of audioList.value) {
      plugin.addTask(String(item.id), item.base64, 16000, 1)
    }
  }, 1000)
}

/**
 * ✅ 停止播放
 */
function stopPlayback() {
  plugin.stop()
  isRunning.value = false
  currentId.value = null
  progress.value = 0
  uni.showToast({ title: '播放已停止', icon: 'none' })
}

/**
 * ✅ 清空任务队列
 */
function clearQueue() {
  plugin.clear()
  queueSize.value = 0
  currentId.value = null
  progress.value = 0
  currentIndex = 0
  isRunning.value = false
  uni.showToast({ title: '队列已清空', icon: 'none' })
}

/**
 * ✅ 切换自动播放
 */
function toggleAutoPlay() {
  autoPlay.value = !autoPlay.value
  plugin.setAutoPlay(autoPlay.value)
  uni.showToast({
    title: `自动播放${autoPlay.value ? '已开启' : '已关闭'}`,
    icon: 'none',
  })
}

onMounted(() => {
  setTimeout(() => {
    registerPluginListener()
  }, 800)
})

onUnmounted(() => stopPlayback())
</script>

<template>
  <view class="page">
    <view class="title">
      🎧 音频任务自动播放示例
    </view>

    <view class="controls">
      <button :disabled="isRunning" @click="startPlayProcess">
        开始
      </button>
      <button :disabled="!isRunning" @click="stopPlayback">
        停止
      </button>
      <button @click="clearQueue">
        清空
      </button>
      <button @click="toggleAutoPlay">
        {{ autoPlay ? '关闭自动播放' : '开启自动播放' }}
      </button>
    </view>

    <view class="status">
      <text>当前播放 ID：{{ currentId ?? '-' }}</text>
      <text>播放进度：{{ progress }}%</text>
      <text>队列任务数：{{ queueSize }}</text>
      <text>自动播放：{{ autoPlay ? '开启' : '关闭' }}</text>
    </view>

    <view class="list">
      <text>📜 音频列表：</text>
      <view
        v-for="item in audioList"
        :key="item.id"
        class="item"
        :class="{ active: currentId === item.id }"
      >
        <text>{{ item.id }}. {{ item.text }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  padding: 20rpx;
}
.title {
  font-size: 34rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
}
.controls {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  margin-bottom: 20rpx;
}
.status {
  background: #f8f8f8;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
  font-size: 28rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.list .item {
  padding: 10rpx;
  background: #f5f5f5;
  margin-top: 8rpx;
  border-radius: 8rpx;
}
.item.active {
  background-color: #c7efff;
}
</style>
