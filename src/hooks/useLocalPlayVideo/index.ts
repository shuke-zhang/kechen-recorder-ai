export function useLocalPlayVideo() {
  /**
   * 本地视频是否可用
   *  - uninitialized: 未初始化
   *  - has: 扫描到至少 1 个符合格式的视频
   *  - empty: 为空不可用
   *  - denied: 权限被拒绝
   */
  const localVideoStatus = ref<'uninitialized' | 'has' | 'empty' | 'denied'>('uninitialized')

  /**
   * 本地视频列表 - 视频名称不可以直接用来播放
   */
  const localVideoNameList = ref<string[]>([])

  const folderPath = '/storage/emulated/0/chat_video'
  /**
   * 视频文件夹路径
   * 注意：在 Android 上，必须使用绝对路径
   */
  const localVideoList = computed(() => {
    return localVideoNameList.value.map(name => `file:///storage/emulated/0/chat_video/${name}`)
  })

  /**
   * 屏保视频列表 - 只包含名称中包含 "screensaver" 的视频
   */
  const localScreensaverVideoList = computed(() => {
    return localVideoNameList.value.map(name => `file:///storage/emulated/0/chat_video/${name}`).filter((name) => {
      return name.includes('screensaver')
    })
  })

  /**
   * 等待视频列表 - 表示静默时播放
   */
  const localWaitingVideoList = computed(() => {
    return localVideoNameList.value.map(name => `file:///storage/emulated/0/chat_video/${name}`).filter((name) => {
      return name.includes('wait')
    })
  })

  /**
   * 说话时视频列表 - 表示说话时播放
   */
  const localSpeakingVideoList = computed(() => {
    return localVideoNameList.value.map(name => `file:///storage/emulated/0/chat_video/${name}`).filter((name) => {
      return name.includes('say')
    })
  })

  /**
   * 检查权限问题
   */
  async function requestPermission(): Promise<boolean> {
    return new Promise((resolve) => {
      plus.android.requestPermissions(['android.permission.READ_EXTERNAL_STORAGE', 'android.permission.WRITE_EXTERNAL_STORAGE'], (result: any) => {
        resolve(result.granted.length > 0)
      }, (error: any) => {
        console.error('❌ 权限请求失败', error)
        localVideoStatus.value = 'denied'
        resolve(false)
      })
    })
  }
  /**
   * 扫描指定目录下的视频文件
   */
  async function initFolder() {
    const hasPermission = await requestPermission()
    if (!hasPermission) {
      uni.showToast({ title: '请先开启文件权限', icon: 'none' })
      return
    }

    const file = plus.android.newObject('java.io.File', folderPath)
    const exists = plus.android.invoke(file, 'exists')
    console.log('📄 文件存在:', exists)
    if (!exists) {
      const created = plus.android.invoke(file, 'mkdirs')
      if (!created) {
        uni.showToast({ title: '❌ 目录创建失败', icon: 'none' })
        return
      }
      console.log('✅ chat_video 文件夹已创建')
    }
    else {
      console.log('📁 chat_video 文件夹已存在')
    }

    const files = plus.android.invoke(file, 'listFiles')
    const extensions = ['.mp4', '.avi', '.mov']
    const results: string[] = []

    for (let i = 0; i < files.length; i++) {
      const name = plus.android.invoke(files[i], 'getName')
      if (extensions.some(ext => name.toLowerCase().endsWith(ext))) {
        results.push(name)
      }
    }

    if (results.length === 0) {
      console.log('📭 没有视频文件')
      localVideoStatus.value = 'empty'
    }
    else {
      console.log(`🎬 检测到 ${results.length} 个视频：`, results)
      localVideoStatus.value = 'has'
    }

    localVideoNameList.value = results
  }

  return {
    /**
     * 本地视频名字列表 - 视频名称列表
     */
    localVideoNameList,
    /**
     * 本地全部视频列表 - 视频文件路径可以直接播放
     */
    localVideoList,
    /**
     * 屏保视频列表 - 视频文件路径可以直接播放
     */
    localScreensaverVideoList,
    /**
     * 等待视频列表 - 视频文件路径可以直接播放
     */
    localWaitingVideoList,
    /**
     * 说话时视频列表 - 视频文件路径可以直接播放
     */
    localSpeakingVideoList,
    /**
     * 本地视频是否可用
     *  - uninitialized: 未初始化
     *  - has: 扫描到至少 1 个符合格式的视频
     *  - empty: 为空不可用
     *  - denied: 权限被拒绝
     */
    localVideoStatus,
    /**
     * 请求权限
     */
    requestPermission,
    /**
     * 初始化视频文件夹
     */
    initFolder,

  }
}
