<route  lang="json" type="mine">
  {
    "style": { "navigationBarTitleText": "柯臣","navigationStyle": "custom" }

  }
</route>

<script setup lang="ts">
import { useCheckAppVersion } from '@/hooks/useCheckAppVersion'

// 直接解构会丢失响应式数据 也可以用 storeToRefs https://pinia.vuejs.org/zh/api/modules/pinia.html#storetorefs
const userInfo = useUserStore()
const router = useRouter()
const userHeightStyle = computed(() => {
  return {
    height: '520rpx',
    backgroundImage: `url(${STATIC_URL}/images/user-bg.png)`,
    // 拉伸背景图片
    backgroundSize: '750rpx 520rpx',
    backgroundPosition: 'center bottom',
    backgroundRepeat: 'no-repeat',
  }
})
const { visible, downloadUrl, updateList, downloadApp, checkNewVersion } = useCheckAppVersion()
const listFeature = [
  {
    title: '意见反馈',
    icon: '/images/icons/user-feature-advice.png',
    // path: '/feature/pages/test/index',
  },
  {
    title: '关于我们',
    icon: '/images/icons/user-feature-about.png',
  },
  {
    title: '检查更新',
    icon: '/images/icons/user-feature-update.png',
    function: onCheckUpdate,
  },
]

function handleClickFeature(item: any) {
  if (item.path) {
    router.push(item.path)
  }
  if (item.function) {
    item.function()
  }
  else {
    showToast('敬请期待！')
  }
}

function onCheckUpdate() {
  console.log('检查更新')
  checkNewVersion(true)
}
</script>

<template>
  <view class="mine-bg-container" :style="userHeightStyle">
    <nav-bar transparent :show-back="false" />
    <view class="h-124rpx mt-20rpx  mx-32rpx flex-center">
      <view class="size-300rpx border-rd-124rpx bg-#ffffff flex-center">
        <image
          :src="`${STATIC_URL}/images/logo.png`"
          class="size-300rpx border-rd-36rpx "
          :class="userInfo.userInfo?.sex === '2' ? 'bg-#f7def0' : 'bg-#def0f7'"
        />
      </view>
    </view>
  </view>

  <view class="m-32rpx">
    <view class=" card card-form list-features">
      <view class="features-container">
        <view
          v-for="item in listFeature" :key="item.title"
          class="features-item flex items-center"
          @click="handleClickFeature(item)"
        >
          <image
            mode="aspectFill"
            :src="`${STATIC_URL}${item.icon}`"
          />
          <view class="flex items-center h-full title flex-1">
            <text>
              {{ item.title }}
            </text>
          </view>
          <icon-font
            name="right"
            color="#ccc"
            class="more"
            size="24"
          />
        </view>
      </view>
    </view>
  </view>

  <check-app-page v-model="visible" :update-list="updateList" @update-now="downloadApp(downloadUrl)" />
</template>

<style lang="scss">
.list-features {
  padding: 0 40rpx 0 40rpx;
  .features-container {
    image {
      width: 48rpx;
      height: 48rpx;
      margin-right: 20rpx;
    }
  }
}

.features-item {
  height: 100rpx;
  position: relative;

  &:not(:last-of-type) {
    .title {
      border-bottom: 1rpx solid;
      border-color: rgba(185, 183, 194, 0.5);
    }
  }

  .more {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    margin: auto 0;
    right: 30rpx;
  }
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-gap: 20rpx;
  padding: 40rpx 0;
}
</style>
