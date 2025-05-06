/* eslint-disable no-eval */
export default function useSpeechSynthesis(options: AnyObject) {
  const {
    RecordApp,
    vueInstance,
  } = options || {}
  const isAudioPlaying = ref(false)

  /**
   * @description 播放流式语音
   */
  function streamPlay(pcm: string, sampleRate: number) {
    isAudioPlaying.value = true
    if (sampleRate !== 16000) {
      console.warn('未适配非16000采样率的pcm播放：initStreamPlay中手写的16000采样率，使用其他采样率需要修改初始化代码')
    }

    // #ifdef MP-WEIXIN
    // 微信环境，单独创建的播放器播放
    vueInstance.addWxPlayBuffer && vueInstance.addWxPlayBuffer(pcm)
    // #endif

    // App、H5 时使用 BufferStreamPlayer 播放
    const funcCode = `(function(pcm16k){ //这里需要独立执行
            var sp=window.wsStreamPlay;
            if(!sp || !sp.__isStart) return;
            //if(播放新的) sp.clearInput(); //清除已输入但还未播放的数据，一般用于非实时模式打断老的播放
            sp.input(pcm16k);
        })`
    // #ifdef H5
    eval(funcCode)(pcm)
    // #endif

    const buffer = base64ToArrayBuffer(pcm)

    RecordApp.UniWebViewEval(getPage(), `${funcCode}(new Int16Array(BigBytes))`, buffer)
  }

  /**
   * @description 初始化播放器
   */
  function initStreamPlay() {
    // #ifdef MP-WEIXIN
    // 微信环境，单独创建播放器
    initWxStreamPlay()
    // #endif

    if (vueInstance.spIsInit) {
      return console.log('已初始化完成')
    }
    if (vueInstance.spInit_time && Date.now() - vueInstance.spInit_time < 2000) {
      return console.log('初始化中')
    };

    const stime = vueInstance.spInit_time = Date.now()
    const funcCode = `(function(True,False,onStreamPlayEnd){ //这里需要独立执行
    if(window.wsStreamPlay) return True();
    var Tag="wsStreamPlay";
    if(!Recorder.BufferStreamPlayer){
      var err="H5需要在逻辑层中、App需要在renderjs模块中 imp"+"ort 'recorder-core/src/extensions/buffer_stream.player.js'";
      window["console"].error(Tag+"缺少文件："+err); False(err); return;
    }
    var sp=Recorder.BufferStreamPlayer({
      decode:false,sampleRate:16000,
      realtime:false
      //,realtime:false //默认为true实时模式，设为false为非实时模式。要连续完整播放时要设为false，否则实时模式会丢弃延迟过大的数据并加速播放
      ,onInputError:function(errMsg, inputIndex){
        window["console"].error(Tag+"第"+inputIndex+"次的音频片段input输入出错: "+errMsg);
      }
      ,onPlayEnd:function(){

        // 没有可播放的数据了，缓冲中 或者 已播放完成
            onStreamPlayEnd()
      }
    });
    sp.start(function(){
      window["console"].log(Tag+"已打开播放");
      sp.__isStart=true;
      window.wsStreamPlay=sp;
      True();
    },function(err){
      window["console"].error(Tag+"开始失败："+err);
      False(err);
    });
                    })`
    const initOk = () => {
      if (stime !== vueInstance.spInit_time)
        return // 可能调用了destroy
      vueInstance.spIsInit = true
      vueInstance.spInit_time = 0
    }
    const initErr = (err: any) => {
      if (stime !== vueInstance.spInit_time)
        return // 可能调用了destroy
      vueInstance.spInit_time = 0
      vueInstance.log(`streamPlay初始化错误：${err}`, 1)
    }

    const onStreamPlayEnd = () => {
      isAudioPlaying.value = true
    }
    // #ifdef H5
    eval(funcCode)(initOk, initErr, onStreamPlayEnd)
    // #endif
    const cb = RecordApp.UniMainCallBack_Register('useSpeechSynthesis', (data: any) => {
      if (data.onStreamPlayEnd) {
        isAudioPlaying.value = false
      }
      else if (data.ok) {
        initOk()
      }
      else {
        initErr(data.errMsg)
      }
    })

    RecordApp.UniWebViewEval(getPage(), `${funcCode}(function(){
      RecordApp.UniWebViewSendToMain({action:"${cb}",ok:1});
    },function(err){
      RecordApp.UniWebViewSendToMain({action:"${cb}",errMsg:err||'-'});
    },
    function(err){
      RecordApp.UniWebViewSendToMain({action:"${cb}",onStreamPlayEnd:1});
    }
      )`)
  }

  /**
   * @description 销毁播放器
   */
  function destroyStreamPlay() {
    isAudioPlaying.value = false
    // #ifdef MP-WEIXIN
    // 微信环境，单独销毁播放器
    if (vueInstance.spWxCtx) {
      vueInstance.spWxCtx.close()
      vueInstance.spWxCtx = null
    }
    // #endif

    // App、H5 时销毁
    vueInstance.spIsInit = false
    vueInstance.spInit_time = 0
    const funcCode = `if(window.wsStreamPlay){ wsStreamPlay.stop(); wsStreamPlay=null; }`
    // #ifdef H5
    eval(funcCode)
    // #endif
    RecordApp.UniWebViewEval(getPage(), funcCode)
  }

  /**
   * @description 微信单独创建播放器
   */
  function initWxStreamPlay() {
    if (vueInstance.spWxCtx && vueInstance.spWxCtx.state === 'running')
      return
    if (vueInstance.spWxCtx) {
      if (Date.now() - vueInstance.spWxCtx.__time < 2000)
        return// wait running
      vueInstance.spWxCtx.close()
    };
    const playBuffers = []
    let _playBufferLen = 0
    vueInstance.addWxPlayBuffer = (pcm: any) => {
      playBuffers.push(pcm)
      _playBufferLen += pcm.length
    }
    try {
      vueInstance.spWxCtx = wx.createWebAudioContext()
      if (!vueInstance.spWxCtx)
        throw new Error('vueInstance.spWxCtx')
    }
    catch (e) {
      console.log('微信版本太低，无法创建WebAudioContext', e)
    }
    vueInstance.spWxCtx.__time = Date.now()
    console.log('微信streamPlay已打开（播放效果一般，听个响）', 2)
    if (vueInstance.spWxTimer)
      clearInterval(vueInstance.spWxTimer)
    vueInstance.spWxTimer = setInterval(() => {
      vueInstance.spWxPlay()
    }, 300)
    vueInstance.spWxPlay = () => {
      // 参考Recorder源码 /assets/runtime-codes/fragment.playbuffer.js
      const ctx = vueInstance.spWxCtx
      const sampleRate = 16000; const dur = 300
      const audioSize = sampleRate / 1000 * dur

      const playBuffers: any = []
      const playBufferLen = 0
      const arr: any = playBuffers
      const arrSize = playBufferLen
      let more = new Int16Array(Math.max(0, arrSize - audioSize)); let moreOffset = 0

      const audio = ctx.createBuffer(1, audioSize, sampleRate)
      const channel = audio.getChannelData(0)
      const sd = sampleRate / 1000 * 1// 1ms的淡入淡出 大幅减弱爆音
      const sd2 = audioSize - sd
      for (let j = 0, idx = 0; j < arr.length; j++) {
        const buf = arr[j]
        for (let i = 0, l = buf.length; i < l; i++) {
          let factor = 1// 淡入淡出因子
          if (idx < sd) {
            factor = idx / sd
          }
          else if (idx > sd2) {
            factor = (audioSize - idx) / sd
          };
          if (idx < audioSize) {
            channel[idx++] = buf[i] / 0x7FFF * factor
          }
          else {
            more[moreOffset++] = buf[i]
          }
        };
      };
      // 剩余数据存回去
      if (more.length > 0) {
        if (more.length > arrSize / 2) {
          more = more.subarray(~~(more.length - arrSize / 2))
        }
        vueInstance.addWxPlayBuffer(more)
      }

      // 播放
      const source = ctx.createBufferSource()
      source.buffer = audio
      source.connect(ctx.destination)
      source.start()

      if (vueInstance.lastSource2)
        vueInstance.lastSource2.disconnect()
      vueInstance.lastSource2 = vueInstance.lastSource1
      vueInstance.lastSource1 = source
    }
  }

  function getPage() {
    let p = vueInstance.$parent
    while (p) {
      if (p.reclog)
        break
      p = p.$parent
    }
    return p
  }

  function base64ToArrayBuffer(base64Data: string) {
    // 1. 解码Base64为二进制字符串
    const binaryString = atob(base64Data)

    // 2. 创建一个新的Uint8Array来保存解码后的数据
    const arrayBuffer = new ArrayBuffer(binaryString.length)
    const uint8Array = new Uint8Array(arrayBuffer)

    // 3. 将二进制字符串中的每个字符转换为Uint8Array的相应值
    for (let i = 0; i < binaryString.length; i++) {
      uint8Array[i] = binaryString.charCodeAt(i)
    }

    return arrayBuffer
  }

  return {
    /** 是否正在播放 */
    isAudioPlaying,
    // 播放实时的语音流
    streamPlay,
    // 销毁播放器
    destroyStreamPlay,
    // 初始化播放器
    initStreamPlay,
  }
}
