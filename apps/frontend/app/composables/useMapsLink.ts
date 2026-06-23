import type { Platform } from '~/plugins/platform.client'

function buildUrl(platform: Platform, lat: number, lng: number): string {
  // Always return an https:// URL so the Tauri opener plugin (which only
  // allows http(s) by default) and the webview both handle it. On mobile,
  // the OS resolves https://maps.google.com links to the native maps app
  // via intent resolution. Using geo: / maps.apple.com here would require
  // expanding the opener's URL allow-list in capabilities/mobile.json.
  if (platform === 'ios' || platform === 'web-ios') {
    return `https://maps.google.com/?ll=${lat},${lng}&q=${lat},${lng}`
  }
  return `https://maps.google.com/?q=${lat},${lng}`
}

export function useMapsLink() {
  const platform = useState<Platform>('platform', () => 'web')
  return ({ latitude, longitude }: { latitude: number; longitude: number }) =>
    buildUrl(platform.value, latitude, longitude)
}
