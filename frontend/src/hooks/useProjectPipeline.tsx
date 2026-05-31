import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { getApiBase } from '@/lib/apiBase'

export const SOP_FLOW = [
  { id: 'positioning', label: '账号定位分析', path: '/account-profile', emoji: '💡' },
  { id: 'category', label: '品类定位分析', path: '/category-positioning', emoji: '🔍' },
  { id: 'topic', label: '短视频选题', path: '/topic-selection', emoji: '🎬' },
  { id: 'script', label: '文案创作', path: '/script-creation', emoji: '📝' },
  { id: 'video', label: '视频制作', path: '/video-production', emoji: '📹' },
  { id: 'private', label: '私域运营', path: '/private-domain', emoji: '👥' },
] as const

export const VIDEO_TOOLS_FLOW = [
  { id: 'videoDeconstruct', label: '视频拆解', path: '/video-deconstruct', emoji: '🔬' },
  { id: 'viralFollowUp', label: '爆款跟拍', path: '/viral-follow-up', emoji: '🔥' },
] as const

export const AUX_FLOW = [
  { id: 'market', label: '市场分析', path: '/market-analysis', emoji: '📈' },
  { id: 'boss', label: '老板助手', path: '/boss-helper', emoji: '👔' },
  { id: 'resource', label: '资源管理', path: '/resource-management', emoji: '📦' },
  { id: 'channel', label: '频道任务', path: '/channel-task', emoji: '🤖' },
] as const

interface PipelineState {
  projectId: string | null
  currentStep: string
  completedSteps: string[]
  accountProfile: Record<string, unknown> | null
  selectedTopic: Record<string, unknown> | null
  scriptData: Record<string, unknown> | null
  videoAssets: Record<string, unknown> | null
}

interface PipelineContextValue extends PipelineState {
  setProjectId: (id: string) => void
  markStepCompleted: (step: string) => void
  isStepCompleted: (step: string) => boolean
  getNextStep: (currentStep: string) => { id: string; label: string; path: string; emoji: string } | null
  saveProfile: (data: Record<string, unknown>, goNext?: boolean) => void
  saveTopic: (data: Record<string, unknown>, goNext?: boolean) => void
  saveScript: (data: Record<string, unknown>, goNext?: boolean) => void
  saveVideoAssets: (data: Record<string, unknown>, goNext?: boolean) => void
  proceedToNext: (fromStep: string) => string | null
  goToStep: (stepId: string) => string
  clearDownstream: () => void
  resetPipeline: () => void
}

const PipelineContext = createContext<PipelineContextValue | null>(null)

const STORAGE_KEY = 'pipeline_state'

function loadFromStorage(): PipelineState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (!parsed.completedSteps) parsed.completedSteps = []
      if (!parsed.projectId) parsed.projectId = null
      return parsed as PipelineState
    }
  } catch { /* ignore */ }
  return {
    projectId: null,
    currentStep: 'positioning',
    completedSteps: [],
    accountProfile: null,
    selectedTopic: null,
    scriptData: null,
    videoAssets: null,
  }
}

function persistToStorage(state: PipelineState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch { /* ignore */ }
}

