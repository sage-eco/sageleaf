const GID_PREFIX = 'gid://sageleaf/'

export function toGlobalId(type: string, id: string): string {
  return `${GID_PREFIX}${type}/${id}`
}

export function fromGlobalId(gid: string): { type: string; id: string } | null {
  if (!gid.startsWith(GID_PREFIX)) {
    return null
  }
  const rest = gid.slice(GID_PREFIX.length)
  const slashIndex = rest.indexOf('/')
  if (slashIndex <= 0 || slashIndex === rest.length - 1) {
    return null
  }
  const type = rest.slice(0, slashIndex)
  const id = rest.slice(slashIndex + 1)
  if (!type || !id || id.includes('/')) {
    return null
  }
  return { type, id }
}
