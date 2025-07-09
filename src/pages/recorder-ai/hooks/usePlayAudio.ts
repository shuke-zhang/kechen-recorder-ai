export function usePlayAudio(RecordApp: any) {
  /**
   * @description 播放初始化
   * @options
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
  function playAudioInit(options: {
    pcmBuffers: ArrayBuffer[]
    _fileName?: string
    isAutoPlay?: boolean
    isSave?: boolean
  }) {
    const pcmBuffer = mergeArrayBuffers(options.pcmBuffers)
    const wavBuffer = encodePCMToWav(pcmBuffer, 16000)
    options.isSave ?? saveThenDoAndDelete(wavBuffer, options._fileName, options.isAutoPlay)
    const pcmBase64 = arrayBufferToBase64(pcmBuffer)
    const wavBase64 = arrayBufferToBase64(wavBuffer)
    return {
      pcmBuffer,
      wavBuffer,
      pcmBase64,
      wavBase64,
    }
  }

  /**
   * 合并多个ArrayBuffer
   */
  function mergeArrayBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
    console.log('mergeArrayBuffers')

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
  function encodePCMToWav(pcmBuffer: ArrayBuffer, sampleRate = 16000, numChannels = 1): ArrayBuffer {
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

  /**
   * @description 保存文件 并播放
   * - sBuffer 数据
   * - _fileName 可选 文件名
   * - isPlay 可选 是否直接播放
   * @warn 默认直接播放
   */
  async function saveThenDoAndDelete(sBuffer: ArrayBuffer, _fileName?: string, isPlay = true) {
    return new Promise<void>((resolve, reject) => {
      const fileName = _fileName || __LocalFileName('wav')
      RecordApp.UniSaveLocalFile(
        fileName,
        sBuffer,
        async (savedPath: string) => {
          console.log(`✅ 文件已保存到本地: ${savedPath}`)
          try {
            // 在这儿执行播放
            if (isPlay) {
              playAudio(savedPath)
            }
            // 执行完后删除文件
            uni.removeSavedFile({
              filePath: savedPath,
              success: () => {
                console.log(` 🗑️ 文件已删除: ${savedPath}`)
                resolve()
              },
              fail: (err) => {
                console.warn(` ⚠️ 文件删除失败:`, err)
                resolve() // 删除失败也不影响流程
              },
            })
          }
          catch (e) {
            console.error(`❌ afterSave 执行失败:`, e)
            reject(e)
          }
        },
        (err: Error) => {
          console.error(`❌ 保存失败:`, err)
          reject(err)
        },
      )
    })
  }

  /**
   * @description 播放文件
   */
  function playAudio(savePath: string) {
    const ctx = uni.createInnerAudioContext()
    ctx.src = savePath
    ctx.onError((res) => { console.log(res, 'onError') })
    ctx.onEnded((res) => {
      console.log(res.errMsg, 'onEnded')
    })
    ctx.onPlay(() => { console.log('onPlay执行') })
    ctx.onTimeUpdate(() => { console.log('onTimeUpdate执行') })
    ctx.play()
  }
  /**
   * @description 生成文件名
   * - type 文件类型
   */
  function __LocalFileName(type: string) {
    const now = new Date()
    const fileName = `local-${now.getFullYear()
    }${(`0${now.getMonth() + 1}`).substr(-2)
    }${(`0${now.getDate()}`).substr(-2)
    }${(`0${now.getHours()}`).substr(-2)
    }${(`0${now.getMinutes()}`).substr(-2)
    }${(`0${now.getSeconds()}`).substr(-2)
    }${(`00${now.getMilliseconds()}`).substr(-3)
    }${(`${Math.random()}`).substr(2, 6)
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
    const binaryString = atob(base64)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
  }
  return {
    /** 合并多个ArrayBuffer */
    mergeArrayBuffers,
    /** 将PCM数据编码为WAV格式 */
    encodePCMToWav,
    /** 保存文件 并播放 */
    saveThenDoAndDelete,
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
  }
}
