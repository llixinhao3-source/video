import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
    X, Upload, Mic, UserPlus, Check, Pencil, Trash2, Image, Video, ChevronDown,
    Sparkles, Wand2, Plus, Settings, Loader2, FileVideo, FileAudio, AlertCircle,
} from 'lucide-react'
import { useAppStore, type AvatarItem } from '@/store/useAppStore'
import { getApiBase } from '@/lib/apiBase'

const TABS = [
    { key: 'library', icon: '👥', label: '现役数字人库', sub: '增删改查' },
    { key: 'clone', icon: '🧬', label: '形象与声音克隆', sub: '多模态录入' },
    { key: 'ai', icon: '✨', label: 'AI 文生数字人', sub: '智能渲染' },
] as const
type TabKey = (typeof TABS)[number]['key']

const VOICE_OPTIONS = ['知性干练女声', '专业沉稳男声', '活力元气少女']

export default function AvatarCenterModal({
    onClose,
    onSelect,
}: {
    onClose: () => void
    onSelect?: (avatar: AvatarItem) => void
}) {
    const {
        avatarList,
        selectedAvatar,
        selectAvatar,
        addAvatar,
        removeAvatar,
        renameAvatar,
        loadAvatars,
        showToast,
    } = useAppStore()

    const [tab, setTab] = useState<TabKey>('library')

    useEffect(() => {
        loadAvatars()
    }, [])

    const handleSelect = (avatar: AvatarItem) => {
        selectAvatar(avatar)
        showToast(`已绑定数字人：${avatar.name}`, 'success')
        onSelect?.(avatar)
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40"
                onClick={onClose}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="relative w-full max-w-[780px] bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.12)] border border-slate-100 overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100">
                    <h2 className="text-[17px] font-semibold text-[#1D1D1F] flex items-center gap-2.5">
                        <UserPlus className="w-5 h-5 text-[#007AFF]" />
                        数字人资产与克隆中心
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors"
                    >
                        <X className="w-4.5 h-4.5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-7 pt-5">
                    <div className="flex bg-[#F5F5F7] rounded-xl p-1">
                        {TABS.map(({ key, icon, label, sub }) => (
                            <button
                                key={key}
                                onClick={() => setTab(key)}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] text-[12px] font-medium transition-all duration-200 ${
                                    tab === key
                                        ? 'bg-white text-[#1D1D1F] shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
                                        : 'text-[#86868B] hover:text-[#1D1D1F]'
                                }`}
                            >
                                <span className="text-[14px] flex-shrink-0">{icon}</span>
                                <span className="text-left leading-tight">
                                    {label}
                                    <span className="block text-[10px] opacity-60 font-normal">{sub}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="px-7 py-5 max-h-[480px] overflow-y-auto">
                    {tab === 'library' && <LibraryTab onSelect={handleSelect} onRefresh={loadAvatars} />}
                    {tab === 'clone' && <CloneTab onRefresh={loadAvatars} />}
                    {tab === 'ai' && <AiTab onRefresh={loadAvatars} />}
                </div>
            </motion.div>
        </div>
    )
}

/* ========================================================================
   Tab 1: 现役数字人库 (增删改查)
   ======================================================================== */
function LibraryTab({
    onSelect,
    onRefresh,
}: {
    onSelect: (avatar: AvatarItem) => void
    onRefresh: () => void
}) {
    const {
        avatarList,
        selectedAvatar,
        selectAvatar,
        removeAvatar,
        renameAvatar,
        showToast,
    } = useAppStore()

    const [hoveredId, setHoveredId] = useState<string | null>(null)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')
    const [editVoice, setEditVoice] = useState('')

    const startEdit = (avatar: AvatarItem) => {
        setEditingId(avatar.id)
        setEditName(avatar.name)
        setEditVoice(avatar.voice_type || '知性干练女声')
    }

    const confirmEdit = async () => {
        if (!editingId || !editName.trim()) {
            setEditingId(null)
            return
        }

        try {
            await fetch(`${getApiBase()}/api/v1/assets/avatars/${editingId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editName.trim(), voice_type: editVoice }),
            })
            renameAvatar(editingId, editName.trim())
            showToast('已更新数字人信息', 'success')
            onRefresh()
        } catch {
            showToast('更新失败', 'error')
        }
        setEditingId(null)
        setEditName('')
        setEditVoice('')
    }

    const handleDelete = async (id: string) => {
        try {
            await fetch(`${getApiBase()}/api/v1/assets/avatars/${id}`, { method: 'DELETE' })
            removeAvatar(id)
            showToast('数字人资产已删除', 'success')
            onRefresh()
        } catch {
            showToast('删除失败', 'error')
        }
    }

    const readyAvatars = avatarList.filter((a) => a.status === 'ready')

    if (readyAvatars.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-14 text-[#86868B]">
                <Image className="w-12 h-12 mb-4 opacity-30" />
                <p className="text-[13px] font-medium mb-1">暂无已就绪的数字人</p>
                <p className="text-[11px] mb-4">前往「形象与声音克隆」或「AI 文生数字人」创建新资产</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-2 gap-3.5">
            {readyAvatars.map((avatar) => {
                const isSelected = selectedAvatar?.id === avatar.id
                const isEditing = editingId === avatar.id
                const isHovered = hoveredId === avatar.id

                return (
                    <motion.div
                        key={avatar.id}
                        whileTap={{ scale: 0.985 }}
                        onMouseEnter={() => setHoveredId(avatar.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => !isEditing && avatar.status === 'ready' && onSelect(avatar)}
                        className={`relative rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden ${
                            isSelected
                                ? 'border-[#007AFF]/40 bg-[#007AFF]/5 ring-2 ring-[#007AFF]/10'
                                : 'border-slate-100 bg-white hover:border-[#007AFF]/20 hover:shadow-sm'
                        }`}
                    >
                        <div className="p-4">
                            <div className="flex items-start gap-3">
                                <div className="w-[52px] h-[52px] rounded-xl bg-gradient-to-br from-[#007AFF]/15 to-[#5856D6]/15 flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
                                    {avatar.thumbnail || avatar.avatar_url ? (
                                        <img
                                            src={avatar.thumbnail || avatar.avatar_url || ''}
                                            alt={avatar.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-[#007AFF]/50">{avatar.name.charAt(0)}</span>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    {isEditing ? (
                                        <div className="space-y-2">
                                            <input
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') confirmEdit()
                                                    if (e.key === 'Escape') setEditingId(null)
                                                }}
                                                autoFocus
                                                onClick={(e) => e.stopPropagation()}
                                                placeholder="数字人名称"
                                                className="w-full h-7 px-2 rounded-lg border border-[#007AFF]/40 bg-white text-[13px] text-[#1D1D1F] outline-none"
                                            />
                                            <select
                                                value={editVoice}
                                                onChange={(e) => setEditVoice(e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-full h-7 px-2 rounded-lg border border-slate-100 text-[12px] text-[#1D1D1F] outline-none bg-white"
                                            >
                                                {VOICE_OPTIONS.map((v) => (
                                                    <option key={v} value={v}>{v}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); confirmEdit() }}
                                                className="text-[11px] text-white bg-[#007AFF] px-2.5 py-0.5 rounded-md"
                                            >
                                                保存
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-[13px] font-semibold text-[#1D1D1F] truncate">
                                                {avatar.name}
                                            </p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#34C759]" />
                                                <span className="text-[11px] text-[#34C759] font-medium">
                                                    {avatar.is_virtual ? 'AI虚拟' : '已就绪'}
                                                </span>
                                            </div>
                                            {avatar.voice_type && (
                                                <p className="text-[10px] text-[#86868B] mt-1">
                                                    🎤 {avatar.voice_type}
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>

                                {isSelected && !isEditing && (
                                    <div className="w-6 h-6 rounded-full bg-[#007AFF] flex items-center justify-center flex-shrink-0">
                                        <Check className="w-3.5 h-3.5 text-white" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Hover action buttons */}
                        <AnimatePresence>
                            {isHovered && !isEditing && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-x-0 bottom-0 flex gap-1 px-1.5 pb-1.5"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button
                                        onClick={() => startEdit(avatar)}
                                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-white/95 backdrop-blur-sm text-[11px] text-[#1D1D1F] font-medium border border-slate-100 hover:bg-[#F5F5F7] transition-colors"
                                    >
                                        <Pencil className="w-3 h-3" /> 编辑
                                    </button>
                                    <button
                                        onClick={() => handleDelete(avatar.id)}
                                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-white/95 backdrop-blur-sm text-[11px] text-[#FF3B30] font-medium border border-slate-100 hover:bg-[#FF3B30]/5 transition-colors"
                                    >
                                        <Trash2 className="w-3 h-3" /> 删除
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )
            })}
        </div>
    )
}

/* ========================================================================
   Tab 2: 形象与声音克隆 (拖拽上传)
   ======================================================================== */
function CloneTab({ onRefresh }: { onRefresh: () => void }) {
    const { addAvatar, showToast } = useAppStore()

    const [cloneName, setCloneName] = useState('')
    const [voiceType, setVoiceType] = useState(VOICE_OPTIONS[0])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [videoFile, setVideoFile] = useState<File | null>(null)
    const [audioFile, setAudioFile] = useState<File | null>(null)
    const [videoDragOver, setVideoDragOver] = useState(false)
    const [audioDragOver, setAudioDragOver] = useState(false)
    const videoInputRef = useRef<HTMLInputElement>(null)

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation()
    }, [])

    const handleVideoDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setVideoDragOver(false)
        const file = e.dataTransfer.files?.[0]
        if (file && file.type.startsWith('video/')) {
            if (file.size > 50 * 1024 * 1024) { showToast('文件超过 50MB 限制', 'error'); return }
            setVideoFile(file)
        }
    }, [showToast])

    const handleAudioDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setAudioDragOver(false)
        const file = e.dataTransfer.files?.[0]
        if (file && file.type.startsWith('audio/')) {
            if (file.size > 50 * 1024 * 1024) { showToast('文件超过 50MB 限制', 'error'); return }
            setAudioFile(file)
        }
    }, [showToast])

    const handleSubmitClone = async () => {
        if (!cloneName.trim()) { showToast('请给数字人起个名字', 'error'); return }
        if (!videoFile) { showToast('请上传形象克隆视频', 'error'); return }

        setIsSubmitting(true)
        try {
            const formData = new FormData()
            formData.append('name', cloneName.trim())
            formData.append('avatar_video', videoFile)
            formData.append('voice_type', voiceType)
            if (audioFile) formData.append('voice_audio', audioFile)

            const res = await fetch(`${getApiBase()}/api/v1/assets/avatars/clone`, {
                method: 'POST',
                body: formData,
            })
            if (!res.ok) {
                const err = await res.json().catch(() => null)
                throw new Error(err?.detail || '提交失败')
            }
            const json = await res.json()
            const data = json.data
            addAvatar({
                id: data.id,
                name: data.name,
                status: 'cloning',
                thumbnail: '',
                voice_type: data.voice_type,
                voice_id: data.voice_id,
                is_virtual: false,
            })
            setCloneName('')
            setVideoFile(null)
            setAudioFile(null)
            if (videoInputRef.current) videoInputRef.current.value = ''
            showToast('克隆任务已提交！', 'success')
            onRefresh()
        } catch (err) {
            showToast(err instanceof Error ? err.message : '提交失败', 'error')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="space-y-5">
            {/* 视频拖拽区 */}
            <div>
                <label className="flex items-center gap-2 text-[13px] font-medium text-[#1D1D1F] mb-2.5">
                    <FileVideo className="w-4 h-4 text-[#86868B]" />
                    形象克隆视频（必传，≤50MB .mp4 绿幕口播）
                </label>
                <div
                    onDragEnter={(e) => { handleDrag(e); setVideoDragOver(true) }}
                    onDragOver={handleDrag}
                    onDragLeave={() => setVideoDragOver(false)}
                    onDrop={handleVideoDrop}
                    onClick={() => videoInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
                        videoDragOver
                            ? 'border-[#007AFF] bg-[#007AFF]/5 scale-[1.01]'
                            : videoFile
                            ? 'border-[#34C759]/30 bg-[#34C759]/5'
                            : 'border-slate-200 bg-[#FAFAFA] hover:border-[#007AFF]/30 hover:bg-[#007AFF]/3'
                    }`}
                >
                    <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) {
                                if (f.size > 50 * 1024 * 1024) { showToast('文件超过 50MB', 'error'); return }
                                setVideoFile(f)
                            }
                        }}
                    />
                    {videoFile ? (
                        <div>
                            <Check className="w-7 h-7 text-[#34C759] mx-auto mb-2" />
                            <p className="text-[13px] text-[#1D1D1F] font-medium">{videoFile.name}</p>
                            <p className="text-[11px] text-[#86868B] mt-1">{(videoFile.size / 1024 / 1024).toFixed(1)} MB — 已就绪</p>
                        </div>
                    ) : (
                        <div>
                            <Upload className="w-10 h-10 text-[#C7C7CC] mx-auto mb-3" />
                            <p className="text-[13px] text-[#1D1D1F] font-medium">拖拽或点击上传形象克隆视频</p>
                            <p className="text-[11px] text-[#86868B] mt-1">支持 .mp4 格式，最大 50MB</p>
                        </div>
                    )}
                </div>
            </div>

            {/* 音频拖拽区 */}
            <div>
                <label className="flex items-center gap-2 text-[13px] font-medium text-[#1D1D1F] mb-2.5">
                    <FileAudio className="w-4 h-4 text-[#86868B]" />
                    声音克隆音频（可选，≤50MB 清晰人声样本）
                </label>
                <div
                    onDragEnter={(e) => { handleDrag(e); setAudioDragOver(true) }}
                    onDragOver={handleDrag}
                    onDragLeave={() => setAudioDragOver(false)}
                    onDrop={handleAudioDrop}
                    onClick={() => document.getElementById('audio-clone-input')?.click()}
                    className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
                        audioDragOver
                            ? 'border-[#007AFF] bg-[#007AFF]/5 scale-[1.01]'
                            : audioFile
                            ? 'border-[#34C759]/30 bg-[#34C759]/5'
                            : 'border-slate-200 bg-[#FAFAFA] hover:border-[#007AFF]/30 hover:bg-[#007AFF]/3'
                    }`}
                >
                    <input
                        id="audio-clone-input"
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) {
                                if (f.size > 50 * 1024 * 1024) { showToast('文件超过 50MB', 'error'); return }
                                setAudioFile(f)
                            }
                        }}
                    />
                    {audioFile ? (
                        <div>
                            <Check className="w-6 h-6 text-[#34C759] mx-auto mb-1" />
                            <p className="text-[13px] text-[#1D1D1F] font-medium">{audioFile.name}</p>
                            <p className="text-[11px] text-[#86868B] mt-0.5">{(audioFile.size / 1024).toFixed(1)} KB — 已就绪</p>
                        </div>
                    ) : (
                        <div>
                            <Upload className="w-8 h-8 text-[#C7C7CC] mx-auto mb-2" />
                            <p className="text-[13px] text-[#1D1D1F] font-medium">拖拽或点击上传声音样本</p>
                            <p className="text-[11px] text-[#86868B] mt-1">建议 1-3 分钟清晰人声，支持 .mp3/.wav</p>
                        </div>
                    )}
                </div>
            </div>

            {/* 名称 & 声线 */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="flex items-center gap-2 text-[13px] font-medium text-[#1D1D1F] mb-2.5">
                        <UserPlus className="w-4 h-4 text-[#86868B]" />
                        数字人名称
                    </label>
                    <input
                        type="text"
                        value={cloneName}
                        onChange={(e) => setCloneName(e.target.value)}
                        placeholder="如：全能主播-小王"
                        className="w-full h-[46px] px-4 rounded-2xl border border-slate-200 bg-[#FAFAFA] text-[14px] text-[#1D1D1F] placeholder:text-[#C7C7CC] outline-none focus:border-[#007AFF] focus:bg-white focus:ring-[3px] focus:ring-[#007AFF]/10 transition-all duration-200"
                    />
                </div>
                <div>
                    <label className="flex items-center gap-2 text-[13px] font-medium text-[#1D1D1F] mb-2.5">
                        <Mic className="w-4 h-4 text-[#86868B]" />
                        默认声线
                    </label>
                    <div className="relative">
                        <select
                            value={voiceType}
                            onChange={(e) => setVoiceType(e.target.value)}
                            className="w-full h-[46px] pl-4 pr-10 rounded-2xl border border-slate-200 bg-[#FAFAFA] text-[14px] text-[#1D1D1F] outline-none focus:border-[#007AFF] focus:bg-white focus:ring-[3px] focus:ring-[#007AFF]/10 transition-all duration-200 appearance-none cursor-pointer"
                        >
                            {VOICE_OPTIONS.map((v) => (
                                <option key={v} value={v}>{v}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868B] pointer-events-none" />
                    </div>
                </div>
            </div>

            <button
                onClick={handleSubmitClone}
                disabled={isSubmitting}
                className={`w-full h-[48px] rounded-2xl text-[14px] font-medium text-white flex items-center justify-center gap-2 transition-all duration-200 ${
                    isSubmitting ? 'bg-[#1D1D1F]/60 cursor-not-allowed' : 'bg-[#1D1D1F] hover:bg-[#333338] active:scale-[0.985]'
                }`}
            >
                {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> 提交中...</>
                ) : (
                    <>🧬 开始克隆</>
                )}
            </button>

            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#F5F5F7] border border-slate-100">
                <AlertCircle className="w-4 h-4 text-[#86868B] flex-shrink-0" />
                <p className="text-[11px] text-[#86868B] leading-relaxed">
                    上传后系统将在后台执行形象与声音克隆。克隆完成后，资产将自动出现在「现役数字人库」中。
                </p>
            </div>
        </div>
    )
}

/* ========================================================================
   Tab 3: AI 文生数字人
   ======================================================================== */
function AiTab({ onRefresh }: { onRefresh: () => void }) {
    const { addAvatar, showToast } = useAppStore()

    const [aiDesc, setAiDesc] = useState('')
    const [aiVoice, setAiVoice] = useState(VOICE_OPTIONS[0])
    const [aiLoading, setAiLoading] = useState(false)
    const [aiResult, setAiResult] = useState<AvatarItem | null>(null)

    const handleAiGenerate = async () => {
        if (!aiDesc.trim()) {
            showToast('请填写数字人形象描述', 'error')
            return
        }

        setAiLoading(true)
        setAiResult(null)

        try {
            const res = await fetch(`${getApiBase()}/api/v1/assets/avatars/text-to-avatar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: aiDesc.trim(), voice_type: aiVoice }),
            })

            if (!res.ok) {
                const err = await res.json().catch(() => null)
                throw new Error(err?.detail || '生成失败')
            }

            const json = await res.json()
            const data = json.data

            const previewUrl = data.avatar_url?.startsWith('http')
                ? data.avatar_url
                : data.avatar_url
                ? `${getApiBase()}${data.avatar_url}`
                : ''

            const newAvatar: AvatarItem = {
                id: data.id,
                name: data.name,
                status: 'ready',
                thumbnail: previewUrl,
                avatar_url: data.avatar_url,
                voice_type: data.voice_type,
                voice_id: 'female_professional_01',
                is_virtual: true,
            }

            setAiResult(newAvatar)
            addAvatar(newAvatar)
            showToast('AI 数字人渲染完成！', 'success')
            onRefresh()
        } catch (err) {
            showToast(err instanceof Error ? err.message : '渲染失败', 'error')
        } finally {
            setAiLoading(false)
        }
    }

    return (
        <div className="space-y-5">
            <div>
                <label className="flex items-center gap-2 text-[13px] font-medium text-[#1D1D1F] mb-2.5">
                    <Wand2 className="w-4 h-4 text-[#86868B]" />
                    数字人形象描述
                </label>
                <textarea
                    value={aiDesc}
                    onChange={(e) => setAiDesc(e.target.value)}
                    placeholder="描述虚拟数字人的外貌、职业、风格。如：30岁专业科技男主播，短发清爽，深蓝西装，背景是现代极简办公室，胶片质感..."
                    disabled={aiLoading}
                    rows={4}
                    className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-[#FAFAFA] text-[14px] text-[#1D1D1F] placeholder:text-[#C7C7CC] resize-none outline-none focus:border-[#007AFF] focus:bg-white focus:ring-[3px] focus:ring-[#007AFF]/10 transition-all duration-200"
                />
            </div>

            <div>
                <label className="flex items-center gap-2 text-[13px] font-medium text-[#1D1D1F] mb-2.5">
                    <Mic className="w-4 h-4 text-[#86868B]" />
                    声线快速匹配
                </label>
                <div className="relative">
                    <select
                        value={aiVoice}
                        onChange={(e) => setAiVoice(e.target.value)}
                        disabled={aiLoading}
                        className="w-full h-[46px] pl-4 pr-10 rounded-2xl border border-slate-200 bg-[#FAFAFA] text-[14px] text-[#1D1D1F] outline-none focus:border-[#007AFF] focus:bg-white focus:ring-[3px] focus:ring-[#007AFF]/10 transition-all duration-200 appearance-none cursor-pointer"
                    >
                        {VOICE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868B] pointer-events-none" />
                </div>
            </div>

            <button
                onClick={handleAiGenerate}
                disabled={aiLoading}
                className={`relative w-full h-[48px] rounded-2xl text-[14px] font-medium text-white flex items-center justify-center gap-2.5 transition-all duration-300 overflow-hidden ${
                    aiLoading ? 'cursor-not-allowed' : 'hover:scale-[1.01] active:scale-[0.985]'
                }`}
                style={{
                    background: aiLoading
                        ? '#1D1D1F'
                        : 'linear-gradient(135deg, #1D1D1F 0%, #333338 30%, #1D1D1F 60%, #5856D6 100%)',
                    backgroundSize: '300% 100%',
                }}
            >
                <motion.div
                    className="absolute inset-0 rounded-2xl opacity-50"
                    style={{
                        background: 'linear-gradient(135deg, transparent 0%, rgba(88,86,214,0.3) 50%, transparent 100%)',
                        backgroundSize: '200% 100%',
                    }}
                    animate={!aiLoading ? { backgroundPosition: ['0% 0%', '200% 0%'] } : {}}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                />
                <span className="relative z-10 flex items-center gap-2.5">
                    {aiLoading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> AI 正在构思人设画布...</>
                    ) : (
                        <><Sparkles className="w-4 h-4" /> 🎨 智能渲染虚拟数字人</>
                    )}
                </span>
            </button>

            <AnimatePresence>
                {aiLoading && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-[#F5F5F7] to-[#EAEAEC] border border-slate-200">
                            <div className="flex flex-col items-center justify-center py-12 px-6">
                                <motion.div
                                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#5856D6]/20 to-[#007AFF]/20 flex items-center justify-center mb-4"
                                    animate={{ scale: [1, 1.05, 1] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                >
                                    <Wand2 className="w-8 h-8 text-[#5856D6]" />
                                </motion.div>
                                <p className="text-[13px] text-[#86868B] font-medium">生图大师正在构思人设画布...</p>
                                <p className="text-[11px] text-[#C7C7CC] mt-1">正在根据描述生成 9:16 专业数字人半身照</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {aiResult && !aiLoading && (
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="space-y-4"
                    >
                        {aiResult.avatar_url && (
                            <div className="rounded-2xl overflow-hidden bg-slate-100 border border-slate-100">
                                <img
                                    src={aiResult.avatar_url}
                                    alt={aiResult.name}
                                    className="w-full object-cover"
                                    style={{ aspectRatio: '9/16', maxHeight: '360px' }}
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                />
                            </div>
                        )}
                        <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-[#34C759]/5 border border-[#34C759]/20">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-[#34C759]/20 flex items-center justify-center">
                                    <Check className="w-4 h-4 text-[#34C759]" />
                                </div>
                                <div>
                                    <p className="text-[13px] text-[#1D1D1F] font-medium">{aiResult.name}</p>
                                    <p className="text-[11px] text-[#34C759]">渲染完成 · 已自动入库</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
