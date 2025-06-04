import type { UniAppResponse, versionModel } from './types'

// 用于更新版本的json文件
// 版本号：version
// 下载地址：url
// 每次更新版本后需要将该文件需要和打包后的app文件上传到oss服务器
// 记住 这个json文件内不能有注释 否则会报错
export function useCheckAppVersion() {
  /**
   * 通过json检测最新版本
   */
  async function getVersionFromJson() {
    try {
      const nextVersion = await uni.request({
        url: 'https://shuke-zhang.oss-cn-chengdu.aliyuncs.com/kezai/version.json',
        method: 'GET',

      }) as UniAppResponse<versionModel>
      return nextVersion.data
    }
    catch (error) {
      console.log('收集到报错', error)
    }
  }

  /**
   * 检测当前版本
   */
  async function detectNewVersion() {
    try {
      if (!plus.runtime.appid)
        return ''
      return await new Promise<string>((resolve) => {
        plus.runtime.getProperty(plus.runtime.appid || '0', (widgetInfo) => {
          resolve(widgetInfo.version || '0')
        })
      })
    }
    catch (error) {
      console.log(error)
      return ''
    }
  }

  /**
   * 检测最新版本是否高于当前版本 如果是则更新如果不是则不更新
   */
  async function checkNewVersion() {
    try {
    // 获取线上/远程版本
      const nextVersionRes = await getVersionFromJson() // 比如 '1.3.68'
      const nextVersion = nextVersionRes?.version
      const downloadUrl = nextVersionRes?.appUrl || ''
      // 获取当前App本地版本
      const currentVersion = await detectNewVersion() // 比如 '1.3.67'
      console.log('本地版本:', currentVersion, '线上版本:', nextVersion)
      if (!nextVersion || !currentVersion)
        return

      // 对比版本号
      if (compareVersion(nextVersion, currentVersion) > 0) {
      // 有新版本，弹窗提示
        uni.showModal({
          title: '发现新版本',
          content: `最新版本：${nextVersion}\n当前版本：${currentVersion}\n是否前往更新？`,
          confirmText: '去更新',
          cancelText: '稍后',
          success: (res) => {
            if (res.confirm) {
              console.log('用户点击了确定按钮')
              downloadApp(downloadUrl)
            // 这里可跳转下载页面/应用商店，或调用更新逻辑
            // uni.navigateTo({ url: '/pages/update/index' })
            // 或调用你的自定义更新方法
            }
          },
        })
      }
      else {
        console.log('没有新版本')

      // 没有新版本，可选提示
      // uni.showToast({ title: '当前已是最新版本', icon: 'none' })
      }
    }
    catch (e) {
      console.error('检测新版本失败', e)
    }
  }
  /**
   * 比较版本号
   */
  function compareVersion(v1: string, v2: string) {
    const arr1 = v1.split('.').map(Number)
    const arr2 = v2.split('.').map(Number)
    for (let i = 0; i < Math.max(arr1.length, arr2.length); i++) {
      const n1 = arr1[i] || 0
      const n2 = arr2[i] || 0
      if (n1 > n2)
        return 1
      if (n1 < n2)
        return -1
    }
    return 0
  }

  /**
   * 下载最新版本
   */
  function downloadApp(url: string) {
    // 先打印下载地址，检查 URL 是否正确
    console.log('下载地址:', url)
    if (!url) {
      return console.error('下载地址为空')
    }
    const showLoading = plus.nativeUI.showWaiting('正在下载')
    const downloadTask = uni.downloadFile({
      url,
      success: (res) => {
        console.log('下载结果:', res) // 添加日志
        if (res.statusCode === 200) {
          console.log('开始安装:', res.tempFilePath) // 添加日志
          plus.runtime.install(
            res.tempFilePath,
            {
              force: false,
            },
            () => {
              console.log('安装成功') // 添加日志
              plus.nativeUI.closeWaiting()
              plus.runtime.restart()
            },
            (error) => {
              console.error('安装失败:', error) // 添加错误日志
              plus.nativeUI.closeWaiting()
              uni.showToast({
                title: `安装失败: ${error.message}`,
                icon: 'none',
                duration: 2000,
              })
            },
          )
        }
        else {
          console.error('下载状态码异常:', res.statusCode) // 添加错误日志
          plus.nativeUI.closeWaiting()
          uni.showToast({
            title: `下载失败: ${res.statusCode}`,
            icon: 'none',
            duration: 2000,
          })
        }
      },
      fail: (err) => {
        console.error('下载失败:', err) // 添加错误日志
        plus.nativeUI.closeWaiting()
        uni.showToast({
          title: `下载失败: ${err.errMsg}`,
          icon: 'none',
          duration: 2000,
        })
      },

    })

    downloadTask.onProgressUpdate((res) => {
      console.log('下载进度:', res.progress) // 添加日志
      if (res.progress > 0) { // 只在有实际进度时更新提示
        showLoading.setTitle(`正在下载${res.progress}%`)
      }
    })
  }

  return {
    checkNewVersion,
  }
}
