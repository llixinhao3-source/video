import { useState } from 'react'
import { motion } from 'motion/react'
import { useAppStore } from '@/store/useAppStore'
import { Sparkles, Loader2, Link2, Play, XCircle, ExternalLink } from 'lucide-react'
import MarkdownContent from '@/components/MarkdownContent'

const API_BASE = import.meta.env.VITE_API_BASE || ''

interface VideoInfo {
  title: string
  description: string
  duration: number | null
  view_count: number | null
  like_count: number | null
  comment_count: number | null
  uploader: string
  upload_date: string
  thumbnail: string
  video_url: string
  platform: string
}

export default function ViralFollowUpPanel() {
  const { isGenerating, setIsGenerating, setResult, result, showToast, getAbortSignal, cancelGeneration } = useAppStore()
  const [videoUrl, setVideoUrl] = useState('')
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [phase, setPhase] = useState<'input' | 'parsed' | 'generating' | 'done'>('input')

  const agents = [
    { key: 'scriptAdapt', label: '脚本改编', emoji: '✍️' },
    { key: 'shotList', label: '分镜脚本', emoji: '🎬' },
    { key: 'propList', label: '道具清单', emoji: '🧰' },
    { key: 'caption', label: '字幕文案', emoji: '💬' },
    { key: 'publishPlan', label: '发布策略', emoji: '📅' },
    { key: 'diffStrategy', label: '差异化建议', emoji: '💡' },
  ]
  const [enabledAgents, setEnabledAgents] = useState<Record<string, boolean>>(
    Object.fromEntries(agents.map((a) => [a.key, false]))
  )

  const toggleAgent = (key: string) => {
    setEnabledAgents((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleParse = async () => {
    if (!videoUrl.trim()) return
    setIsGenerating(true)
    try {
      const response = await fetch(`${API_BASE}/api/v1/video/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: videoUrl.trim() }),
        signal: getAbortSignal(),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(err?.detail || `解析失败: ${response.status}`)
      }
      const json = await response.json()
      if (json.video_info) {
        setVideoInfo(json.video_info)
        setPhase('parsed')
        showToast('视频信息解析成功！', 'success')
      } else {
        throw new Error('未获取到视频信息')
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      showToast(err instanceof Error ? err.message : '解析失败', 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerate = async () => {
    if (!videoInfo) return
    const hasAgent = Object.values(enabledAgents).some(Boolean)
    if (!hasAgent) {
      showToast('请至少选择一个跟拍维度', 'error')
      return
    }
    setIsGenerating(true)
    setPhase('generating')
    try {
      const response = await fetch(`${API_BASE}/api/v1/video/viral_follow_up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: { videoUrl, videoInfo },
          agents: enabledAgents,
        }),
        signal: getAbortSignal(),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(err?.detail || `生成失败: ${response.status}`)
      }
      const json = await response.json()
      setResult(json)
      setPhase('done')
      showToast('爆款跟拍方案生成完成！', 'success')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      showToast(err instanceof Error ? err.message : '生成失败', 'error')
      setPhase('parsed')
    } finally {
      setIsGenerating(false)
    }
  }

  const formatDuration = (s: number | null) => {
    if (!s) return '未知'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const formatCount = (n: number | null) => {
    if (n === null) return '—'
    if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
    return n.toLocaleString()
  }

  const sections = (result as Record<string, unknown>)?.sections as Array<{ title: string; content: string }> | undefined

  return (
    <div className="px-8 py-10 rounded-3xl bg-white border border-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#F5F5F7] mb-4">
          <span className="text-[28px]">🔥</span>
        </div>
        <h2 className="text-[20px] font-semibold text-[#1D1D1F] tracking-tight">爆款跟拍</h2>
        <p className="text-[14px] text-[#86868B] mt-2 max-w-[480px] mx-auto leading-relaxed">
          粘贴爆款视频链接，AI 自动拆解并生成可执行的跟拍方案
        </p>
      </div>

      <div className="max-w-[680px] mx-auto space-y-6">
        <div>
          <label className="flex items-center gap-2 text-[13px] font-medium text-[#1D1D1F] mb-3">
            <Link2 className="w-4 h-4 text-[#86868B]" />
            爆款视频链接
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="粘贴抖音、小红书、B站、快手等平台的爆款视频分享链接..."
              className="flex-1 h-[46px] px-4 rounded-2xl border border-black/[0.06] bg-[#FAFAFA] text-[14px] text-[#1D1D1F] placeholder:text-[#C7C7CC] focus:outline-none focus:border-[#007AFF] focus:bg-white focus:ring-[3px] focus:ring-[#007AFF]/10 transition-all duration-200"
            />
            <motion.button
              onClick={handleParse}
              disabled={!videoUrl.trim() || isGenerating}
              className={`h-[46px] px-6 rounded-2xl text-[14px] font-medium flex items-center gap-2 transition-all duration-200 ${
                !videoUrl.trim() || isGenerating
                  ? 'bg-[#1D1D1F]/30 text-white/60 cursor-not-allowed'
                  : 'bg-[#FF6B6B] text-white hover:bg-[#FF5252] active:scale-[0.98]'
              }`}
              whileTap={videoUrl.trim() && !isGenerating ? { scale: 0.98 } : undefined}
            >
              <Play className="w-4 h-4" />
              解析
            </motion.button>
          </div>
          <p className="text-[11px] text-[#C7C7CC] mt-2">支持：抖音、小红书、B站、快手、YouTube、微博视频等</p>
        </div>

        {videoInfo && (phase === 'parsed' || phase === 'generating' || phase === 'done') && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-black/[0.06] bg-[#FAFAFA] overflow-hidden"
          >
            <div className="flex gap-4 p-4">
              {videoInfo.thumbnail && (
                <div className="w-[140px] h-[100px] rounded-xl overflow-hidden flex-shrink-0 bg-black/5">
                  <img src={videoInfo.thumbnail} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-[14px] font-semibold text-[#1D1D1F] line-clamp-2 mb-1.5">{videoInfo.title}</h3>
                <p className="text-[12px] text-[#86868B] mb-2">作者：{videoInfo.uploader} · {videoInfo.platform}</p>
                <div className="flex gap-3 text-[11px] text-[#86868B]">
                  <span>⏱ {formatDuration(videoInfo.duration)}</span>
                  {videoInfo.view_count !== null && <span>👁 {formatCount(videoInfo.view_count)}</span>}
                  {videoInfo.like_count !== null && <span>❤️ {formatCount(videoInfo.like_count)}</span>}
                  {videoInfo.comment_count !== null && <span>💬 {formatCount(videoInfo.comment_count)}</span>}
                </div>
              </div>
            </div>
            {videoInfo.description && (
              <div className="px-4 pb-3">
                <p className="text-[12px] text-[#86868B] line-clamp-2">{videoInfo.description}</p>
              </div>
            )}
          </motion.div>
        )}

        {videoInfo && (
          <div>
            <label className="flex items-center gap-2 text-[13px] font-medium text-[#1D1D1F] mb-3">
              跟拍维度
            </label>
            <div className="grid grid-cols-3 gap-2">
              {agents.map((agent) => (
                <button
                  key={agent.key}
                  onClick={() => toggleAgent(agent.key)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-200 ${
                    enabledAgents[agent.key]
                      ? 'bg-[#FF6B6B]/10 text-[#FF6B6B] border border-[#FF6B6B]/20'
                      : 'bg-[#F5F5F7] text-[#86868B] border border-transparent hover:bg-[#EEEFF0]'
                  }`}
                >
                  <span>{agent.emoji}</span>
                  <span>{agent.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {videoInfo && phase !== 'generating' && (
          isGenerating ? (
            <div className="flex gap-3">
              <div className="flex-1 h-[52px] rounded-2xl bg-[#1D1D1F]/70 text-white text-[15px] font-medium flex items-center justify-center gap-2.5">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>AI 生成跟拍方案...</span>
              </div>
              <button
                onClick={cancelGeneration}
                className="h-[52px] px-5 rounded-2xl bg-[#FF6B6B]/10 text-[#FF6B6B] text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-[#FF6B6B]/20 active:scale-[0.98] transition-all duration-200"
              >
                <XCircle className="w-4 h-4" />
                取消
              </button>
            </div>
          ) : (
            <motion.button
              onClick={handleGenerate}
              disabled={!Object.values(enabledAgents).some(Boolean)}
              className={`w-full h-[52px] rounded-2xl text-[15px] font-medium text-white flex items-center justify-center gap-2.5 transition-all duration-300 ${
                !Object.values(enabledAgents).some(Boolean)
                  ? 'bg-[#1D1D1F]/30 cursor-not-allowed'
                  : 'bg-[#1D1D1F] hover:bg-[#333338] active:scale-[0.985]'
              }`}
              whileTap={Object.values(enabledAgents).some(Boolean) ? { scale: 0.985 } : undefined}
            >
              <Sparkles className="w-5 h-5" />
              <span>生成跟拍方案</span>
            </motion.button>
          )
        )}

        {phase === 'generating' && isGenerating && (
          <div className="flex gap-3">
            <div className="flex-1 h-[52px] rounded-2xl bg-[#1D1D1F]/70 text-white text-[15px] font-medium flex items-center justify-center gap-2.5">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>AI 生成跟拍方案...</span>
            </div>
            <button
              onClick={cancelGeneration}
              className="h-[52px] px-5 rounded-2xl bg-[#FF6B6B]/10 text-[#FF6B6B] text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-[#FF6B6B]/20 active:scale-[0.98] transition-all duration-200"
            >
              <XCircle className="w-4 h-4" />
              取消
            </button>
          </div>
        )}

        {phase === 'done' && sections && sections.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-[#1D1D1F]">跟拍方案</h3>
              {videoInfo?.video_url && (
                <a
                  href={videoInfo.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[12px] text-[#007AFF] hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  查看原视频
                </a>
              )}
            </div>
            {sections.map((sec, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="rounded-2xl border border-black/[0.06] bg-[#FAFAFA] overflow-hidden"
              >
                <div className="px-5 py-3 border-b border-black/[0.04] bg-white">
                  <h4 className="text-[14px] font-semibold text-[#1D1D1F]">{sec.title}</h4>
                </div>
                <div className="p-4">
                  <MarkdownContent content={sec.content} />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
