/**
 * 音频播放回调函数
 */
export interface PlayAudioCallbackModel {
  /**
   * 音频播放事件
   */
  onPlay?: () => void
  /**
   * 音频停止事件
   */
  onStop?: () => void
  /**
   * 音频播放错误事件
   */
  onError?: (res: any) => void
  /**
   * 音频自然播放结束事件
   */
  onEnded?: (res: any) => void
  /**
   * 音频播放进度更新事件
   */
  onTimeUpdate?: () => void
}

export default function usePlayAudio(RecordApp?: any) {
  /**
   * @description 播放初始化
   * @options
   * - _buffers 传入的buffers数组
   * @returns
   * - audioBuffers 将多个buffer组成的列表组合成一个
   * - wavBuffer wav数据格式 通过这个来保存数据 民命为wav主要是我生成的是wav文件没有其他意思
   * - audioBase64 wav数据格式base64
   */
  function playAudioInit(_buffers: ArrayBuffer[]) {
    const audioBuffers = mergeArrayBuffers(_buffers)
    const wavBuffer = encodeBufferToWav(audioBuffers, 16000)
    const audioBase64 = arrayBufferToBase64(wavBuffer)
    return {
      audioBuffers,
      wavBuffer,
      audioBase64,
    }
  }

  /**
   * 合并多个ArrayBuffer
   */
  function mergeArrayBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
    const totalLength = buffers.reduce((sum, buf) => sum + buf.byteLength, 0)
    const merged = new Uint8Array(totalLength)

    let offset = 0
    for (const buf of buffers) {
      merged.set(new Uint8Array(buf), offset)
      offset += buf.byteLength
    }

    return merged.buffer
  }

  /**
   * @description 将PCM数据编码为WAV格式
   *  - pcmBuffer - PCM数据
   *  - sampleRate - 采样率
   *  - numChannels - 声道数
   */
  function encodeBufferToWav(pcmBuffer: ArrayBuffer, sampleRate = 16000, numChannels = 1): ArrayBuffer {
    const pcm = new Int16Array(pcmBuffer)
    const wavBuffer = new ArrayBuffer(44 + pcm.length * 2)
    const view = new DataView(wavBuffer)

    function writeString(view: DataView, offset: number, str: string) {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i))
      }
    }

    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF')
    view.setUint32(4, 36 + pcm.length * 2, true)
    writeString(view, 8, 'WAVE')

    writeString(view, 12, 'fmt ')
    view.setUint32(16, 16, true) // Subchunk1Size
    view.setUint16(20, 1, true) // AudioFormat = PCM
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * numChannels * 2, true)
    view.setUint16(32, numChannels * 2, true)
    view.setUint16(34, 16, true) // BitsPerSample

    writeString(view, 36, 'data')
    view.setUint32(40, pcm.length * 2, true)

    let offset = 44
    for (let i = 0; i < pcm.length; i++, offset += 2) {
      view.setInt16(offset, pcm[i], true)
    }

    return wavBuffer
  }

  // 1. Base64 转 ArrayBuffer
  function base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes
  }

  /**
   * @description 播放文件
   */
  function playAudio(savePath: string, callBack?: PlayAudioCallbackModel) {
    const ctx = uni.createInnerAudioContext()
    ctx.src = savePath
    // ctx.obeyMuteSwitch = false
    ctx.onError((res) => {
      console.log(res, '音频播放错误')
      uni.removeSavedFile({
        filePath: savePath,
        success: () => {
          console.log(`🗑️ 文件已删除: ${savePath}`)
        },
        fail: (err) => {
          console.warn('⚠️ 文件删除失败:', err)
        },
      })
      if (callBack) {
        callBack.onError && callBack.onError(res)
      }
      ctx.destroy()
    })
    ctx.onEnded((res) => {
      uni.removeSavedFile({
        filePath: savePath,
        success: () => {
          console.log(`🗑️ 文件已删除: ${savePath}`)
        },
        fail: (err) => {
          console.warn('⚠️ 文件删除失败:', err)
        },
      })
      console.log(res.errMsg, '音频播放结束')
      if (callBack) {
        callBack.onEnded && callBack.onEnded(res)
      }
      ctx.destroy()
    })
    ctx.onPlay(() => {
      console.log('音频开始播放')
      if (callBack) {
        callBack.onPlay && callBack.onPlay()
      }
    })
    ctx.onTimeUpdate(() => {
      console.log('音频播放进度更新事件')
    })
    ctx.play()
  }
  /**
   * @description 生成文件名
   * - type 文件类型
   */
  function getFileName(type: string, prefix = 'local') {
    const now = new Date()
    const fileName = `${prefix}-${
      now.getFullYear()}${
      String(now.getMonth() + 1).padStart(2, '0')}${
      String(now.getDate()).padStart(2, '0')}${
      String(now.getHours()).padStart(2, '0')}${
      String(now.getMinutes()).padStart(2, '0')}${
      String(now.getSeconds()).padStart(2, '0')}${
      String(now.getMilliseconds()).padStart(3, '0')}-${
      Math.random().toString().slice(2, 8)
    }.${type || 'bin'}`
    return fileName
  }

  /**
   * 将 ArrayBuffer 转为 base64
   */
  function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = ''
    const bytes = new Uint8Array(buffer)
    const len = bytes.byteLength
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  /**
   * 将 base64 转回 ArrayBuffer
   */
  function base64ToArrayBuffer(base64: string): ArrayBuffer {
    // 1. 解码Base64为二进制字符串
    const binaryString = atob(base64)
    // 2. 创建一个新的Uint8Array来保存解码后的数据
    const arrayBuffer = new ArrayBuffer(binaryString.length)
    const uint8Array = new Uint8Array(arrayBuffer)
    // 3. 将二进制字符串中的每个字符转换为Uint8Array的相应值
    for (let i = 0; i < binaryString.length; i++) {
      uint8Array[i] = binaryString.charCodeAt(i)
    }
    return arrayBuffer
  }

  /**
   * 统一上传文件的接口
   */
  function uploadFileAudio(options: {
    wavBuffer: ArrayBuffer
    /** 文件类型 */
    fileType: string
    /** 文件名前缀 */
    fileNamePre: string
    /** 文件名字 */
    _fileName?: string
  }): Promise<any> {
    return new Promise((resolve, reject) => {
      const fileName = options._fileName || getFileName(options.fileType, options.fileNamePre)
      RecordApp.UniSaveLocalFile(
        fileName,
        options.wavBuffer,
        (savedPath: string) => {
          console.log(`✅ 文件已保存到本地: ${savedPath}`)
          uni.uploadFile({
            url: `${API_URL}/common/upload/v1`,
            filePath: savedPath,
            name: 'file',
            header: {
              'Content-Type': 'multipart/form-data',
            },
            success: (res) => {
              try {
                const data = JSON.parse(res.data)
                console.log('✅ 文件上传成功:', data)

                // 删除本地临时文件
                uni.removeSavedFile({
                  filePath: savedPath,
                  success: () => {
                    console.log(`🗑️ 文件已删除: ${savedPath}`)
                    resolve(data)
                  },
                  fail: (err) => {
                    console.warn('⚠️ 文件删除失败:', err)
                    resolve(data) // 删除失败不影响上传成功
                  },
                })
              }
              catch (e) {
                throw new Error (`文件上传响应解析失败: ${e}`)
              }
            },
            fail: (err) => {
              console.warn('❌ 文件上传失败:', err)
              reject(err)
            },
          })
        },
        (err: Error) => {
          console.error('❌ 保存失败:', err)
          reject(err)
        },
      )
    })
  }

  /**
   * 保存 buffer 为文件，使用 uni.recorder 播放后自动删除
   */
  async function saveAndPlayBase64MP3(options: {
    base64: string // MP3 格式的 base64 音频
    fileNamePre?: string // 临时文件前缀
    audioCallback?: PlayAudioCallbackModel
  }): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const fileName = getFileName('mp3', options.fileNamePre)
      const arrayBuffer = mp3Base64ToArrayBuffer(options.base64) // 将 base64 转为 ArrayBuffer
      RecordApp.UniSaveLocalFile(
        fileName,
        arrayBuffer,
        (savedPath: string) => {
          console.log(`✅ MP3文件已保存: ${savedPath}`)
          playAudio(savedPath, options.audioCallback)
        },
        (err: Error) => {
          console.error('❌ 保存失败:', err)
          reject(err)
        },
      )
    })
  }

  function mp3Base64ToArrayBuffer(base64: string): ArrayBuffer {
  // 去掉 data URI 头部（如果有）
    const pureBase64 = base64.replace(/^data:audio\/\w+;base64,/, '')
    const binaryString = atob(pureBase64) // base64 解码成二进制字符串

    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    return bytes.buffer // 返回 ArrayBuffer
  }
  return {
    /** 合并多个ArrayBuffer */
    mergeArrayBuffers,
    /** 将PCM数据编码为WAV格式 */
    encodeBufferToWav,
    base64ToUint8Array,
    /** 播放 */
    playAudio,
    /**
     * @description 播放初始化 options
     * - pcmBuffers 传入pcm数据流数组
     * - _fileName 文件名 可选
     * - isAutoPlay 是否自动播放
     * - isSave 是否保存文件
     * @returns
     * - pcmBuffer pcm数据格式
     * - wavBuffer wav数据格式
     * - pcmBase64 pcm数据格式base64
     * - wavBase64 wav数据格式base64
     */
    playAudioInit,
    /**
     * @description base64 转 ArrayBuffer
     */
    base64ToArrayBuffer,
    /**
     * @description 上传文件 仅限于传入 Buffer
     */
    uploadFileAudio,
    /**
     * @description 存 buffer 为文件，使用 uni.recorder 播放后自动删除
     */
    saveAndPlayBase64MP3,
  }
}
