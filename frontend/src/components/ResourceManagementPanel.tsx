import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { useAppStore } from '@/store/useAppStore'
import { useProjectPipeline } from '@/hooks/useProjectPipeline'
import { FileText, Film, Image, Music, Layers, Search, Copy, Check, ExternalLink } from 'lucide-react'
import MarkdownContent from '@/components/MarkdownContent'

interface ResourceItem {
  id: string
  type: 'script' | 'video' | 'image' | 'audio' | 'template'
  title: string
  content: string
  source: string
  createdAt: string
}

function extractSections(data: Record<string, unknown>): ResourceItem[] {
  const items: ResourceItem[] = []
  const sections = data.sections
  if (!Array.isArray(sections)) return items

  sections.forEach((sec: Record<string, unknown>, i: number) => {
    const title = String(sec.title || `分析${i + 1}`)
    const content = String(sec.content || '')
    if (!content.trim()) return

    let type: ResourceItem['type'] = 'script'
    const t = title.toLowerCase()
    if (t.includes('视频') || t.includes('数字人') || t.includes('克隆') || t.includes('品宣') || t.includes('发布')) type = 'video'
    else if (t.includes('图片') || t.includes('绘图') || t.includes('配图')) type = 'image'
    else if (t.includes('音乐') || t.includes('音效')) type = 'audio'
    else if (t.includes('模板') || t.includes('选题') || t.includes('规划') || t.includes('方案')) type = 'template'

    items.push({
      id: `${title}-${i}`,
      type,
      title,
      content,
      source: '',
      createdAt: new Date().toLocaleDateString(),
    })
  })

  if (data.summary && String(data.summary).trim()) {
    items.push({
      id: 'summary',
      type: 'template',
      title: '综合摘要',
      content: String(data.summary),
      source: '',
      createdAt: new Date().toLocaleDateString(),
    })
  }

  return items
}

