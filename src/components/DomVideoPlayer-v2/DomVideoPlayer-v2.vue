<!-- DomVideoPlayer.vue -->
<!-- eslint-disable -->
<script>
export default {
  props: {
    /** 视频资源地址 仅仅支持网络地址 */
    src: {
      type: String,
      default: ''
    },
    /** 是否自动播放  */
    autoplay: {
      type: Boolean,
      default: false
    },
    /** 是否循环播放  */
    loop: {
      type: Boolean,
      default: false
    },
    /** 是否显示视频控件 */
    controls: {
      type: Boolean,
      default: false
    },
    /** 视频的填充模式 */
    objectFit: {
      type: String,
      default: 'contain'
    },
    /** 是否静音 */
    muted: {
      type: Boolean,
      default: false
    },
    /** 播放速率 */
    playbackRate: {
      type: Number,
      default: 1
    },
    /**
     * 加载时是否显示黑色 loading 遮罩（Android/iOS 都生效）
     * 主要是为了遮挡默认按钮 + 防止白屏
     */
    isLoading: {
      type: Boolean,
      default: false
    },
    /**
     * loading 遮罩是否透明（可选）
     */
    loadingTransparent: {
      type: Boolean,
      default: false
    },
    /** 视频封面 */
    poster: {
      type: String,
      default: ''
    },
    /** 视频 id */
    id: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      randomNum: Math.floor(Math.random() * 100000000),
      videoSrc: '',
      // 父组件向子组件传递的事件指令（video 原生事件）
      eventCommand: null,
      // 父组件传递过来的自定义函数（renderjs 层）
      renderFunc: {
        name: null,
        params: null
      },
      // 提供给父组件获取的视频属性
      currentTime: 0,
      duration: 0,
      playing: false
    }
  },
  watch: {
    // 监听视频资源地址更新
    src: {
      handler(val) {
        if (!val) return
        // 让绑定的 videoSrc 改变，从而触发 renderjs 的 initVideoPlayer
        setTimeout(() => {
          this.videoSrc = val
        }, 0)
      },
      immediate: true
    }
  },
  computed: {
    videoWrapperId() {
      return `video-wrapper-${this.randomNum}`
    },
    // 聚合视图层的所有数据变化，传给 renderjs 渲染层
    viewportProps() {
      return {
        autoplay: this.autoplay,
        muted: this.muted,
        controls: this.controls,
        loop: this.loop,
        objectFit: this.objectFit,
        poster: this.poster,
        isLoading: this.isLoading,
        playbackRate: this.playbackRate,
        loadingTransparent: this.loadingTransparent
      }
    }
  },
  methods: {
    /**
     * 传递事件指令给父组件
     */
    eventEmit({ event, data }) {
      this.$emit(event, data)
    },
    /**
     * 修改 view 视图层的 data 数据
     */
    setViewData({ key, value }) {
      key && this.$set(this, key, value)
    },
    /**
     * 重置事件指令
     */
    resetEventCommand() {
      this.eventCommand = null
    },
    /**
     * 播放
     */
    play() {
      this.eventCommand = 'play'
    },
    /**
     * 暂停
     */
    pause() {
      this.eventCommand = 'pause'
    },
    /**
     * 重置自定义函数指令
     */
    resetFunc() {
      this.renderFunc = {
        name: null,
        params: null
      }
    },
    /**
     * 自定义函数 - 移除视频
     */
    remove(params) {
      this.renderFunc = {
        name: 'removeHandler',
        params
      }
    },
    /**
     * 自定义函数 - 全屏播放
     */
    fullScreen(params) {
      this.renderFunc = {
        name: 'fullScreenHandler',
        params
      }
    },
    /**
     * 自定义函数 - 跳转到指定时间点
     */
    toSeek(sec, isDelay = false) {
      this.renderFunc = {
        name: 'toSeekHandler',
        params: { sec, isDelay }
      }
    },
    /**
     * 自定义函数 - 重置视频播放器状态
     */
    reset() {
      this.renderFunc = {
        name: 'resetHandler',
        params: null
      }
    }
  }
}
</script>

