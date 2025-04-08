<route lang="json">
    {
         "style": { "navigationBarTitleText": "recorder-core插件页面" }
    }
</route>

<script>
import Recorder from 'recorder-core' // 使用import、require都行
// 必须引入的RecordApp核心文件（文件路径是 /src/app-support/app.js）
import RecordApp from 'recorder-core/src/app-support/app'
import XunfeiRecorder from '../xunfei/xunfei-recorder-copy.ts'
import RecorderCoreManager from './recorder-core.ts'
// 所有平台必须引入的uni-app支持文件（如果编译出现路径错误，请把@换成 ../../ 这种）
// import '@/uni_modules/Recorder-UniCore/app-uni-support.js'
import '../../../../../uni_modules/Recorder-UniCore/app-uni-support.js'
/** 需要编译成微信小程序时，引入微信小程序支持文件 */
// #ifdef MP-WEIXIN
import 'recorder-core/src/app-support/app-miniProgram-wx-support.js'
// #endif
/** H5、小程序环境中：引入需要的格式编码器、可视化插件，App环境中在renderjs中引入 */
// #ifdef H5 || MP-WEIXIN
// 按需引入你需要的录音格式支持文件，如果需要多个格式支持，把这些格式的编码引擎js文件统统引入进来即可
import 'recorder-core/src/engine/pcm'
// import 'recorder-core/src/engine/pcm-engine' // 如果此格式有额外的编码引擎（*-engine.js）的话，必须要加上