export default function ResourceManagementPanel() {
  const { showToast } = useAppStore()
  const pipeline = useProjectPipeline()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const resources = useMemo<ResourceItem[]>(() => {
    const items: ResourceItem[] = []

    if (pipeline.accountProfile) {
      const ap = pipeline.accountProfile as Record<string, unknown>
      const name = String(ap.own_account || ap.category_keyword || '未命名项目')
      const source = ap.analysis_type === 'category' ? '品类定位分析' : '账号定位分析'

      const profileItems = extractSections(ap)
      if (profileItems.length > 0) {
        profileItems.forEach((item) => {
          items.push({ ...item, id: `profile-${item.id}`, source, title: `${name} · ${item.title}` })
        })
      } else {
        const lines: string[] = []
        lines.push(`账号/品类：${name}`)
        if (ap.platform) lines.push(`平台：${String(ap.platform)}`)
        if (ap.market_size) lines.push(`市场规模：${String(ap.market_size)}`)
        if (ap.competition_summary) lines.push(`竞争格局：${String(ap.competition_summary)}`)
        if (ap.user_profile) lines.push(`用户画像：${String(ap.user_profile)}`)
        if (ap.trend_analysis) lines.push(`趋势分析：${String(ap.trend_analysis)}`)
        if (lines.length > 1) {
          items.push({
            id: 'profile-summary',
            type: 'script',
            title: `${name} · 定位分析报告`,
            content: lines.join('\n'),
            source,
            createdAt: new Date().toLocaleDateString(),
          })
        }
      }
    }

    if (pipeline.selectedTopic) {
      const st = pipeline.selectedTopic as Record<string, unknown>
      const topicItems = extractSections(st)
      topicItems.forEach((item) => {
        items.push({ ...item, id: `topic-${item.id}`, source: '短视频选题' })
      })
    }

    if (pipeline.scriptData) {
      const sd = pipeline.scriptData as Record<string, unknown>
      const scriptItems = extractSections(sd)
      if (scriptItems.length > 0) {
        scriptItems.forEach((item) => {
          items.push({ ...item, id: `script-${item.id}`, source: '文案创作' })
        })
      } else {
        const lines: string[] = []
        if (sd.titles && Array.isArray(sd.titles)) {
          lines.push('【标题】')
          ;(sd.titles as string[]).forEach((t, i) => lines.push(`${i + 1}. ${t}`))
          lines.push('')
        }
        if (sd.hook) lines.push(`【钩子】${String(sd.hook)}`)
        if (sd.content) lines.push(`【正文】${String(sd.content)}`)
        if (sd.cta) lines.push(`【CTA】${String(sd.cta)}`)
        if (sd.tags && Array.isArray(sd.tags)) {
          lines.push(`【标签】${(sd.tags as string[]).join(' ')}`)
        }
        if (lines.length > 0) {
          items.push({
            id: 'script-content',
            type: 'script',
            title: '文案脚本',
            content: lines.join('\n'),
            source: '文案创作',
            createdAt: new Date().toLocaleDateString(),
          })
        }
      }
    }

    if (pipeline.videoAssets) {
      const va = pipeline.videoAssets as Record<string, unknown>
      const videoUrl = va.video_url as string
      if (videoUrl) {
        items.push({
          id: 'video-asset',
          type: 'video',
          title: '已生成视频',
          content: videoUrl.startsWith('http') ? videoUrl : `http://localhost:8001${videoUrl}`,
          source: '视频制作',
          createdAt: new Date().toLocaleDateString(),
        })
      }
      const videoItems = extractSections(va)
      videoItems.forEach((item) => {
        items.push({ ...item, id: `video-${item.id}`, source: '视频制作' })
      })
    }

    return items
  }, [pipeline.accountProfile, pipeline.selectedTopic, pipeline.scriptData, pipeline.videoAssets])

  const filtered = resources.filter((r) => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = activeFilter === 'all' || r.type === activeFilter
    return matchesSearch && matchesFilter
  })

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    showToast('已复制到剪贴板', 'success')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const typeConfig: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
    script: { icon: <FileText className="w-4 h-4" />, label: '文案', color: 'text-[#007AFF]', bg: 'bg-[#007AFF]/10' },
    video: { icon: <Film className="w-4 h-4" />, label: '视频', color: 'text-[#FF3B30]', bg: 'bg-[#FF3B30]/10' },
    image: { icon: <Image className="w-4 h-4" />, label: '图片', color: 'text-[#FF9500]', bg: 'bg-[#FF9500]/10' },
    audio: { icon: <Music className="w-4 h-4" />, label: '音频', color: 'text-[#AF52DE]', bg: 'bg-[#AF52DE]/10' },
    template: { icon: <Layers className="w-4 h-4" />, label: '模板', color: 'text-[#34C759]', bg: 'bg-[#34C759]/10' },
  }

  const filters = [
    { key: 'all', label: '全部' },
    { key: 'script', label: '文案' },
    { key: 'video', label: '视频' },
    { key: 'template', label: '模板' },
  ]

  return (
    <div className="px-8 py-10 rounded-3xl bg-white border border-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#F5F5F7] mb-4">
          <span className="text-[28px]">📦</span>
        </div>
        <h2 className="text-[20px] font-semibold text-[#1D1D1F] tracking-tight">资源管理中心</h2>
        <p className="text-[14px] text-[#86868B] mt-2 max-w-[480px] mx-auto leading-relaxed">
          统一管理你在各工作流中产生的文案、视频、选题等资源，支持快速搜索和复用
        </p>
      </div>

      <div className="max-w-[680px] mx-auto space-y-5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#C7C7CC]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索资源..."
            className="w-full h-[48px] pl-12 pr-4 rounded-2xl border border-black/[0.06] bg-[#FAFAFA] text-[15px] text-[#1D1D1F] placeholder:text-[#C7C7CC] focus:outline-none focus:border-[#007AFF] focus:bg-white focus:ring-[3px] focus:ring-[#007AFF]/10 transition-all duration-200"
          />
        </div>

        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`h-[34px] px-4 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                activeFilter === f.key
                  ? 'bg-[#1D1D1F] text-white'
                  : 'bg-[#F5F5F7] text-[#86868B] hover:bg-[#EEEFF0]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[13px] text-[#86868B]">
            共 <span className="font-semibold text-[#1D1D1F]">{filtered.length}</span> 个资源
          </p>
          {resources.length === 0 && (
            <p className="text-[12px] text-[#C7C7CC]">完成前面的工作流即可在此查看资源</p>
          )}
        </div>

        <div className="space-y-3">
          {filtered.map((resource, idx) => {
            const tc = typeConfig[resource.type] || typeConfig.script
            return (
              <motion.div
                key={resource.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="rounded-xl border border-black/[0.06] bg-[#FAFAFA] hover:bg-white hover:border-black/[0.1] transition-all duration-200 overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-8 h-8 rounded-lg ${tc.bg} flex items-center justify-center`}>
                      <div className={tc.color}>{tc.icon}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[14px] font-semibold text-[#1D1D1F] truncate">{resource.title}</h4>
                      <p className="text-[11px] text-[#86868B]">来源：{resource.source} · {resource.createdAt}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopy(resource.content, resource.id)}
                        className="w-8 h-8 rounded-lg bg-white border border-black/[0.06] flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition-all"
                        title="复制内容"
                      >
                        {copiedId === resource.id ? <Check className="w-3.5 h-3.5 text-[#34C759]" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      {resource.type === 'video' && (
                        <a
                          href={resource.content}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-lg bg-white border border-black/[0.06] flex items-center justify-center text-[#86868B] hover:text-[#007AFF] hover:bg-[#007AFF]/5 transition-all"
                          title="打开视频"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg bg-white border border-black/[0.04] p-3">
                    {resource.type === 'video' && resource.content.startsWith('http') ? (
                      <video
                        src={resource.content}
                        controls
                        className="w-full rounded-lg max-h-[200px]"
                      />
                    ) : (
                      <div className="max-h-[160px] overflow-y-auto">
                        <MarkdownContent content={resource.content} />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {filtered.length === 0 && resources.length > 0 && (
          <div className="text-center py-10">
            <p className="text-[14px] text-[#86868B]">没有找到匹配的资源</p>
            <p className="text-[12px] text-[#C7C7CC] mt-1">尝试更换搜索词或筛选条件</p>
          </div>
        )}

        {resources.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-[#F5F5F7] flex items-center justify-center mx-auto mb-4">
              <Layers className="w-7 h-7 text-[#C7C7CC]" />
            </div>
            <p className="text-[14px] text-[#86868B] font-medium">暂无资源</p>
            <p className="text-[12px] text-[#C7C7CC] mt-1 max-w-[280px] mx-auto">
              完成账号定位、选题、文案创作等工作流后，相关资源将自动汇总到这里
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
