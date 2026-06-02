import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
    Play, Loader2, CheckCircle2, ChevronDown, ChevronUp,
    Copy, Check, Sparkles, Upload, FileVideo, User, Settings, Clock, Film, ArrowRight,
    Download, MonitorPlay, Smartphone, Tv,
} from 'lucide-react'
import { useAppStore, type AvatarItem } from '@/store/useAppStore'
import { useProjectPipeline } from '@/hooks/useProjectPipeline'
import AvatarCenterModal from '@/components/AvatarCenterModal'
import DomainAssetModal from '@/components/DomainAssetModal'
import { getApiBase } from '@/lib/apiBase'

/* ─────────────────────────────────────
   Domain‑specific expert parameters
   ───────────────────────────────────── */
interface DomainParams {
    promo_tone: string
    brand_assets: string
    explain_depth: string
    max_scenes: string
    image_engine: string
    aspect_ratio: string
    platforms: string[]
    publish_time: string
}

interface ExpertState {
    active: boolean
    script: string
    greenScreenFile: File | null
    greenScreenPath: string
    selectedAvatarId: string
    selectedAvatarName: string
    isGenerating: boolean
    isUploading: boolean
    resultMarkdown: string
    isExpanded: boolean
}

interface ExpertDef {
    key: string
    label: string
    sub: string
    emoji: string
    color: string
    hasGreenScreen: boolean
    hasAvatarSelector: boolean
}

const VIDEO_EXPERTS: ExpertDef[] = [
    { key: 'avatar_smart_cut', label: '数字人智剪', sub: '绿幕模板+素材制作', emoji: '✂️', color: '#007AFF', hasGreenScreen: true, hasAvatarSelector: false },
    { key: 'avatar_clone_video', label: '数字人视频', sub: '形象/声音克隆渲染', emoji: '🎭', color: '#5856D6', hasGreenScreen: false, hasAvatarSelector: true },
    { key: 'brand_cube', label: '品宣魔方', sub: '品牌宣传视频方案', emoji: '🧊', color: '#FF9500', hasGreenScreen: false, hasAvatarSelector: false },
    { key: 'ai_model_explain', label: '智模讲解', sub: '智能讲解分镜台本', emoji: '🧠', color: '#34C759', hasGreenScreen: false, hasAvatarSelector: false },
    { key: 'image_master', label: '生图大师', sub: '配套图片素材 Prompt', emoji: '🎨', color: '#FF3B30', hasGreenScreen: false, hasAvatarSelector: false },
    { key: 'video_publisher', label: '视频发布员', sub: '多平台智能发布策略', emoji: '🚀', color: '#AF52DE', hasGreenScreen: false, hasAvatarSelector: false },
]

const PROMO_TONES = ['激情热血', '高端科技', '沉稳商务', '温暖走心']
const BRAND_ASSETS = ['默认企业Logo', '官方产品主图', '品牌VI套装', '仅文字水印']
const EXPLAIN_DEPTHS = ['浅显科普', '产品带货', '深度硬核', '行业评测']
const IMAGE_ENGINES = ['Midjourney-v6 真实风', 'SDXL 3D电商风', '国风水墨', '扁平插画']
const ASPECT_RATIOS = ['16:9', '9:16', '1:1']
const PUBLISH_PLATFORMS = ['抖音', '小红书', '视频号', '快手', 'B站']

/* ── Toggle Switch ── */
function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
    return (
        <button
            onClick={(e) => { e.stopPropagation(); onToggle() }}
            className={`relative w-[44px] h-[26px] rounded-full transition-colors duration-300 flex-shrink-0 ${
                enabled ? 'bg-[#34C759]' : 'bg-[#E5E5EA]'
            }`}
        >
            <div className={`absolute top-[3px] w-[20px] h-[20px] rounded-full bg-white shadow-sm transition-transform duration-300 ${
                enabled ? 'translate-x-[21px]' : 'translate-x-[3px]'
            }`} />
        </button>
    )
}

/* ── Copy Button ── */
function CopyBtn({ text }: { text: string }) {
    const [copied, setCopied] = useState(false)
    const handleCopy = async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }
    return (
        <button
            onClick={(e) => { e.stopPropagation(); handleCopy() }}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-[#86868B] hover:text-[#1D1D1F] hover:bg-white/60 transition-colors"
        >
            {copied ? <Check className="w-3 h-3 text-[#34C759]" /> : <Copy className="w-3 h-3" />}
            {copied ? '已复制' : '复制'}
        </button>
    )
}

/* ── Reusable Section Label ── */
function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <span className="text-[11px] font-medium text-[#86868B]">{children}</span>
    )
}

/* ── Render the correct left‑column config per expert ── */
function LeftColumn({
    expert,
    st,
    dp,
    updateExpert,
    updateDomain,
}: {
    expert: ExpertDef
    st: ExpertState
    dp: DomainParams
    updateExpert: (key: string, p: Partial<ExpertState>) => void
    updateDomain: (p: Partial<DomainParams>) => void
}) {
    if (expert.key === 'avatar_smart_cut') {
        return <GreenScreenColumn expert={expert} st={st} updateExpert={updateExpert} />
    }
    if (expert.key === 'avatar_clone_video') {
        return <AvatarSelectorColumn expert={expert} st={st} updateExpert={updateExpert} />
    }
    if (expert.key === 'brand_cube') {
        return <BrandCubeColumn dp={dp} updateDomain={updateDomain} />
    }
    if (expert.key === 'ai_model_explain') {
        return <AiModelExplainColumn dp={dp} updateDomain={updateDomain} />
    }
    if (expert.key === 'image_master') {
        return <ImageMasterColumn dp={dp} updateDomain={updateDomain} />
    }
    if (expert.key === 'video_publisher') {
        return <VideoPublisherColumn dp={dp} updateDomain={updateDomain} />
    }
    return null
}

