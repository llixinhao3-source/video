import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
    FileText, FileOutput, Play, Loader2, CheckCircle2, ChevronDown, ChevronUp,
    Copy, Check, Lightbulb, Sparkles, ArrowRight, Film,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useProjectPipeline } from '@/hooks/useProjectPipeline'
import { useNavigate } from 'react-router-dom'
import type { AgentDef } from '@/types'

const API_BASE = import.meta.env.VITE_API_BASE || ''

interface ExpertChainDef {
    key: string
    label: string
    desc: string
    emoji: string
    sourceFile: string
    targetFile: string
    color: string
}

const SCRIPT_EXPERTS: ExpertChainDef[] = [
    {
        key: 'framework', label: '智能跟创', desc: '根据选题生成文案初稿',
        emoji: '📝', sourceFile: '0_选题方向.md', targetFile: '1_文案初稿.md',
        color: '#007AFF',
    },
    {
        key: 'titleGenerator', label: '标题生成师', desc: '生成 5 个爆款标题',
        emoji: '🔥', sourceFile: '1_文案初稿.md', targetFile: '2_爆款标题.md',
        color: '#FF9500',
    },
    {
        key: 'hookDesigner', label: '钩子设计师', desc: '设计黄金 3 秒开头',
        emoji: '🪝', sourceFile: '1_文案初稿.md', targetFile: '3_黄金钩子.md',
        color: '#FF3B30',
    },
    {
        key: 'textRewriter', label: '文本改写师', desc: '口语化改写，适合口播',
        emoji: '💬', sourceFile: '1_文案初稿.md', targetFile: '4_口语化文案.md',
        color: '#34C759',
    },
    {
        key: 'sellingPoint', label: '卖点策划师', desc: '植入产品痛点与卖点',
        emoji: '💎', sourceFile: '1_文案初稿.md', targetFile: '5_卖点植入.md',
        color: '#5856D6',
    },
    {
        key: 'riskControl', label: '违禁词风控员', desc: '审查替换敏感极限词',
        emoji: '🛡️', sourceFile: '1_文案初稿.md', targetFile: '6_合规版文案.md',
        color: '#AF52DE',
    },
    {
        key: 'marketingCopy', label: '营销文案助手', desc: '追加引导语和话题标签',
        emoji: '🏷️', sourceFile: '6_合规版文案.md', targetFile: '7_终稿带标签.md',
        color: '#FF6B6B',
    },
]

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

