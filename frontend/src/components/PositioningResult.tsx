import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useAppStore } from '@/store/useAppStore'
import { CheckCircle2, Copy, Check, Building2, UserCircle, Package } from 'lucide-react'

type TabKey = 'enterprise' | 'persona' | 'product'

const TABS_ACCOUNT: { key: TabKey; label: string; emoji: string; icon: typeof Building2 }[] = [
  { key: 'enterprise', label: '企业立项', emoji: '🏢', icon: Building2 },
  { key: 'persona', label: '人设档案', emoji: '🎭', icon: UserCircle },
  { key: 'product', label: '产品档案', emoji: '📦', icon: Package },
]

const TABS_KEYWORD: { key: TabKey; label: string; emoji: string; icon: typeof Building2 }[] = [
  { key: 'enterprise', label: '赛道分析', emoji: '🎯', icon: Building2 },
  { key: 'persona', label: '人设方案', emoji: '🎭', icon: UserCircle },
  { key: 'product', label: '内容策略', emoji: '📋', icon: Package },
]

const FIELD_LABELS: Record<string, string> = {
  brand_core_value: '品牌核心价值',
  company_goals: '企业目标与愿景',
  business_scope: '业务范围与产品线',
  target_market: '目标市场分析',
  persona_features: '人格化特征',
  language_style: '语言风格与口头禅',
  visual_identity: '视觉形象包装',
  emotional_connection: '情感连接点',
  core_selling_points: '核心卖点',
  usage_scenarios: '使用场景',
  differentiation_advantages: '差异化优势',
  user_demand_matching: '需求匹配方案',
  niche_overview: '赛道概况',
  benchmark_accounts: '对标账号推荐',
  adoptable_strategies: '可采纳策略',
  action_roadmap: '30天行动路线图',
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors duration-200"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-[#34C759]" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? '已复制' : '复制'}
    </button>
  )
}

function FieldBlock({ label, value }: { label: string; value: unknown }) {
  if (!value) return null
  return (
    <div className="px-4 py-4 rounded-xl bg-[#FAFAFA] border border-black/[0.04]">
      <p className="text-[11px] text-[#86868B] font-medium mb-2 tracking-wide">{label}</p>
      {Array.isArray(value) ? (
        <div className="space-y-3">
          {(value as (string | Record<string, unknown>)[]).map((item, i) => (
            <div key={i} className="rounded-lg bg-white border border-black/[0.04] p-3">
              {typeof item === 'string' ? (
                <div className="flex items-start gap-2.5">
                  <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-[#007AFF] flex-shrink-0" />
                  <p className="text-[13.5px] text-[#1D1D1F] leading-relaxed">{item}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(item as Record<string, unknown>).map(([k, v]) => (
                    <div key={k} className="flex items-start gap-2">
                      <span className="mt-[6px] w-1.5 h-1.5 rounded-full bg-[#007AFF] flex-shrink-0" />
                      <div>
                        <span className="text-[11px] text-[#86868B] font-medium">{FIELD_LABELS[k] || k.replace(/_/g, ' ')}：</span>
                        <span className="text-[13px] text-[#1D1D1F] leading-relaxed">{String(v)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[13.5px] text-[#1D1D1F] leading-[1.8]">{String(value)}</p>
      )}
    </div>
  )
}

export default function PositioningResult() {
  const { result } = useAppStore()
  const [activeTab, setActiveTab] = useState<TabKey>('enterprise')

  if (!result) return null

  const data = result as Record<string, unknown>
  const enterprise = (data.enterprise_project || {}) as Record<string, unknown>
  const persona = (data.persona_archivist || {}) as Record<string, unknown>
  const product = (data.product_profiler || {}) as Record<string, unknown>

  const isKeywordMode = 'niche_overview' in enterprise || 'benchmark_accounts' in enterprise
  const TABS = isKeywordMode ? TABS_KEYWORD : TABS_ACCOUNT

  const tabData: Record<TabKey, Record<string, unknown>> = { enterprise, persona, product }

  const allText = [
    ...Object.values(enterprise).map(String),
    ...Object.values(persona).map(String),
    ...Object.values(product).map(v => Array.isArray(v) ? (v as string[]).join(' ') : String(v)),
  ].join('\n')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="mt-6 space-y-5"
    >
      <div className="flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-[#F0FFF4] border border-[#34C759]/15">
        <CheckCircle2 className="w-4.5 h-4.5 text-[#34C759] flex-shrink-0" />
        <p className="text-[13px] text-[#1D1D1F]">
          <span className="font-medium text-[#34C759]">✅ 品牌定位全案已成功写入</span>本地 Obsidian 库 ＆ 飞书多维表格
          {data.obsidian_path && (
            <span className="ml-1 text-[#86868B]">
              （{String(data.obsidian_path).split('/').pop()}）
            </span>
          )}
        </p>
      </div>

      <div className="px-1 pt-1 rounded-2xl bg-white/70 backdrop-blur-md border border-black/[0.04]">
        <div className="flex border-b border-black/[0.04]">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="relative flex-1 flex items-center justify-center gap-2 py-3.5 text-[13.5px] transition-colors duration-200"
              >
                {activeTab === tab.key && (
                  <motion.div
                    layoutId="positioning-tab-indicator"
                    className="absolute bottom-0 left-[12%] right-[12%] h-[2.5px] rounded-full bg-[#1D1D1F]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon className={`w-4 h-4 ${activeTab === tab.key ? 'text-[#1D1D1F]' : 'text-[#86868B]'}`} />
                <span className={activeTab === tab.key ? 'text-[#1D1D1F] font-medium' : 'text-[#86868B]'}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-[#1D1D1F]">
                {TABS.find((t) => t.key === activeTab)?.emoji} {TABS.find((t) => t.key === activeTab)?.label}
              </h3>
              <CopyButton text={allText} />
            </div>

            {Object.entries(tabData[activeTab]).map(([key, value]) => (
              <FieldBlock
                key={key}
                label={FIELD_LABELS[key] || key.replace(/_/g, ' ')}
                value={value}
              />
            ))}

            {Object.keys(tabData[activeTab]).length === 0 && (
              <div className="py-8 text-center text-[13px] text-[#86868B]">
                该模块暂无数据
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
