import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { useAppStore } from '@/store/useAppStore'
import { useProjectPipeline } from '@/hooks/useProjectPipeline'
import { getWorkflowDef } from '@/types'
import { Sparkles, Loader2, CheckCircle2, XCircle, Flame, Calendar, Target, Handshake, DollarSign } from 'lucide-react'
import MarkdownContent from '@/components/MarkdownContent'

const API_BASE = import.meta.env.VITE_API_BASE || ''

const PLATFORMS = [
  { value: 'douyin', label: '抖音', emoji: '🎵' },
  { value: 'xiaohongshu', label: '小红书', emoji: '📕' },
  { value: 'bilibili', label: 'B站', emoji: '📺' },
  { value: 'kuaishou', label: '快手', emoji: '🎬' },
  { value: 'weibo', label: '微博', emoji: '📢' },
  { value: 'video_account', label: '视频号', emoji: '💬' },
]

const PERIODS = [
  { value: 'today', label: '今日', emoji: '📅' },
  { value: 'week', label: '本周', emoji: '📆' },
  { value: 'month', label: '本月', emoji: '🗓️' },
]

const AGENT_ICONS: Record<string, React.ReactNode> = {
  hotspot: <Flame className="w-4 h-4" />,
  daily: <Calendar className="w-4 h-4" />,
  special: <Target className="w-4 h-4" />,
  collab: <Handshake className="w-4 h-4" />,
  conversion: <DollarSign className="w-4 h-4" />,
}

