<route lang="json">
  {
    "style": {
      "navigationBarTitleText": "组合式API桥接方案"
    }
  }
  </route>

    <!-- #ifdef APP -->
<script module="myRenderModule" lang="renderjs">
// eslint-disable-next-line ts/ban-ts-comment
// @ts-nocheck
export default {
  mounted() {
    setTimeout(() => {
      // ✅ 正确做法：通过 eventBus 桥接 renderjs -> 逻辑层
      this.$ownerInstance.callMethod('emit', {
        type: 'renderjs-message',
        data: {
          msg: '来自 RenderJS 的桥接消息 ✅',
        },
      })
    }, 300)
  },
}
</script>
  <!-- #endif -->

  <!-- 组合式API业务逻辑 -->
<script setup lang="ts">
// 状态和数据
const msgFromRender = ref('')
const msgRender = ref('')
// 处理renderjs发来的消息
function handleRenderMessage(data: any) {
  console.log('[组合式API] 处理renderjs数据:', data)
  msgRender.value = data
}

// 向视图层发送数据
function sendToRenderLayer() {
  console.log('[组合式API] 发送数据到视图层:', `从组合式API发送的数据: ${new Date().toLocaleTimeString()}`)
}

// 监听和清理事件
onMounted(() => {
  (uni as any).$eventBus.on('renderjs-message', (data: any) => {
    console.log('[逻辑层收到 renderjs 桥接数据]:', data)
    msgRender.value = data.msg
  })
})

onUnmounted(() => {
  // 清理事件监听
  (uni as any).$eventBus.off('renderjs-message', handleRenderMessage)
})

// 为了兼容性，也暴露方法(可能不起作用)
function onMessage(data: any) {
  console.log('[组合式API] 直接调用的onMessage:', data)
  msgFromRender.value = `${data.data} (通过直接暴露的方法)`
}

function onRenderMessage(data: any) {
  console.log('逻辑层接收renderjs发送的数据', data)
  msgRender.value = `${data.data} (通过直接暴露的方法)`
}

defineExpose({
  onMessage,
  onRenderMessage,
})
</script>

<template>
  <view class="container">
    <view class="header">
      <text class="title">
        组合式API桥接方案
      </text>
    </view>

    <view class="content">
      <text class="label">
        来自RenderJS的数据： {{ msgRender || '===' }}
      </text>
      <view class="result">
        {{ msgFromRender || '等待数据...' }}
      </view>

      <button class="btn" @click="sendToRenderLayer">
        发送数据到视图层2
      </button>
    </view>

    <!-- RenderJS 宿主元素 -->
    <view
      type="renderjs"
      module="myRenderModule"
      :prop="msgFromRender"
    />
  </view>
</template>

  <style>
  .container {
  padding: 40rpx;
}

.header {
  margin-bottom: 40rpx;
  text-align: center;
}

.title {
  font-size: 36rpx;
  font-weight: bold;
  color: #2c3e50;
}

.content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.label {
  font-size: 32rpx;
  color: #409eff;
  margin-bottom: 20rpx;
}

.result {
  font-size: 40rpx;
  color: #67c23a;
  padding: 20rpx;
  border: 1px solid #ebeef5;
  border-radius: 8rpx;
  width: 100%;
  text-align: center;
  margin-bottom: 40rpx;
  min-height: 60rpx;
}

.btn {
  background-color: #409eff;
  color: white;
  margin-top: 20rpx;
  padding: 20rpx 40rpx;
}
</style>
