<route lang="json" type="home">
{
  "style": { "navigationBarTitleText": "柯臣" }
}
</route>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'

const router = useRouter()
const isWifi = ref(false)
const checking = ref(true)
const ssid = ref('')

// 跳转到主页面
function goHome() {
  router.push('/pages/recorder-ai/index')
}

// 跳转到Wi-Fi设置页（你可根据平台做不同处理）
function openWifiSetting() {
  // 微信小程序
  if (uni.navigateToMiniProgram) {
    uni.navigateToMiniProgram({
      appId: 'wx8f9b0b5c8492f6fa', // “系统WiFi助手”小程序
      path: 'pages/index/index',
    })
    return
  }
  // App端兼容写法
  if (uni.openSetting) {
    uni.openSetting({})
    return
  }
  uni.showToast({ title: '请手动前往系统设置连接Wi-Fi', icon: 'none' })
}

function checkNetwork() {
  uni.getNetworkType({
    success: (res) => {
      console.log(res, '检查网络类型成功')

      if (res.networkType !== 'wifi') {
        isWifi.value = false
        checking.value = true
        uni.showModal({
          title: '提示',
          content: '请连接Wi-Fi网络，是否前往Wi-Fi设置？',
          confirmText: '去连接',
          cancelText: '留在本页',
          success: (modalRes) => {
            if (modalRes.confirm) {
              openWifiSetting()
            }
          },
        })
      }
      else {
        isWifi.value = true
        console.log('是wifi')
        // 检查 Wi-Fi 名称（仅App/小程序端支持）
        uni.getConnectedWifi().then((res) => {
          console.log(res, '是wifi-res内容')
        })
        // uni.getConnectedWifi.({
        //   success: (wifiRes) => {
        //     console.log(wifiRes, 'wifiRes内容')

        //     // ssid.value = wifiRes.wifi.SSID || ''
        //     // if (ssid.value.includes('kechen')) {
        //     //   // Wi-Fi 名称符合，直接跳转
        //     // //   goHome()
        //     // }
        //     // else {
        //     //   uni.showModal({
        //     //     title: 'Wi-Fi不正确',
        //     //     content: '请连接名称中包含“kechen”的Wi-Fi。是否前往Wi-Fi设置？',
        //     //     confirmText: '去连接',
        //     //     cancelText: '留在本页',
        //     //     success: (modalRes) => {
        //     //       if (modalRes.confirm) {
        //     //         openWifiSetting()
        //     //       }
        //     //     },
        //     //   })
        //     // }
        //   },
        //   fail: () => {
        //     console.log('获取Wi-Fi信息失败getConnectedWifi')

        //     showToastError('获取Wi-Fi信息失败')
        //   },
        // })
      }
    },
    fail: (err) => {
      console.log('检查网络类型成功', err)
    //   showToastError('网络检测失败')
    },
  })
}

onShow(() => {
  checking.value = true
  nextTick(checkNetwork)
})
</script>

<template>
  <view class="container">
    <view v-if="checking || !isWifi" class="mt-80rpx flex-center flex-col ">
      <text class=" text-black-1">
        请连接名为“kechen”的Wi-Fi才能进入页面
      </text>
      <view class="mt-40rpx text-color-#888">
        当前Wi-Fi：<text>{{ ssid || '未连接' }}</text>
      </view>
      <button type="primary" class="mt-60rpx" @click="checkNetwork">
        刷新检测
      </button>

      <button type="primary" class="mt-60rpx" @click="goHome">
        跳转
      </button>
    </view>
    <!-- 检测通过会直接跳转页面 -->
  </view>
</template>

<style lang="scss">

</style>
