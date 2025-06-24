import { defineStore } from 'pinia'
import { aiModelList } from '@/pages/ai/const'

export const useAiStore = defineStore('id', () => {
  const defaultModel = aiModelList[1].name
  const cachedModel = getCache('AI_MODEL')
  // 如果没有缓存，初始化写入默认值
  if (!cachedModel) {
    setCache('AI_MODEL', defaultModel)
  }
  /**
   * 模型
   */
  const currentAiModel = ref<typeof aiModelList[number]['name']>(getCache('AI_MODEL') || defaultModel)

  /** 切换aiModel模型 */
  function switchAiModel(model: typeof aiModelList[number]['name']) {
    currentAiModel.value = model
    setCache('AI_MODEL', model)
  }

  return {
    currentAiModel,
    switchAiModel,
  }
})
