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
  watchValues?: any[]
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
  const isAutoScrolling = ref(false)
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
   *
   */
  const scrollToBottom = () => {
    if (hasUserScrolledUp.value) {
      return console.log('用户主动向上滚动，不自动滚动到底部')
    }
    nextTick(() => {
      isAutoScrolling.value = true
      getContentHeight().then((contentHeight) => {
        const scrollTops = contentHeight + extraPadding
        scrollTop.value = scrollTops || 0
        setTimeout(() => {
          isAutoScrolling.value = false
        }, 50)
      })
    })
  }

  /**
   * 处理滚动事件 似乎并不生效等待后续优化吧
   * @param e 滚动事件
   */
  const handleScroll = (e: any) => {
    const currentScrollTop = e.detail.scrollTop || 0
    // 保存当前滚动位置
    oldScrollTop.value = e.detail.scrollTop || 0
    if (isAutoScrolling.value) {
      // 🚫 自动滚动触发的 scroll，不处理
      return
    }
    // 检测用户是否主动向上滚动
    if (!isUserScrolling.value && oldScrollTop.value > currentScrollTop) {
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
  }

  function scrolltolower() {
    hasUserScrolledUp.value = false
  }

  /**
   * 重置用户滚动状态并强制滚动到底部
   * @warning 此方法会直接强制滚动，优先级高于用户滚动状态的检测
   */
  const resetAndScrollToBottom = () => {
    hasUserScrolledUp.value = false
    isUserScrolling.value = false
    if (userScrollTimer) {
      clearTimeout(userScrollTimer)
      userScrollTimer = null
    }
    scrollToBottom()
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
    scrolltolower,
  }
}
