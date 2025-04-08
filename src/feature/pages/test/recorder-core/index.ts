// src/pages/test/recorder-core/RecorderCoreManager.ts

import Recorder from 'recorder-core'
import RecordApp from 'recorder-core/src/app-support/app'
import '../../../../../uni_modules/Recorder-UniCore/app-uni-support.js'

// #ifdef H5 || MP-WEIXIN
import 'recorder-core/src/engine/mp3'
import 'recorder-core/src/engine/mp3-engine'
import 'recorder-core/src/extensions/waveview'
// #endif

interface StopResult {
  arrayBuffer: ArrayBuffer
  duration: number
  mime: string
}
/**
 * @description 录音
 */
export class RecorderCoreManager extends EventEmitter {
  private ctx: any
  private waveView: any = null
  private isReady = false

  constructor(ctx: any) {
    super()
    this.ctx = ctx
    RecordApp.UniPageOnShow(this.ctx)
    this.isReady = true
  }

  /**
   * @description 申请录音权限
   */
  requestPermission(): Promise<void> {
    return new Promise((resolve, reject) => {
      RecordApp.UniWebViewActivate(this.ctx)
      RecordApp.RequestPermission(() => {
        this.emit('requestPermission')
        resolve()
      }, (msg: string, isUserNotAllow: boolean) => {
        reject(new Error(`录音权限拒绝：${msg} - ${isUserNotAllow}`))
      })
    })
  }

  /**
   * @description 开始录音
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('开始录音')
      this.requestPermission().then(() => {
        if (!this.isReady)
          return reject(new Error('RecorderCoreManager 未初始化'))

        RecordApp.UniWebViewActivate(this.ctx)

        const set = {
          type: 'pcm',
          sampleRate: 16000,
          bitRate: 16,
          onProcess: (buffers: any[], powerLevel: number, duration: number, sampleRate: number) => {
            /** 处理实时帧 */
            this.emit('onFrameRecorded', { buffers, powerLevel, duration, sampleRate })
            if (this.waveView) {
              this.waveView.input(buffers[buffers.length - 1], powerLevel, sampleRate)
            }
          },
          onProcess_renderjs: `function(buffers,powerLevel,duration,sampleRate,newBufferIdx,asyncEnd){
            if(this.waveView) this.waveView.input(buffers[buffers.length-1],powerLevel,sampleRate);
          }`,
          takeoffEncodeChunk: null,
          start_renderjs: null,
          stop_renderjs: null,
        }

        RecordApp.Start(set, () => {
          this.emit('onStart')
        }, (msg: string) => {
          reject(new Error(`开始录音失败：${msg}`))
        })
      })
    })
  }

  /**
   * @description 暂停录音
   */
  pause(): void {
    if (RecordApp.GetCurrentRecOrNull()) {
      this.emit('onPause')
      RecordApp.Pause()
    }
  }

  /**
   * @description 继续录音
   */
  resume(): void {
    if (RecordApp.GetCurrentRecOrNull()) {
      this.emit('onResume')
      RecordApp.Resume()
    }
  }

  /**
   * @description 停止录音
   */
  stop(): Promise<StopResult> {
    return new Promise((resolve, reject) => {
      RecordApp.Stop((arrayBuffer: ArrayBuffer, duration: number, mime: string) => {
        this.emit('onStop')
        resolve({ arrayBuffer, duration, mime })
      }, (msg: string) => {
        reject(new Error(`停止录音失败：${msg}`))
      })
    })
  }
}
