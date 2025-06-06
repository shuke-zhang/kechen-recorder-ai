<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  updateList: string[]
}>()
const emit = defineEmits(['updateNow', 'remindLater'])

const model = defineModel<boolean>()
watch(model, (newVal) => {
  console.log('监听到了弹窗变化', newVal)
})
function handleUpdateNow() {
  emit('updateNow')
  model.value = false
}
function handleRemindLater() {
  emit('remindLater')
  model.value = false
}
onReady(() => {
  console.log('页面加载完成check-app-page')
})
</script>

<template>
  <popup v-model="model" type="center" :is-mask-click="false">
    <view class="check-app-bg">
      <view class="content-card">
        <view class="title">
          发现新版本
        </view>
        <image class="main-img" :src="`${STATIC_URL}/kezai/check-app-bg.png`" mode="widthFix" />
        <view class="update-list">
          <view v-for="(item, idx) in props.updateList" :key="idx" class="update-item">
            <text class="dot">
              •
            </text>
            <text class="desc">
              {{ item }}
            </text>
          </view>
        </view>
        <view class="btn-group">
          <button class="btn update" @click="handleUpdateNow">
            立即更新
          </button>
          <button class="btn remind" @click="handleRemindLater">
            稍后提醒
          </button>
        </view>
      </view>
    </view>
  </popup>
</template>

<style lang="scss" scoped>
.check-app-bg {
  width: 686rpx;
  min-height: 800rpx;
  border-radius: 32rpx;
  overflow: visible;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: transparent;
}
.main-img {
  width: 420rpx;
  margin-top: 32rpx;
  z-index: 1;
}
.content-card {
  width: 90%;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  margin-top: -40rpx;
  padding: 48rpx 24rpx 32rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 2;
}
.title {
  font-size: 44rpx;
  font-weight: bold;
  color: #333;
  text-align: center;
  margin-bottom: 24rpx;
}
.update-list {
  width: 100%;
  margin-bottom: 32rpx;
}
.update-item {
  display: flex;
  align-items: flex-start;
  font-size: 30rpx;
  color: #333;
  margin-bottom: 18rpx;
  .dot {
    color: #1ec6b6;
    font-size: 36rpx;
    margin-right: 16rpx;
    line-height: 1.2;
  }
  .desc {
    flex: 1;
    line-height: 1.6;
  }
}
.btn-group {
  display: flex;
  justify-content: space-between;
  width: 100%;
  .btn {
    flex: 1;
    height: 80rpx;
    border-radius: 40rpx;
    font-size: 32rpx;
    margin: 0 12rpx;
    &.update {
      background: #333;
      color: #fff;
    }
    &.remind {
      background: #e6f7f5;
      color: #1ec6b6;
      border: 2rpx solid #1ec6b6;
    }
  }
}
</style>
