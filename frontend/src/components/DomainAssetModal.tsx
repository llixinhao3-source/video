import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
    X, Plus, Pencil, Trash2, Check, Upload, Music, Palette, Image,
    FileText, GripVertical, Tag, Layers, MessageSquare, Globe, Clock,
    AlertCircle, Sparkles, ChevronDown,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

const API_BASE = 'http://localhost:8001'

/* ================================================================
   Shared types & helpers
   ================================================================ */

const DOMAIN_META: Record<string, { label: string; emoji: string; tabs: string[] }> = {
    brand_cube:      { label: '品宣魔方', emoji: '🧊', tabs: ['品牌VI资产', '产品卖点库'] },
    ai_model_explain:{ label: '智模讲解', emoji: '🧠', tabs: ['行业知识文档', '爆款分镜结构'] },
    image_master:    { label: '生图大师', emoji: '🎨', tabs: ['参考垫图库', '画风Prompt词典'] },
    video_publisher: { label: '视频发布员', emoji: '🚀', tabs: ['平台矩阵配置', '私域互动钩子'] },
}

function asyncApi(method: string, path: string, body?: unknown) {
    return fetch(`${API_BASE}${path}`, {
        method,
        headers: body != null ? { 'Content-Type': 'application/json' } : undefined,
        body: body != null ? JSON.stringify(body) : undefined,
    })
}

/* ================================================================
   Props (unchanged – drop‑in replacement)
   ================================================================ */
export default function DomainAssetModal(props: {
    domainType: string
    currentConfig?: Record<string, unknown>
    onClose: () => void
    onSelect: (config: Record<string, unknown>) => void
}) {
    const meta = DOMAIN_META[props.domainType] || { label: props.domainType, emoji: '📋', tabs: ['配置'] }
    const [activeTab, setActiveTab] = useState(0)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40" onClick={props.onClose} />

            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="relative w-full max-w-[720px] bg-white/85 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-white/40 overflow-hidden">

                {/* ── Header (glass) ── */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-black/[0.05] bg-white/60 backdrop-blur-sm">
                    <h2 className="text-[17px] font-semibold text-[#1D1D1F] flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl flex items-center justify-center text-[16px]"
                            style={{ backgroundColor: 'rgba(0,122,255,0.1)' }}>{meta.emoji}</span>
                        {meta.label} · 资产与管理中心
                    </h2>
                    <button onClick={props.onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/5 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* ── Tabs ── */}
                <div className="px-6 pt-4 pb-1">
                    <div className="flex bg-black/[0.035] rounded-xl p-1">
                        {meta.tabs.map((label, i) => (
                            <button key={label} onClick={() => setActiveTab(i)}
                                className={`flex-1 py-2 rounded-[10px] text-[12px] font-medium transition-all duration-200 ${
                                    activeTab === i ? 'bg-white text-[#1D1D1F] shadow-[0_1px_3px_rgba(0,0,0,0.06)]' : 'text-[#86868B] hover:text-[#1D1D1F]'
                                }`}>{label}</button>
                        ))}
                    </div>
                </div>

                {/* ── Tab content ── */}
                <div className="px-6 py-4 max-h-[460px] overflow-y-auto">
                    {props.domainType === 'brand_cube' && (
                        activeTab === 0 ? <BrandVIAssets /> : <SellingPointLibrary />
                    )}
                    {props.domainType === 'ai_model_explain' && (
                        activeTab === 0 ? <KnowledgeDocLibrary /> : <StoryboardLibrary />
                    )}
                    {props.domainType === 'image_master' && (
                        activeTab === 0 ? <ReferenceImageGrid /> : <PromptDictionary />
                    )}
                    {props.domainType === 'video_publisher' && (
                        activeTab === 0 ? <PlatformMatrix /> : <InteractionHookLib />
                    )}
                </div>
            </motion.div>
        </div>
    )
}

/* ════════════════════════════════════════════════════════════════
   Sub‑component: Toast helper
   ════════════════════════════════════════════════════════════════ */
function useToast() {
    const { showToast } = useAppStore()
    return { toast: showToast }
}

/* ════════════════════════════════════════════════════════════════
   Sub‑component: inline‑edit input
   ════════════════════════════════════════════════════════════════ */
function InlineEdit({ value, onSave }: { value: string; onSave: (v: string) => void }) {
    const [v, setV] = useState(value)
    const ref = useRef<HTMLInputElement>(null)
    useEffect(() => { ref.current?.focus() }, [])
    return (
        <input ref={ref} value={v} onChange={e => setV(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onSave(v); if (e.key === 'Escape') onSave(value) }}
            onBlur={() => onSave(v)}
            className="w-full h-7 px-2 rounded-lg border border-[#007AFF]/40 bg-white text-[13px] outline-none" />
    )
}

/* ════════════════════════════════════════════════════════════════
   brand_cube  Tab 0 — 品牌VI资产
   ════════════════════════════════════════════════════════════════ */

interface VIItem { id: string; type: 'logo' | 'bgm'; name: string; url: string; color?: string; duration?: string }

