<route lang="json">
{
  "style": {
    "navigationBarTitleText": "AI对话"
  }
}
</route>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { aiModelList } from './const'

const router = useRouter()

// 卡片描述，可根据模型名自定义
const aiDescMap: Record<string, string> = {
  'deepseek-r1': '更强大的推理与创作能力',
  'doubao': '多模态视觉理解与生成',
  '通义千问': '阿里通义千问大模型',
  '智谱清言': '智谱AI大模型',
}

function handleCardClick(model: string) {
  // 跳转到对应聊天页面，假设路由为 /pages/ai/模型名
  router.push(`/pages/ai/${model}`)
}
</script>

<template>
  <view class="ai-card-list">
    <view
      v-for="item in aiModelList"
      :key="item.model"
      class="ai-card"
      @click="handleCardClick(item.icon!)"
    >
      <image
        class="ai-card-logo"
        :src="`/static/images/${item.icon}.png`"
        mode="aspectFit"
      />
      <view class="ai-card-title">
        {{ item.model.toUpperCase() }}
      </view>
      <view class="ai-card-desc">
        {{ aiDescMap[item.name!] || 'AI智能助手' }}
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.ai-card-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-start;
  gap: 32rpx;
  padding: 48rpx 24rpx;
  min-height: 100vh;
  background: linear-gradient(135deg, #f3eaff 0%, #e6f0ff 100%);
}

.ai-card {
  width: 320rpx;
  height: 360rpx;
  background: #fff;
  border-radius: 32rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: box-shadow 0.2s;
  padding: 32rpx 0;
  &:active {
    box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.12);
  }
}

.ai-card-logo {
  width: 96rpx;
  height: 96rpx;
  margin-bottom: 24rpx;
}

.ai-card-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #222;
  margin-bottom: 12rpx;
}

.ai-card-desc {
  font-size: 26rpx;
  color: #888;
  text-align: center;
  padding: 0 12rpx;
}
</style>
