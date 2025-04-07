import CryptoJS from 'crypto-js'
import { Base64 } from 'js-base64'
import { ref } from 'vue'
import { WebSocket } from '@/store/modules/socket/webSocket'

export function useXunFeiWebSocket(options: {
  APPID?: string
  APISecret?: string
  APIKey?: string
  url?: string
  host?: string
} = {
  APPID: 'f9b52f87',
  APISecret: 'ZDVkYzU5YmFhZmNlODVkM2RlNDMyNDhl',
  APIKey: '287ae449056d33e0f4995f480737564a',
  url: 'wss://iat-api.xfyun.cn/v2/iat',
  host: 'iat-api.xfyun.cn',
}) {
  const socketUrl = ref('')
  const { APPID, APISecret, APIKey, url, host } = options
  const DEBUG = true

  const finalSocketUrl = getWebSocketUrl()
  socketUrl.value = finalSocketUrl

  const ws = new WebSocket(socketUrl.value)

  function handleSocketStart() {
    ws.reset()
    ws.initSocket()
    ws.on('log', (e) => {
      if (DEBUG) {
        console.log(e)
      }
    })
    ws.on('open', () => {
      console.log('🍍 open成功啦啊啊')
    })

    ws.on('message', (e) => {
      const jsonData = JSON.parse(e)
      console.log(jsonData, '识别成功')
    })
  }

  function handleSocketStop() {
    ws?.closeSocket()
  }

  function send() {
    const params = {
      common: {
        app_id: 'f9b52f87',
      },
      business: {
        language: 'zh_cn',
        domain: 'iat',
        accent: 'mandarin',
        dwa: 'wpgs',
      },
      data: { status: 0 },
    }
    ws.sendMessage(params)
  }

  return {
    APPID,
    APISecret,
    APIKey,
    socketUrl,
    ws,
    handleSocketStart,
    handleSocketStop,
    send,
  }

  function getWebSocketUrl(): string {
    const date = (new Date() as any).toGMTString()
    const algorithm = 'hmac-sha256'
    const headers = 'host date request-line'

    if (!host || !APIKey || !APISecret || !url) {
      throw new Error('❌ getWebSocketUrl 参数不完整')
    }

    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET /v2/iat HTTP/1.1`
    const signatureSha = CryptoJS.HmacSHA256(signatureOrigin, APISecret)
    const signature = CryptoJS.enc.Base64.stringify(signatureSha)

    const authorizationOrigin = `api_key="${APIKey}", algorithm="${algorithm}", headers="${headers}", signature="${signature}"`
    const authorization = Base64.encode(authorizationOrigin)

    // ✅ 关键点：对所有参数做 encodeURIComponent 处理
    const finalUrl = `${url}?authorization=${encodeURIComponent(authorization)}&date=${encodeURIComponent(date)}&host=${encodeURIComponent(host)}`

    console.log('📡 最终 WebSocket URL:', finalUrl)
    return finalUrl
  }
}
