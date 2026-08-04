window.__TAURI_ISOLATION_HOOK__ = (payload) => {
  // let's not verify or modify anything, just print the content from the hook
  // oxlint-disable-next-line no-console
  console.log('hook', payload)
  return payload
}
