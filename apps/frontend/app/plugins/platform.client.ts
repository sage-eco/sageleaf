import { isTauri } from '@tauri-apps/api/core'
import { platform as tauriPlatform } from '@tauri-apps/plugin-os'

export type Platform = 'ios' | 'android' | 'web-ios' | 'web-android' | 'web'

export default defineNuxtPlugin(() => {
  const state = useState<Platform>('platform', () => 'web')
  if (!import.meta.client) return
  if (isTauri()) {
    const p = tauriPlatform()
    if (p === 'ios') state.value = 'ios'
    else if (p === 'android') state.value = 'android'
  } else {
    const ua = navigator.userAgent
    if (/android/i.test(ua)) state.value = 'web-android'
    else if (/iphone|ipad|ipod/i.test(ua)) state.value = 'web-ios'
  }
})
