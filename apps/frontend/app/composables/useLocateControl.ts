import { isTauri } from '@tauri-apps/api/core'
import maplibregl, { type IControl, type Map } from 'maplibre-gl'

/**
 * One-shot position lookup that respects platform differences (Tauri vs web)
 * and only ever requests the permission prompt in response to a user action.
 * Returns null if the user hasn't granted permission or the platform
 * doesn't support geolocation.
 */
async function getPosition(): Promise<{ lng: number; lat: number } | { error: string } | null> {
  if (isTauri()) {
    const { checkPermissions, requestPermissions, getCurrentPosition } =
      await import('@tauri-apps/plugin-geolocation')
    let permissions = await checkPermissions()
    if (permissions.location === 'prompt' || permissions.location === 'prompt-with-rationale') {
      permissions = await requestPermissions(['location'])
    }
    if (permissions.location !== 'granted') {
      return { error: 'Location permission denied' }
    }
    try {
      const pos = await getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      })
      return { lng: pos.coords.longitude, lat: pos.coords.latitude }
    } catch {
      return { error: 'Could not determine location' }
    }
  }
  if (!navigator.geolocation) {
    return { error: 'Geolocation not supported' }
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lng: pos.coords.longitude, lat: pos.coords.latitude }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          resolve({ error: 'Location permission denied' })
        } else {
          resolve({ error: 'Could not determine location' })
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  })
}

function createUserLocationElement(): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'user-location-marker'
  el.innerHTML =
    '<div class="user-location-marker__pulse"></div><div class="user-location-marker__dot"></div>'
  return el
}

interface ControlHandlers {
  onClick: (map: Map) => Promise<void>
  onRemove: () => void
}

class LocateControl implements IControl {
  private container?: HTMLElement
  private btn?: HTMLButtonElement
  private map?: Map
  constructor(private readonly handlers: ControlHandlers) {}

  setTracking(tracking: boolean) {
    this.btn?.classList.toggle('is-tracking', tracking)
  }

  setError(message: string | null) {
    if (!this.btn) return
    if (message) {
      this.btn.classList.add('is-error')
      this.btn.title = message
      this.btn.setAttribute('aria-label', message)
    } else {
      this.btn.classList.remove('is-error')
      this.btn.title = 'Center on current location'
      this.btn.setAttribute('aria-label', 'Center on current location')
    }
  }

  onAdd(map: Map): HTMLElement {
    this.map = map
    const container = document.createElement('div')
    container.className = 'maplibregl-ctrl maplibregl-ctrl-group'
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.title = 'Center on current location'
    btn.setAttribute('aria-label', 'Center on current location')
    btn.className = 'maplibregl-ctrl-locate'
    btn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" x2="5" y1="12" y2="12"/><line x1="19" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="5"/><line x1="12" x2="12" y1="19" y2="22"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/></svg>'
    btn.onclick = () => {
      if (this.map) void this.handlers.onClick(this.map)
    }
    container.append(btn)
    this.container = container
    this.btn = btn
    return container
  }
  onRemove(): void {
    if (this.btn) this.btn.onclick = null
    this.container?.remove()
    this.container = undefined
    this.btn = undefined
    this.handlers.onRemove()
    this.map = undefined
  }
}

function setupDisengageListeners(map: Map, onUserInteraction: () => void): () => void {
  const events = ['dragstart', 'zoomstart', 'rotatestart', 'pitchstart'] as const
  for (const ev of events) map.on(ev, onUserInteraction)
  return () => {
    for (const ev of events) map.off(ev, onUserInteraction)
  }
}

/**
 * Wires up a "center on current location" MapLibre control.
 *
 * On click, fetches the device position and `flyTo`s it. Then passively
 * follows the device until the user manually interacts with the map
 * (drag, zoom, rotate, pitch) — mirroring how native map apps "disengage"
 * locate mode. Once permission is granted, a persistent user-location
 * marker is added and tracks subsequent watch updates. Initial map setup
 * must not invoke the geolocation plugin; the permission prompt is only
 * ever shown in response to the click.
 */
// oxlint-disable-next-line max-lines-per-function
export function useLocateControl() {
  let watchUnlisten: (() => void) | null = null
  let userMarker: maplibregl.Marker | null = null
  let disposed = false

  function stopWatching() {
    watchUnlisten?.()
    watchUnlisten = null
    control.setTracking(false)
  }

  function ensureUserMarker(map: Map, pos: { lng: number; lat: number }) {
    if (userMarker) {
      userMarker.setLngLat([pos.lng, pos.lat])
      return
    }
    userMarker = new maplibregl.Marker({ element: createUserLocationElement() })
      .setLngLat([pos.lng, pos.lat])
      .addTo(map)
  }

  function startTauriWatch(onUpdate: (lng: number, lat: number) => void, offDisengage: () => void) {
    import('@tauri-apps/plugin-geolocation').then(({ watchPosition, clearWatch }) => {
      if (disposed) {
        offDisengage()
        return
      }
      const channelIdP = watchPosition(
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 },
        (pos, error) => {
          if (error) {
            // oxlint-disable-next-line no-console
            console.warn('[MapLibre] geolocation watch error:', error)
            return
          }
          if (pos) onUpdate(pos.coords.longitude, pos.coords.latitude)
        },
      )
      watchUnlisten = () => {
        offDisengage()
        void channelIdP.then((id) => clearWatch(id)).catch(() => {})
      }
    })
  }

  function startWebWatch(onUpdate: (lng: number, lat: number) => void, offDisengage: () => void) {
    const id = navigator.geolocation.watchPosition(
      (pos) => onUpdate(pos.coords.longitude, pos.coords.latitude),
      (err) => {
        // oxlint-disable-next-line no-console
        console.warn('[MapLibre] geolocation watch error:', err.message)
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 },
    )
    watchUnlisten = () => {
      navigator.geolocation.clearWatch(id)
      offDisengage()
    }
  }

  function startWatching(map: Map) {
    stopWatching()
    control.setTracking(true)
    const offDisengage = setupDisengageListeners(map, stopWatching)
    const onUpdate = (lng: number, lat: number) => {
      if (disposed) return
      ensureUserMarker(map, { lng, lat })
      map.setCenter([lng, lat])
    }
    if (isTauri()) {
      startTauriWatch(onUpdate, offDisengage)
      // Synchronous fallback: if dispose runs before the import resolves,
      // this clears the disengage listeners.
      watchUnlisten = offDisengage
    } else if (navigator.geolocation) {
      startWebWatch(onUpdate, offDisengage)
    } else {
      offDisengage()
    }
  }

  async function handleClick(map: Map) {
    const pos = await getPosition()
    if (!pos) {
      control.setError('Location unavailable')
      return
    }
    if ('error' in pos) {
      control.setError(pos.error)
      return
    }
    control.setError(null)
    ensureUserMarker(map, pos)
    map.flyTo({ center: [pos.lng, pos.lat], zoom: 15 })
    startWatching(map)
  }

  const control = new LocateControl({
    onClick: handleClick,
    onRemove: () => stopWatching(),
  })

  function dispose() {
    disposed = true
    stopWatching()
    userMarker?.remove()
    userMarker = null
  }

  return { control, stop: dispose }
}