function BrandVIAssets() {
    const { toast } = useToast()
    const [items, setItems] = useState<VIItem[]>([
        { id: 'vi1', type: 'logo', name: '企业主Logo', url: '', color: '#007AFF' },
        { id: 'vi2', type: 'logo', name: '品牌标志文字', url: '', color: '#1D1D1F' },
        { id: 'vi3', type: 'bgm', name: '官方品牌BGM', url: '', duration: '0:15' },
    ])
    const [editingId, setEditingId] = useState<string | null>(null)
    const [showAdd, setShowAdd] = useState(false)
    const [addType, setAddType] = useState<'logo' | 'bgm'>('logo')
    const [addName, setAddName] = useState('')
    const [addColor, setAddColor] = useState('#007AFF')
    const fileRef = useRef<HTMLInputElement>(null)

    const handleDelete = (id: string) => { setItems(prev => prev.filter(i => i.id !== id)); toast('已删除', 'success') }
    const handleAdd = () => {
        if (!addName.trim()) { toast('请输入名称', 'error'); return }
        setItems(prev => [...prev, { id: `vi${Date.now()}`, type: addType, name: addName.trim(), url: '', color: addType === 'logo' ? addColor : undefined }])
        setShowAdd(false); setAddName(''); toast('已添加', 'success')
    }
    const handleLogoUpload = (id: string) => {
        fileRef.current?.click()
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-[11px] text-[#86868B] font-medium">品牌Logo、主色、官方BGM的集中管理</p>
                <button onClick={() => setShowAdd(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1D1D1F] text-[11px] text-white font-medium hover:bg-[#333338] transition-colors">
                    <Plus className="w-3 h-3" /> 新增
                </button>
            </div>
            <AnimatePresence>
                {showAdd && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="p-4 rounded-2xl bg-black/[0.02] border border-black/[0.04] space-y-3">
                            <div className="flex gap-2">
                                <button onClick={() => setAddType('logo')} className={`flex-1 py-1.5 rounded-lg text-[12px] font-medium border ${addType === 'logo' ? 'border-[#007AFF]/40 bg-[#007AFF]/8 text-[#007AFF]' : 'border-black/[0.06] text-[#86868B]'}`}>Logo/色值</button>
                                <button onClick={() => setAddType('bgm')} className={`flex-1 py-1.5 rounded-lg text-[12px] font-medium border ${addType === 'bgm' ? 'border-[#007AFF]/40 bg-[#007AFF]/8 text-[#007AFF]' : 'border-black/[0.06] text-[#86868B]'}`}>BGM音乐</button>
                            </div>
                            <input value={addName} onChange={e => setAddName(e.target.value)} placeholder={addType === 'logo' ? '资产名称，如：企业副标志' : 'BGM名称，如：品牌宣传BGM'}
                                className="w-full h-[34px] px-3 rounded-lg border border-black/[0.06] bg-white text-[13px] outline-none focus:border-[#007AFF]/30" />
                            {addType === 'logo' && (
                                <div className="flex items-center gap-3">
                                    <span className="text-[11px] text-[#86868B]">品牌色</span>
                                    <input type="color" value={addColor} onChange={e => setAddColor(e.target.value)} className="w-8 h-8 rounded-lg border-0 cursor-pointer" />
                                    <span className="text-[11px] text-[#C7C7CC] font-mono">{addColor}</span>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <button onClick={handleAdd} className="flex-1 py-2 rounded-lg bg-[#007AFF] text-[12px] text-white font-medium">确认添加</button>
                                <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg text-[12px] text-[#86868B]">取消</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <input ref={fileRef} type="file" accept="image/*,audio/*" className="hidden"
                onChange={e => { if (e.target.files?.[0]) toast('文件已选择（演示模式）', 'success') }} />
            <div className="space-y-1.5">
                {items.map(item => (
                    <div key={item.id} className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-black/[0.015] border border-black/[0.04] hover:border-black/[0.08] transition-colors">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${item.color || '#86868B'}18` }}>
                            {item.type === 'logo' ? <Palette className="w-4 h-4" style={{ color: item.color || '#86868B' }} /> : <Music className="w-4 h-4 text-[#86868B]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            {editingId === item.id ? (
                                <InlineEdit value={item.name} onSave={v => { setItems(prev => prev.map(i => i.id === item.id ? { ...i, name: v } : i)); setEditingId(null) }} />
                            ) : (
                                <p className="text-[13px] font-medium text-[#1D1D1F] truncate">{item.name}</p>
                            )}
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-[#86868B]">{item.type === 'logo' ? 'VI · Logo/色值' : `BGM · ${item.duration || '—'}`}</span>
                                {item.color && <span className="w-2.5 h-2.5 rounded-full border border-black/[0.08]" style={{ backgroundColor: item.color }} />}
                            </div>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {item.type === 'logo' && <button onClick={() => handleLogoUpload(item.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#86868B] hover:text-[#007AFF] hover:bg-[#007AFF]/8" title="上传文件"><Upload className="w-3 h-3" /></button>}
                            <button onClick={() => setEditingId(item.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/5"><Pencil className="w-3 h-3" /></button>
                            <button onClick={() => handleDelete(item.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#C7C7CC] hover:text-[#FF3B30] hover:bg-[#FF3B30]/5"><Trash2 className="w-3 h-3" /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

/* ════════════════════════════════════════════════════════════════
   brand_cube  Tab 1 — 产品卖点库
   ════════════════════════════════════════════════════════════════ */

interface SellingPoint { id: string; tag: string; detail: string; hallucinationGuard: string }

function SellingPointLibrary() {
    const { toast } = useToast()
    const [points, setPoints] = useState<SellingPoint[]>([
        { id: 'sp1', tag: '全自主研发', detail: '100%自研底层算法，无外部依赖', hallucinationGuard: '需提供专利号或技术白皮书链接' },
        { id: 'sp2', tag: '国产替代', detail: '完全替代进口方案，降本40%以上', hallucinationGuard: '必须引用第三方评测报告数据' },
    ])
    const [showAdd, setShowAdd] = useState(false)
    const [editingRow, setEditingRow] = useState<string | null>(null)
    const [form, setForm] = useState({ tag: '', detail: '', hallucinationGuard: '' })

    const resetForm = () => setForm({ tag: '', detail: '', hallucinationGuard: '' })
    const handleAdd = () => {
        if (!form.tag.trim()) { toast('请输入卖点标签', 'error'); return }
        setPoints(prev => [...prev, { id: `sp${Date.now()}`, ...form }])
        resetForm(); setShowAdd(false); toast('卖点已添加', 'success')
    }
    const handleSaveEdit = (id: string) => {
        setEditingRow(null)
        toast('已保存', 'success')
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-[11px] text-[#86868B] font-medium">核心卖点标签 + 详细参数 + AI防幻觉校验项</p>
                <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1D1D1F] text-[11px] text-white font-medium hover:bg-[#333338] transition-colors">
                    <Plus className="w-3 h-3" /> 新增卖点
                </button>
            </div>
            <AnimatePresence>
                {showAdd && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="p-4 rounded-2xl bg-black/[0.02] border border-black/[0.04] space-y-3">
                            <input value={form.tag} onChange={e => setForm(prev => ({ ...prev, tag: e.target.value }))}
                                placeholder="卖点标签，如：全自主研发"
                                className="w-full h-[34px] px-3 rounded-lg border border-black/[0.06] bg-white text-[13px] outline-none focus:border-[#007AFF]/30" />
                            <textarea value={form.detail} onChange={e => setForm(prev => ({ ...prev, detail: e.target.value }))}
                                placeholder="详细参数描述..." rows={2}
                                className="w-full px-3 py-2 rounded-lg border border-black/[0.06] bg-white text-[13px] resize-none outline-none focus:border-[#007AFF]/30" />
                            <input value={form.hallucinationGuard} onChange={e => setForm(prev => ({ ...prev, hallucinationGuard: e.target.value }))}
                                placeholder="防AI幻觉校验项，如：需提供专利号"
                                className="w-full h-[34px] px-3 rounded-lg border border-black/[0.06] bg-white text-[13px] outline-none focus:border-[#007AFF]/30" />
                            <div className="flex gap-2">
                                <button onClick={handleAdd} className="flex-1 py-2 rounded-lg bg-[#007AFF] text-[12px] text-white font-medium">确认添加</button>
                                <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg text-[12px] text-[#86868B]">取消</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="rounded-xl border border-black/[0.04] overflow-hidden">
                <table className="w-full text-left">
                    <thead><tr className="bg-black/[0.015]">
                        <th className="px-4 py-2.5 text-[11px] font-medium text-[#86868B] w-[120px]">卖点标签</th>
                        <th className="px-4 py-2.5 text-[11px] font-medium text-[#86868B]">详细参数</th>
                        <th className="px-4 py-2.5 text-[11px] font-medium text-[#86868B] w-[160px]">防幻觉校验</th>
                        <th className="px-4 py-2.5 w-[60px]" />
                    </tr></thead>
                    <tbody>
                        {points.map(p => (
                            <tr key={p.id} className="border-t border-black/[0.04] group">
                                <td className="px-4 py-3">
                                    {editingRow === p.id ? <input value={p.tag} onChange={e => setPoints(prev => prev.map(r => r.id === p.id ? { ...r, tag: e.target.value } : r))}
                                        className="w-full h-7 px-2 rounded border border-[#007AFF]/40 text-[12px] outline-none" />
                                        : <span className="inline-block px-2 py-0.5 rounded-md bg-[#007AFF]/8 text-[12px] text-[#007AFF] font-medium">{p.tag}</span>}
                                </td>
                                <td className="px-4 py-3 text-[12px] text-[#1D1D1F]">
                                    {editingRow === p.id ? <input value={p.detail} onChange={e => setPoints(prev => prev.map(r => r.id === p.id ? { ...r, detail: e.target.value } : r))}
                                        className="w-full h-7 px-2 rounded border border-[#007AFF]/40 text-[12px] outline-none" /> : p.detail}
                                </td>
                                <td className="px-4 py-3 text-[12px] text-[#FF9500]">
                                    {editingRow === p.id ? <input value={p.hallucinationGuard} onChange={e => setPoints(prev => prev.map(r => r.id === p.id ? { ...r, hallucinationGuard: e.target.value } : r))}
                                        className="w-full h-7 px-2 rounded border border-[#007AFF]/40 text-[12px] outline-none" /> : p.hallucinationGuard}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {editingRow === p.id ? (
                                            <button onClick={() => handleSaveEdit(p.id)} className="w-7 h-7 rounded flex items-center justify-center text-[#007AFF]"><Check className="w-3.5 h-3.5" /></button>
                                        ) : (
                                            <button onClick={() => setEditingRow(p.id)} className="w-7 h-7 rounded flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F]"><Pencil className="w-3 h-3" /></button>
                                        )}
                                        <button onClick={() => { setPoints(prev => prev.filter(r => r.id !== p.id)); toast('已删除', 'success') }}
                                            className="w-7 h-7 rounded flex items-center justify-center text-[#C7C7CC] hover:text-[#FF3B30]"><Trash2 className="w-3 h-3" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

/* ════════════════════════════════════════════════════════════════
   ai_model_explain  Tab 0 — 行业知识文档库
   ════════════════════════════════════════════════════════════════ */

interface DocItem { id: string; name: string; status: 'ready' | 'parsing' | 'error'; pages?: number; updatedAt: string }

function KnowledgeDocLibrary() {
    const { toast } = useToast()
    const [docs, setDocs] = useState<DocItem[]>([
        { id: 'd1', name: '半导体行业白皮书2024.pdf', status: 'ready', pages: 42, updatedAt: '2024-11-15' },
        { id: 'd2', name: '产品技术参数手册_v3.docx', status: 'parsing', updatedAt: '2024-12-01' },
    ])
    const fileRef = useRef<HTMLInputElement>(null)

    const handleUpload = () => {
        if (fileRef.current?.files?.[0]) {
            const f = fileRef.current.files[0]
            setDocs(prev => [...prev, { id: `d${Date.now()}`, name: f.name, status: 'parsing', updatedAt: new Date().toISOString().slice(0, 10) }])
            toast(`文件 "${f.name}" 已提交解析`, 'success')
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-[11px] text-[#86868B] font-medium">上传行业白皮书、产品手册，供AI讲解时引用</p>
                <button onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1D1D1F] text-[11px] text-white font-medium hover:bg-[#333338] transition-colors">
                    <Upload className="w-3 h-3" /> 上传文档
                </button>
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md" className="hidden" onChange={handleUpload} />
            <div className="space-y-1.5">
                {docs.map(doc => (
                    <div key={doc.id} className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-black/[0.015] border border-black/[0.04] hover:border-black/[0.08] transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4 text-[#007AFF]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-[#1D1D1F] truncate">{doc.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-1.5 py-0.5 ${
                                    doc.status === 'ready' ? 'bg-[#34C759]/10 text-[#34C759]' : doc.status === 'parsing' ? 'bg-[#FF9500]/10 text-[#FF9500]' : 'bg-[#FF3B30]/10 text-[#FF3B30]'
                                }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${doc.status === 'ready' ? 'bg-[#34C759]' : doc.status === 'parsing' ? 'bg-[#FF9500] animate-pulse' : 'bg-[#FF3B30]'}`} />
                                    {doc.status === 'ready' ? '已解析' : doc.status === 'parsing' ? '解析中' : '解析失败'}
                                </span>
                                {doc.pages && <span className="text-[10px] text-[#C7C7CC]">{doc.pages}页</span>}
                            </div>
                        </div>
                        <button onClick={() => { setDocs(prev => prev.filter(d => d.id !== doc.id)); toast('已删除', 'success') }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#C7C7CC] hover:text-[#FF3B30] hover:bg-[#FF3B30]/5 opacity-0 group-hover:opacity-100 transition-all">
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}

/* ════════════════════════════════════════════════════════════════
   ai_model_explain  Tab 1 — 爆款分镜结构库
   ════════════════════════════════════════════════════════════════ */

interface StoryStep { id: string; order: number; title: string; duration: string; description: string }

function StoryboardLibrary() {
    const { toast } = useToast()
    const [steps, setSteps] = useState<StoryStep[]>([
        { id: 's1', order: 1, title: '悬念引入', duration: '5s', description: '抛出反常识问题，引发好奇心' },
        { id: 's2', order: 2, title: '痛点共鸣', duration: '10s', description: '通过场景还原让观众产生"这就是我"的感觉' },
        { id: 's3', order: 3, title: '方案展示', duration: '15s', description: '产品核心功能演示+参数特写' },
        { id: 's4', order: 4, title: '信任背书', duration: '8s', description: '客户案例/第三方认证/数据佐证' },
        { id: 's5', order: 5, title: '行动号召', duration: '5s', description: '引导评论/关注/点击链接' },
    ])
    const [editingId, setEditingId] = useState<string | null>(null)
    const [showAdd, setShowAdd] = useState(false)
    const [newStep, setNewStep] = useState({ title: '', duration: '5s', description: '' })

    const move = (id: string, dir: -1 | 1) => {
        setSteps(prev => {
            const idx = prev.findIndex(s => s.id === id)
            if (idx < 0 || idx + dir < 0 || idx + dir >= prev.length) return prev
            const arr = [...prev];
            [arr[idx], arr[idx + dir]] = [arr[idx + dir], arr[idx]]
            return arr.map((s, i) => ({ ...s, order: i + 1 }))
        })
    }

    const handleAdd = () => {
        if (!newStep.title.trim()) { toast('请输入分镜名称', 'error'); return }
        setSteps(prev => [...prev, { id: `ss${Date.now()}`, order: prev.length + 1, ...newStep }])
        setNewStep({ title: '', duration: '5s', description: '' }); setShowAdd(false); toast('已添加', 'success')
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-[11px] text-[#86868B] font-medium">可拖拽排序的分镜结构模板</p>
                <button onClick={() => setShowAdd(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1D1D1F] text-[11px] text-white font-medium hover:bg-[#333338] transition-colors">
                    <Plus className="w-3 h-3" /> 新增分镜
                </button>
            </div>
            <AnimatePresence>
                {showAdd && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="p-4 rounded-2xl bg-black/[0.02] border border-black/[0.04] space-y-3">
                            <input value={newStep.title} onChange={e => setNewStep(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="分镜名称" className="w-full h-[34px] px-3 rounded-lg border border-black/[0.06] bg-white text-[13px] outline-none focus:border-[#007AFF]/30" />
                            <div className="flex gap-3">
                                <input value={newStep.duration} onChange={e => setNewStep(prev => ({ ...prev, duration: e.target.value }))}
                                    placeholder="时长，如 8s" className="w-20 h-[34px] px-3 rounded-lg border border-black/[0.06] bg-white text-[13px] outline-none focus:border-[#007AFF]/30" />
                                <input value={newStep.description} onChange={e => setNewStep(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="画面描述..." className="flex-1 h-[34px] px-3 rounded-lg border border-black/[0.06] bg-white text-[13px] outline-none focus:border-[#007AFF]/30" />
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleAdd} className="flex-1 py-2 rounded-lg bg-[#007AFF] text-[12px] text-white font-medium">确认添加</button>
                                <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg text-[12px] text-[#86868B]">取消</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="space-y-1">
                {steps.map(step => (
                    <div key={step.id} className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-black/[0.015] border border-black/[0.04] hover:border-black/[0.08] transition-colors">
                        <div className="flex flex-col items-center gap-0.5">
                            <button onClick={() => move(step.id, -1)} className="w-5 h-5 rounded flex items-center justify-center text-[#C7C7CC] hover:text-[#1D1D1F] opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-[10px]">▲</span></button>
                            <span className="text-[10px] text-[#C7C7CC] font-mono w-5 text-center">{step.order}</span>
                            <button onClick={() => move(step.id, 1)} className="w-5 h-5 rounded flex items-center justify-center text-[#C7C7CC] hover:text-[#1D1D1F] opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-[10px]">▼</span></button>
                        </div>
                        <div className="flex items-center gap-2 text-[#C7C7CC] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <GripVertical className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            {editingId === step.id ? (
                                <div className="flex items-center gap-2">
                                    <input value={step.title} onChange={e => setSteps(prev => prev.map(s => s.id === step.id ? { ...s, title: e.target.value } : s))}
                                        className="w-28 h-7 px-2 rounded border border-[#007AFF]/40 text-[12px] outline-none" />
                                    <input value={step.duration} onChange={e => setSteps(prev => prev.map(s => s.id === step.id ? { ...s, duration: e.target.value } : s))}
                                        className="w-16 h-7 px-2 rounded border border-[#007AFF]/40 text-[12px] outline-none" />
                                    <input value={step.description} onChange={e => setSteps(prev => prev.map(s => s.id === step.id ? { ...s, description: e.target.value } : s))}
                                        className="flex-1 h-7 px-2 rounded border border-[#007AFF]/40 text-[12px] outline-none" />
                                    <button onClick={() => setEditingId(null)} className="text-[#007AFF]"><Check className="w-3.5 h-3.5" /></button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[13px] font-semibold text-[#1D1D1F]">{step.title}</span>
                                        <span className="text-[10px] text-[#86868B] bg-black/[0.04] px-1.5 py-0.5 rounded-md">{step.duration}</span>
                                    </div>
                                    <p className="text-[11px] text-[#86868B] mt-0.5 truncate">{step.description}</p>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingId(step.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F]"><Pencil className="w-3 h-3" /></button>
                            <button onClick={() => { setSteps(prev => prev.filter(s => s.id !== step.id)); toast('已删除', 'success') }}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#C7C7CC] hover:text-[#FF3B30]"><Trash2 className="w-3 h-3" /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

/* ════════════════════════════════════════════════════════════════
   image_master  Tab 0 — 参考垫图库
   ════════════════════════════════════════════════════════════════ */

interface RefImage { id: string; name: string; url: string; description: string }

function ReferenceImageGrid() {
    const { toast } = useToast()
    const [images, setImages] = useState<RefImage[]>([
        { id: 'img1', name: '科技感办公室', url: '', description: '赛博朋克风，蓝紫色调，全息屏幕' },
        { id: 'img2', name: '产品特写', url: '', description: '微距镜头，浅景深，金属质感' },
        { id: 'img3', name: '城市夜景', url: '', description: '陆家嘴航拍，霓虹灯，长曝光' },
    ])
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editingField, setEditingField] = useState<{ id: string; key: 'name' | 'description'; value: string } | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)

    const startFieldEdit = (id: string, key: 'name' | 'description', value: string) => {
        setEditingField({ id, key, value })
    }
    const saveField = () => {
        if (!editingField) return
        setImages(prev => prev.map(i => i.id === editingField.id ? { ...i, [editingField.key]: editingField.value } : i))
        setEditingField(null)
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-[11px] text-[#86868B] font-medium">参考图片的预览与风格描述管理</p>
                <button onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1D1D1F] text-[11px] text-white font-medium hover:bg-[#333338] transition-colors">
                    <Upload className="w-3 h-3" /> 上传垫图
                </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
                onChange={e => {
                    const files = e.target.files
                    if (files) {
                        const newImgs = Array.from(files).map((f, i) => ({ id: `img${Date.now() + i}`, name: f.name.replace(/\.[^.]+$/, ''), url: '', description: '' }))
                        setImages(prev => [...prev, ...newImgs])
                        toast(`已添加 ${files.length} 张垫图`, 'success')
                    }
                }} />
            <div className="grid grid-cols-3 gap-3">
                {images.map(img => (
                    <div key={img.id} className="group rounded-2xl border border-black/[0.04] bg-black/[0.01] overflow-hidden hover:shadow-sm transition-all">
                        <div className="aspect-[4/3] bg-gradient-to-br from-black/[0.03] to-black/[0.06] flex items-center justify-center">
                            <Image className="w-8 h-8 text-[#D1D1D6]" />
                        </div>
                        <div className="p-3 space-y-1.5">
                            {editingField?.id === img.id && editingField.key === 'name' ? (
                                <input value={editingField.value} onChange={e => setEditingField(prev => prev ? { ...prev, value: e.target.value } : prev)}
                                    onKeyDown={e => { if (e.key === 'Enter') saveField(); if (e.key === 'Escape') setEditingField(null) }}
                                    onBlur={saveField} autoFocus
                                    className="w-full h-6 px-1.5 rounded border border-[#007AFF]/40 text-[12px] font-medium outline-none" />
                            ) : (
                                <p className="text-[12px] font-semibold text-[#1D1D1F] truncate cursor-pointer" onClick={() => startFieldEdit(img.id, 'name', img.name)}>{img.name}</p>
                            )}
                            {editingField?.id === img.id && editingField.key === 'description' ? (
                                <input value={editingField.value} onChange={e => setEditingField(prev => prev ? { ...prev, value: e.target.value } : prev)}
                                    onKeyDown={e => { if (e.key === 'Enter') saveField(); if (e.key === 'Escape') setEditingField(null) }}
                                    onBlur={saveField} autoFocus
                                    className="w-full h-6 px-1.5 rounded border border-[#007AFF]/40 text-[11px] outline-none" />
                            ) : (
                                <p className="text-[10px] text-[#86868B] leading-snug cursor-pointer line-clamp-2" onClick={() => startFieldEdit(img.id, 'description', img.description)}>{img.description || '点击添加描述...'}</p>
                            )}
                        </div>
                        <div className="flex justify-end gap-0.5 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setImages(prev => prev.filter(i => i.id !== img.id)); toast('已删除', 'success') }}
                                className="w-6 h-6 rounded flex items-center justify-center text-[#C7C7CC] hover:text-[#FF3B30]"><Trash2 className="w-3 h-3" /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

/* ════════════════════════════════════════════════════════════════
   image_master  Tab 1 — 画风 Prompt 词典
   ════════════════════════════════════════════════════════════════ */

interface PromptTag { id: string; label: string; promptEn: string }

function PromptDictionary() {
    const { toast } = useToast()
    const [tags, setTags] = useState<PromptTag[]>([
        { id: 'pt1', label: '电影感', promptEn: 'cinematic lighting, 8k, photorealistic' },
        { id: 'pt2', label: '赛博朋克', promptEn: 'cyberpunk style, neon lights, dark futuristic city' },
        { id: 'pt3', label: '极简主义', promptEn: 'minimalist design, clean lines, white background' },
        { id: 'pt4', label: '微距特写', promptEn: 'macro shot, extreme detail, shallow depth of field' },
        { id: 'pt5', label: '水彩风格', promptEn: 'watercolor painting style, soft edges, artistic' },
        { id: 'pt6', label: '胶片质感', promptEn: 'film grain, vintage color grading, analog photography' },
    ])
    const [editingTag, setEditingTag] = useState<PromptTag | null>(null)
    const [showAdd, setShowAdd] = useState(false)
    const [newTag, setNewTag] = useState({ label: '', promptEn: '' })

    const handleSaveEdit = () => {
        if (!editingTag || !editingTag.label.trim()) return
        setTags(prev => prev.map(t => t.id === editingTag.id ? editingTag : t))
        setEditingTag(null); toast('已更新', 'success')
    }

    const handleAdd = () => {
        if (!newTag.label.trim()) { toast('请输入标签名', 'error'); return }
        setTags(prev => [...prev, { id: `pt${Date.now()}`, ...newTag }])
        setNewTag({ label: '', promptEn: '' }); setShowAdd(false); toast('已添加', 'success')
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-[11px] text-[#86868B] font-medium">点击标签编辑，右键删除 — 构建你的 Prompt 词库</p>
                <button onClick={() => setShowAdd(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1D1D1F] text-[11px] text-white font-medium hover:bg-[#333338] transition-colors">
                    <Plus className="w-3 h-3" /> 新增标签
                </button>
            </div>
            <AnimatePresence>
                {showAdd && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="p-4 rounded-2xl bg-black/[0.02] border border-black/[0.04] space-y-3">
                            <input value={newTag.label} onChange={e => setNewTag(prev => ({ ...prev, label: e.target.value }))}
                                placeholder="中文标签，如：国风水墨"
                                className="w-full h-[34px] px-3 rounded-lg border border-black/[0.06] bg-white text-[13px] outline-none focus:border-[#007AFF]/30" />
                            <input value={newTag.promptEn} onChange={e => setNewTag(prev => ({ ...prev, promptEn: e.target.value }))}
                                placeholder="英文Prompt片段..."
                                className="w-full h-[34px] px-3 rounded-lg border border-black/[0.06] bg-white text-[13px] outline-none focus:border-[#007AFF]/30" />
                            <div className="flex gap-2">
                                <button onClick={handleAdd} className="flex-1 py-2 rounded-lg bg-[#007AFF] text-[12px] text-white font-medium">确认添加</button>
                                <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg text-[12px] text-[#86868B]">取消</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                    <div key={tag.id} className="group relative">
                        {editingTag?.id === tag.id ? (
                            <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white border border-[#007AFF]/30 shadow-sm">
                                <input value={editingTag.label} onChange={e => setEditingTag({ ...editingTag, label: e.target.value })}
                                    className="w-20 h-6 px-1.5 rounded border border-[#007AFF]/20 text-[12px] outline-none" placeholder="标签" />
                                <input value={editingTag.promptEn} onChange={e => setEditingTag({ ...editingTag, promptEn: e.target.value })}
                                    className="w-40 h-6 px-1.5 rounded border border-[#007AFF]/20 text-[12px] outline-none" placeholder="Prompt" />
                                <button onClick={handleSaveEdit} className="text-[#007AFF]"><Check className="w-3.5 h-3.5" /></button>
                                <button onClick={() => setEditingTag(null)} className="text-[#86868B]"><X className="w-3 h-3" /></button>
                            </div>
                        ) : (
                            <span onClick={() => setEditingTag(tag)}
                                onContextMenu={e => { e.preventDefault(); setTags(prev => prev.filter(t => t.id !== tag.id)); toast('已删除', 'success') }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium cursor-pointer transition-all duration-200 border bg-white hover:shadow-sm border-black/[0.06] hover:border-[#007AFF]/20 text-[#1D1D1F]"
                                title={`${tag.promptEn}`}>
                                <Tag className="w-3 h-3 text-[#86868B]" />{tag.label}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

/* ════════════════════════════════════════════════════════════════
   video_publisher  Tab 0 — 平台矩阵配置
   ════════════════════════════════════════════════════════════════ */

interface PlatformCfg { id: string; name: string; enabled: boolean; stickyTags: string[] }

function PlatformMatrix() {
    const { toast } = useToast()
    const [platforms, setPlatforms] = useState<PlatformCfg[]>([
        { id: 'plat1', name: '抖音', enabled: true, stickyTags: ['#人工智能', '#黑科技'] },
        { id: 'plat2', name: '小红书', enabled: true, stickyTags: ['#AI工具分享', '#搞钱副业'] },
        { id: 'plat3', name: '视频号', enabled: true, stickyTags: ['#科技改变生活'] },
        { id: 'plat4', name: '快手', enabled: false, stickyTags: [] },
        { id: 'plat5', name: 'B站', enabled: false, stickyTags: [] },
    ])
    const [addingTagFor, setAddingTagFor] = useState<string | null>(null)
    const [newTagValue, setNewTagValue] = useState('')

    const togglePlatform = (id: string) => {
        setPlatforms(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p))
    }

    const addTag = (id: string) => {
        if (!newTagValue.trim()) return
        setPlatforms(prev => prev.map(p => p.id === id ? { ...p, stickyTags: [...p.stickyTags, newTagValue.trim()] } : p))
        setNewTagValue(''); setAddingTagFor(null)
    }

    const removeTag = (platId: string, tagIdx: number) => {
        setPlatforms(prev => prev.map(p => p.id === platId ? { ...p, stickyTags: p.stickyTags.filter((_, i) => i !== tagIdx) } : p))
    }

    return (
        <div className="space-y-4">
            <p className="text-[11px] text-[#86868B] font-medium">管理各平台的常驻话题标签与发布开关</p>
            <div className="space-y-2">
                {platforms.map(plat => (
                    <div key={plat.id} className={`rounded-xl border p-4 transition-all duration-200 ${plat.enabled ? 'border-black/[0.06] bg-white' : 'border-transparent bg-black/[0.015] opacity-60'}`}>
                        <div className="flex items-center gap-3 mb-3">
                            <button onClick={() => togglePlatform(plat.id)}
                                className={`relative w-[40px] h-[24px] rounded-full transition-colors duration-300 flex-shrink-0 ${plat.enabled ? 'bg-[#34C759]' : 'bg-[#D1D1D6]'}`}>
                                <div className={`absolute top-[2px] w-[20px] h-[20px] rounded-full bg-white shadow-sm transition-transform duration-300 ${plat.enabled ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                            </button>
                            <span className="text-[13px] font-semibold text-[#1D1D1F]">{plat.name}</span>
                            <Globe className={`w-3.5 h-3.5 ${plat.enabled ? 'text-[#34C759]' : 'text-[#C7C7CC]'}`} />
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                            {plat.stickyTags.map((t, i) => (
                                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#007AFF]/8 text-[11px] text-[#007AFF] font-medium">
                                    {t}
                                    <button onClick={() => removeTag(plat.id, i)} className="text-[#007AFF]/50 hover:text-[#007AFF]"><X className="w-2.5 h-2.5" /></button>
                                </span>
                            ))}
                            {addingTagFor === plat.id ? (
                                <div className="flex items-center gap-1">
                                    <input value={newTagValue} onChange={e => setNewTagValue(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') addTag(plat.id); if (e.key === 'Escape') setAddingTagFor(null) }}
                                        autoFocus placeholder="#标签"
                                        className="w-24 h-6 px-2 rounded-md border border-[#007AFF]/30 text-[11px] outline-none" />
                                    <button onClick={() => addTag(plat.id)} className="text-[#007AFF]"><Check className="w-3 h-3" /></button>
                                </div>
                            ) : (
                                <button onClick={() => setAddingTagFor(plat.id)}
                                    className="flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] text-[#C7C7CC] hover:text-[#007AFF] hover:bg-[#007AFF]/5 transition-colors">
                                    <Plus className="w-2.5 h-2.5" /> 添加标签
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

/* ════════════════════════════════════════════════════════════════
   video_publisher  Tab 1 — 私域互动钩子库
   ════════════════════════════════════════════════════════════════ */

interface HookRule { id: string; trigger: string; reply: string }

function InteractionHookLib() {
    const { toast } = useToast()
    const [rules, setRules] = useState<HookRule[]>([
        { id: 'hr1', trigger: '想要', reply: '私信我发你完整教程和工具链接 🔗' },
        { id: 'hr2', trigger: '怎么买', reply: '点击主页链接或私信"优惠"获取专属福利价 🎁' },
        { id: 'hr3', trigger: '价格', reply: '不同方案价格不同哦～私信我帮你匹配最适合的方案 💰' },
    ])
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editingTrigger, setEditingTrigger] = useState('')
    const [editingReply, setEditingReply] = useState('')
    const [showAdd, setShowAdd] = useState(false)
    const [newRule, setNewRule] = useState({ trigger: '', reply: '' })

    const startEdit = (rule: HookRule) => {
        setEditingId(rule.id); setEditingTrigger(rule.trigger); setEditingReply(rule.reply)
    }
    const saveEdit = () => {
        setRules(prev => prev.map(r => r.id === editingId ? { ...r, trigger: editingTrigger, reply: editingReply } : r))
        setEditingId(null); toast('已更新', 'success')
    }
    const handleAdd = () => {
        if (!newRule.trigger.trim() || !newRule.reply.trim()) { toast('触发词和回复都必填', 'error'); return }
        setRules(prev => [...prev, { id: `hr${Date.now()}`, ...newRule }])
        setNewRule({ trigger: '', reply: '' }); setShowAdd(false); toast('已添加', 'success')
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-[11px] text-[#86868B] font-medium">触发词 → 自动回复文案的映射配置表</p>
                <button onClick={() => setShowAdd(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1D1D1F] text-[11px] text-white font-medium hover:bg-[#333338] transition-colors">
                    <Plus className="w-3 h-3" /> 新增钩子
                </button>
            </div>
            <AnimatePresence>
                {showAdd && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="p-4 rounded-2xl bg-black/[0.02] border border-black/[0.04] space-y-3">
                            <div className="flex gap-3">
                                <input value={newRule.trigger} onChange={e => setNewRule(prev => ({ ...prev, trigger: e.target.value }))}
                                    placeholder="触发关键词" className="flex-1 h-[34px] px-3 rounded-lg border border-black/[0.06] bg-white text-[13px] outline-none focus:border-[#007AFF]/30" />
                                <input value={newRule.reply} onChange={e => setNewRule(prev => ({ ...prev, reply: e.target.value }))}
                                    placeholder="自动回复文案" className="flex-[2] h-[34px] px-3 rounded-lg border border-black/[0.06] bg-white text-[13px] outline-none focus:border-[#007AFF]/30" />
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleAdd} className="flex-1 py-2 rounded-lg bg-[#007AFF] text-[12px] text-white font-medium">确认添加</button>
                                <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg text-[12px] text-[#86868B]">取消</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="rounded-xl border border-black/[0.04] overflow-hidden">
                <table className="w-full text-left">
                    <thead><tr className="bg-black/[0.015]">
                        <th className="px-4 py-2.5 text-[11px] font-medium text-[#86868B] w-[100px]">触发词</th>
                        <th className="px-4 py-2.5 text-[11px] font-medium text-[#86868B]">自动回复文案</th>
                        <th className="px-4 py-2.5 w-[70px]" />
                    </tr></thead>
                    <tbody>
                        {rules.map(rule => (
                            <tr key={rule.id} className="border-t border-black/[0.04] group">
                                <td className="px-4 py-3">
                                    {editingId === rule.id ? (
                                        <input value={editingTrigger} onChange={e => setEditingTrigger(e.target.value)}
                                            className="w-full h-7 px-2 rounded border border-[#007AFF]/40 text-[12px] outline-none" />
                                    ) : (
                                        <span className="inline-block px-2 py-0.5 rounded-md bg-[#FF9500]/8 text-[12px] text-[#FF9500] font-medium">{rule.trigger}</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-[12px] text-[#1D1D1F]">
                                    {editingId === rule.id ? (
                                        <input value={editingReply} onChange={e => setEditingReply(e.target.value)}
                                            className="w-full h-7 px-2 rounded border border-[#007AFF]/40 text-[12px] outline-none" />
                                    ) : rule.reply}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {editingId === rule.id ? (
                                            <button onClick={saveEdit} className="w-7 h-7 rounded flex items-center justify-center text-[#007AFF]"><Check className="w-3.5 h-3.5" /></button>
                                        ) : (
                                            <button onClick={() => startEdit(rule)} className="w-7 h-7 rounded flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F]"><Pencil className="w-3 h-3" /></button>
                                        )}
                                        <button onClick={() => { setRules(prev => prev.filter(r => r.id !== rule.id)); toast('已删除', 'success') }}
                                            className="w-7 h-7 rounded flex items-center justify-center text-[#C7C7CC] hover:text-[#FF3B30]"><Trash2 className="w-3 h-3" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
