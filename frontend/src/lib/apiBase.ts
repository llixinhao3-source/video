const STORAGE_KEY = 'api_base_url'

function getBuildTimeBase(): string {
  return import.meta.env.VITE_API_BASE || ''
}

export function getApiBase(): string {
  const runtime = localStorage.getItem(STORAGE_KEY)
  return runtime || getBuildTimeBase()
}

export function setApiBase(url: string): void {
  if (url.trim()) {
    localStorage.setItem(STORAGE_KEY, url.trim().replace(/\/+$/, ''))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function getApiBaseDisplay(): string {
  return localStorage.getItem(STORAGE_KEY) || getBuildTimeBase() || '(未设置)'
}
