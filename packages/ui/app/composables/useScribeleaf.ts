import { invoke, isTauri } from '@tauri-apps/api/core'
import type { Event } from '@tauri-apps/api/event'
import { listen } from '@tauri-apps/api/event'

export interface ScribeleafFormMeta {
  modelId: string
  entityName: string
  changeId: string | undefined
}

const DATA_UPDATED_EVENT = 'scribeleaf://data-updated'

/**
 * Bridges the currently-mounted form to the local scribeleaf REST API running
 * inside the Tauri process, so an external process can inspect and edit its
 * fields. Fully inert (all methods no-op) unless running inside Tauri with
 * `runtimeConfig.public.scribeleafEnabled` set.
 */
export function useScribeleaf() {
  const config = useRuntimeConfig()
  const enabled = Boolean(config.public.scribeleafEnabled) && isTauri()

  async function register(
    schema: object,
    uischema: object,
    data: object,
    meta: ScribeleafFormMeta,
  ) {
    if (!enabled) return
    await invoke('plugin:sageleaf-scribeleaf|register_form', { schema, uischema, data, meta })
  }

  async function push(data: object) {
    if (!enabled) return
    await invoke('plugin:sageleaf-scribeleaf|update_form_data', { data })
  }

  async function unregister() {
    if (!enabled) return
    await invoke('plugin:sageleaf-scribeleaf|unregister_form')
  }

  function onExternalUpdate(cb: (data: object) => void) {
    if (!enabled) return Promise.resolve(() => {})
    return listen<object>(DATA_UPDATED_EVENT, (event: Event<object>) => cb(event.payload))
  }

  return { enabled, register, push, unregister, onExternalUpdate }
}
