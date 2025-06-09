<route  lang="json" type="home">
  {
    "style": { "navigationBarTitleText": "柯臣" }
  }
</route>

<script setup lang="ts">
import { aiModelList } from '../ai/const'

const router = useRouter()

function handleCardClick(model?: typeof aiModelList[number]['model']) {
  if (model) {
    // router.push(`/pages/recorder-ai/index`, { modelName: model, id: 123 })
    uni.navigateTo({
      url: `/pages/recorder-ai/index?modelName=${model}&id=123`,
    })
  }
}
</script>

<template>
  <view class="container min-h-100vh bg-[linear-gradient(135deg,_#f3eaff_0%,_#e6f0ff_100%)]">
    <view class="flex flex-wrap justify-center gap-32rpx ">
      <view
        v-for="item in aiModelList"
        :key="item.model"
        class="size-300rpx bg-white rounded-32rpx shadow-[0_4rpx_24rpx_rgba(0,_0,_0,_0.08)] flex flex-col items-center justify-center  "
        @click="handleCardClick(item.name)"
      >
        <image
          class="size-96rpx mb-24rpx"
          :src="`/static/images/${item.icon}.png`"
          mode="aspectFit"
        />
        <view class=" text-black-1 mb-12rpx font-bold">
          {{ item.name }}
        </view>
        <view class="text-small text-black-2 text-align-center px-12rpx">
          {{ item.mark || 'AI智能助手' }}
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">

</style>
