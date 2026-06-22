import { isTauri } from '@tauri-apps/api/core'
import { openUrl as tauriOpenUrl } from '@tauri-apps/plugin-opener'

/**
 * Opens a URL in the system browser when running inside Tauri, otherwise
 * falls back to a new browser tab. Always stringifies the input so the
 * Tauri bridge never receives a URL object
 */
export function useOpenUrl() {
  async function openUrl(url: string) {
    const target = String(url)
    if (isTauri()) {
      await tauriOpenUrl(target)
    } else {
      window.open(target, '_blank', 'noopener,noreferrer')
    }
  }

  return { openUrl }
}
