import { name, version } from '../../../package.json'
import { Cache, type CacheTime } from './cache'
import type { UserInfoModel } from '@/model/user'

interface CacheType {
  /**
   * 登录凭证
   */
  TOKEN: string
  /**
   * openid
   */
  OPEN_ID: string
  /**
   * debug
   */
  DEBUG_DATA: any
  /**
   * 用户信息
   */
  USER_INFO: UserInfoModel | null
  /**
   * 当前ai模型
   */
  AI_MODEL: string
  /**
   * ai 打招呼音频数据
   */
  AI_GREETING_AUDIO_DATA: {
    audioData: string
    text: string
    id: number
  }
}
/**
 * 缓存
 */
const cache = new Cache<CacheType>(name, version)

/** 通用缓存方案 */
export function getCache<T>(key: keyof CacheType) {
  return cache.get(key) as T
}
/** 通用缓存方案 */
export function setCache<K extends keyof CacheType>(
  key: K,
  value: CacheType[K],
  expires?: number | Partial<CacheTime>,
) {
  return cache.set(key, value, expires)
}

export function removeCache(key: keyof CacheType) {
  return cache.remove(key)
}

/** */
export function getCacheToken() {
  return cache.get('TOKEN')
}

export function setCacheToken(token: string) {
  return cache.set('TOKEN', token, -1)
}

export function removeCacheToken() {
  return cache.remove('TOKEN')
}
/** */

/** */
export function getCacheOpenId() {
  return cache.get('OPEN_ID')
}

export function setCacheOpenId(openid: string) {
  return cache.set('OPEN_ID', openid, -1)
}

export function removeCacheOpenId() {
  return cache.remove('OPEN_ID')
}

/** */
export function getCacheDebugData() {
  return cache.get('DEBUG_DATA')
}

export function setCacheDebugData(data: any) {
  return cache.set('DEBUG_DATA', data, -1)
}

export function removeCacheDebugData() {
  return cache.remove('DEBUG_DATA')
}

/** */
export function getCacheUserInfo() {
  return cache.get('USER_INFO')
}

export function setCacheUserInfo(data: UserInfoModel | null) {
  return cache.set('USER_INFO', data, -1)
}

export function removeCacheUserInfo() {
  return cache.remove('USER_INFO')
}

/** */
// 清空所有缓存
export function clearCache() {
  const keys: (keyof CacheType)[] = [
    'TOKEN',
    'OPEN_ID',
    'DEBUG_DATA',
    'USER_INFO',
  ]
  keys.forEach((key) => {
    cache.remove(key)
  })
}
