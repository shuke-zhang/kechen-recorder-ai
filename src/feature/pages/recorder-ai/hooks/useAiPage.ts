export default function useAiPage(height: string) {
  /**
   * ai 页面内容样式
   * ${getStatusBarHeight() + NAV_BAR_HEIGHT + 1}px 顶部导航栏高度 + 1px 底部安全区域高度
   * 120rox 底部发送按钮高度
   */
  const aiPageContent = computed(() => {
    return {
      height: `calc(100vh - ${height} -  120rpx)`,
      backgroundImage: `url(/static/images/aiPageBg.gif)`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',

    }
  })
  return {
    aiPageContent,
  }
}