/* ================================================================
   Avatar‑smart‑cut: green screen upload
   ================================================================ */
function GreenScreenColumn({
    expert, st, updateExpert,
}: { expert: ExpertDef; st: ExpertState; updateExpert: (k: string, p: Partial<ExpertState>) => void }) {
    const fileRef = useRef<HTMLInputElement | null>(null)
    const { showToast } = useAppStore()
    const pipeline = useProjectPipeline()

    const handleSelect = async (file: File | undefined) => {
        if (!file) return
        updateExpert(expert.key, { greenScreenFile: file, isUploading: true })
        const pid = pipeline.projectId
        if (!pid) { showToast('项目未初始化', 'error'); updateExpert(expert.key, { isUploading: false }); return }
        try {
            const fd = new FormData(); fd.append('project_id', pid); fd.append('file', file)
            const res = await fetch(`${getApiBase()}/api/v1/video/upload-greenscreen`, { method: 'POST', body: fd })
            if (!res.ok) { const e = await res.json().catch(() => null); throw new Error(e?.detail) }
            const j = await res.json()
            updateExpert(expert.key, { greenScreenPath: j.file_path, isUploading: false })
            showToast(`已上传: ${file.name}`, 'success')
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : '上传失败', 'error')
            updateExpert(expert.key, { isUploading: false, greenScreenFile: null })
        }
    }

    return (
        <div>
            <div className="flex items-center gap-1.5 mb-2"><FileVideo className="w-3.5 h-3.5 text-[#86868B]" /><SectionLabel>绿幕资产</SectionLabel></div>
            <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={e => handleSelect(e.target.files?.[0])} />
            {st.greenScreenFile ? (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#34C759]/5 border border-[#34C759]/20">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#34C759] flex-shrink-0" />
                    <span className="text-[11px] text-[#1D1D1F] font-medium truncate flex-1">{st.greenScreenFile.name}</span>
                    {st.isUploading && <Loader2 className="w-3.5 h-3.5 text-[#007AFF] animate-spin flex-shrink-0" />}
                </div>
            ) : (
                <button onClick={() => fileRef.current?.click()} disabled={st.isUploading}
                    className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl border border-dashed border-slate-200 bg-[#FAFAFA] text-[12px] text-[#86868B] hover:border-[#007AFF]/30 hover:text-[#007AFF] hover:bg-[#007AFF]/2 transition-all duration-200">
                    {st.isUploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 上传中...</> : <><Upload className="w-3.5 h-3.5" /> 上传绿幕.mp4</>}
                </button>
            )}
            <div className="flex items-center gap-1.5 mt-1.5 px-1">
                <div className={`w-1.5 h-1.5 rounded-full ${st.greenScreenPath ? 'bg-[#34C759]' : 'bg-[#E5E5EA]'}`} />
                <span className="text-[10px] text-[#86868B]">{st.greenScreenPath ? '已挂载' : '未选择绿幕'}</span>
            </div>
        </div>
    )
}

/* ================================================================
   Avatar‑clone‑video: avatar radio selector
   ================================================================ */
