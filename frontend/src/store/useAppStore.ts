import { create } from 'zustand'
import { getWorkflowDef, WORKFLOWS } from '@/types'
import { getApiBase } from '@/lib/apiBase'

export interface AvatarItem {
  id: string
  name: string
  status: 'ready' | 'cloning' | 'error'
  thumbnail: string
  avatar_url?: string | null
  voice_id?: string
  voice_type?: string
  voice_status?: string
  is_virtual?: boolean
  video_path?: string
  audio_path?: string
  created_at?: string
  updated_at?: string
}

interface AppState {
  activeWorkflow: string
  inputValues: Record<string, string>
  style: string
  agents: Record<string, boolean>
  isGenerating: boolean
  result: Record<string, unknown> | null
  toast: { message: string; type: 'success' | 'error' } | null
  selectedAvatar: AvatarItem | null
  avatarList: AvatarItem[]
  abortController: AbortController | null

  setActiveWorkflow: (id: string) => void
  setInputValue: (key: string, value: string) => void
  setStyle: (style: string) => void
  toggleAgent: (key: string) => void
  setIsGenerating: (v: boolean) => void
  setResult: (result: Record<string, unknown> | null) => void
  showToast: (message: string, type: 'success' | 'error') => void
  hideToast: () => void
  resetForWorkflow: (id: string) => void
  selectAvatar: (avatar: AvatarItem | null) => void
  addAvatar: (avatar: AvatarItem) => void
  removeAvatar: (id: string) => void
  renameAvatar: (id: string, name: string) => void
  loadAvatars: () => Promise<void>
  cancelGeneration: () => void
  getAbortSignal: () => AbortSignal | undefined
}

function getDefaultAgents(id: string): Record<string, boolean> {
  const wf = getWorkflowDef(id)
  if (!wf) return {}
  const agents: Record<string, boolean> = {}
  for (const a of wf.agents) {
    agents[a.key] = false
  }
  return agents
}

const DEFAULT_AVATARS: AvatarItem[] = [
  { id: 'av1', name: '全能主播-小李', status: 'ready', thumbnail: '', voice_type: '知性干练女声', voice_id: 'female_professional_01' },
  { id: 'av2', name: '知识分享-王老师', status: 'ready', thumbnail: '', voice_type: '专业沉稳男声', voice_id: 'male_professional_01' },
  { id: 'av3', name: '时尚达人-Anna', status: 'ready', thumbnail: '', voice_type: '活力元气少女', voice_id: 'female_energetic_01' },
  { id: 'av4', name: '科技极客-张工', status: 'ready', thumbnail: '', voice_type: '专业沉稳男声', voice_id: 'male_professional_01' },
]

export const useAppStore = create<AppState>((set, get) => ({
  activeWorkflow: 'script',
  inputValues: {},
  style: 'viral',
  agents: getDefaultAgents('script'),
  isGenerating: false,
  result: null,
  toast: null,
  selectedAvatar: null,
  avatarList: DEFAULT_AVATARS,
  abortController: null,

  setActiveWorkflow: (id) => {
    get().resetForWorkflow(id)
    set({ activeWorkflow: id })
  },

  setInputValue: (key, value) =>
    set((state) => ({ inputValues: { ...state.inputValues, [key]: value } })),

  setStyle: (style) => set({ style }),

  toggleAgent: (key) =>
    set((state) => ({ agents: { ...state.agents, [key]: !state.agents[key] } })),

  setIsGenerating: (v) => {
    if (v) {
      const controller = new AbortController()
      set({ isGenerating: true, abortController: controller })
    } else {
      set({ isGenerating: false, abortController: null })
    }
  },
  setResult: (result) => set({ result }),
  showToast: (message, type) => set({ toast: { message, type } }),
  hideToast: () => set({ toast: null }),

  resetForWorkflow: (id) => {
    const wf = getWorkflowDef(id)
    const inputValues: Record<string, string> = {}
    if (wf) {
      for (const inp of wf.inputs) {
        inputValues[inp.key] = ''
      }
    }
    set({
      inputValues,
      style: wf?.styles?.[0]?.value || '',
      agents: getDefaultAgents(id),
      result: null,
    })
  },

  selectAvatar: (avatar) => set({ selectedAvatar: avatar }),

  addAvatar: (avatar) =>
    set((state) => ({ avatarList: [...state.avatarList, avatar] })),

  removeAvatar: (id) =>
    set((state) => ({
      avatarList: state.avatarList.filter((a) => a.id !== id),
      selectedAvatar: state.selectedAvatar?.id === id ? null : state.selectedAvatar,
    })),

  renameAvatar: (id, name) =>
    set((state) => ({
      avatarList: state.avatarList.map((a) => (a.id === id ? { ...a, name } : a)),
      selectedAvatar: state.selectedAvatar?.id === id ? { ...state.selectedAvatar, name } : state.selectedAvatar,
    })),

  cancelGeneration: () => {
    const { abortController } = get()
    if (abortController) {
      abortController.abort()
      set({ isGenerating: false, abortController: null })
      get().showToast('已取消生成', 'success')
    }
  },

  getAbortSignal: () => get().abortController?.signal,

  loadAvatars: async () => {
    try {
      const res = await fetch(`${getApiBase()}/api/v1/assets/avatars`)
      if (!res.ok) return
      const json = await res.json()
      const list: AvatarItem[] = (json.data || []).map((a: Record<string, unknown>) => ({
        id: a.id as string,
        name: a.name as string,
        status: (a.status as AvatarItem['status']) || 'ready',
        thumbnail: (a.avatar_url as string) || '',
        avatar_url: a.avatar_url as string | null,
        voice_id: a.voice_id as string,
        voice_type: a.voice_type as string,
        voice_status: a.voice_status as string,
        is_virtual: a.is_virtual as boolean,
        video_path: a.video_path as string,
        audio_path: a.audio_path as string,
        created_at: a.created_at as string,
        updated_at: a.updated_at as string,
      }))
      set({ avatarList: list.length > 0 ? list : DEFAULT_AVATARS })
    } catch {
      /* keep defaults */
    }
  },
}))
