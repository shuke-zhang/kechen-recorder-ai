<route lang="json" type="page">
  {
    "style": { "navigationBarTitleText": "测试页面2" }
  }
</route>

<script setup lang="ts">
import { doubaoSpeechSynthesisFormat } from '@/api/audio'

onMounted(() => {
  doubaoSpeechSynthesisFormat({ text: '欢迎使用音频任务自动播放示例', id: 1 }).then((res) => {
    console.log('音频任务已添加', res)
  }).catch((err) => {
	console.error('音频任务添加失败', err)
  })
  .finally(() => {
    console.log('示例准备完毕')
  })
})
</script>

<template>
  <view>
    <view style="width:100vw;text-align: center; font-weight: bold; padding: 15px 0;">
      插件调试
    </view>
  
  </view>
</template>

<style scoped>
.content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
 
	.logo {
		height: 200rpx;
		width: 200rpx;
		margin-top: 200rpx;
		margin-left: auto;
		margin-right: auto;
		margin-bottom: 50rpx;
	}
 
	.text-area {
		display: flex;
		justify-content: center;
	}
 
	.title {
		font-size: 36rpx;
		color: #8f8f94;
	}

</style>
