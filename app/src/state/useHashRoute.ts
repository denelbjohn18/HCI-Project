import { useMemo, useSyncExternalStore } from 'react'

export const ROUTES = ['profile', 'result', 'explore', 'baseline'] as const
export type RouteName = (typeof ROUTES)[number]

export interface Route {
  name: RouteName
  params: URLSearchParams
}

function isRouteName(value: string): value is RouteName {
  return (ROUTES as readonly string[]).includes(value)
}

function parse(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?')
  return { name: isRouteName(path) ? path : 'profile', params: new URLSearchParams(query) }
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

export function routeHref(name: RouteName, params?: Record<string, string>): string {
  const query = params ? `?${new URLSearchParams(params)}` : ''
  return `#/${name}${query}`
}

export function navigate(name: RouteName, params?: Record<string, string>) {
  window.location.hash = routeHref(name, params)
}

export function useHashRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  return useMemo(() => parse(hash), [hash])
}
