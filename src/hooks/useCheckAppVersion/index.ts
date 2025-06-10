import type { UniAppResponse, versionModel } from './types'

/**
 * @warn 注意
 *7
 * 1. 运行环境  仅限 **App** 端，H5 环境会报错
 * 2. 更新钱准备
 *    2.1 发布前必须更新 `script/version.json` version-版本号，appUrl-下载地址
 *    2.2 更新后需要将 version.json 文件和打包后的app文件上传到oss服务器
 *
 */
export function useCheckAppVersion() {
  const visible = ref(false) // 是否显示弹窗
  const downloadUrl = ref('') // 下载地址
  const updateList = ref<string[]>([]) // 更新内容列表
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
      downloadUrl.value = nextVersionRes?.appUrl || ''
      updateList.value = nextVersionRes?.updateList || []
      // 获取当前App本地版本
      const currentVersion = await detectNewVersion() // 比如 '1.3.67'
      console.log('本地版本:', currentVersion, '线上版本:', nextVersion)
      if (!nextVersion || !currentVersion)
        return

      // 对比版本号
      if (compareVersion(nextVersion, currentVersion) > 0) {
      // 有新版本，弹窗提示
        console.log('有新版本^^^^^^^^^^^^^^^^^^^^^^^', downloadUrl.value)
        visible.value = true
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
   * 下载并安装更新包（同时兼容 .apk / .wgt / .wgtu 及 .zip 容器）
   * @param url 远程文件地址
   */
  function downloadApp(url: string): void {
    if (!url) {
      uni.showToast({ title: '下载地址为空', icon: 'none' })
      return
    }

    const waiting = plus.nativeUI.showWaiting('正在下载 0%')

    /* ---------- 开始下载 ---------- */
    const task = uni.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode !== 200) {
          showError(`下载失败（${res.statusCode}）`)
          return
        }

        const tempPath = res.tempFilePath

        if (/\.zip$/i.test(url)) {
          unzipAndInstall(tempPath)
        }
        else {
          installPackage(tempPath)
        }
      },
      fail: err => showError(`下载失败：${err.errMsg}`),
    })
    let lastTitleUpdate = 0
    task.onProgressUpdate(({ progress }) => {
      const now = Date.now()
      if (now - lastTitleUpdate > 300) { // 每 300ms 更新一次 UI
        lastTitleUpdate = now
        waiting.setTitle(`正在下载 ${progress}%`)
      }

      if (progress === 100) {
        waiting.setTitle('正在安装...')
        setTimeout(() => {
          waiting.close()
        }, 300)
      }
    })
  }
  /* ---------- 通用报错 ---------- */
  function showError(msg: string) {
    console.error(msg)
    plus.nativeUI.closeWaiting()
    uni.showToast({ title: msg, icon: 'none', duration: 2500 })
  }

  /* ---------- 安装包 ---------- */
  function installPackage(pkgPath: string) {
    plus.runtime.install(
      pkgPath,
      { force: false },
      () => {
        // plus.nativeUI.closeWaiting()
      },
      err => showError(`安装失败：${err.message}`),
    )
  }
  /* ---------- 递归扫描目录并安装 ---------- */
  function scanAndInstall(dirPath: string) {
    plus.io.resolveLocalFileSystemURL(
      dirPath,
      (entry: any) => {
        if (entry.isFile) {
          const name = (entry.name as string).toLowerCase()
          if (/\.(?:apk|wgt|wgtu)$/.test(name)) {
            installPackage(entry.fullPath)
            return
          }
        }

        if (entry.isDirectory) {
          const reader = (entry as any).createReader()
          reader.readEntries((entries: any[]) => {
            for (const item of entries) {
              if (item.isDirectory) {
                scanAndInstall(item.fullPath)
              }
              else if (/\.(?:apk|wgt|wgtu)$/.test((item.name as string).toLowerCase())) {
                installPackage(item.fullPath)
                return
              }
            }
          })
        }
      },
      err => showError(`读取目录失败：${err.message}`),
    )
  }
  /**
   * ZIP 解压 + 安装
   */
  function unzipAndInstall(zipPath: string) {
    const docDir: string = plus.io.convertLocalFileSystemURL('_doc')

    const targetDir: string = `${docDir.startsWith('file://') ? docDir : `file://${docDir}`}/update_${Date.now()}/`

    if (zipPath && targetDir) {
      plus.zip.decompress(zipPath, targetDir, () => {
        scanAndInstall(targetDir)
      }, () => {
        console.log('解压失败')
      })
    }
  }
  return {
    visible,
    downloadUrl,
    updateList,
    checkNewVersion,
    downloadApp,
  }
}
