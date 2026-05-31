const STORAGE_KEY = 'api_base_url'
const DEFAULT_BASE = 'https://storm-benjamin-flyer-ross.trycloudflare.com'

function getBuildTimeBase(): string {
  const envBase = import.meta.env.VITE_API_BASE || ''
  if (envBase && envBase.startsWith('https://')) return envBase
  return ''
}

export function getApiBase(): string {
  const runtime = localStorage.getItem(STORAGE_KEY)
  if (runtime) return runtime
  return getBuildTimeBase() || DEFAULT_BASE
}

export function setApiBase(url: string): void {
  if (url.trim()) {
    localStorage.setItem(STORAGE_KEY, url.trim().replace(/\/+$/, ''))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function getApiBaseDisplay(): string {
  return localStorage.getItem(STORAGE_KEY) || getBuildTimeBase() || DEFAULT_BASE
}
