import { useState, useEffect, useCallback } from 'react'
import { getApiBase } from '@/lib/apiBase'

export type BackendStatus = 'checking' | 'connected' | 'disconnected'

export function useBackendStatus() {
  const [status, setStatus] = useState<BackendStatus>('checking')

  const check = useCallback(async () => {
    try {
      const base = getApiBase()
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      const res = await fetch(`${base}/health`, { signal: controller.signal })
      clearTimeout(timeout)
      setStatus(res.ok ? 'connected' : 'disconnected')
    } catch {
      setStatus('disconnected')
    }
  }, [])

  useEffect(() => {
    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [check])

  return { status, recheck: check }
}