function MarkdownContent({ content }: { content: string }) {
    const html = content
        .replace(/^### (.*$)/gim, '<h3 class="text-[15px] font-bold text-[#1D1D1F] mt-5 mb-2.5 pb-1.5 border-b border-slate-100">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 class="text-[16px] font-bold text-[#1D1D1F] mt-6 mb-3 pb-2 border-b border-slate-100">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 class="text-[18px] font-bold text-[#1D1D1F] mt-6 mb-3 pb-2 border-b border-slate-100">$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-[#1D1D1F]">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="italic text-[#555]">$1</em>')
        .replace(/^\* (.*$)/gim, '<li class="flex items-start gap-2 text-[13.5px] text-[#333] leading-[1.8] mb-1"><span class="mt-2 w-1.5 h-1.5 rounded-full bg-[#007AFF] flex-shrink-0"></span><span>$1</span></li>')
        .replace(/^- (.*$)/gim, '<li class="flex items-start gap-2 text-[13.5px] text-[#333] leading-[1.8] mb-1"><span class="mt-2 w-1.5 h-1.5 rounded-full bg-[#007AFF] flex-shrink-0"></span><span>$1</span></li>')
        .replace(/^\d+\. (.*$)/gim, '<li class="flex items-start gap-2 text-[13.5px] text-[#333] leading-[1.8] mb-1"><span class="mt-0.5 w-5 h-5 rounded-md bg-[#007AFF]/10 text-[#007AFF] text-[11px] font-medium flex items-center justify-center flex-shrink-0">#</span><span>$1</span></li>')
        .replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 rounded-md bg-[#F5F5F7] text-[12px] font-mono text-[#007AFF]">$1</code>')
        .replace(/---/g, '<hr class="my-4 border-t border-slate-100" />')
        .replace(/\n\n/g, '</p><p class="text-[13.5px] text-[#333] leading-[1.8] mb-3">')
        .replace(/\n/g, ' ')

    const wrapped = `<div class="markdown-body"><p class="text-[13.5px] text-[#333] leading-[1.8] mb-3">${html}</p></div>`

    return <div dangerouslySetInnerHTML={{ __html: wrapped }} />
}

export default function ScriptExpertPanel() {
    const { inputValues, showToast } = useAppStore()
    const pipeline = useProjectPipeline()
    const navigate = useNavigate()

    const [runningKey, setRunningKey] = useState<string | null>(null)
    const [results, setResults] = useState<Record<string, string>>({})
    const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({})
    const [customInstructions, setCustomInstructions] = useState<Record<string, string>>({})

    const toggleExpand = (key: string) => {
        setExpandedCards((prev) => ({ ...prev, [key]: !prev[key] }))
    }

    const runExpert = async (expert: ExpertChainDef) => {
        let pid = pipeline.projectId
        if (!pid) {
            try {
                const res = await fetch(`${API_BASE}/api/v1/project/init`, {
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
        if (!pid) {
            showToast('项目未初始化，请先完成账号定位', 'error')
            return
        }

        setRunningKey(expert.key)
        try {
            const topicText = inputValues.topic || ''
            const customInst = customInstructions[expert.key] || ''

            const body: Record<string, unknown> = {
                project_id: pid,
                agent_key: expert.key,
            }

            if (expert.key === 'framework') {
                body.user_custom_instruction = topicText + (customInst ? `\n\n额外指令：${customInst}` : '')
            } else {
                body.user_custom_instruction = customInst || '请根据源文件内容进行处理'
            }

            const res = await fetch(`${API_BASE}/api/v1/pipeline/run-expert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })

            if (!res.ok) {
                const errData = await res.json().catch(() => null)
                throw new Error(errData?.detail || `请求失败: ${res.status}`)
            }

            const json = await res.json()
            const output = json.output || ''

            setResults((prev) => ({ ...prev, [expert.key]: output }))
            setExpandedCards((prev) => ({ ...prev, [expert.key]: true }))
            pipeline.markStepCompleted('script')
            showToast(`${expert.label} 运行完成 → ${expert.targetFile}`, 'success')

        } catch (err) {
            const msg = err instanceof Error ? err.message : '运行失败'
            showToast(msg, 'error')
        } finally {
            setRunningKey(null)
        }
    }

    return (
        <div>
            <label className="flex items-center gap-2 text-[13px] font-medium text-[#1D1D1F] mb-3">
                <Sparkles className="w-4 h-4 text-[#86868B]" />
                第三步：定制专家链（文件级流转）
            </label>

            <div className="space-y-2.5">
                {SCRIPT_EXPERTS.map((expert) => {
                    const isRunning = runningKey === expert.key
                    const hasResult = !!results[expert.key]
                    const isExpanded = expandedCards[expert.key]

                    return (
                        <motion.div
                            key={expert.key}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25 }}
                            className={`rounded-2xl border transition-all duration-200 ${
                                isRunning
                                    ? 'border-[#007AFF]/30 bg-[#007AFF]/3'
                                    : hasResult
                                    ? 'border-[#34C759]/20 bg-[#F0FFF4]/50'
                                    : 'border-black/[0.06] bg-[#F5F5F7]'
                            }`}
                        >
                            {/* card header */}
                            <div className="flex items-center gap-3 px-4 py-3.5">
                                <div
                                    className="w-9 h-9 rounded-xl flex items-center justify-center text-[16px] flex-shrink-0"
                                    style={{ backgroundColor: `${expert.color}15` }}
                                >
                                    {expert.emoji}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[13px] font-semibold text-[#1D1D1F]">
                                            {expert.label}
                                        </span>
                                        {hasResult && (
                                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#34C759]/15 text-[10px] text-[#34C759] font-medium">
                                                <CheckCircle2 className="w-2.5 h-2.5" /> 已完成
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[11px] text-[#86868B]">{expert.desc}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {hasResult && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    pipeline.saveScript({ body_content: results[expert.key] }, false)
                                                    navigate('/video-production')
                                                }}
                                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#FF3B30] text-white text-[11px] font-medium hover:bg-[#E6352B] active:scale-[0.97] transition-all duration-200"
                                            >
                                                <Film className="w-3 h-3" />
                                                生成视频
                                            </button>
                                            <button
                                                onClick={() => toggleExpand(expert.key)}
                                                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] hover:bg-white/60 transition-colors"
                                            >
                                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                            </button>
                                        </>
                                    )}
                                    <button
                                        onClick={() => runExpert(expert)}
                                        disabled={isRunning}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all duration-200 ${
                                            isRunning
                                                ? 'bg-[#007AFF]/10 text-[#007AFF] cursor-not-allowed'
                                                : hasResult
                                                ? 'bg-white text-[#34C759] border border-[#34C759]/20 hover:bg-[#34C759]/5'
                                                : 'bg-[#1D1D1F] text-white hover:bg-[#333338] active:scale-[0.97]'
                                        }`}
                                    >
                                        {isRunning ? (
                                            <><Loader2 className="w-3 h-3 animate-spin" /> 运行中</>
                                        ) : (
                                            <><Play className="w-3 h-3" /> 运行</>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* file chain indicator */}
                            <div className="flex items-center gap-2 px-4 pb-3">
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/70 border border-black/[0.04] text-[10px] text-[#86868B]">
                                    <FileText className="w-3 h-3" />
                                    {expert.sourceFile}
                                </div>
                                <span className="text-[10px] text-[#C7C7CC]">→</span>
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/70 border border-black/[0.04] text-[10px] text-[#007AFF] font-medium">
                                    <FileOutput className="w-3 h-3" />
                                    {expert.targetFile}
                                </div>
                            </div>

                            {/* custom instruction input */}
                            <div className="px-4 pb-3">
                                <input
                                    type="text"
                                    value={customInstructions[expert.key] || ''}
                                    onChange={(e) => setCustomInstructions((prev) => ({ ...prev, [expert.key]: e.target.value }))}
                                    placeholder={expert.key === 'framework' ? '已自动使用左侧输入框的选题内容' : `给 ${expert.label} 的补充指令（可选）...`}
                                    disabled={isRunning}
                                    className="w-full h-[34px] px-3 rounded-xl border border-black/[0.04] bg-white/60 text-[12px] text-[#1D1D1F] placeholder:text-[#C7C7CC] outline-none focus:border-[#007AFF]/30 focus:bg-white transition-all duration-200"
                                />
                            </div>

                            {/* expanded result preview */}
                            <AnimatePresence>
                                {isExpanded && hasResult && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-4 pb-4 pt-1">
                                            <div className="relative rounded-xl bg-white border border-black/[0.04] overflow-hidden">
                                                <div className="flex items-center justify-between px-3 py-2 bg-[#FAFAFA] border-b border-black/[0.04]">
                                                    <span className="text-[11px] text-[#86868B] font-medium">
                                                        {expert.targetFile} — 最新输出预览
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <CopyBtn text={results[expert.key]} />
                                                    </div>
                                                </div>
                                                <div className="p-4 max-h-[280px] overflow-y-auto">
                                                    <MarkdownContent content={results[expert.key]} />
                                                </div>
                                                {/* Generate Video from this script */}
                                                <div className="px-3 py-2.5 bg-[#FAFAFA] border-t border-black/[0.04] flex items-center justify-between">
                                                    <span className="text-[11px] text-[#86868B]">基于当前文案直接生成视频</span>
                                                    <button
                                                        onClick={() => {
                                                            pipeline.saveScript({ body_content: results[expert.key] }, false)
                                                            navigate('/video-production')
                                                        }}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1D1D1F] text-white text-[11px] font-medium hover:bg-[#333338] active:scale-[0.97] transition-all duration-200"
                                                    >
                                                        <Film className="w-3 h-3" />
                                                        生成视频
                                                    </button>
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
        </div>
    )
}