export default function ChannelTaskPanel() {
  const { isGenerating, setIsGenerating, setResult, result, showToast, getAbortSignal, cancelGeneration } = useAppStore()
  const pipeline = useProjectPipeline()

  const wf = getWorkflowDef('channel')

  const [taskName, setTaskName] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [platforms, setPlatforms] = useState<Record<string, boolean>>({
    douyin: false,
    xiaohongshu: false,
    bilibili: false,
    kuaishou: false,
    weibo: false,
    video_account: false,
  })
  const [period, setPeriod] = useState('today')
  const [activeAgents, setActiveAgents] = useState<Record<string, boolean>>(
    Object.fromEntries((wf?.agents || []).map((a) => [a.key, false]))
  )

  const toggleAgent = (key: string) => {
    setActiveAgents((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const togglePlatform = (key: string) => {
    setPlatforms((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const contextInfo = useMemo(() => {
    const parts: string[] = []
    if (pipeline.accountProfile) {
      const ap = pipeline.accountProfile as Record<string, unknown>
      const name = String(ap.own_account || ap.category_keyword || '')
      if (name) parts.push(`账号：${name}`)
      if (ap.platform) parts.push(`平台：${String(ap.platform)}`)
      const pp = (ap.product_profiler || {}) as Record<string, unknown>
      if (pp.core_selling_points && Array.isArray(pp.core_selling_points)) {
        const top3 = (pp.core_selling_points as string[]).slice(0, 3).map((s) => s.split(/[——\-,，。；;]/)[0].slice(0, 15))
        parts.push(`卖点：${top3.join('、')}`)
      }
    }
    if (pipeline.selectedTopic) {
      const st = pipeline.selectedTopic as Record<string, unknown>
      if (st.selected_topic) parts.push(`选题：${String(st.selected_topic).slice(0, 40)}`)
    }
    if (pipeline.scriptData) {
      const sd = pipeline.scriptData as Record<string, unknown>
      const body = (sd.body_content as string) || (sd.script as string) || ''
      if (body) parts.push(`文案：${body.slice(0, 60)}`)
    }
    return parts
  }, [pipeline.accountProfile, pipeline.selectedTopic, pipeline.scriptData])

  const handleGenerate = async () => {
    if (!taskName.trim()) {
      showToast('请输入任务名称', 'error')
      return
    }

    const hasAgent = Object.values(activeAgents).some(Boolean)
    if (!hasAgent) {
      showToast('请至少选择一个任务类型', 'error')
      return
    }

    setIsGenerating(true)
    setResult(null)

    const selectedPlatforms = Object.entries(platforms)
      .filter(([, v]) => v)
      .map(([k]) => PLATFORMS.find((p) => p.value === k)?.label || k)

    try {
      const response = await fetch(`${API_BASE}/api/v1/workflow/channel_task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: {
            taskName,
            taskDesc,
            platforms: selectedPlatforms,
            period,
            context: contextInfo,
          },
          agents: activeAgents,
        }),
        signal: getAbortSignal(),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => null)
        throw new Error(errData?.detail || `请求失败: ${response.status}`)
      }

      const json = await response.json()

      if (json.success && json.data) {
        setResult(json.data)
        pipeline.markStepCompleted('channel')
        showToast('任务方案生成完成！', 'success')
      } else {
        throw new Error('生成结果异常')
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      const message = err instanceof Error ? err.message : '未知错误'
      showToast(message, 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  const hasResult = result && (result as Record<string, unknown>).sections
  const sections = (hasResult ? (result as Record<string, unknown>).sections : []) as { title: string; content: string }[]

  return (
    <div className="px-8 py-10 rounded-3xl bg-white border border-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#F5F5F7] mb-4">
          <span className="text-[28px]">🤖</span>
        </div>
        <h2 className="text-[20px] font-semibold text-[#1D1D1F] tracking-tight">频道自动化任务</h2>
        <p className="text-[14px] text-[#86868B] mt-2 max-w-[480px] mx-auto leading-relaxed">
          配置自动化任务，AI 将每日抓取热点、规划内容发布、追踪数据表现
        </p>
      </div>

      <div className="max-w-[560px] mx-auto space-y-5">
        <div>
          <label className="block text-[13px] font-medium text-[#1D1D1F] mb-2">任务名称</label>
          <input
            type="text"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder="例如：每日热点追踪与内容发布"
            className="w-full h-[48px] px-4 rounded-2xl border border-black/[0.06] bg-[#FAFAFA] text-[15px] text-[#1D1D1F] placeholder:text-[#C7C7CC] focus:outline-none focus:border-[#007AFF] focus:bg-white focus:ring-[3px] focus:ring-[#007AFF]/10 transition-all duration-200"
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#1D1D1F] mb-2">任务描述 <span className="text-[#86868B] font-normal">（可选）</span></label>
          <textarea
            value={taskDesc}
            onChange={(e) => setTaskDesc(e.target.value)}
            placeholder="描述你的行业/赛道，例如：我是做美食探店的，主要在小红书和抖音发布..."
            rows={3}
            className="w-full px-4 py-3 rounded-2xl border border-black/[0.06] bg-[#FAFAFA] text-[15px] text-[#1D1D1F] placeholder:text-[#C7C7CC] focus:outline-none focus:border-[#007AFF] focus:bg-white focus:ring-[3px] focus:ring-[#007AFF]/10 transition-all duration-200 resize-none"
          />
        </div>

        {contextInfo.length > 0 && (
          <div className="rounded-xl border border-[#007AFF]/10 bg-[#007AFF]/[0.02] p-3.5">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[12px] font-medium text-[#007AFF]">📋 已自动带入流水线上下文</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {contextInfo.map((info, i) => (
                <span key={i} className="inline-block px-2.5 py-1 rounded-lg bg-[#007AFF]/5 text-[11px] text-[#007AFF]/80">
                  {info}
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-[13px] font-medium text-[#1D1D1F] mb-2">运营平台 <span className="text-[#86868B] font-normal">（可多选）</span></label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.value}
                onClick={() => togglePlatform(p.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] transition-all duration-200 ${
                  platforms[p.value]
                    ? 'bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/20'
                    : 'bg-[#F5F5F7] text-[#86868B] border border-transparent hover:bg-[#EEEFF0]'
                }`}
              >
                <span>{p.emoji}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#1D1D1F] mb-2">任务周期</label>
          <div className="flex gap-2">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] transition-all duration-200 ${
                  period === p.value
                    ? 'bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/20 font-medium'
                    : 'bg-[#F5F5F7] text-[#86868B] border border-transparent hover:bg-[#EEEFF0]'
                }`}
              >
                <span>{p.emoji}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#1D1D1F] mb-2">启用功能</label>
          <div className="space-y-2">
            {(wf?.agents || []).map((agent) => (
              <button
                key={agent.key}
                onClick={() => toggleAgent(agent.key)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-200 text-left ${
                  activeAgents[agent.key]
                    ? 'border-[#007AFF] bg-[#007AFF]/[0.03] shadow-[0_0_0_1px_#007AFF]'
                    : 'border-black/[0.06] bg-[#FAFAFA] hover:border-black/[0.12]'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  activeAgents[agent.key] ? 'bg-[#007AFF]/10 text-[#007AFF]' : 'bg-[#F5F5F7] text-[#86868B]'
                }`}>
                  {AGENT_ICONS[agent.key]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#1D1D1F]">{agent.label}</p>
                  <p className="text-[11px] text-[#86868B] mt-0.5">{agent.desc}</p>
                </div>
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  activeAgents[agent.key]
                    ? 'bg-[#007AFF] border-[#007AFF]'
                    : 'border-[#C7C7CC] bg-white'
                }`}>
                  {activeAgents[agent.key] && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {!hasResult && (
          isGenerating ? (
            <div className="flex gap-3">
              <div className="flex-1 h-[52px] rounded-2xl bg-[#1D1D1F]/70 text-white text-[15px] font-medium flex items-center justify-center gap-2.5">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>AI 生成任务方案...</span>
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
              disabled={!taskName.trim() || !Object.values(activeAgents).some(Boolean)}
              className={`w-full h-[52px] rounded-2xl text-[15px] font-medium text-white flex items-center justify-center gap-2.5 transition-all duration-300 ${
                !taskName.trim() || !Object.values(activeAgents).some(Boolean)
                  ? 'bg-[#1D1D1F]/30 cursor-not-allowed'
                  : 'bg-[#1D1D1F] hover:bg-[#333338] active:scale-[0.985]'
              }`}
              whileTap={taskName.trim() && Object.values(activeAgents).some(Boolean) ? { scale: 0.985 } : undefined}
            >
              <Sparkles className="w-5 h-5" />
              <span>生成任务方案</span>
            </motion.button>
          )
        )}

        {hasResult && sections.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="rounded-2xl bg-[#F0FFF4] border border-[#34C759]/20 p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
                <span className="text-[13px] font-medium text-[#1D1D1F]">任务方案已生成</span>
              </div>
              <p className="text-[12px] text-[#86868B]">包含热点追踪、任务规划等方案</p>
            </div>

            {sections.map((sec, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="rounded-xl bg-[#FAFAFA] border border-black/[0.04] overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-black/[0.04] bg-white/50">
                  <h4 className="text-[13px] font-semibold text-[#1D1D1F]">{sec.title}</h4>
                </div>
                <div className="p-4">
                  <MarkdownContent content={sec.content} />
                </div>
              </motion.div>
            ))}

            <button
              onClick={() => { setResult(null); setTaskName(''); setTaskDesc('') }}
              className="w-full h-[48px] rounded-2xl bg-[#F5F5F7] text-[#1D1D1F] text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-[#EEEFF0] active:scale-[0.98] transition-all duration-200"
            >
              重新生成任务方案
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
