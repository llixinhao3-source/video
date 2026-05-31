import { motion } from 'motion/react'
import { useAppStore } from '@/store/useAppStore'
import { getWorkflowDef } from '@/types'
import { CheckCircle2, Copy, Check, Play, Film, Image, Mic, Layers, TrendingUp, Target, Users, FileText, Lightbulb, AlertTriangle, Award, BarChart3, Calendar } from 'lucide-react'
import { useState } from 'react'
import { useProjectPipeline } from '@/hooks/useProjectPipeline'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import MarkdownContent from '@/components/MarkdownContent'

const API_BASE = ''

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handleCopy} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors duration-200">
      {copied ? <Check className="w-3.5 h-3.5 text-[#34C759]" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? '已复制' : '复制'}
    </button>
  )
}

function SectionCard({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-5 rounded-2xl bg-white/70 backdrop-blur-md border border-black/[0.04]">
      <h3 className="flex items-center gap-2 text-[14px] font-semibold text-[#1D1D1F] mb-3.5">
        <span className="text-[16px]">{emoji}</span>
        {title}
      </h3>
      {children}
    </div>
  )
}

function RiskCard({ riskReport }: { riskReport: { hasRisk: boolean; riskyWords: { word: string; suggestion: string }[] } }) {
  return (
    <div className={`px-5 py-5 rounded-2xl border ${riskReport.hasRisk ? 'bg-[#FFF2F0] border-[#FF6B6B]/15' : 'bg-[#F0FFF4] border-[#34C759]/15'}`}>
      <div className="flex items-center gap-2.5 mb-3.5">
        <span className="text-[16px]">{'🛡️'}</span>
        <h3 className="text-[14px] font-semibold text-[#1D1D1F]">违禁词风控报告</h3>
      </div>
      {riskReport.hasRisk ? (
        <div className="space-y-2.5">
          <p className="text-[13px] text-[#FF6B6B] font-medium">检测到 {riskReport.riskyWords.length} 个敏感词，请修改后发布</p>
          {riskReport.riskyWords.map((rw, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/80 border border-[#FF6B6B]/10">
              <span className="px-2 py-0.5 rounded-md bg-[#FF6B6B]/15 text-[#FF6B6B] text-[12px] font-medium line-through">{rw.word}</span>
              <span className="text-[12px] text-[#86868B]">→</span>
              <span className="px-2 py-0.5 rounded-md bg-[#34C759]/15 text-[#34C759] text-[12px] font-medium">{rw.suggestion}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/60">
          <span className="text-[24px]">✅</span>
          <div>
            <p className="text-[13px] text-[#1D1D1F] font-medium">内容安全，未检测到敏感词</p>
            <p className="text-[11px] text-[#86868B] mt-0.5">已通过全平台违禁词库实时检测</p>
          </div>
        </div>
      )}
    </div>
  )
}

function BossResultPanel({ data }: { data: Record<string, unknown> }) {
  const sections = (data.sections as { title: string; content: string }[]) || []
  const dashboardSection = sections.find(s => s.title === '数据看板')
  const reportSection = sections.find(s => s.title === '智能报告')

  const dashboardContent = dashboardSection?.content || ''
  const reportContent = reportSection?.content || ''

  const kpi = extractKPIs(dashboardContent + '\n' + reportContent)
  const dashboardBlocks = parseContentBlocks(dashboardContent)
  const reportBlocks = parseContentBlocks(reportContent)

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard icon={<FileText className="w-4 h-4" />} label="分析报告" value={kpi.reportCount} color="blue" />
        <KpiCard icon={<Target className="w-4 h-4" />} label="覆盖赛道" value={kpi.trackCount} color="purple" />
        <KpiCard icon={<Users className="w-4 h-4" />} label="对标账号" value={kpi.accountCount} color="orange" />
        <KpiCard icon={<TrendingUp className="w-4 h-4" />} label="健康度评分" value={kpi.healthScore} suffix="分" color="green" />
      </div>

      {/* Dashboard Section */}
      {dashboardBlocks.length > 0 && (
        <div className="rounded-2xl bg-white/70 backdrop-blur-md border border-black/[0.04] overflow-hidden">
          <div className="px-5 py-4 border-b border-black/[0.04] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#007AFF]/10 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-[#007AFF]" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-[#1D1D1F]">数据看板</h3>
              <p className="text-[11px] text-[#86868B]">基于真实 Obsidian 运营数据</p>
            </div>
          </div>
          <div className="p-5 space-y-4">
            {dashboardBlocks.map((block, i) => (
              <ContentBlock key={i} block={block} />
            ))}
          </div>
        </div>
      )}

      {/* Smart Report Section */}
      {reportBlocks.length > 0 && (
        <div className="rounded-2xl bg-white/70 backdrop-blur-md border border-black/[0.04] overflow-hidden">
          <div className="px-5 py-4 border-b border-black/[0.04] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#34C759]/10 flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-[#34C759]" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-[#1D1D1F]">智能报告</h3>
              <p className="text-[11px] text-[#86868B]">AI 驱动的运营策略洞察</p>
            </div>
          </div>
          <div className="p-5 space-y-4">
            {reportBlocks.map((block, i) => (
              <ContentBlock key={i} block={block} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function KpiCard({ icon, label, value, suffix = '', color }: { icon: React.ReactNode; label: string; value: string | number; suffix?: string; color: 'blue' | 'purple' | 'orange' | 'green' }) {
  const colorMap = {
    blue: { bg: 'bg-[#007AFF]/8', text: 'text-[#007AFF]', iconBg: 'bg-[#007AFF]/10' },
    purple: { bg: 'bg-[#AF52DE]/8', text: 'text-[#AF52DE]', iconBg: 'bg-[#AF52DE]/10' },
    orange: { bg: 'bg-[#FF9500]/8', text: 'text-[#FF9500]', iconBg: 'bg-[#FF9500]/10' },
    green: { bg: 'bg-[#34C759]/8', text: 'text-[#34C759]', iconBg: 'bg-[#34C759]/10' },
  }
  const c = colorMap[color]
  return (
    <div className={`${c.bg} rounded-xl px-4 py-4 border border-black/[0.04]`}>
      <div className={`w-7 h-7 rounded-lg ${c.iconBg} flex items-center justify-center mb-2.5`}>
        <div className={c.text}>{icon}</div>
      </div>
      <p className={`text-[22px] font-bold ${c.text} leading-none`}>{value}{suffix}</p>
      <p className="text-[11px] text-[#86868B] mt-1.5">{label}</p>
    </div>
  )
}

interface ContentBlock {
  type: 'heading' | 'paragraph' | 'list' | 'table'
  content: string
  items?: string[]
  rows?: string[][]
}

function extractKPIs(content: string) {
  const reportMatch = content.match(/(\d+)\s*份\s*(?:定位分析)?报告/)
  const trackMatch = content.match(/(\d+)\s*个\s*(?:赛道|行业|品类)/)
  const accountMatch = content.match(/(\d+)\s*个\s*(?:账号|对标账号)/)
  const scoreMatch = content.match(/(\d{1,3})\s*分/) || content.match(/评分[:：]\s*(\d{1,3})/)

  return {
    reportCount: reportMatch ? reportMatch[1] : '—',
    trackCount: trackMatch ? trackMatch[1] : '—',
    accountCount: accountMatch ? accountMatch[1] : '—',
    healthScore: scoreMatch ? scoreMatch[1] : '—',
  }
}

function parseContentBlocks(content: string): ContentBlock[] {
  const lines = content.split('\n')
  const blocks: ContentBlock[] = []
  let currentList: string[] = []
  let inTable = false
  let tableRows: string[][] = []

  const flushList = () => {
    if (currentList.length > 0) {
      blocks.push({ type: 'list', content: '', items: [...currentList] })
      currentList = []
    }
  }

  const flushTable = () => {
    if (tableRows.length > 0) {
      blocks.push({ type: 'table', content: '', rows: [...tableRows] })
      tableRows = []
    }
    inTable = false
  }

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed) {
      flushList()
      flushTable()
      continue
    }

    if (trimmed.startsWith('|')) {
      if (!inTable) {
        flushList()
        inTable = true
        tableRows = []
      }
      if (trimmed.match(/^\|[\s\-\|:]+\|$/)) continue
      const cells = trimmed.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1).map(c => c.trim())
      tableRows.push(cells)
    } else if (trimmed.startsWith('### ')) {
      flushList()
      flushTable()
      blocks.push({ type: 'heading', content: trimmed.slice(4) })
    } else if (trimmed.startsWith('## ')) {
      flushList()
      flushTable()
      blocks.push({ type: 'heading', content: trimmed.slice(3) })
    } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      flushTable()
      currentList.push(trimmed.slice(2))
    } else if (trimmed.match(/^\d+\.\s/)) {
      flushTable()
      currentList.push(trimmed.replace(/^\d+\.\s/, ''))
    } else {
      flushList()
      flushTable()
      blocks.push({ type: 'paragraph', content: trimmed })
    }
  }

  flushList()
  flushTable()

  return blocks
}

function ContentBlock({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case 'heading':
      return <h4 className="text-[14px] font-semibold text-[#1D1D1F] mt-2 mb-2 flex items-center gap-2"><span className="w-1 h-4 rounded-full bg-[#007AFF]" />{block.content}</h4>
    case 'paragraph':
      return <p className="text-[13px] text-[#333] leading-[1.8]">{block.content}</p>
    case 'list':
      return (
        <div className="space-y-2">
          {block.items?.map((item, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#007AFF] flex-shrink-0" />
              <p className="text-[13px] text-[#333] leading-[1.7]">{item}</p>
            </div>
          ))}
        </div>
      )
    case 'table':
      if (!block.rows || block.rows.length === 0) return null
      const header = block.rows[0]
      const body = block.rows.slice(1)
      return (
        <div className="overflow-x-auto rounded-xl border border-black/[0.06]">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-[#F5F5F7]">
                {header.map((cell, i) => (
                  <th key={i} className="px-3 py-2.5 text-left font-semibold text-[#1D1D1F] first:rounded-tl-xl last:rounded-tr-xl">{cell}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, i) => (
                <tr key={i} className="border-t border-black/[0.04] hover:bg-[#FAFAFA]">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-2.5 text-[#333]">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    default:
      return null
  }
}

function VideoResultPanel({ data }: { data: Record<string, unknown> }) {
  const videoUrl = data.video_url as string | undefined
  const stepsExecuted = (data.steps_executed as string[]) || []
  const assetsSummary = (data.assets_summary as Record<string, unknown>) || {}
  const aspectRatio = (data.aspect_ratio as string) || '9:16'
  const status = (data.status as string) || 'unknown'

  const fullVideoUrl = videoUrl ? (videoUrl.startsWith('http') ? videoUrl : `${API_BASE}${videoUrl}`) : ''

  const stepLabelMap: Record<string, string> = {
    draw_master: '生图大师',
    avatar_video: '数字人视频',
    model_explain: '智模讲解',
    smart_cut: '数字人智剪',
    brand_magic: '品宣魔方',
    video_publisher: '视频发布员',
  }

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    success: { label: '生成成功', color: 'text-[#34C759]', bg: 'bg-[#34C759]/10' },
    partial: { label: '部分完成', color: 'text-[#FF9500]', bg: 'bg-[#FF9500]/10' },
    error: { label: '生成失败', color: 'text-[#FF6B6B]', bg: 'bg-[#FF6B6B]/10' },
  }
  const sc = statusConfig[status] || statusConfig.error

  return (
    <>
      <div className="flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-white/70 backdrop-blur-md border border-black/[0.04]">
        <CheckCircle2 className="w-4.5 h-4.5 text-[#34C759] flex-shrink-0" />
        <p className="text-[13px] text-[#1D1D1F]">
          视频制作完成，已同步至本地 Obsidian 库{' '}
          <span className={`px-2 py-0.5 rounded-md ${sc.bg} ${sc.color} text-[12px] font-medium`}>
            {sc.label}
          </span>
        </p>
      </div>

      {fullVideoUrl && (
        <SectionCard emoji="🎥" title="视频预览">
          <div className="rounded-xl overflow-hidden bg-black/5 border border-black/[0.04]">
            <video
              key={fullVideoUrl}
              controls
              autoPlay
              playsInline
              className="w-full rounded-xl"
              style={{ aspectRatio: aspectRatio === '9:16' ? '9/16' : aspectRatio === '16:9' ? '16/9' : '1/1', maxHeight: '480px', objectFit: 'contain', margin: '0 auto', display: 'block' }}
            >
              <source src={fullVideoUrl} type="video/mp4" />
              您的浏览器不支持视频播放
            </video>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px] text-[#86868B]">
              <Film className="w-3.5 h-3.5" />
              <span>比例 {aspectRatio}</span>
            </div>
            <CopyButton text={fullVideoUrl} />
          </div>
        </SectionCard>
      )}

      <SectionCard emoji="📊" title="执行详情">
        <div className="space-y-3">
          {stepsExecuted.length > 0 && (
            <div>
              <p className="text-[11px] text-[#86868B] font-medium mb-2">已执行节点</p>
              <div className="flex flex-wrap gap-2">
                {stepsExecuted.map((step) => (
                  <span key={step} className="px-3 py-1.5 rounded-lg bg-[#007AFF]/8 text-[#007AFF] text-[12px] font-medium">
                    {stepLabelMap[step] || step}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="px-4 py-3 rounded-xl bg-[#F5F5F7] text-center">
              <Image className="w-4 h-4 mx-auto text-[#86868B] mb-1.5" />
              <p className="text-[18px] font-semibold text-[#1D1D1F]">{String(assetsSummary.images ?? 0)}</p>
              <p className="text-[11px] text-[#86868B]">图片</p>
            </div>
            <div className="px-4 py-3 rounded-xl bg-[#F5F5F7] text-center">
              <Mic className="w-4 h-4 mx-auto text-[#86868B] mb-1.5" />
              <p className="text-[18px] font-semibold text-[#1D1D1F]">{assetsSummary.audio ? '✓' : '—'}</p>
              <p className="text-[11px] text-[#86868B]">音频</p>
            </div>
            <div className="px-4 py-3 rounded-xl bg-[#F5F5F7] text-center">
              <Layers className="w-4 h-4 mx-auto text-[#86868B] mb-1.5" />
              <p className="text-[18px] font-semibold text-[#1D1D1F]">{String(assetsSummary.video_clips ?? 0)}</p>
              <p className="text-[11px] text-[#86868B]">片段</p>
            </div>
          </div>
        </div>
      </SectionCard>
    </>
  )
}


export default function GenericResultPanel() {
  const { result, activeWorkflow } = useAppStore()
  const wf = getWorkflowDef(activeWorkflow)
  const pipeline = useProjectPipeline()
  const navigate = useNavigate()

  if (!result || !wf) return null

  const data = result as Record<string, unknown>

  const handleGoNext = () => {
    const nextPath = pipeline.proceedToNext(activeWorkflow)
    if (nextPath) {
      navigate(nextPath)
    }
  }

  const nextStep = pipeline.getNextStep(activeWorkflow)
  const isCurrentCompleted = pipeline.isStepCompleted(activeWorkflow)

  if (activeWorkflow === 'boss') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="mt-6 space-y-4"
      >
        <BossResultPanel data={data} />
        {isCurrentCompleted && nextStep && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            <button
              onClick={handleGoNext}
              className="w-full h-[48px] rounded-2xl bg-[#007AFF] text-white text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-[#0066DD] active:scale-[0.98] transition-all duration-200"
            >
              <CheckCircle2 className="w-4 h-4" />
              当前步骤已完成，进入 {nextStep.emoji} {nextStep.label}
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </motion.div>
    )
  }

  if (activeWorkflow === 'video') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="mt-6 space-y-4"
      >
        <VideoResultPanel data={data} />
        {isCurrentCompleted && nextStep && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            <button
              onClick={handleGoNext}
              className="w-full h-[48px] rounded-2xl bg-[#007AFF] text-white text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-[#0066DD] active:scale-[0.98] transition-all duration-200"
            >
              <CheckCircle2 className="w-4 h-4" />
              当前步骤已完成，进入 {nextStep.emoji} {nextStep.label}
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="mt-6 space-y-4"
    >
      <div className="flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-white/70 backdrop-blur-md border border-black/[0.04]">
        <CheckCircle2 className="w-4.5 h-4.5 text-[#34C759] flex-shrink-0" />
        <p className="text-[13px] text-[#1D1D1F]">
          脚本已自动推送到 <span className="font-medium text-[#007AFF]">飞书多维表格</span> 并同步至本地 Obsidian 库{' '}
          <code className="px-1.5 py-0.5 rounded-md bg-[#F5F5F7] text-[12px] font-mono">
            {data.obsidian_path ? String(data.obsidian_path).split('/').slice(-3).join('/') : '桌面/obsidian/video'}
          </code>
        </p>
      </div>

      {activeWorkflow === 'script' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <SectionCard emoji="🪝" title="标题与前3秒钩子">
              <div className="space-y-2.5">
                {Array.isArray(data.titles) && (data.titles as string[]).map((t, i) => (
                  <div key={i} className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 w-5 h-5 rounded-md bg-[#007AFF]/10 text-[#007AFF] text-[11px] font-medium flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <p className="text-[13.5px] text-[#1D1D1F] leading-relaxed">{t}</p>
                    </div>
                    <CopyButton text={t} />
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3.5 border-t border-black/[0.04]">
                <p className="text-[11px] text-[#86868B] mb-1.5 font-medium">黄金开头（前3秒）</p>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13.5px] text-[#1D1D1F] leading-relaxed">{String(data.hook || '')}</p>
                  <CopyButton text={String(data.hook || '')} />
                </div>
              </div>
            </SectionCard>
            <SectionCard emoji="📢" title="引导语">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[13.5px] text-[#1D1D1F] leading-[1.8]">{String(data.cta || '')}</p>
                <CopyButton text={String(data.cta || '')} />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="px-2 py-1 rounded-md bg-[#FF6B6B]/10 text-[#FF6B6B] text-[11px] font-medium">点赞</span>
                <span className="px-2 py-1 rounded-md bg-[#007AFF]/10 text-[#007AFF] text-[11px] font-medium">关注</span>
                <span className="px-2 py-1 rounded-md bg-[#FF9500]/10 text-[#FF9500] text-[11px] font-medium">评论</span>
              </div>
            </SectionCard>
          </div>
          <SectionCard emoji="📝" title="正文内容">
            <div className="flex items-center justify-end mb-2">
              <CopyButton text={String(data.content || '')} />
            </div>
            <div className="p-4 rounded-xl bg-[#FAFAFA] border border-black/[0.04]">
              <MarkdownContent content={String(data.content || '')} />
            </div>
          </SectionCard>
          <SectionCard emoji="🏷️" title="话题标签建议">
            <div className="flex items-center justify-end mb-2">
              <CopyButton text={Array.isArray(data.tags) ? (data.tags as string[]).map(t => `#${t}`).join(' ') : ''} />
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.isArray(data.tags) && (data.tags as string[]).map((tag, i) => (
                <span key={i} className="px-3 py-1.5 rounded-lg bg-[#007AFF]/8 text-[#007AFF] text-[13px] font-medium hover:bg-[#007AFF]/15 transition-colors duration-200 cursor-default">#{tag}</span>
              ))}
            </div>
          </SectionCard>
          {data.riskReport && <RiskCard riskReport={data.riskReport as { hasRisk: boolean; riskyWords: { word: string; suggestion: string }[] }} />}
        </>
      )}

      {activeWorkflow !== 'script' && (
        <>
          {Array.isArray(data.sections) && (data.sections as { title: string; content: string; structured?: Record<string, unknown> }[]).map((sec, i) => (
            <SectionCard key={i} emoji="📋" title={sec.title}>
              <div className="flex items-center justify-end mb-2">
                <CopyButton text={sec.content} />
              </div>
              {sec.structured && typeof sec.structured === 'object' ? (
                <div className="space-y-3">
                  {Object.entries(sec.structured).map(([key, value]) => (
                    <div key={key} className="px-4 py-3.5 rounded-xl bg-[#FAFAFA] border border-black/[0.04]">
                      <p className="text-[11px] text-[#86868B] font-medium mb-1.5 uppercase tracking-wide">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </p>
                      {Array.isArray(value) ? (
                        <div className="space-y-1.5">
                          {(value as string[]).map((item, j) => (
                            <div key={j} className="flex items-start gap-2">
                              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#007AFF] flex-shrink-0" />
                              <p className="text-[13.5px] text-[#1D1D1F] leading-relaxed">{item}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[13.5px] text-[#1D1D1F] leading-relaxed">{String(value)}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#FAFAFA] border border-black/[0.04]">
                  <MarkdownContent content={sec.content} />
                </div>
              )}
            </SectionCard>
          ))}
          {data.summary && (
            <SectionCard emoji="📊" title="综合分析">
              <div className="flex items-center justify-end mb-2">
                <CopyButton text={String(data.summary)} />
              </div>
              <div className="p-4 rounded-xl bg-[#FAFAFA] border border-black/[0.04]">
                <MarkdownContent content={String(data.summary)} />
              </div>
            </SectionCard>
          )}
          {data.riskReport && <RiskCard riskReport={data.riskReport as { hasRisk: boolean; riskyWords: { word: string; suggestion: string }[] }} />}
        </>
      )}

      {isCurrentCompleted && nextStep && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6"
        >
          <button
            onClick={handleGoNext}
            className="w-full h-[48px] rounded-2xl bg-[#007AFF] text-white text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-[#0066DD] active:scale-[0.98] transition-all duration-200"
          >
            <CheckCircle2 className="w-4 h-4" />
            当前步骤已完成，进入 {nextStep.emoji} {nextStep.label}
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </motion.div>
  )
}
