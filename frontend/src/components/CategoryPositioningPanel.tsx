import { useState } from 'react'
import { motion } from 'motion/react'
import { useAppStore } from '@/store/useAppStore'
import { useProjectPipeline } from '@/hooks/useProjectPipeline'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Loader2, Search, CheckCircle2, ArrowRight } from 'lucide-react'

import { getApiBase } from '@/lib/apiBase'

export default function CategoryPositioningPanel() {
  const { isGenerating, setIsGenerating, setResult, result, showToast, setInputValue } = useAppStore()
  const pipeline = useProjectPipeline()
  const navigate = useNavigate()

  const [categoryKeyword, setCategoryKeyword] = useState('')

  const handleGenerate = async () => {
    if (!categoryKeyword.trim()) {
      showToast('请输入品类关键词', 'error')
      return
    }

    setIsGenerating(true)
    setResult(null)

    try {
      const response = await fetch(`${getApiBase()}/api/v1/positioning/category`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: categoryKeyword }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => null)
        throw new Error(errData?.detail || `请求失败: ${response.status}`)
      }

      const json = await response.json()

      if (json.success && json.data) {
        setResult(json.data)
        pipeline.saveProfile({
          ...json.data,
          category_keyword: categoryKeyword,
          analysis_type: 'category',
        })
        pipeline.markStepCompleted('category')
        showToast('品类分析完成！请查看结果并决定是否采纳', 'success')
      } else {
        throw new Error('生成结果异常')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '未知错误'
      showToast(message, 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAdoptAndNavigate = () => {
    if (!result) return
    const summary = buildCategorySummary(result as Record<string, unknown>, categoryKeyword)
    setInputValue('dimension', summary)
    pipeline.proceedToNext('category')
    navigate('/market-analysis')
  }

  return (
    <div className="px-8 py-10 rounded-3xl bg-white border border-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#F5F5F7] mb-4">
          <span className="text-[28px]">🔍</span>
        </div>
        <h2 className="text-[20px] font-semibold text-[#1D1D1F] tracking-tight">品类定位分析</h2>
        <p className="text-[14px] text-[#86868B] mt-2 max-w-[480px] mx-auto leading-relaxed">
          输入品类关键词，AI 将分析市场规模、竞争格局、用户画像，并给出市场策略建议
        </p>
      </div>

      <div className="max-w-[560px] mx-auto space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#C7C7CC]" />
          <input
            type="text"
            value={categoryKeyword}
            onChange={(e) => setCategoryKeyword(e.target.value)}
            placeholder="输入品类关键词，例如：咖啡、新能源汽车、AI工具、母婴用品"
            className="w-full h-[52px] pl-12 pr-4 rounded-2xl border border-black/[0.06] bg-[#FAFAFA] text-[15px] text-[#1D1D1F] placeholder:text-[#C7C7CC] focus:outline-none focus:border-[#007AFF] focus:bg-white focus:ring-[3px] focus:ring-[#007AFF]/10 transition-all duration-200"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {['咖啡', '新能源汽车', 'AI工具', '母婴', '美妆', '宠物', '零食', '家居'].map((tag) => (
            <button
              key={tag}
              onClick={() => setCategoryKeyword(tag)}
              className={`h-[30px] px-3 rounded-lg text-[12px] font-medium transition-all duration-200 ${
                categoryKeyword === tag
                  ? 'bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/20'
                  : 'bg-[#F5F5F7] text-[#86868B] hover:bg-[#EEEFF0] border border-transparent'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {!result && (
          <motion.button
            onClick={handleGenerate}
            disabled={isGenerating || !categoryKeyword.trim()}
            className={`w-full h-[52px] rounded-2xl text-[15px] font-medium text-white flex items-center justify-center gap-2.5 transition-all duration-300 ${
              isGenerating
                ? 'bg-[#1D1D1F]/70 cursor-not-allowed'
                : !categoryKeyword.trim()
                ? 'bg-[#1D1D1F]/30 cursor-not-allowed'
                : 'bg-[#1D1D1F] hover:bg-[#333338] active:scale-[0.985]'
            }`}
            whileTap={!isGenerating && categoryKeyword.trim() ? { scale: 0.985 } : undefined}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>AI 分析中...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>分析品类定位</span>
              </>
            )}
          </motion.button>
        )}

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="rounded-2xl bg-[#F0FFF4] border border-[#34C759]/20 p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
                <span className="text-[13px] font-medium text-[#1D1D1F]">品类分析完成</span>
              </div>
              <p className="text-[12px] text-[#86868B]">已生成品类定位报告，请查看后决定是否采纳</p>
            </div>

            {(result as Record<string, unknown>).market_size && (
              <div className="rounded-xl bg-[#FAFAFA] border border-black/[0.04] p-4">
                <p className="text-[11px] text-[#86868B] font-medium mb-1">市场规模</p>
                <p className="text-[13px] text-[#1D1D1F]">{(result as Record<string, unknown>).market_size as string}</p>
              </div>
            )}
            {(result as Record<string, unknown>).competition_summary && (
              <div className="rounded-xl bg-[#FAFAFA] border border-black/[0.04] p-4">
                <p className="text-[11px] text-[#86868B] font-medium mb-1">竞争格局</p>
                <p className="text-[13px] text-[#1D1D1F]">{(result as Record<string, unknown>).competition_summary as string}</p>
              </div>
            )}
            {(result as Record<string, unknown>).user_profile && (
              <div className="rounded-xl bg-[#FAFAFA] border border-black/[0.04] p-4">
                <p className="text-[11px] text-[#86868B] font-medium mb-1">用户画像</p>
                <p className="text-[13px] text-[#1D1D1F]">{(result as Record<string, unknown>).user_profile as string}</p>
              </div>
            )}
            {(result as Record<string, unknown>).trend_analysis && (
              <div className="rounded-xl bg-[#FAFAFA] border border-black/[0.04] p-4">
                <p className="text-[11px] text-[#86868B] font-medium mb-1">趋势分析</p>
                <p className="text-[13px] text-[#1D1D1F]">{(result as Record<string, unknown>).trend_analysis as string}</p>
              </div>
            )}
            {(result as Record<string, unknown>).strategy_suggestions && Array.isArray((result as Record<string, unknown>).strategy_suggestions) && (
              <div className="rounded-xl bg-[#FAFAFA] border border-black/[0.04] p-4">
                <p className="text-[11px] text-[#86868B] font-medium mb-2">策略建议</p>
                <div className="space-y-2">
                  {((result as Record<string, unknown>).strategy_suggestions as string[]).map((s, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#007AFF] flex-shrink-0" />
                      <p className="text-[13px] text-[#1D1D1F] leading-relaxed">{s}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(result as Record<string, unknown>).opportunity_points && Array.isArray((result as Record<string, unknown>).opportunity_points) && (
              <div className="rounded-xl bg-[#FAFAFA] border border-black/[0.04] p-4">
                <p className="text-[11px] text-[#86868B] font-medium mb-2">机会点</p>
                <div className="space-y-2">
                  {((result as Record<string, unknown>).opportunity_points as string[]).map((s, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#34C759] flex-shrink-0" />
                      <p className="text-[13px] text-[#1D1D1F] leading-relaxed">{s}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleAdoptAndNavigate}
              className="w-full h-[48px] rounded-2xl bg-[#007AFF] text-white text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-[#0066DD] active:scale-[0.98] transition-all duration-200"
            >
              <CheckCircle2 className="w-4 h-4" />
              采纳分析结果，进入 📊 市场分析
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}

function buildCategorySummary(data: Record<string, unknown>, keyword: string): string {
  const lines: string[] = []
  lines.push(`【品类定位分析报告】`)
  lines.push(`品类关键词：${keyword}`)
  lines.push('')

  if (data.market_size) {
    lines.push(`【市场规模】`)
    lines.push(String(data.market_size))
    lines.push('')
  }
  if (data.competition_summary) {
    lines.push(`【竞争格局】`)
    lines.push(String(data.competition_summary))
    lines.push('')
  }
  if (data.user_profile) {
    lines.push(`【用户画像】`)
    lines.push(String(data.user_profile))
    lines.push('')
  }
  if (data.trend_analysis) {
    lines.push(`【趋势分析】`)
    lines.push(String(data.trend_analysis))
    lines.push('')
  }
  if (data.strategy_suggestions && Array.isArray(data.strategy_suggestions)) {
    lines.push(`【策略建议】`)
    ;(data.strategy_suggestions as string[]).forEach((s) => lines.push(`• ${s}`))
    lines.push('')
  }
  if (data.opportunity_points && Array.isArray(data.opportunity_points)) {
    lines.push(`【机会点】`)
    ;(data.opportunity_points as string[]).forEach((s) => lines.push(`• ${s}`))
  }

  return lines.join('\n')
}
