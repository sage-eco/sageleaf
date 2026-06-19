import type { Platform } from '~/plugins/platform.client'

function buildUrl(platform: Platform, lat: number, lng: number): string {
  if (platform === 'ios' || platform === 'web-ios') {
    return `https://maps.apple.com/?ll=${lat},${lng}&q=${lat},${lng}`
  }
  if (platform === 'android') {
    return `geo:${lat},${lng}?q=${lat},${lng}`
  }
  return `https://maps.google.com/?q=${lat},${lng}`
}

export function useMapsLink() {
  const platform = useState<Platform>('platform', () => 'web')
  return ({ latitude, longitude }: { latitude: number; longitude: number }) =>
    buildUrl(platform.value, latitude, longitude)
}