function AvatarSelectorColumn({
    expert, st, updateExpert,
}: { expert: ExpertDef; st: ExpertState; updateExpert: (k: string, p: Partial<ExpertState>) => void }) {
    const { avatarList } = useAppStore()
    return (
        <div>
            <div className="flex items-center gap-1.5 mb-2"><User className="w-3.5 h-3.5 text-[#86868B]" /><SectionLabel>绑定数字人</SectionLabel></div>
            <div className="space-y-2">
                {avatarList.filter(a => a.status === 'ready').slice(0, 4).map(a => (
                    <button key={a.id} onClick={() => updateExpert(expert.key, { selectedAvatarId: a.id, selectedAvatarName: a.name })}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all duration-200 ${
                            st.selectedAvatarId === a.id ? 'border-[#007AFF]/40 bg-[#007AFF]/5 ring-1 ring-[#007AFF]/10' : 'border-slate-100 bg-white hover:border-[#007AFF]/20'
                        }`}>
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#007AFF]/15 to-[#5856D6]/15 flex items-center justify-center text-sm flex-shrink-0">
                            {a.thumbnail || a.avatar_url ? <img src={a.thumbnail || a.avatar_url || ''} alt="" className="w-full h-full rounded-lg object-cover" /> : a.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-medium text-[#1D1D1F] truncate">{a.name}</p>
                            <p className="text-[10px] text-[#86868B]">{a.voice_type || '知性干练女声'}</p>
                        </div>
                        {st.selectedAvatarId === a.id && <CheckCircle2 className="w-4 h-4 text-[#007AFF] flex-shrink-0" />}
                    </button>
                ))}
            </div>
        </div>
    )
}

/* ================================================================
   brand_cube  品宣魔方
   ================================================================ */
function BrandCubeColumn({ dp, updateDomain }: { dp: DomainParams; updateDomain: (p: Partial<DomainParams>) => void }) {
    return (
        <div className="space-y-4">
            <div>
                <SectionLabel>关联品牌VI资产</SectionLabel>
                <select value={dp.brand_assets} onChange={e => updateDomain({ brand_assets: e.target.value })}
                    className="mt-1.5 w-full h-[36px] pl-3 pr-8 rounded-xl border border-slate-200 bg-white text-[12px] text-[#1D1D1F] outline-none focus:border-[#007AFF]/30 focus:ring-[3px] focus:ring-[#007AFF]/8 appearance-none cursor-pointer">
                    {BRAND_ASSETS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
            </div>
            <div>
                <SectionLabel>宣传调性选择</SectionLabel>
                <select value={dp.promo_tone} onChange={e => updateDomain({ promo_tone: e.target.value })}
                    className="mt-1.5 w-full h-[36px] pl-3 pr-8 rounded-xl border border-slate-200 bg-white text-[12px] text-[#1D1D1F] outline-none focus:border-[#007AFF]/30 focus:ring-[3px] focus:ring-[#007AFF]/8 appearance-none cursor-pointer">
                    {PROMO_TONES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
            </div>
        </div>
    )
}

/* ================================================================
   ai_model_explain  智模讲解
   ================================================================ */
function AiModelExplainColumn({ dp, updateDomain }: { dp: DomainParams; updateDomain: (p: Partial<DomainParams>) => void }) {
    return (
        <div className="space-y-4">
            <div>
                <SectionLabel>讲解深度</SectionLabel>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {EXPLAIN_DEPTHS.map(d => (
                        <button key={d} onClick={() => updateDomain({ explain_depth: d })}
                            className={`px-2.5 py-2 rounded-xl text-[11px] font-medium border transition-all duration-200 ${
                                dp.explain_depth === d ? 'border-[#007AFF]/40 bg-[#007AFF]/8 text-[#007AFF]' : 'border-slate-100 bg-white text-[#86868B] hover:border-slate-200'
                            }`}>{d}</button>
                    ))}
                </div>
            </div>
            <div>
                <SectionLabel>目标分镜数量上限</SectionLabel>
                <div className="mt-1.5 flex items-center gap-2">
                    <input type="number" min={2} max={12} value={dp.max_scenes}
                        onChange={e => updateDomain({ max_scenes: e.target.value })}
                        className="w-[72px] h-[36px] px-3 rounded-xl border border-slate-200 bg-white text-[13px] text-center text-[#1D1D1F] outline-none focus:border-[#007AFF]/30" />
                    <span className="text-[11px] text-[#C7C7CC]">个分镜</span>
                </div>
            </div>
        </div>
    )
}

/* ================================================================
   image_master  生图大师
   ================================================================ */
function ImageMasterColumn({ dp, updateDomain }: { dp: DomainParams; updateDomain: (p: Partial<DomainParams>) => void }) {
    return (
        <div className="space-y-4">
            <div>
                <SectionLabel>图片生成引擎 / 风格</SectionLabel>
                <select value={dp.image_engine} onChange={e => updateDomain({ image_engine: e.target.value })}
                    className="mt-1.5 w-full h-[36px] pl-3 pr-8 rounded-xl border border-slate-200 bg-white text-[12px] text-[#1D1D1F] outline-none focus:border-[#007AFF]/30 focus:ring-[3px] focus:ring-[#007AFF]/8 appearance-none cursor-pointer">
                    {IMAGE_ENGINES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
            </div>
            <div>
                <SectionLabel>画幅比例</SectionLabel>
                <div className="mt-2 flex gap-2">
                    {ASPECT_RATIOS.map(ar => (
                        <button key={ar} onClick={() => updateDomain({ aspect_ratio: ar })}
                            className={`flex-1 py-2 rounded-xl text-[12px] font-medium border transition-all duration-200 ${
                                dp.aspect_ratio === ar ? 'border-[#007AFF]/40 bg-[#007AFF]/8 text-[#007AFF]' : 'border-slate-100 bg-white text-[#86868B] hover:border-slate-200'
                            }`}>{ar}</button>
                    ))}
                </div>
            </div>
        </div>
    )
}

/* ================================================================
   video_publisher  视频发布员
   ================================================================ */
function VideoPublisherColumn({ dp, updateDomain }: { dp: DomainParams; updateDomain: (p: Partial<DomainParams>) => void }) {
    const togglePlatform = (p: string) => {
        const set = new Set(dp.platforms)
        if (set.has(p)) set.delete(p); else set.add(p)
        updateDomain({ platforms: [...set] })
    }
    return (
        <div className="space-y-4">
            <div>
                <SectionLabel>拟发布平台</SectionLabel>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {PUBLISH_PLATFORMS.map(p => (
                        <button key={p} onClick={() => togglePlatform(p)}
                            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-medium border transition-all duration-200 ${
                                dp.platforms.includes(p) ? 'border-[#007AFF]/40 bg-[#007AFF]/8 text-[#007AFF]' : 'border-slate-100 bg-white text-[#86868B] hover:border-slate-200'
                            }`}>
                            <span className={`w-3 h-3 rounded border flex items-center justify-center transition-colors ${
                                dp.platforms.includes(p) ? 'bg-[#007AFF] border-[#007AFF]' : 'border-slate-300'
                            }`}>
                                {dp.platforms.includes(p) && <Check className="w-2 h-2 text-white" />}
                            </span>
                            {p}
                        </button>
                    ))}
                </div>
            </div>
            <div>
                <SectionLabel>预期发布时段</SectionLabel>
                <div className="mt-1.5 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[#86868B]" />
                    <input type="time" value={dp.publish_time} onChange={e => updateDomain({ publish_time: e.target.value })}
                        className="w-[160px] h-[36px] px-3 rounded-xl border border-slate-200 bg-white text-[13px] text-[#1D1D1F] outline-none focus:border-[#007AFF]/30" />
                </div>
            </div>
        </div>
    )
}

/* =================================================================
   Main component
   ================================================================= */