// 可选的插件支持项
import 'recorder-core/src/extensions/waveview'
// #endif
export default {
  data() {
    return {
      xunfeiRecorder: null,
      text: '',
      RecorderCoreManager: null, // 录音核心管理类
    }
  },
  mounted() {
    this.isMounted = true
    // 页面onShow时【必须调用】的函数，传入当前组件this
    RecordApp.UniPageOnShow(this)
    this.xunfeiRecorder = new XunfeiRecorder({
      APPID: 'f9b52f87',
      APISecret: 'ZDVkYzU5YmFhZmNlODVkM2RlNDMyNDhl',
      APIKey: '287ae449056d33e0f4995f480737564a',
      url: 'wss://iat-api.xfyun.cn/v2/iat',
      host: 'iat-api.xfyun.cn',
    }, this.onTextChanged, this)

    this.RecorderCoreManager = new RecorderCoreManager({
      APPID: 'f9b52f87',
      APISecret: 'ZDVkYzU5YmFhZmNlODVkM2RlNDMyNDhl',
      APIKey: '287ae449056d33e0f4995f480737564a',
      url: 'wss://iat-api.xfyun.cn/v2/iat',
      host: 'iat-api.xfyun.cn',
    }, this.onTextChanged)
  },

  onShow() { // onShow可能比mounted先执行，页面可能还未准备好
    if (this.isMounted)
      RecordApp.UniPageOnShow(this)
    this.xunfeiRecorder = new XunfeiRecorder({
      APPID: 'f9b52f87',
      APISecret: 'ZDVkYzU5YmFhZmNlODVkM2RlNDMyNDhl',
      APIKey: '287ae449056d33e0f4995f480737564a',
      url: 'wss://iat-api.xfyun.cn/v2/iat',
      host: 'iat-api.xfyun.cn',
    }, this.onTextChanged, this)
    this.RecorderCoreManager = new RecorderCoreManager({
      APPID: 'f9b52f87',
      APISecret: 'ZDVkYzU5YmFhZmNlODVkM2RlNDMyNDhl',
      APIKey: '287ae449056d33e0f4995f480737564a',
      url: 'wss://iat-api.xfyun.cn/v2/iat',
      host: 'iat-api.xfyun.cn',
    }, this.onTextChanged)
  },
  methods: {
    // 请求录音权限
    recReq() {
      // 编译成App时提供的授权许可（编译成H5、小程序为免费授权可不填写）；如果未填写授权许可，将会在App打开后第一次调用请求录音权限时，弹出“未获得商用授权时，App上仅供测试”提示框
      // RecordApp.UniAppUseLicense='我已获得UniAppID=*****的商用授权';

      RecordApp.UniWebViewActivate(this) // App环境下必须先切换成当前页面WebView
      RecordApp.RequestPermission(() => {
        console.log('已获得录音权限，可以开始录音了')
      }, (msg, isUserNotAllow) => {
        if (isUserNotAllow) { // 用户拒绝了录音权限
          // 这里你应当编写代码进行引导用户给录音权限，不同平台分别进行编写
        }
        console.error(`请求录音权限失败：${msg}`)
      })
    },
    recStart() {
      let lastIdx = 1e9
      let chunk = null
      // 录音配置信息
      const set = {
        type: 'pcm',
        sampleRate: 16000,
        bitRate: 16, // mp3格式，指定采样率hz、比特率kbps，其他参数使用默认配置；注意：是数字的参数必须提供数字，不要用字符串；需要使用的type类型，需提前把格式支持文件加载进来，比如使用wav格式需要提前加载wav.js编码引擎
        onProcess: (buffers, powerLevel, duration, sampleRate, _newBufferIdx, _asyncEnd) => {
          if (lastIdx > _newBufferIdx) {
            chunk = null // 重新录音了，重置环境
          }
          lastIdx = _newBufferIdx
          // 借用SampleData函数进行数据的连续处理，采样率转换是顺带的，得到新的pcm数据
          chunk = Recorder.SampleData(buffers, sampleRate, 16000, chunk)
          const pcmInt16 = new Int16Array(chunk.data)
          const arrayBuffer = pcmInt16.buffer // ✅ 得到最终的 ArrayBuffer
          this.RecorderCoreManager.pushAudioData(arrayBuffer)

          //   const chunk = Recorder.SampleData(buffers, sampleRate, sampleRate, prevChunk)
          //   const pcmInt16 = new Int16Array(chunk.data) // 把 number[] 转为 Int16Array
          //   const arrayBuffer = pcmInt16.buffer // ✅ 得到最终的 ArrayBuffer
          //   this.RecorderCoreManager.pushAudioData(arrayBuffer)
          //   prevChunk = chunk
          // console.log('newBufferIdx', newBufferIdx)
          // console.log('asyncEnd', asyncEnd)
          // 全平台通用：可实时上传（发送）数据，配合Recorder.SampleData方法，将buffers中的新数据连续的转换成pcm上传，或使用mock方法将新数据连续的转码成其他格式上传，可以参考Recorder文档里面的：Demo片段列表 -> 实时转码并上传-通用版；基于本功能可以做到：实时转发数据、实时保存数据、实时语音识别（ASR）等

          // 注意：App里面是在renderjs中进行实际的音频格式编码操作，此处的buffers数据是renderjs实时转发过来的，修改此处的buffers数据不会改变renderjs中buffers，所以不会改变生成的音频文件，可在onProcess_renderjs中进行修改操作就没有此问题了；如需清理buffers内存，此处和onProcess_renderjs中均需要进行清理，H5、小程序中无此限制
          // 注意：如果你要用只支持在浏览器中使用的Recorder扩展插件，App里面请在renderjs中引入此扩展插件，然后在onProcess_renderjs中调用这个插件；H5可直接在这里进行调用，小程序不支持这类插件；如果调用插件的逻辑比较复杂，建议封装成js文件，这样逻辑层、renderjs中直接import，不需要重复编写

          // H5、小程序等可视化图形绘制，直接运行在逻辑层；App里面需要在onProcess_renderjs中进行这些操作
          // #ifdef H5 || MP-WEIXIN
          if (this.waveView)
            this.waveView.input(buffers[buffers.length - 1], powerLevel, sampleRate)
          // #endif
        },
        onProcess_renderjs: `function(buffers,powerLevel,duration,sampleRate,_newBufferIdx,_asyncEnd){
                //App中在这里修改buffers才会改变生成的音频文件
                //App中是在renderjs中进行的可视化图形绘制，因此需要写在这里，this是renderjs模块的this（也可以用This变量）；如果代码比较复杂，请直接在renderjs的methods里面放个方法xxxFunc，这里直接使用this.xxxFunc(args)进行调用
                if(this.waveView) this.waveView.input(buffers[buffers.length-1],powerLevel,sampleRate);
            }`,

        takeoffEncodeChunk: true ? null : (chunkBytes) => {
          console.log('chunkBytes', chunkBytes)

          // 全平台通用：实时接收到编码器编码出来的音频片段数据，chunkBytes是Uint8Array二进制数据，可以实时上传（发送）出去
          // App中如果未配置RecordApp.UniWithoutAppRenderjs时，建议提供此回调，因为录音结束后会将整个录音文件从renderjs传回逻辑层，由于uni-app的逻辑层和renderjs层数据交互性能实在太拉跨了，大点的文件传输会比较慢，提供此回调后可避免Stop时产生超大数据回传
        },
        takeoffEncodeChunk_renderjs: true
          ? null
          : `function(chunkBytes){
                //App中这里可以做一些仅在renderjs中才生效的事情，不提供也行，this是renderjs模块的this（也可以用This变量）
            }`,

        start_renderjs: `function(){
                //App中可以放一个函数，在Start成功时renderjs中会先调用这里的代码，this是renderjs模块的this（也可以用This变量）
                //放一些仅在renderjs中才生效的事情，比如初始化，不提供也行
            }`,
        stop_renderjs: `function(arrayBuffer,duration,mime){
                //App中可以放一个函数，在Stop成功时renderjs中会先调用这里的代码，this是renderjs模块的this（也可以用This变量）
                //放一些仅在renderjs中才生效的事情，不提供也行
            }`,
      }

      RecordApp.UniWebViewActivate(this) // App环境下必须先切换成当前页面WebView
      RecordApp.Start(set, () => {
        console.log('已开始录音')
        this.handleStart1()
        this.RecorderCoreManager.on('log', (msg) => {
          console.log(msg)
        })
        // 创建音频可视化图形绘制，App环境下是在renderjs中绘制，H5、小程序等是在逻辑层中绘制，因此需要提供两段相同的代码
        // view里面放一个canvas，canvas需要指定宽高（下面style里指定了300*100）
        // <canvas type="2d" class="recwave-WaveView" style="width:300px;height:100px"></canvas>
        RecordApp.UniFindCanvas(this, ['.recwave-WaveView'], `
                this.waveView=Recorder.WaveView({compatibleCanvas:canvas1, width:300, height:100});
            `, (canvas1) => {
          this.waveView = Recorder.WaveView({ compatibleCanvas: canvas1, width: 300, height: 100 })
        })
      }, (msg) => {
        console.error(`开始录音失败：${msg}`)
      })
    },
    // 暂停录音
    recPause() {
      if (RecordApp.GetCurrentRecOrNull()) {
        RecordApp.Pause()
        console.log('已暂停')
      }
    },
    // 继续录音
    recResume() {
      if (RecordApp.GetCurrentRecOrNull()) {
        RecordApp.Resume()
        console.log('继续录音中...')
      }
    },
    // 停止录音
    recStop() {
      RecordApp.Stop((arrayBuffer, duration, mime) => {
        // 全平台通用：arrayBuffer是音频文件二进制数据，可以保存成文件或者发送给服务器
        // App中如果在Start参数中提供了stop_renderjs，renderjs中的函数会比这个函数先执行

        // 注意：当Start时提供了takeoffEncodeChunk后，你需要自行实时保存录音文件数据，因此Stop时返回的arrayBuffer的长度将为0字节
        this.handleStop1()
        // 如果当前环境支持Blob，也可以直接构造成Blob文件对象，和Recorder使用一致
        if (typeof (Blob) != 'undefined' && typeof (window) == 'object') {
          const blob = new Blob([arrayBuffer], { type: mime })
          console.log(blob, (window.URL || webkitURL).createObjectURL(blob))
        }
      }, (msg) => {
        console.error(`结束录音失败：${msg}`)
      })
    },
    handleStart1() {
      this.RecorderCoreManager.destroy()
      this.RecorderCoreManager.start()
    },
    handleStop1() {
      this.RecorderCoreManager.stop()
    },
    onTextChanged(data) {
      this.text = data
    },

  },
}
</script>

