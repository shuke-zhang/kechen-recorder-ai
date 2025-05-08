// hooks/useAutoScroll.ts
import type { ComponentPublicInstance } from 'vue'

interface AutoScrollOptions {
  /**
   * 内容列表
   */
  contentList: Ref<any[]>
  /**
   * Vue实例 - 用于获取组件实例引用
   */
  vueInstance: ComponentPublicInstance
  /**
   * 滚动视图的选择器
   */
  scrollViewSelector?: string
  /**
   * 滚动内容的选择器
   */
  scrollContentSelector?: string
  /**
   * 监听的其他反应式状态，当这些状态变化时将重新计算滚动位置
   */
  watchValues?: Ref<any>[]
  /**
   * 滚动时添加的额外边距
   */
  extraPadding?: number
  /**
   * 是否立即触发初始滚动
   */
  immediate?: boolean
}

/**
 * 自动滚动到底部的Hook
 * @param options 配置选项
 * @returns 滚动相关的值和方法
 */
export default function useAutoScroll(options: AutoScrollOptions) {
  const {
    contentList,
    vueInstance,
    scrollViewSelector = '.scroll-view',
    scrollContentSelector = '.scroll-content',
    watchValues = [],
    extraPadding = 0,
    immediate = true,
  } = options

  // 滚动位置
  const scrollTop = ref(0)
  // 滚动区域高度
  const scrollViewHeight = ref(0)
  // 内容高度
  const contentHeight = ref(0)
  // 上一次滚动位置，用于检测用户是否手动滚动
  const oldScrollTop = ref(0)
  // 是否用户正在手动滚动
  const isUserScrolling = ref(false)
  // 用户是否主动向上滚动，此时不应自动滚动到底部
  const hasUserScrolledUp = ref(false)
  // 计时器，用于重置用户滚动状态
  let userScrollTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * 获取滚动视图的高度
   */
  const getScrollViewHeight = () => {
    return new Promise<number>((resolve) => {
      uni.createSelectorQuery()
        .in(vueInstance)
        .select(scrollViewSelector)
        .boundingClientRect((data) => {
          if (data) {
            const height = (data as UniNamespace.NodeInfo).height || 0
            scrollViewHeight.value = height
            resolve(height)
          }
          else {
            resolve(0)
          }
        })
        .exec()
    })
  }

  /**
   * 获取内容的高度
   */
  const getContentHeight = () => {
    return new Promise<number>((resolve) => {
      uni.createSelectorQuery()
        .in(vueInstance)
        .select(scrollContentSelector)
        .boundingClientRect((data) => {
          if (data) {
            const height = (data as UniNamespace.NodeInfo).height || 0
            contentHeight.value = height
            resolve(height)
          }
          else {
            resolve(0)
          }
        })
        .exec()
    })
  }

  /**
   * 滚动到底部
   * @param force 是否强制滚动，忽略用户滚动状态
   */
  const scrollToBottom = async (force = false) => {
    // 如果用户向上滚动过且不是强制滚动，则不执行自动滚动
    if (hasUserScrolledUp.value && !force) {
      return
    }

    await nextTick()

    try {
      // 获取最新的视图高度和内容高度
      const viewHeight = await getScrollViewHeight()
      const cHeight = await getContentHeight()

      // 如果内容高度大于视图高度，滚动到底部
      if (cHeight > viewHeight) {
        // 设置滚动位置，添加额外边距确保滚到底部
        scrollTop.value = cHeight - viewHeight + extraPadding

        // 为确保滚动生效，可以在下一个渲染周期再次尝试
        setTimeout(() => {
          if (!hasUserScrolledUp.value || force) {
            scrollTop.value = cHeight
          }
        }, 50)
      }
    }
    catch (error) {
      console.error('滚动计算出错:', error)
    }
  }

  /**
   * 处理滚动事件
   * @param e 滚动事件
   */
  const handleScroll = (e: any) => {
    const currentScrollTop = e.detail.scrollTop

    // 检测用户是否主动向上滚动
    if (
      !isUserScrolling.value
      && oldScrollTop.value > currentScrollTop
      && contentHeight.value > scrollViewHeight.value
    ) {
      isUserScrolling.value = true
      hasUserScrolledUp.value = true

      // 清除之前的计时器
      if (userScrollTimer) {
        clearTimeout(userScrollTimer)
      }

      // 设置计时器，用户停止滚动3秒后重置状态
      userScrollTimer = setTimeout(() => {
        isUserScrolling.value = false
      }, 3000)
    }

    // 如果用户滚动到接近底部，重置用户滚动状态
    const isNearBottom = contentHeight.value - scrollViewHeight.value - currentScrollTop < 50
    if (isNearBottom) {
      hasUserScrolledUp.value = false
    }

    // 保存当前滚动位置
    oldScrollTop.value = currentScrollTop
  }

  /**
   * 重置用户滚动状态并强制滚动到底部
   */
  const resetAndScrollToBottom = () => {
    hasUserScrolledUp.value = false
    isUserScrolling.value = false
    if (userScrollTimer) {
      clearTimeout(userScrollTimer)
      userScrollTimer = null
    }
    scrollToBottom(true)
  }

  /**
   * 初始化获取高度信息
   */
  const initHeights = async () => {
    await getScrollViewHeight()
    await getContentHeight()
  }

  // 监听内容变化和其他需要监听的值
  watch(
    [contentList, ...watchValues],
    () => {
      if (contentList.value.length > 0) {
        scrollToBottom()
      }
    },
    { deep: true, immediate },
  )

  // 特别监听最后一条消息的内容变化（对流式输出有用）
  watch(
    () => contentList.value[contentList.value.length - 1]?.content,
    () => {
      if (contentList.value.length > 0) {
        scrollToBottom()
      }
    },
  )

  return {
    scrollTop,
    oldScrollTop,
    scrollViewHeight,
    contentHeight,
    isUserScrolling,
    hasUserScrolledUp,
    handleScroll,
    scrollToBottom,
    resetAndScrollToBottom,
    initHeights,
    getScrollViewHeight,
    getContentHeight,
  }
}
