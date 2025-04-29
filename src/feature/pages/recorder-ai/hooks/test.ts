var sp=Recorder.BufferStreamPlayer({
    decode:false,sampleRate:16000，
    realtime:false
    //,realtime:false //默认为true实时模式，设为false为非实时模式。要连续完整播放时要设为false，否则实时模式会丢弃延迟过大的数据并加速播放
    ,onInputError:function(errMsg, inputIndex){
      window["console"].error(Tag+"第"+inputIndex+"次的音频片段input输入出错: "+errMsg);
    }
   ,onPlayError:function(errMsg, inputIndex){
      window["console"].error(Tag+"第"+inputIndex+"次的音频片段播放出错: "+errMsg);
    } 
   }
  );