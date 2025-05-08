<route lang="json">
  {
    "style": {
      "navigationBarTitleText": "组合式API桥接方案"
    }
  }
  </route>

  <!-- #ifdef APP -->
<script module="demoRender" lang="renderjs">
// eslint-disable-next-line ts/ban-ts-comment
// @ts-nocheck
export default {
  mounted() {
    console.log('📢 renderjs mounted，准备调用逻辑层 onRenderCall')
    setTimeout(() => {
      if (this.$ownerInstance?.callMethod) {
        console.log('📤 renderjs 开始 callMethod onRenderCall')
        this.$ownerInstance.callMethod('onRenderCall', {
          msg: 'hello from renderjs',
        })
      }
      else {
        console.error('❌ this.$ownerInstance.callMethod 不存在')
      }
    }, 500) // 加延迟以确保逻辑层挂载完成
  },
}
</script>
  <!-- #endif -->

<script setup lang="ts">
onMounted(() => {
  const instance = getCurrentInstance()
  console.log('📌 getCurrentInstance:', instance)

  if (instance?.proxy?.$scope) {
    console.log('✅ $scope 存在，开始挂载 onRenderCall')

    instance.proxy.$scope.onRenderCall = (e) => {
      console.log('🎯 renderjs 调用了逻辑层 onRenderCall@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@:', e)
      uni.showToast({ title: `收到：${e?.msg}`, icon: 'none' })
    }
  }
  else {
    console.error('❌ $scope 不存在')
  }
})
defineExpose({
  onRenderCall,
})
</script>

<template>
  <view class="container">
    <text>RenderJS 调用逻辑层示例</text>
    <view
      ref="renderView"
      type="renderjs"
      module="demoRender"
    />
  </view>
</template>

  <style>
  .container {
  padding: 50rpx;
}
</style>
