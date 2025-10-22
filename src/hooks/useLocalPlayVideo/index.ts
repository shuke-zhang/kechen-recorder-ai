export function useLocalPlayVideo(networkVideoUrls?: string[], videoType?: 'screensaver' | 'waiting' | 'speaking') {
  const localVideoStatus = ref<'uninitialized' | 'has' | 'empty' | 'denied'>('uninitialized')
  const localVideoNameList = ref<string[]>([])

  const folderPath = '/storage/emulated/0/chat_video'

  const localVideoList = computed(() =>
    localVideoNameList.value.map(name => `file://${folderPath}/${name}`),
  )

  const localScreensaverVideoList = computed(() =>
    localVideoList.value.filter(path => path.includes('screensaver')),
  )

  const localWaitingVideoList = computed(() =>
    localVideoList.value.filter(path => path.includes('wait')),
  )

  const localSpeakingVideoList = computed(() =>
    localVideoList.value.filter(path => path.includes('say')),
  )

  async function requestPermission(): Promise<boolean> {
    return new Promise((resolve) => {
      plus.android.requestPermissions([
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
      ], (result) => {
        resolve(result.granted.length > 0)
      }, (error) => {
        console.error('❌ 权限请求失败', error)
        localVideoStatus.value = 'denied'
        resolve(false)
      })
    })
  }

  async function initFolder() {
    const hasPermission = await requestPermission()
    if (!hasPermission) {
      // uni.showToast({ title: '请先开启文件权限', icon: 'none' })
      return
    }

    const file = plus.android.newObject('java.io.File', folderPath)
    const exists = plus.android.invoke(file, 'exists')
    if (!exists) {
      const created = plus.android.invoke(file, 'mkdirs')
      if (!created) {
        // uni.showToast({ title: '❌ 目录创建失败', icon: 'none' })
        return
      }
      console.log('✅ chat_video 文件夹已创建')
    }

    const files = plus.android.invoke(file, 'listFiles')
    const extensions = ['.mp4', '.avi', '.mov']
    const allFiles: string[] = []

    for (let i = 0; i < files.length; i++) {
      const name = plus.android.invoke(files[i], 'getName')
      if (extensions.some(ext => name.toLowerCase().endsWith(ext))) {
        allFiles.push(name)
      }
    }

    localVideoNameList.value = allFiles

    if (allFiles.length === 0) {
      console.log('📭 没有视频文件')
      localVideoStatus.value = 'empty'
      return
    }

    // 根据 videoType 判断是否有符合的子集
    let matchedList: string[] = []

    const fullPathList = allFiles.map(name => `file://${folderPath}/${name}`)

    if (videoType === 'screensaver') {
      matchedList = fullPathList.filter(name => name.includes('screensaver'))
    }
    else if (videoType === 'waiting') {
      matchedList = fullPathList.filter(name => name.includes('wait'))
    }
    else if (videoType === 'speaking') {
      matchedList = fullPathList.filter(name => name.includes('say'))
    }
    else {
      matchedList = fullPathList
    }

    if (matchedList.length === 0) {
      console.warn(`⚠️ 视频类型 ${videoType || '全部'} 匹配为空`)
      networkVideoToLocal(networkVideoUrls || [])
      localVideoStatus.value = 'empty'
    }
    else {
      console.log(`🎬 匹配 ${videoType || '全部'} 视频 ${matchedList.length} 个`)
      localVideoStatus.value = 'has'
    }
  }

  function networkVideoToLocal(videoUrlList: string[]) {
    if (!videoUrlList || videoUrlList.length === 0)
      return

    videoUrlList.forEach((videoUrl) => {
      const fileName = videoUrl.split('/').pop() || `video_${Date.now()}.mp4`
      const savePath = `${folderPath}/${fileName}`
      console.log(`📥 准备下载视频：${videoUrl} 到 ${savePath}`)
      const fullPath = `file://${savePath}`
      const downloadTask = plus.downloader.createDownload(
        videoUrl,
        { filename: fullPath },
        (download, status) => {
          if (status === 200) {
            console.log(`✅ 下载成功: ${fileName}`)
            // 下载成功后你可以选择触发重新扫描视频列表
          }
          else {
            console.error(`❌ 下载失败: ${fileName}, 状态码: ${status}`)
          }
        },
      )
      // 启动下载
      downloadTask.start()
    })
  }

  return {
    localVideoNameList,
    /**
     * 本地视频列表
     */
    localVideoList,
    /**
     * 本地屏保视频列表
     */
    localScreensaverVideoList,
    /**
     * 本地等待视频列表
     */
    localWaitingVideoList,
    /**
     * 本地说话视频列表
     */
    localSpeakingVideoList,
    /**
     * 本地视频状态
     * @warning 根据 videoType  判断是否有符合的子集
     * 可能值：
     * - 'uninitialized'：未初始化
     * - 'has'：有符合条件的视频
     * - 'empty'：没有符合条件的视频
     * - 'denied'：权限被拒绝
     */
    localVideoStatus,
    /**
     * 请求文件权限
     */
    requestPermission,
    /**
     * 初始化视频文件夹
     */
    initFolder,
    /**
     * 下载网络视频到本地
     */
    networkVideoToLocal,
  }
}
