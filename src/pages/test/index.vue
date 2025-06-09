<route lang="json">
 {
      "style": { "navigationBarTitleText": "测试页面" }
 }
</route>

<script setup lang="ts">
const visible = ref(false)
const router = useRouter()
console.log(router.query, '录音传递的参数')

function checkVersion() {
  visible.value = true
}
router.ready(() => {
  console.log(router.query, '录音传递的参数2')
})
</script>

<template>
  <view class="audioPlay">
    <button class="mt-40rpx" type="primary" @click="checkVersion">
      版本更新
    </button>

    <check-app-page
      v-model="visible"
      :update-list="['修复启动闪退问题', '优化首页加载速度', '新增深色模式']"
    />
  </view>
</template>