export function PipelineProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PipelineState>(loadFromStorage)

  useEffect(() => {
    persistToStorage(state)
  }, [state])

  const setProjectId = useCallback((id: string) => {
    if (!id) return
    setState((prev) => ({ ...prev, projectId: id }))
  }, [])

  const markStepCompleted = useCallback((step: string) => {
    setState((prev) => {
      if (prev.completedSteps.includes(step)) return prev
      return { ...prev, completedSteps: [...prev.completedSteps, step] }
    })
  }, [])

  const isStepCompleted = useCallback((step: string) => {
    return state.completedSteps.includes(step)
  }, [state.completedSteps])

  const getNextStep = useCallback((currentStep: string) => {
    const idx = SOP_FLOW.findIndex(s => s.id === currentStep)
    if (idx === -1 || idx >= SOP_FLOW.length - 1) return null
    const next = SOP_FLOW[idx + 1]
    return { id: next.id, label: next.label, path: next.path, emoji: next.emoji }
  }, [])

  const saveProfile = useCallback((data: Record<string, unknown>, goNext = false) => {
    setState((prev) => ({
      ...prev,
      accountProfile: data,
      completedSteps: prev.completedSteps.includes('positioning') ? prev.completedSteps : [...prev.completedSteps, 'positioning'],
      currentStep: goNext ? 'topic' : prev.currentStep,
    }))
    const id = state.projectId
    if (id) {
      fetch(`${getApiBase()}/api/v1/project/save-step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: id, step: 'positioning', data, advance: goNext }),
      }).catch(() => {})
    }
  }, [state.projectId])

  const saveTopic = useCallback((data: Record<string, unknown>, goNext = false) => {
    setState((prev) => ({
      ...prev,
      selectedTopic: data,
      completedSteps: prev.completedSteps.includes('topic') ? prev.completedSteps : [...prev.completedSteps, 'topic'],
      currentStep: goNext ? 'script' : prev.currentStep,
    }))
    const id = state.projectId
    if (id) {
      fetch(`${getApiBase()}/api/v1/project/save-step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: id, step: 'topic_selection', data, advance: goNext }),
      }).catch(() => {})
    }
  }, [state.projectId])

  const saveScript = useCallback((data: Record<string, unknown>, goNext = false) => {
    setState((prev) => ({
      ...prev,
      scriptData: data,
      completedSteps: prev.completedSteps.includes('script') ? prev.completedSteps : [...prev.completedSteps, 'script'],
      currentStep: goNext ? 'video' : prev.currentStep,
    }))
    const id = state.projectId
    if (id) {
      fetch(`${getApiBase()}/api/v1/project/save-step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: id, step: 'script_writing', data, advance: goNext }),
      }).catch(() => {})
    }
  }, [state.projectId])

  const saveVideoAssets = useCallback((data: Record<string, unknown>, goNext = false) => {
    setState((prev) => ({
      ...prev,
      videoAssets: data,
      completedSteps: prev.completedSteps.includes('video') ? prev.completedSteps : [...prev.completedSteps, 'video'],
      currentStep: goNext ? 'private' : prev.currentStep,
    }))
    const id = state.projectId
    if (id) {
      fetch(`${getApiBase()}/api/v1/project/save-step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: id, step: 'video_production', data, advance: goNext }),
      }).catch(() => {})
    }
  }, [state.projectId])

  const proceedToNext = useCallback((fromStep: string): string | null => {
    const idx = SOP_FLOW.findIndex(s => s.id === fromStep)
    if (idx === -1 || idx >= SOP_FLOW.length - 1) return null
    const next = SOP_FLOW[idx + 1]
    setState((prev) => {
      const completed = prev.completedSteps.includes(fromStep) ? prev.completedSteps : [...prev.completedSteps, fromStep]
      return { ...prev, completedSteps: completed, currentStep: next.id }
    })
    return next.path
  }, [])

  const goToStep = useCallback((stepId: string) => {
    setState((prev) => ({ ...prev, currentStep: stepId }))
    const step = SOP_FLOW.find(s => s.id === stepId)
    return step?.path || '/'
  }, [])

  const clearDownstream = useCallback(() => {
    setState((prev) => ({
      ...prev,
      completedSteps: [],
      accountProfile: null,
      selectedTopic: null,
      scriptData: null,
      videoAssets: null,
    }))
  }, [])

  const resetPipeline = useCallback(() => {
    const fresh: PipelineState = {
      projectId: null,
      currentStep: 'positioning',
      completedSteps: [],
      accountProfile: null,
      selectedTopic: null,
      scriptData: null,
      videoAssets: null,
    }
    setState(fresh)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return (
    <PipelineContext.Provider
      value={{
        ...state,
        setProjectId,
        markStepCompleted,
        isStepCompleted,
        getNextStep,
        saveProfile,
        saveTopic,
        saveScript,
        saveVideoAssets,
        proceedToNext,
        goToStep,
        clearDownstream,
        resetPipeline,
      }}
    >
      {children}
    </PipelineContext.Provider>
  )
}

export function useProjectPipeline() {
  const ctx = useContext(PipelineContext)
  if (!ctx) throw new Error('useProjectPipeline must be used within PipelineProvider')
  return ctx
}
