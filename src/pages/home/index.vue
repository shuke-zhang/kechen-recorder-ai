<route  lang="json" type="page">
  {
    "style": { "navigationBarTitleText": "柯臣" }
  }
</route>

<script setup lang="ts">
import { useCheckAppVersion } from '@/hooks'

const router = useRouter()

const { checkNewVersion } = useCheckAppVersion()

router.ready(() => {
  console.log('版本')
  checkNewVersion()
})
</script>

<template>
  <view>首页</view>
</template>

<style scoped lang="scss">

</style>