<script module="domVideoPlayer" lang="renderjs">
const PLAYER_ID = 'DOM_VIDEO_PLAYER'

export default {
  data() {
    return {
      num: '',
      videoEl: null,
      loadingEl: null,
      // 延迟生效的函数
      delayFunc: null,
      renderProps: {}
    }
  },
  computed: {
    playerId() {
      return `${PLAYER_ID}_${this.num}`
    },
    wrapperId() {
      return `video-wrapper-${this.num}`
    }
  },
  methods: {
    isApple() {
      const ua = navigator.userAgent.toLowerCase()
      return ua.indexOf('iphone') !== -1 || ua.indexOf('ipad') !== -1
    },

    resetHandler() {
      if (this.videoEl) {
        this.videoEl.pause()
        this.videoEl.currentTime = 0
        this.$ownerInstance.callMethod('setViewData', {
          key: 'currentTime',
          value: 0
        })
        this.$ownerInstance.callMethod('setViewData', {
          key: 'playing',
          value: false
        })
      }
    },

    async initVideoPlayer(src) {
      this.delayFunc = null
      await this.$nextTick()
      if (!src) return

      // 已有 video 元素：只切换 src，切换前先把黑色遮罩显示出来，防止白屏
      if (this.videoEl) {
        const props = this.renderProps || {}
        if (props.isLoading && this.loadingEl) {
          this.loadingEl.style.display = 'block'
        }
        this.videoEl.src = src
        return
      }

      // 首次创建 video
      const videoEl = document.createElement('video')
      this.videoEl = videoEl

      // 开始监听视频相关事件
      this.listenVideoEvent()

      const {
        autoplay,
        muted,
        controls,
        loop,
        playbackRate,
        objectFit,
        poster
      } = this.renderProps || {}

      videoEl.src = src
      videoEl.autoplay = autoplay
      videoEl.controls = controls
      videoEl.loop = loop
      videoEl.muted = muted
      videoEl.playbackRate = playbackRate
      videoEl.id = this.playerId
      videoEl.style.position = 'absolute'
      videoEl.style.top = '0'
      videoEl.style.left = '0'
      videoEl.style.width = '100%'
      videoEl.style.height = '100%'
      videoEl.style.objectFit = objectFit || 'contain'
      videoEl.style.backgroundColor = 'black' // 防止视频区域透出白色
      videoEl.setAttribute('preload', 'auto')
      videoEl.setAttribute('playsinline', true)
      videoEl.setAttribute('webkit-playsinline', true)
      videoEl.setAttribute('crossorigin', 'anonymous')
      videoEl.setAttribute('controlslist', 'nodownload')
      videoEl.setAttribute('disablePictureInPicture', true)

      if (poster) {
        videoEl.poster = poster
      }

      const playerWrapper = document.getElementById(this.wrapperId)
      playerWrapper.insertBefore(videoEl, playerWrapper.firstChild)

      // 创建黑色 loading 遮罩（假隐藏，无动画）
      this.createLoading()
    },

    // 创建 loading（纯黑或透明，无动画）
    createLoading() {
      const { isLoading, loadingTransparent } = this.renderProps || {}
      if (!isLoading) return

      const loadingEl = document.createElement('div')
      this.loadingEl = loadingEl
      loadingEl.className = 'loading-wrapper'
      loadingEl.style.position = 'absolute'
      loadingEl.style.top = '0'
      loadingEl.style.left = '0'
      loadingEl.style.zIndex = '1'
      loadingEl.style.width = '100%'
      loadingEl.style.height = '100%'
      loadingEl.style.backgroundColor = loadingTransparent ? 'transparent' : 'black'
      // 不拦截点击，完全当背景用
      loadingEl.style.pointerEvents = 'none'

      document.getElementById(this.wrapperId).appendChild(loadingEl)
      // ❌ 不再创建任何圆圈 / 动画，就是一层黑幕
    },

    // 监听视频相关事件
    listenVideoEvent() {
      // 播放事件
      const playHandler = () => {
        this.$ownerInstance.callMethod('eventEmit', { event: 'play' })
        this.$ownerInstance.callMethod('setViewData', {
          key: 'playing',
          value: true
        })

        // 播放时隐藏 loading 遮罩
        if (this.loadingEl && (this.renderProps || {}).isLoading) {
          this.loadingEl.style.display = 'none'
        }
      }
      this.videoEl.removeEventListener('play', playHandler)
      this.videoEl.addEventListener('play', playHandler)

      // 暂停事件
      const pauseHandler = () => {
        this.$ownerInstance.callMethod('eventEmit', { event: 'pause' })
        this.$ownerInstance.callMethod('setViewData', {
          key: 'playing',
          value: false
        })
      }
      this.videoEl.removeEventListener('pause', pauseHandler)
      this.videoEl.addEventListener('pause', pauseHandler)

      // 结束事件
      const endedHandler = () => {
        this.$ownerInstance.callMethod('eventEmit', { event: 'ended' })
        this.$ownerInstance.callMethod('resetEventCommand')
      }
      this.videoEl.removeEventListener('ended', endedHandler)
      this.videoEl.addEventListener('ended', endedHandler)

      // canplay
      const canPlayHandler = () => {
        this.$ownerInstance.callMethod('eventEmit', { event: 'canplay' })
        this.execDelayFunc()
      }
      this.videoEl.removeEventListener('canplay', canPlayHandler)
      this.videoEl.addEventListener('canplay', canPlayHandler)

      // error
      const errorHandler = () => {
        // 出错时保持黑屏
        if (this.loadingEl && (this.renderProps || {}).isLoading) {
          this.loadingEl.style.display = 'block'
        }
        this.$ownerInstance.callMethod('eventEmit', { event: 'error' })
      }
      this.videoEl.removeEventListener('error', errorHandler)
      this.videoEl.addEventListener('error', errorHandler)

      // loadedmetadata
      const loadedMetadataHandler = () => {
        this.$ownerInstance.callMethod('eventEmit', { event: 'loadedmetadata' })

        const duration = this.videoEl.duration
        this.$ownerInstance.callMethod('eventEmit', {
          event: 'durationchange',
          data: duration
        })
        this.$ownerInstance.callMethod('setViewData', {
          key: 'duration',
          value: duration
        })

        this.loadFirstFrame()
      }
      this.videoEl.removeEventListener('loadedmetadata', loadedMetadataHandler)
      this.videoEl.addEventListener('loadedmetadata', loadedMetadataHandler)

      // timeupdate
      const timeupdateHandler = (e) => {
        const currentTime = e.target.currentTime
        this.$ownerInstance.callMethod('eventEmit', {
          event: 'timeupdate',
          data: currentTime
        })
        this.$ownerInstance.callMethod('setViewData', {
          key: 'currentTime',
          value: currentTime
        })
      }
      this.videoEl.removeEventListener('timeupdate', timeupdateHandler)
      this.videoEl.addEventListener('timeupdate', timeupdateHandler)

      // ratechange
      const ratechangeHandler = (e) => {
        const playbackRate = e.target.playbackRate
        this.$ownerInstance.callMethod('eventEmit', {
          event: 'ratechange',
          data: playbackRate
        })
      }
      this.videoEl.removeEventListener('ratechange', ratechangeHandler)
      this.videoEl.addEventListener('ratechange', ratechangeHandler)

      // 全屏事件
      if (this.isApple()) {
        const webkitbeginfullscreenHandler = () => {
          const presentationMode = this.videoEl.webkitPresentationMode
          const isFullScreen = presentationMode === 'fullscreen'
          this.$ownerInstance.callMethod('eventEmit', {
            event: 'fullscreenchange',
            data: isFullScreen
          })
        }
        this.videoEl.removeEventListener('webkitpresentationmodechanged', webkitbeginfullscreenHandler)
        this.videoEl.addEventListener('webkitpresentationmodechanged', webkitbeginfullscreenHandler)
      } else {
        const fullscreenchangeHandler = () => {
          const isFullScreen = !!document.fullscreenElement
          this.$ownerInstance.callMethod('eventEmit', {
            event: 'fullscreenchange',
            data: isFullScreen
          })
        }
        document.removeEventListener('fullscreenchange', fullscreenchangeHandler)
        document.addEventListener('fullscreenchange', fullscreenchangeHandler)
      }
    },

    // 加载首帧视频，模拟封面
    loadFirstFrame() {
      const { autoplay, muted } = this.renderProps || {}
      if (this.isApple()) {
        this.videoEl.play()
        if (!autoplay) {
          this.videoEl.pause()
        }
      } else {
        this.videoEl.muted = true
        setTimeout(() => {
          this.videoEl.play()
          this.videoEl.muted = muted
          if (!autoplay) {
            setTimeout(() => {
              this.videoEl.pause()
            }, 100)
          }
        }, 10)
      }
    },

    triggerCommand(eventType) {
      if (eventType) {
        this.$ownerInstance.callMethod('resetEventCommand')
        this.videoEl && this.videoEl[eventType]()
      }
    },

    triggerFunc(func) {
      const { name, params } = func || {}
      if (name) {
        this[name](params)
        this.$ownerInstance.callMethod('resetFunc')
      }
    },

    removeHandler() {
      if (this.videoEl) {
        this.videoEl.pause()
        this.videoEl.src = ''
        this.$ownerInstance.callMethod('setViewData', {
          key: 'videoSrc',
          value: ''
        })
        this.videoEl.load()
      }
    },

    fullScreenHandler() {
      if (this.isApple()) {
        this.videoEl.webkitEnterFullscreen()
      } else {
        this.videoEl.requestFullscreen()
      }
    },

    toSeekHandler({ sec, isDelay }) {
      const func = () => {
        if (this.videoEl) {
          this.videoEl.currentTime = sec
        }
      }
      if (isDelay) {
        this.delayFunc = func
      } else {
        func()
      }
    },

    // 执行延迟函数
    execDelayFunc() {
      this.delayFunc && this.delayFunc()
      this.delayFunc = null
    },

    viewportChange(props) {
      this.renderProps = props || {}
      const {
        autoplay,
        muted,
        controls,
        loop,
        playbackRate
      } = this.renderProps
      if (this.videoEl) {
        this.videoEl.autoplay = autoplay
        this.videoEl.controls = controls
        this.videoEl.loop = loop
        this.videoEl.muted = muted
        this.videoEl.playbackRate = playbackRate
      }
    },

    randomNumChange(val) {
      this.num = val
    }
  }
}
</script>

<!-- eslint-disable vue/attribute-hyphenation -->
<template>
  <view
    :id="videoWrapperId"
    class="player-wrapper"
    :parentId="id"
    :randomNum="randomNum"
    :change:randomNum="domVideoPlayer.randomNumChange"
    :viewportProps="viewportProps"
    :change:viewportProps="domVideoPlayer.viewportChange"
    :videoSrc="videoSrc"
    :change:videoSrc="domVideoPlayer.initVideoPlayer"
    :command="eventCommand"
    :change:command="domVideoPlayer.triggerCommand"
    :func="renderFunc"
    :change:func="domVideoPlayer.triggerFunc"
  />
</template>

<style scoped>
.player-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 0;
  overflow: hidden;
  background-color: #000; /* 容器也强制黑色，防止出现白底 */
}
</style>
