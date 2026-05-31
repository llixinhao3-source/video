import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useAppStore } from '@/store/useAppStore'
import { useProjectPipeline } from '@/hooks/useProjectPipeline'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Loader2, User, CheckCircle2, ArrowRight, Lightbulb, Hash, Check } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE || ''

type AnalysisMode = 'account' | 'keyword'
type Phase = 'input' | 'select' | 'deep-analyze' | 'done'

interface BenchmarkAccount {
  name: string
  followers: string
  content_style: string
  viral_type: string
  strengths: string
  weaknesses: string
}

export default function PositioningPanel() {
  const { isGenerating, setIsGenerating, setResult, result, showToast, setInputValue } = useAppStore()
  const pipeline = useProjectPipeline()
  const navigate = useNavigate()

  const [mode, setMode] = useState<AnalysisMode>('keyword')
  const [platform, setPlatform] = useState('小红书')
  const [ownAccount, setOwnAccount] = useState('')
  const [keyword, setKeyword] = useState('')
  const [phase, setPhase] = useState<Phase>('input')

  const [benchmarkAccounts, setBenchmarkAccounts] = useState<BenchmarkAccount[]>([])
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set())
  const [nicheOverview, setNicheOverview] = useState('')
  const [deepResult, setDeepResult] = useState<Record<string, unknown> | null>(null)

  const toggleSelect = (idx: number) => {
    setSelectedIndexes((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const handleGenerate = async () => {
    if (mode === 'account' && !ownAccount.trim()) {
      showToast('请输入账号名称', 'error')
      return
    }
    if (mode === 'keyword' && !keyword.trim()) {
      showToast('请输入行业关键词', 'error')
      return
    }

    setIsGenerating(true)
    setResult(null)
    setPhase('input')
    setDeepResult(null)
    setBenchmarkAccounts([])
    setSelectedIndexes(new Set())
    pipeline.clearDownstream()

    try {
      const body: Record<string, string> = { platform, mode }
      if (mode === 'account') {
        body.own_account = ownAccount
        body.keywords = `平台：${platform} | 账号：${ownAccount} | 请推荐对标账号并分析优缺点`
      } else {
        body.keyword = keyword
        body.keywords = `平台：${platform} | 行业关键词：${keyword}`
      }

      const response = await fetch(`${API_BASE}/api/v1/positioning/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => null)
        throw new Error(errData?.detail || `请求失败: ${response.status}`)
      }

      const json = await response.json()

      if (json.success && json.data) {
        setResult(json.data)
        pipeline.saveProfile({
          enterprise_project: json.data.enterprise_project,
          persona_archivist: json.data.persona_archivist,
          product_profiler: json.data.product_profiler,
          own_account: mode === 'account' ? ownAccount : keyword,
          platform,
        })
        pipeline.markStepCompleted('positioning')

        const ep = json.data.enterprise_project || {}
        const accounts = ep.benchmark_accounts || []
        if (Array.isArray(accounts) && accounts.length > 0) {
          setBenchmarkAccounts(accounts as BenchmarkAccount[])
          setNicheOverview(ep.niche_overview || '')
          setPhase('select')
          showToast('已推荐对标账号，请勾选后继续分析', 'success')
        } else {
          setPhase('done')
          showToast('分析完成！', 'success')
        }
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

  const handleDeepAnalyze = async () => {
    if (selectedIndexes.size === 0) {
      showToast('请至少勾选一个对标账号', 'error')
      return
    }

    setIsGenerating(true)
    setPhase('deep-analyze')

    const selectedAccounts = Array.from(selectedIndexes).map((i) => benchmarkAccounts[i])
    const accountName = mode === 'account' ? ownAccount : keyword

    try {
      const response = await fetch(`${API_BASE}/api/v1/positioning/deep-compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          own_account: accountName,
          platform,
          benchmark_accounts: selectedAccounts,
          niche_overview: nicheOverview,
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => null)
        throw new Error(errData?.detail || `请求失败: ${response.status}`)
      }

      const json = await response.json()

      if (json.success && json.data) {
        setDeepResult(json.data)
        setPhase('done')
        showToast('深度对比分析完成！', 'success')
      } else {
        throw new Error('生成结果异常')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '未知错误'
      showToast(message, 'error')
      setPhase('select')
    } finally {
      setIsGenerating(false)
    }
  }

  const buildAccountSummary = (): string => {
    const accountName = mode === 'account' ? ownAccount : keyword
    const lines: string[] = []

    lines.push(`【账号定位分析报告】`)
    lines.push(`账号/关键词：${accountName}`)
    lines.push(`目标平台：${platform}`)
    lines.push('')

    if (nicheOverview) {
      lines.push(`【赛道概况】`)
      lines.push(nicheOverview)
      lines.push('')
    }

    if (benchmarkAccounts.length > 0) {
      lines.push(`【对标账号】`)
      benchmarkAccounts.forEach((acc, i) => {
        lines.push(`${i + 1}. ${acc.name}（${acc.followers}）`)
        lines.push(`   内容风格：${acc.content_style}`)
        lines.push(`   优势：${acc.strengths}`)
        lines.push(`   劣势：${acc.weaknesses}`)
      })
      lines.push('')
    }

    if (deepResult) {
      const dr = deepResult
      if (dr.own_strengths && Array.isArray(dr.own_strengths)) {
        lines.push(`【我的优势】`)
        ;(dr.own_strengths as string[]).forEach((s) => lines.push(`• ${s}`))
        lines.push('')
      }
      if (dr.own_weaknesses && Array.isArray(dr.own_weaknesses)) {
        lines.push(`【我的不足】`)
        ;(dr.own_weaknesses as string[]).forEach((s) => lines.push(`• ${s}`))
        lines.push('')
      }
      if (dr.benchmark_advantages && Array.isArray(dr.benchmark_advantages)) {
        lines.push(`【对标账号值得学习的地方】`)
        ;(dr.benchmark_advantages as string[]).forEach((s) => lines.push(`• ${s}`))
        lines.push('')
      }
      if (dr.adoptable_strategies && Array.isArray(dr.adoptable_strategies)) {
        lines.push(`【可采纳策略】`)
        ;(dr.adoptable_strategies as string[]).forEach((s) => lines.push(`• ${s}`))
        lines.push('')
      }
      if (dr.action_plan) {
        lines.push(`【行动计划】`)
        lines.push(String(dr.action_plan))
      }
    }

    return lines.join('\n')
  }

  const handleNavigate = () => {
    const summary = buildAccountSummary()
    if (mode === 'keyword') {
      setInputValue('keyword', summary)
      pipeline.proceedToNext('positioning')
      navigate('/topic-selection')
    } else {
      setInputValue('accountInfo', summary)
      pipeline.proceedToNext('positioning')
      navigate('/private-domain')
    }
  }

  const canGenerate =
    mode === 'account' ? ownAccount.trim().length > 0 : keyword.trim().length > 0

  return (
    <div className="px-8 py-10 rounded-3xl bg-white border border-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#F5F5F7] mb-4">
          <span className="text-[28px]">💡</span>
        </div>
        <h2 className="text-[20px] font-semibold text-[#1D1D1F] tracking-tight">账号定位分析</h2>
        <p className="text-[14px] text-[#86868B] mt-2 max-w-[480px] mx-auto leading-relaxed">
          输入行业关键词或账号名称，AI 将推荐对标账号、分析优缺点并给出一步步实操指导
        </p>
      </div>

      <div className="max-w-[560px] mx-auto space-y-4">
        {/* Mode Toggle */}
        <div className="flex gap-2 p-1 bg-[#F5F5F7] rounded-xl">
          <button
            onClick={() => { setMode('keyword'); setPhase('input') }}
            className={`flex-1 h-[38px] rounded-lg text-[13px] font-medium transition-all duration-200 flex items-center justify-center gap-1.5 ${
              mode === 'keyword'
                ? 'bg-white text-[#1D1D1F] shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            行业关键词
          </button>
          <button
            onClick={() => { setMode('account'); setPhase('input') }}
            className={`flex-1 h-[38px] rounded-lg text-[13px] font-medium transition-all duration-200 flex items-center justify-center gap-1.5 ${
              mode === 'account'
                ? 'bg-white text-[#1D1D1F] shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            账号分析
          </button>
        </div>

        {/* Platform Selector */}
        <div className="flex gap-2">
          {['小红书', '抖音', '视频号', 'B站'].map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`flex-1 h-[40px] rounded-xl text-[13px] font-medium transition-all duration-200 ${
                platform === p
                  ? 'bg-[#1D1D1F] text-white'
                  : 'bg-[#FAFAFA] text-[#86868B] hover:bg-[#F5F5F7]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Phase: Input */}
        {phase === 'input' && (
          <AnimatePresence mode="wait">
            {mode === 'keyword' ? (
              <motion.div
                key="keyword"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="relative">
                  <Lightbulb className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#C7C7CC]" />
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="输入行业关键词，例如：游戏、美食、健身、穿搭"
                    className="w-full h-[52px] pl-12 pr-4 rounded-2xl border border-black/[0.06] bg-[#FAFAFA] text-[15px] text-[#1D1D1F] placeholder:text-[#C7C7CC] focus:outline-none focus:border-[#007AFF] focus:bg-white focus:ring-[3px] focus:ring-[#007AFF]/10 transition-all duration-200"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {['游戏', '美食', '健身', '穿搭', '数码', '旅行', '护肤', '宠物'].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setKeyword(tag)}
                      className={`h-[30px] px-3 rounded-lg text-[12px] font-medium transition-all duration-200 ${
                        keyword === tag
                          ? 'bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/20'
                          : 'bg-[#F5F5F7] text-[#86868B] hover:bg-[#EEEFF0] border border-transparent'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="account"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#C7C7CC]" />
                  <input
                    type="text"
                    value={ownAccount}
                    onChange={(e) => setOwnAccount(e.target.value)}
                    placeholder="你的账号名称，例如：铁先生"
                    className="w-full h-[52px] pl-12 pr-4 rounded-2xl border border-black/[0.06] bg-[#FAFAFA] text-[15px] text-[#1D1D1F] placeholder:text-[#C7C7CC] focus:outline-none focus:border-[#007AFF] focus:bg-white focus:ring-[3px] focus:ring-[#007AFF]/10 transition-all duration-200"
                  />
                </div>
                <p className="mt-2 text-[12px] text-[#86868B] px-1">
                  AI 将自动为你推荐对标账号并分析优缺点
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Phase: Select benchmark accounts */}
        {phase === 'select' && benchmarkAccounts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="rounded-xl bg-[#F0F5FF] border border-[#007AFF]/15 p-3.5">
              <p className="text-[13px] font-medium text-[#007AFF] mb-1">🎯 已为你推荐以下对标账号</p>
              <p className="text-[12px] text-[#86868B]">勾选你想深入对比的账号，然后点击"继续分析"</p>
            </div>

            {benchmarkAccounts.map((acc, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.08 }}
                onClick={() => toggleSelect(idx)}
                className={`rounded-xl border p-4 cursor-pointer transition-all duration-200 ${
                  selectedIndexes.has(idx)
                    ? 'border-[#007AFF] bg-[#007AFF]/[0.03] shadow-[0_0_0_1px_#007AFF]'
                    : 'border-black/[0.06] bg-[#FAFAFA] hover:border-black/[0.12] hover:bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-[20px] h-[20px] rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                    selectedIndexes.has(idx)
                      ? 'bg-[#007AFF] border-[#007AFF]'
                      : 'border-[#C7C7CC] bg-white'
                  }`}>
                    {selectedIndexes.has(idx) && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[14px] font-semibold text-[#1D1D1F]">{acc.name}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F5F5F7] text-[#86868B]">{acc.followers}</span>
                    </div>
                    <p className="text-[12px] text-[#86868B] leading-relaxed mb-2">{acc.content_style}</p>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <p className="text-[10px] text-[#34C759] font-medium mb-0.5">✅ 优势</p>
                        <p className="text-[11px] text-[#1D1D1F] leading-relaxed line-clamp-2">{acc.strengths}</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-[#FF3B30] font-medium mb-0.5">⚠️ 劣势</p>
                        <p className="text-[11px] text-[#1D1D1F] leading-relaxed line-clamp-2">{acc.weaknesses}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setPhase('input'); setBenchmarkAccounts([]); setSelectedIndexes(new Set()) }}
                className="flex-1 h-[48px] rounded-2xl bg-[#F5F5F7] text-[#86868B] text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-[#EEEFF0] active:scale-[0.98] transition-all duration-200"
              >
                重新输入
              </button>
              <button
                onClick={handleDeepAnalyze}
                disabled={selectedIndexes.size === 0}
                className={`flex-[2] h-[48px] rounded-2xl text-[14px] font-medium flex items-center justify-center gap-2 transition-all duration-200 ${
                  selectedIndexes.size === 0
                    ? 'bg-[#007AFF]/30 text-white/60 cursor-not-allowed'
                    : 'bg-[#007AFF] text-white hover:bg-[#0066DD] active:scale-[0.98]'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                继续分析（已选 {selectedIndexes.size} 个）
              </button>
            </div>
          </motion.div>
        )}

        {/* Phase: Deep analyzing */}
        {phase === 'deep-analyze' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-8"
          >
            <Loader2 className="w-8 h-8 text-[#007AFF] animate-spin mb-4" />
            <p className="text-[14px] text-[#1D1D1F] font-medium">正在深度对比分析...</p>
            <p className="text-[12px] text-[#86868B] mt-1">分析你的账号与对标账号的优缺点及可采纳策略</p>
          </motion.div>
        )}

        {/* Phase: Done */}
        {phase === 'done' && deepResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="rounded-2xl bg-[#F0FFF4] border border-[#34C759]/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
                <span className="text-[13px] font-medium text-[#1D1D1F]">深度对比分析完成</span>
              </div>
              <p className="text-[12px] text-[#86868B]">
                已完成你与对标账号的优缺点对比分析，包含可采纳策略
              </p>
            </div>

            {Object.entries(deepResult).map(([key, value]) => (
              <div key={key} className="rounded-xl bg-[#FAFAFA] border border-black/[0.04] p-4">
                <p className="text-[11px] text-[#86868B] font-medium mb-2 tracking-wide">
                  {key === 'own_strengths' ? '💪 你的优势' :
                   key === 'own_weaknesses' ? '⚠️ 你的不足' :
                   key === 'benchmark_advantages' ? '🎯 对标账号值得学习的地方' :
                   key === 'adoptable_strategies' ? '📋 可采纳策略' :
                   key === 'action_plan' ? '🚀 行动计划' :
                   key.replace(/_/g, ' ')}
                </p>
                {Array.isArray(value) ? (
                  <div className="space-y-2">
                    {(value as string[]).map((item, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-[#007AFF] flex-shrink-0" />
                        <p className="text-[13px] text-[#1D1D1F] leading-relaxed">{item}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-[#1D1D1F] leading-[1.8]">{String(value)}</p>
                )}
              </div>
            ))}

            <button
              onClick={handleNavigate}
              className="w-full h-[48px] rounded-2xl bg-[#007AFF] text-white text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-[#0066DD] active:scale-[0.98] transition-all duration-200"
            >
              <CheckCircle2 className="w-4 h-4" />
              采纳分析结果，进入 {mode === 'keyword' ? '🎬 短视频选题' : '👥 私域运营'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Phase: Done without deep result (no benchmark accounts found) */}
        {phase === 'done' && !deepResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="rounded-2xl bg-[#F0FFF4] border border-[#34C759]/20 p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
                <span className="text-[13px] font-medium text-[#1D1D1F]">分析完成</span>
              </div>
              <p className="text-[12px] text-[#86868B]">已生成定位分析报告</p>
            </div>
            <button
              onClick={handleNavigate}
              className="w-full h-[48px] rounded-2xl bg-[#007AFF] text-white text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-[#0066DD] active:scale-[0.98] transition-all duration-200"
            >
              <CheckCircle2 className="w-4 h-4" />
              采纳分析结果，进入 {mode === 'keyword' ? '🎬 短视频选题' : '👥 私域运营'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Generate button (only in input phase) */}
        {phase === 'input' && (
          <motion.button
            onClick={handleGenerate}
            disabled={isGenerating || !canGenerate}
            className={`w-full h-[52px] rounded-2xl text-[15px] font-medium text-white flex items-center justify-center gap-2.5 transition-all duration-300 ${
              isGenerating
                ? 'bg-[#1D1D1F]/70 cursor-not-allowed'
                : !canGenerate
                ? 'bg-[#1D1D1F]/30 cursor-not-allowed'
                : 'bg-[#1D1D1F] hover:bg-[#333338] active:scale-[0.985]'
            }`}
            whileTap={!isGenerating && canGenerate ? { scale: 0.985 } : undefined}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>AI 分析中...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>{mode === 'keyword' ? '分析行业定位' : '分析账号定位'}</span>
              </>
            )}
          </motion.button>
        )}
      </div>
    </div>
  )
}
