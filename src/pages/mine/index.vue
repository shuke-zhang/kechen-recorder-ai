<route  lang="json" type="mine">
  {
    "style": { "navigationBarTitleText": "柯臣" ,"navigationStyle": "custom" }

  }
</route>

<script setup lang="ts">
import { aiModelList } from '../ai/const'
import { useAiStore } from '@/store/modules/ai'
import { useCheckAppVersion } from '@/hooks/useCheckAppVersion'

// 直接解构会丢失响应式数据 也可以用 storeToRefs https://pinia.vuejs.org/zh/api/modules/pinia.html#storetorefs
const userInfo = useUserStore()
const aiStore = useAiStore()
const router = useRouter()
const aiVisible = ref(false)
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
const { visible, downloadUrl, updateList, downloadApp, onCheckNewVersion } = useCheckAppVersion()
const listFeature = [
  {
    title: '模型切换',
    icon: '/images/icons/user-feature-switch.png',
    function: onAiModelSwitch,
  },
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

const handleClickFeature = debounce((item: any) => {
  if (item.path) {
    router.push(item.path)
  }
  if (item.function) {
    item.function()
  }
  else {
    showToast('敬请期待！')
  }
}, 300)

function onCheckUpdate() {
  // checkNewVersion(true)
  onCheckNewVersion(true)
}

/** 模型切换 */
function onAiModelSwitch() {
  aiVisible.value = true
}
/** 返回到ai页面 */
function onAiPage() {
  router.replace('/pages/recorder-ai/index')
}

function handleCardClick(model?: typeof aiModelList[number]['name']) {
  if (model) {
    // router.push(`/pages/recorder-ai/index`, { modelName: model })
    aiStore.switchAiModel(model)
    aiVisible.value = false
  }
}

// onBackPress((options) => {
//   console.log('用户触发返回行为')

//   if (options.from === 'backbutton') {
//     console.log('安卓物理返回键')
//     onAiPage()
//   }

//   return false
// })
</script>

<template>
  <nav-bar custom-click @click="onAiPage">
    <text>
      柯臣
    </text>
  </nav-bar>
  <view class="mine-bg-container" :style="userHeightStyle">
    <view class="w-full h-full  flex-center">
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

  <sk-popup v-model="aiVisible" type="bottom">
    <view class="card bg-black-2">
      <view class="flex w-full justify-end">
        <view class=" size-50rpx flex-center" @click="aiVisible = false">
          <icon-font name="close" size="60" />
        </view>
      </view>

      <view class="flex flex-wrap justify-center gap-32rpx mt-20rpx">
        <view
          v-for="item in aiModelList"
          :key="item.model"
          class="size-300rpx bg-white rounded-32rpx shadow-[0_4rpx_24rpx_rgba(0,_0,_0,_0.08)] flex flex-col items-center justify-center  "

          :class="{ isCurrent: item.name === aiStore.currentAiModel }"
          @click="handleCardClick(item.name)"
        >
          <image
            class="size-96rpx mb-24rpx"
            :src="`/static/images/ai-logo/${item.icon}.png`"
            mode="aspectFit"
          />
          <view class=" text-black-1 mb-12rpx font-bold">
            {{ item.subTitle }}
          </view>
          <view class="text-small text-black-2 text-align-center px-12rpx">
            {{ item.mark || 'AI智能助手' }}
          </view>
        </view>
      </view>
    </view>
  </sk-popup>
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

.isCurrent {
  border: 1rpx solid #1ec6b6;
  box-shadow: 0 0 12rpx rgba(30, 198, 182, 0.4); // 添加绿色阴影
}
</style>