export default function VideoExpertChainPanel() {
    const { showToast, avatarList, selectedAvatar: storeAvatar } = useAppStore()
    const pipeline = useProjectPipeline()

    const buildExpert = (): Record<string, ExpertState> => {
        const m: Record<string, ExpertState> = {}
        for (const e of VIDEO_EXPERTS) {
            m[e.key] = {
                active: false, script: '', greenScreenFile: null, greenScreenPath: '',
                selectedAvatarId: storeAvatar?.id || '', selectedAvatarName: storeAvatar?.name || '全能主播-小李',
                isGenerating: false, isUploading: false, resultMarkdown: '', isExpanded: false,
            }
        }
        return m
    }

    const [experts, setExperts] = useState<Record<string, ExpertState>>(buildExpert)
    const [domainParams, setDomainParams] = useState<DomainParams>({
        promo_tone: '高端科技', brand_assets: '默认企业Logo',
        explain_depth: '产品带货', max_scenes: '5',
        image_engine: 'Midjourney-v6 真实风', aspect_ratio: '16:9',
        platforms: ['抖音', '小红书', '视频号'], publish_time: '18:00',
    })
    const [modalForExpert, setModalForExpert] = useState<string | null>(null)
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

    const updateExpert = (key: string, patch: Partial<ExpertState>) => {
        setExperts(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }))
    }
    const updateDomain = (patch: Partial<DomainParams>) => {
        setDomainParams(prev => ({ ...prev, ...patch }))
    }

    const handleToggle = (key: string) => {
        updateExpert(key, { active: !experts[key].active, isExpanded: false })
    }
    const handleAvatarSelected = (key: string, avatar: AvatarItem) => {
        updateExpert(key, { selectedAvatarId: avatar.id, selectedAvatarName: avatar.name })
    }
    const handleToggleExpand = (key: string) => {
        updateExpert(key, { isExpanded: !experts[key].isExpanded })
    }

    /* ── send domain_params_json for non‑avatar experts ── */
    const buildDomainParamsForAgent = (agentKey: string): Record<string, string> => {
        switch (agentKey) {
            case 'brand_cube':
                return { promo_tone: domainParams.promo_tone, brand_assets: domainParams.brand_assets }
            case 'ai_model_explain':
                return { explain_depth: domainParams.explain_depth, max_scenes: domainParams.max_scenes }
            case 'image_master':
                return { image_engine: domainParams.image_engine, aspect_ratio: domainParams.aspect_ratio }
            case 'video_publisher':
                return { platforms: domainParams.platforms.join(', '), publish_time: domainParams.publish_time }
            default:
                return {}
        }
    }

    const runExpert = async (expertDef: ExpertDef) => {
        let pid = pipeline.projectId
        if (!pid) {
            try {
                const res = await fetch(`${getApiBase()}/api/v1/project/init`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                })
                if (res.ok) {
                    const json = await res.json()
                    pid = json.project_id
                    pipeline.setProjectId(pid)
                }
            } catch { /* ignore */ }
        }
        if (!pid) { showToast('项目未初始化，请先完成账号定位', 'error'); return }
        const st = experts[expertDef.key]
        updateExpert(expertDef.key, { isGenerating: true })
        try {
            const fd = new FormData()
            fd.append('project_id', pid)
            fd.append('agent_key', expertDef.key)
            fd.append('user_custom_instruction', st.script || '')
            if (expertDef.hasGreenScreen && st.greenScreenPath) fd.append('referenced_green_screen_path', st.greenScreenPath)
            if (expertDef.hasAvatarSelector && st.selectedAvatarId) fd.append('referenced_avatar_id', st.selectedAvatarId)

            /* Inject domain‑specific params */
            const dp = buildDomainParamsForAgent(expertDef.key)
            if (Object.keys(dp).length > 0) fd.append('domain_params_json', JSON.stringify(dp))

            const res = await fetch(`${getApiBase()}/api/v1/video/run-multimodal-expert`, { method: 'POST', body: fd })
            if (!res.ok) { const err = await res.json().catch(() => null); throw new Error(err?.detail || `执行失败: ${res.status}`) }
            const json = await res.json()
            updateExpert(expertDef.key, { resultMarkdown: json.output || '', isExpanded: true })
            showToast(`${expertDef.label} 执行完成 → ${json.target_file}`, 'success')
        } catch (err) {
            showToast(err instanceof Error ? err.message : '执行失败', 'error')
        } finally {
            updateExpert(expertDef.key, { isGenerating: false })
        }
    }

    /* ── 真正生成视频（调用 video workflow） ── */
    const [isRenderingVideo, setIsRenderingVideo] = useState(false)
    const [videoResult, setVideoResult] = useState<{video_url?: string; status?: string} | null>(null)

    /* ── Sora-2 视频生成 ── */
    const [soraPrompt, setSoraPrompt] = useState(() => {
        const sd = pipeline.scriptData as Record<string, unknown> | null
        if (sd) {
            const body = (sd.body_content as string) || (sd.script as string) || ''
            if (body) return body.slice(0, 800)
        }
        return ''
    })
    const [soraOrientation, setSoraOrientation] = useState<'portrait' | 'landscape'>('portrait')
    const [soraSize, setSoraSize] = useState<'small' | 'large'>('small')
    const [soraDuration, setSoraDuration] = useState(10)
    const [isSoraCreating, setIsSoraCreating] = useState(false)
    const [isSoraPolling, setIsSoraPolling] = useState(false)
    const [soraTaskId, setSoraTaskId] = useState<string | null>(null)
    const [soraVideoResult, setSoraVideoResult] = useState<{video_url?: string; download_url?: string; filename?: string} | null>(null)

    const handleSoraCreate = async () => {
        if (!soraPrompt.trim()) return
        setIsSoraCreating(true)
        setSoraVideoResult(null)
        try {
            const res = await fetch(`${getApiBase()}/api/v1/video/sora-create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: soraPrompt,
                    orientation: soraOrientation,
                    duration: soraDuration,
                    size: soraSize,
                    watermark: false,
                    private: true,
                }),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => null)
                throw new Error(err?.detail || `创建失败: ${res.status}`)
            }
            const json = await res.json()
            const taskId = json.data?.task_id
            if (taskId) {
                setSoraTaskId(taskId)
                showToast('视频生成任务已提交，请等待生成完成', 'success')
                startSoraPolling(taskId)
            }
        } catch (err) {
            showToast(err instanceof Error ? err.message : '创建失败', 'error')
        } finally {
            setIsSoraCreating(false)
        }
    }

    const startSoraPolling = (taskId: string) => {
        let attempts = 0
        const maxAttempts = 60
        const poll = async () => {
            if (attempts >= maxAttempts) {
                showToast('视频生成超时，请稍后手动查询状态', 'error')
                return
            }
            attempts++
            try {
                const res = await fetch(`${getApiBase()}/api/v1/video/sora-status/${taskId}`)
                if (!res.ok) return
                const json = await res.json()
                const status = json.data?.status
                if (status === 'completed' || status === 'succeeded' || status === 'done' || status === 'success') {
                    const videoUrl = json.data?.video_url || json.data?.url || (json.data?.choices?.[0]?.url)
                    if (videoUrl) {
                        try {
                            const dlRes = await fetch(`${getApiBase()}/api/v1/video/sora-download`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ task_id: taskId }),
                            })
                            if (dlRes.ok) {
                                const dlJson = await dlRes.json()
                                setSoraVideoResult({
                                    video_url: videoUrl,
                                    download_url: dlJson.data?.download_url,
                                    filename: dlJson.data?.filename,
                                })
                            } else {
                                setSoraVideoResult({ video_url: videoUrl })
                            }
                        } catch {
                            setSoraVideoResult({ video_url: videoUrl })
                        }
                        setSoraTaskId(null)
                        pipeline.markStepCompleted('video')
                        showToast('视频生成成功！已保存到服务器', 'success')
                        return
                    }
                }
                if (status === 'failed' || status === 'error') {
                    setSoraTaskId(null)
                    showToast('视频生成失败，请重试', 'error')
                    return
                }
                setTimeout(poll, 10000)
            } catch {
                setTimeout(poll, 10000)
            }
        }
        setTimeout(poll, 5000)
    }

    const handleSoraPoll = async () => {
        if (!soraTaskId) return
        setIsSoraPolling(true)
        try {
            const res = await fetch(`${getApiBase()}/api/v1/video/sora-status/${soraTaskId}`)
            if (!res.ok) {
                const err = await res.json().catch(() => null)
                throw new Error(err?.detail || `查询失败: ${res.status}`)
            }
            const json = await res.json()
            const status = json.data?.status
            showToast(`当前状态: ${status}`, 'success')
            if (status === 'completed' || status === 'succeeded' || status === 'done' || status === 'success') {
                const videoUrl = json.data?.video_url || json.data?.url || (json.data?.choices?.[0]?.url)
                if (videoUrl) {
                    try {
                        const dlRes = await fetch(`${getApiBase()}/api/v1/video/sora-download`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ task_id: soraTaskId }),
                        })
                        if (dlRes.ok) {
                            const dlJson = await dlRes.json()
                            setSoraVideoResult({
                                video_url: videoUrl,
                                download_url: dlJson.data?.download_url,
                                filename: dlJson.data?.filename,
                            })
                        } else {
                            setSoraVideoResult({ video_url: videoUrl })
                        }
                    } catch {
                        setSoraVideoResult({ video_url: videoUrl })
                    }
                    setSoraTaskId(null)
                    pipeline.markStepCompleted('video')
                    showToast('视频生成成功！已保存到服务器', 'success')
                }
            }
        } catch (err) {
            showToast(err instanceof Error ? err.message : '查询失败', 'error')
        } finally {
            setIsSoraPolling(false)
        }
    }

    const generateVideo = async () => {
        let pid = pipeline.projectId
        if (!pid) {
            try {
                const res = await fetch(`${getApiBase()}/api/v1/project/init`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                })
                if (res.ok) {
                    const json = await res.json()
                    pid = json.project_id
                    pipeline.setProjectId(pid)
                }
            } catch { /* ignore */ }
        }
        if (!pid) { showToast('项目未初始化', 'error'); return }

        // 收集所有已启用专家的结果作为文案
        const scriptParts: string[] = []
        for (const e of VIDEO_EXPERTS) {
            if (experts[e.key].resultMarkdown) {
                scriptParts.push(`## ${e.label}\n${experts[e.key].resultMarkdown}`)
            }
        }
        const scriptText = scriptParts.join('\n\n') || pipeline.scriptData?.body_content || '请生成视频'

        setIsRenderingVideo(true)
        try {
            const res = await fetch(`${getApiBase()}/api/v1/video/workflow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_id: pid,
                    script_text: scriptText,
                    aspect_ratio: domainParams.aspect_ratio,
                    switches: {
                        draw_master: !!experts['image_master'].resultMarkdown,
                        avatar_video: experts['avatar_clone_video'].active,
                        model_explain: !!experts['ai_model_explain'].resultMarkdown,
                        smart_cut: !!experts['avatar_smart_cut'].resultMarkdown,
                        brand_magic: !!experts['brand_cube'].resultMarkdown,
                        video_publisher: !!experts['video_publisher'].resultMarkdown,
                    },
                }),
            })
            if (!res.ok) { const err = await res.json().catch(() => null); throw new Error(err?.detail || `生成失败: ${res.status}`) }
            const json = await res.json()
            setVideoResult(json)
            pipeline.markStepCompleted('video')
            showToast('视频生成成功！', 'success')
        } catch (err) {
            showToast(err instanceof Error ? err.message : '视频生成失败', 'error')
        } finally {
            setIsRenderingVideo(false)
        }
    }

    const DOMAIN_EXPERT_KEYS = ['brand_cube', 'ai_model_explain', 'image_master', 'video_publisher']
    const isDomainExpert = (key: string) => DOMAIN_EXPERT_KEYS.includes(key)

    /* Helper: does this expert need a two‑column layout? */
    const needsTwoCol = (expert: ExpertDef) =>
        expert.hasGreenScreen || expert.hasAvatarSelector
        || ['brand_cube', 'ai_model_explain', 'image_master', 'video_publisher'].includes(expert.key)

    return (
        <div>
            <label className="flex items-center gap-2 text-[13px] font-medium text-[#1D1D1F] mb-3">
                <Sparkles className="w-4 h-4 text-[#86868B]" />
                第三步：定制专家链（多模态独立执行）
            </label>

            <div className="grid grid-cols-1 gap-3">
                {VIDEO_EXPERTS.map(expert => {
                    const st = experts[expert.key]
                    const isRunning = st.isGenerating
                    const hasResult = !!st.resultMarkdown
                    const isActive = st.active
                    const twoCol = needsTwoCol(expert)

                    return (
                        <motion.div key={expert.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                            className={`rounded-2xl border transition-all duration-200 ${
                                isRunning ? 'border-[#007AFF]/30 bg-[#007AFF]/3 shadow-[0_0_0_1px_rgba(0,122,255,0.1)]'
                                : hasResult ? 'border-[#34C759]/20 bg-[#F0FFF4]/50 shadow-sm'
                                : isActive ? 'border-slate-100 bg-white shadow-sm'
                                : 'border-slate-100 bg-white hover:border-slate-200 shadow-sm'
                            }`}>
                            {/* ── header ── */}
                            <div className="flex items-center gap-3 px-5 py-4">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[17px] flex-shrink-0"
                                    style={{ backgroundColor: `${expert.color}15` }}>{expert.emoji}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[14px] font-semibold text-[#1D1D1F]">{expert.label}</span>
                                        {hasResult && (
                                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#34C759]/15 text-[10px] text-[#34C759] font-medium">
                                                <CheckCircle2 className="w-2.5 h-2.5" /> 已完成
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[12px] text-[#86868B]">{expert.sub}</span>
                                </div>
                                {(expert.hasGreenScreen || expert.hasAvatarSelector || isDomainExpert(expert.key)) && (
                                    <button onClick={(e) => { e.stopPropagation(); setModalForExpert(expert.key) }}
                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] text-[#007AFF] font-medium hover:bg-[#007AFF]/8 transition-colors">
                                        <Settings className="w-3.5 h-3.5" />管理资产
                                    </button>
                                )}
                                <Toggle enabled={isActive} onToggle={() => handleToggle(expert.key)} />
                            </div>

                            {/* ── expandable body ── */}
                            <div className={`grid transition-all duration-300 ${isActive ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                <div className="overflow-hidden">
                                    <div className={`px-5 pb-5 ${twoCol ? 'grid grid-cols-[260px_1fr] gap-5' : 'space-y-4'}`}>
                                        {/* left column */}
                                        <LeftColumn expert={expert} st={st} dp={domainParams} updateExpert={updateExpert} updateDomain={updateDomain} />

                                        {/* right column – prompt textarea + run button */}
                                        <div className="flex flex-col">
                                            <div className="flex-1 flex flex-col">
                                                <div className="flex items-center gap-1.5 mb-2">
                                                    <Sparkles className="w-3.5 h-3.5 text-[#86868B]" />
                                                    <span className="text-[11px] font-medium text-[#86868B]">
                                                        {expert.hasGreenScreen || expert.hasAvatarSelector ? '渲染批注 / 画面风格 Prompt' : '定制批注 / 指令 Prompt'}
                                                    </span>
                                                </div>
                                                <textarea value={st.script} onChange={e => updateExpert(expert.key, { script: e.target.value })}
                                                    placeholder={
                                                        expert.key === 'brand_cube' ? '（选填）请输入品牌特性的补充描述，或指定特定的营销切入点，例如：突出产品"全自主研发、国产替代"的优势...'
                                                        : expert.key === 'ai_model_explain' ? '（选填）请输入对画面视觉、运镜逻辑的额外要求，例如：需要大量的微距特写，讲解到核心参数时，画面右侧要拉出科技感数据图表...'
                                                        : expert.key === 'image_master' ? '（选填）输入对画面光影、构图的全局要求，例如：整体采用逆光冷调，主体要有一种胶片电影的颗粒质感，画面背景要干净...'
                                                        : expert.key === 'video_publisher' ? '（选填）请输入对文案引流、评论区钩子的特定要求，例如：小红书侧多用 Emoji 强调，帮我生成 3 组用于评论区置顶的互动神评...'
                                                        : expert.hasGreenScreen ? '描述你想要的视频背景风格，例如：赛博朋克风办公室，深蓝+霓虹紫色调，极其科幻...'
                                                        : expert.hasAvatarSelector ? '给数字人渲染的补充指令，例如：语速放慢、配合手势讲解...'
                                                        : `给「${expert.label}」的补充处理指令（可选）...`
                                                    }
                                                    rows={4} disabled={isRunning}
                                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-[#FAFAFA] text-[13px] text-[#1D1D1F] placeholder:text-[#C7C7CC] resize-none outline-none focus:border-[#007AFF]/30 focus:bg-white focus:ring-[3px] focus:ring-[#007AFF]/8 transition-all duration-200"
                                                />
                                            </div>

                                            <div className="flex items-center gap-2 mt-3">
                                                <button onClick={() => runExpert(expert)} disabled={isRunning}
                                                    className={`flex-1 flex items-center justify-center gap-1.5 h-[38px] rounded-xl text-[13px] font-medium transition-all duration-200 ${
                                                        isRunning ? 'bg-[#007AFF]/10 text-[#007AFF] cursor-not-allowed' : 'bg-[#1D1D1F] text-white hover:bg-[#333338] active:scale-[0.97]'
                                                    }`}>
                                                    {isRunning ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 执行中</> : <><Play className="w-3.5 h-3.5" /> 局部生成</>}
                                                </button>
                                                {hasResult && (
                                                    <button onClick={() => handleToggleExpand(expert.key)}
                                                        className="flex items-center justify-center gap-1.5 h-[38px] px-4 rounded-xl bg-white border border-slate-100 text-[12px] text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition-all duration-200">
                                                        {st.isExpanded ? <><ChevronUp className="w-3.5 h-3.5" /> 收起</> : <><ChevronDown className="w-3.5 h-3.5" /> 预览</>}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── result preview ── */}
                            <AnimatePresence>
                                {st.isExpanded && hasResult && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                        <div className="px-5 pb-5 pt-0">
                                            <div className="rounded-xl bg-white border border-slate-100 overflow-hidden">
                                                <div className="flex items-center justify-between px-4 py-2.5 bg-[#FAFAFA] border-b border-slate-100">
                                                    <span className="text-[11px] text-[#86868B] font-medium">{expert.label} — 最新输出预览</span>
                                                    <CopyBtn text={st.resultMarkdown} />
                                                </div>
                                                <div className="p-4 max-h-[260px] overflow-y-auto">
                                                    <pre className="whitespace-pre-wrap text-[13px] text-[#1D1D1F] leading-[1.8] font-[inherit]">{st.resultMarkdown}</pre>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )
                })}
            </div>

            {/* ── Sora-2 AI 视频生成 ── */}
            <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-[#5856D6]/20 bg-gradient-to-br from-[#5856D6]/5 to-[#AF52DE]/5 p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-[#5856D6]/15 flex items-center justify-center">
                            <MonitorPlay className="w-5 h-5 text-[#5856D6]" />
                        </div>
                        <div>
                            <h3 className="text-[14px] font-semibold text-[#1D1D1F]">Sora-2 AI 视频生成</h3>
                            <p className="text-[11px] text-[#86868B]">基于文案内容，AI 自动生成视频并保存到本地</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="text-[11px] font-medium text-[#86868B] mb-1.5 block">视频提示词</label>
                            <textarea
                                value={soraPrompt}
                                onChange={(e) => setSoraPrompt(e.target.value)}
                                placeholder="描述你想要生成的视频内容，系统会自动从文案中提取关键信息..."
                                rows={3}
                                disabled={isSoraCreating}
                                className="w-full px-4 py-3 rounded-xl border border-black/[0.06] bg-white text-[13px] text-[#1D1D1F] placeholder:text-[#C7C7CC] resize-none outline-none focus:border-[#5856D6]/30 focus:ring-[3px] focus:ring-[#5856D6]/8 transition-all duration-200"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-[11px] font-medium text-[#86868B] mb-1.5 block">画面方向</label>
                                <div className="flex gap-1.5">
                                    <button
                                        onClick={() => setSoraOrientation('portrait')}
                                        className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-[11px] font-medium border transition-all duration-200 ${
                                            soraOrientation === 'portrait' ? 'border-[#5856D6]/40 bg-[#5856D6]/8 text-[#5856D6]' : 'border-slate-100 bg-white text-[#86868B]'
                                        }`}
                                    >
                                        <Smartphone className="w-3 h-3" />竖屏
                                    </button>
                                    <button
                                        onClick={() => setSoraOrientation('landscape')}
                                        className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-[11px] font-medium border transition-all duration-200 ${
                                            soraOrientation === 'landscape' ? 'border-[#5856D6]/40 bg-[#5856D6]/8 text-[#5856D6]' : 'border-slate-100 bg-white text-[#86868B]'
                                        }`}
                                    >
                                        <Tv className="w-3 h-3" />横屏
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="text-[11px] font-medium text-[#86868B] mb-1.5 block">视频画质</label>
                                <div className="flex gap-1.5">
                                    <button
                                        onClick={() => setSoraSize('small')}
                                        className={`flex-1 py-2.5 rounded-xl text-[11px] font-medium border transition-all duration-200 ${
                                            soraSize === 'small' ? 'border-[#5856D6]/40 bg-[#5856D6]/8 text-[#5856D6]' : 'border-slate-100 bg-white text-[#86868B]'
                                        }`}
                                    >
                                        720p
                                    </button>
                                    <button
                                        onClick={() => setSoraSize('large')}
                                        className={`flex-1 py-2.5 rounded-xl text-[11px] font-medium border transition-all duration-200 ${
                                            soraSize === 'large' ? 'border-[#5856D6]/40 bg-[#5856D6]/8 text-[#5856D6]' : 'border-slate-100 bg-white text-[#86868B]'
                                        }`}
                                    >
                                        1080p
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="text-[11px] font-medium text-[#86868B] mb-1.5 block">时长</label>
                                <select
                                    value={soraDuration}
                                    onChange={(e) => setSoraDuration(Number(e.target.value))}
                                    className="w-full h-[38px] pl-3 pr-8 rounded-xl border border-slate-200 bg-white text-[12px] text-[#1D1D1F] outline-none focus:border-[#5856D6]/30 appearance-none cursor-pointer"
                                >
                                    <option value={10}>10 秒</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleSoraCreate}
                                disabled={isSoraCreating || !soraPrompt.trim()}
                                className={`flex-1 h-[44px] rounded-xl text-[13px] font-medium flex items-center justify-center gap-2 transition-all duration-200 ${
                                    isSoraCreating
                                        ? 'bg-[#5856D6]/10 text-[#5856D6] cursor-not-allowed'
                                        : !soraPrompt.trim()
                                        ? 'bg-[#E5E5EA] text-[#C7C7CC] cursor-not-allowed'
                                        : 'bg-[#5856D6] text-white hover:bg-[#4A48C4] active:scale-[0.98]'
                                }`}
                            >
                                {isSoraCreating ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> 生成中...</>
                                ) : (
                                    <><Film className="w-4 h-4" /> AI 生成视频</>
                                )}
                            </button>
                        </div>

                        {soraTaskId && (
                            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#5856D6]/5 border border-[#5856D6]/10">
                                <Loader2 className="w-3.5 h-3.5 text-[#5856D6] animate-spin" />
                                <span className="text-[12px] text-[#5856D6]">任务 {soraTaskId} 生成中，请稍候...</span>
                                <button
                                    onClick={handleSoraPoll}
                                    disabled={isSoraPolling}
                                    className="ml-auto px-2.5 py-1 rounded-lg bg-[#5856D6]/10 text-[11px] text-[#5856D6] font-medium hover:bg-[#5856D6]/20 transition-colors"
                                >
                                    {isSoraPolling ? '查询中...' : '查询状态'}
                                </button>
                            </div>
                        )}

                        {soraVideoResult && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-xl bg-[#F0FFF4] border border-[#34C759]/20 overflow-hidden"
                            >
                                <div className="flex items-center gap-2 px-4 py-3">
                                    <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
                                    <span className="text-[13px] font-medium text-[#1D1D1F]">视频生成成功</span>
                                </div>
                                {soraVideoResult.video_url && (
                                    <div className="px-4 pb-2">
                                        <video
                                            src={soraVideoResult.video_url}
                                            controls
                                            className="w-full rounded-lg bg-black"
                                            style={{ maxHeight: '320px' }}
                                        />
                                    </div>
                                )}
                                <div className="flex items-center gap-2 px-4 pb-3">
                                    {soraVideoResult.download_url && (
                                        <a
                                            href={`${getApiBase()}${soraVideoResult.download_url}`}
                                            download
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1D1D1F] text-white text-[11px] font-medium hover:bg-[#333338] active:scale-[0.97] transition-all duration-200"
                                        >
                                            <Download className="w-3 h-3" /> 保存到本地
                                        </a>
                                    )}
                                    {soraVideoResult.video_url && (
                                        <a
                                            href={soraVideoResult.video_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-100 text-[11px] text-[#007AFF] font-medium hover:bg-[#007AFF]/5 transition-colors"
                                        >
                                            新窗口打开
                                        </a>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── 全局生成视频按钮 ── */}
            <div className="mt-6 space-y-4">
                <button
                    onClick={generateVideo}
                    disabled={isRenderingVideo}
                    className={`w-full h-[52px] rounded-2xl text-[15px] font-medium flex items-center justify-center gap-2 transition-all duration-200 ${
                        isRenderingVideo
                            ? 'bg-[#007AFF]/10 text-[#007AFF] cursor-not-allowed'
                            : videoResult
                            ? 'bg-[#34C759] text-white hover:bg-[#2DB14A] active:scale-[0.98]'
                            : 'bg-[#FF3B30] text-white hover:bg-[#E6352B] active:scale-[0.98]'
                    }`}
                >
                    {isRenderingVideo ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> 视频渲染中，请稍候...</>
                    ) : videoResult ? (
                        <><CheckCircle2 className="w-5 h-5" /> 视频已生成</>
                    ) : (
                        <><Film className="w-5 h-5" /> 生成最终视频</>
                    )}
                </button>

                {videoResult?.video_url && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-[#F0FFF4] border border-[#34C759]/20 p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
                            <span className="text-[13px] font-medium text-[#1D1D1F]">视频生成成功</span>
                        </div>
                        <a href={videoResult.video_url} target="_blank" rel="noopener noreferrer"
                            className="text-[12px] text-[#007AFF] hover:underline break-all">
                            {videoResult.video_url}
                        </a>
                    </motion.div>
                )}
            </div>

            {/* ── Asset manager modals ── */}
            <AnimatePresence>
                {modalForExpert && !isDomainExpert(modalForExpert) && (
                    <AvatarCenterModal onClose={() => setModalForExpert(null)} onSelect={avatar => handleAvatarSelected(modalForExpert, avatar)} />
                )}
                {modalForExpert && isDomainExpert(modalForExpert) && (
                    <DomainAssetModal
                        domainType={modalForExpert}
                        currentConfig={buildDomainParamsForAgent(modalForExpert)}
                        onClose={() => setModalForExpert(null)}
                        onSelect={(config) => {
                            const normalized: Record<string, unknown> = { ...config }
                            if (typeof normalized.platforms === 'string') {
                                normalized.platforms = (normalized.platforms as string).split(',').map((s: string) => s.trim()).filter(Boolean)
                            }
                            updateDomain(normalized as Partial<DomainParams>)
                            showToast('已加载预设参数', 'success')
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}