<!-- #ifdef APP -->
<script module="recorderCore" lang="renderjs">
/**需要编译成App时，你需要添加一个renderjs模块，然后一模一样的import上面那些js（微信的js除外）
    ，因为App中默认是在renderjs（WebView）中进行录音和音频编码**/
import 'recorder-core'
import RecordApp from 'recorder-core/src/app-support/app'
import '../../../../../uni_modules/Recorder-UniCore/app-uni-support.js'
//按需引入你需要的录音格式支持文件，和插件
import 'recorder-core/src/engine/pcm'

import 'recorder-core/src/extensions/waveview'
export default {
    mounted(){
        //App的renderjs必须调用的函数，传入当前模块this
        RecordApp.UniRenderjsRegister(this);
    },
    methods: {
        //这里定义的方法，在逻辑层中可通过 RecordApp.UniWebViewVueCall(this,'this.xxxFunc()') 直接调用
        //调用逻辑层的方法，请直接用 this.$ownerInstance.callMethod("xxxFunc",{args}) 调用，二进制数据需转成base64来传递
    }
}
</script>
 <!-- #endif -->

<template>
  <view>
    <button class="mt-40rpx" type="primary" @click="recReq">
      请求录音权限
    </button>
    <button class="mt-40rpx" type="primary" @click="recStart">
      开始录音
    </button>
    <button class="mt-40rpx" type="primary" @click="recPause">
      暂停录音
    </button>
    <button class="mt-40rpx" type="primary" @click="recResume">
      继续录音
    </button>
    <button class="mt-40rpx" type="primary" @click="recStop">
      停止录音
    </button>
    <button class="mt-40rpx" type="primary" @click="recStart">
      开始识别1
    </button>

    <button class="mt-40rpx" type="primary" @click="recStop">
      停止识别1
    </button>

    <button class="mt-40rpx" type="primary" @click="text = ''">
      清空内容
    </button>

    <canvas type="2d" class="recwave-WaveView" style="width:300px;height:100px" />

    <view>
      <text>
        结果：
      </text>
      <text class="text-primary">
        {{ text }}
      </text>
    </view>
  </view>
</template>

<style lang="scss">
</style>
