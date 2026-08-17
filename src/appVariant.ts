export type AppVariant = 'default' | 'linx'

export function resolveAppVariant(pathname: string): AppVariant {
  const normalizedPath = `/${pathname}`.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/'
  return normalizedPath.toLowerCase() === '/linxpos' ? 'linx' : 'default'
}
