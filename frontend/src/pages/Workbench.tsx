import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { getWorkflowDef } from '@/types'
import { useProjectPipeline } from '@/hooks/useProjectPipeline'
import Sidebar from '@/components/Sidebar'

const API_BASE = import.meta.env.VITE_API_BASE || ''
import Breadcrumb from '@/components/Breadcrumb'
import DynamicInputs from '@/components/DynamicInputs'
import DynamicStyleSelector from '@/components/DynamicStyleSelector'
import DynamicAgentToggles from '@/components/DynamicAgentToggles'
import ScriptExpertPanel from '@/components/ScriptExpertPanel'
import VideoExpertChainPanel from '@/components/VideoExpertChainPanel'
import PrivateDomainExpertPanel from '@/components/PrivateDomainExpertPanel'
import ResourceManagementPanel from '@/components/ResourceManagementPanel'
import ChannelTaskPanel from '@/components/ChannelTaskPanel'
import VideoDeconstructPanel from '@/components/VideoDeconstructPanel'
import ViralFollowUpPanel from '@/components/ViralFollowUpPanel'
import GenerateButton from '@/components/GenerateButton'
import GenericResultPanel from '@/components/GenericResultPanel'
import PositioningPanel from '@/components/PositioningPanel'
import PositioningResult from '@/components/PositioningResult'
import CategoryPositioningPanel from '@/components/CategoryPositioningPanel'
import Toast from '@/components/Toast'
import { motion } from 'motion/react'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

const URL_TO_WORKFLOW: Record<string, string> = {
  '/': 'script',
  '/account-profile': 'positioning',
  '/category-positioning': 'category',
  '/topic-selection': 'topic',
  '/script-creation': 'script',
  '/video-production': 'video',
  '/video-deconstruct': 'videoDeconstruct',
  '/viral-follow-up': 'viralFollowUp',
  '/private-domain': 'private',
  '/market-analysis': 'market',
  '/boss-helper': 'boss',
  '/resource-management': 'resource',
  '/channel-task': 'channel',
}

function buildScriptText(sd: Record<string, unknown>): string {
  let body = (sd.body_content as string) || (sd.script as string) || ''
  if (!body) {
    const lines: string[] = []
    const titles = sd.titles
    if (Array.isArray(titles) && titles.length > 0) {
      lines.push('**标题：** ' + titles[0])
      lines.push('')
    }
    const hook = sd.hook
    if (typeof hook === 'string' && hook) {
      lines.push('**开场：** ' + hook)
      lines.push('')
    }
    const content = sd.content
    if (typeof content === 'string' && content) {
      lines.push('**正文：** ' + content)
      lines.push('')
    }
    const cta = sd.cta
    if (typeof cta === 'string' && cta) {
      lines.push('**结尾：** ' + cta)
      lines.push('')
    }
    const tags = sd.tags
    if (Array.isArray(tags) && tags.length > 0) {
      lines.push('**标签：** ' + tags.join(' '))
    }
    body = lines.join('\n')
  }
  return body
}

function extractTopicText(data: Record<string, unknown>): string {
  const lines: string[] = []
  if (data.recommended_topics && Array.isArray(data.recommended_topics)) {
    ;(data.recommended_topics as string[]).forEach((t, i) => lines.push(`${i + 1}. ${t}`))
  }
  if (data.trending_topics && Array.isArray(data.trending_topics)) {
    lines.push('【热点选题】')
    ;(data.trending_topics as string[]).forEach((t, i) => lines.push(`${i + 1}. ${t}`))
  }
  if (data.evergreen_topics && Array.isArray(data.evergreen_topics)) {
    lines.push('【常青选题】')
    ;(data.evergreen_topics as string[]).forEach((t, i) => lines.push(`${i + 1}. ${t}`))
  }
  if (data.selected_topic) lines.push(`【推荐选题】${String(data.selected_topic)}`)
  if (data.title_suggestions && Array.isArray(data.title_suggestions)) {
    lines.push('【标题建议】')
    ;(data.title_suggestions as string[]).forEach((t) => lines.push(`• ${t}`))
  }
  if (data.content_angles && Array.isArray(data.content_angles)) {
    lines.push('【内容角度】')
    ;(data.content_angles as string[]).forEach((t) => lines.push(`• ${t}`))
  }
  Object.entries(data).forEach(([k, v]) => {
    if (['recommended_topics', 'trending_topics', 'evergreen_topics', 'selected_topic', 'title_suggestions', 'content_angles'].includes(k)) return
    if (typeof v === 'string' && v.length > 10) {
      lines.push(`【${k.replace(/_/g, ' ')}】\n${v}`)
    } else if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'string') {
      lines.push(`【${k.replace(/_/g, ' ')}】`)
      ;(v as string[]).forEach((t) => lines.push(`• ${t}`))
    }
  })
  return lines.join('\n')
}

export default function Workbench() {
  const { activeWorkflow, setActiveWorkflow, setInputValue, setResult, showToast } = useAppStore()
  const location = useLocation()
  const navigate = useNavigate()
  const pipeline = useProjectPipeline()

  useEffect(() => {
    const targetWorkflow = URL_TO_WORKFLOW[location.pathname]
    if (targetWorkflow && targetWorkflow !== activeWorkflow) {
      setActiveWorkflow(targetWorkflow)
    }
  }, [location.pathname])

  useEffect(() => {
    if (!pipeline.projectId) {
      const initId = async () => {
        try {
          const res = await fetch(`${API_BASE}/api/v1/project/init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          })
          if (res.ok) {
            const json = await res.json()
            pipeline.setProjectId(json.project_id)
          }
        } catch { /* ignore */ }
      }
      initId()
    }
  }, [pipeline.projectId])

  useEffect(() => {
    if (activeWorkflow === 'topic' && pipeline.accountProfile) {
      const ap = pipeline.accountProfile as Record<string, unknown>
      const name = String(ap.own_account || ap.category_keyword || '')
      if (name) {
        setInputValue('keyword', name)
      }
    }
    if (activeWorkflow === 'script') {
      if (pipeline.selectedTopic) {
        const st = pipeline.selectedTopic as Record<string, unknown>
        const topicText = extractTopicText(st)
        if (topicText) setInputValue('topic', topicText)
      } else if (pipeline.scriptData) {
        const sd = pipeline.scriptData as Record<string, unknown>
        const body = (sd.body_content as string) || (sd.script as string) || ''
        if (body) setInputValue('topic', body)
      }
    }
    if (activeWorkflow === 'video' && pipeline.scriptData) {
      const sd = pipeline.scriptData as Record<string, unknown>
      const body = buildScriptText(sd)
      if (body) setInputValue('script', body)
    }
    if (activeWorkflow === 'private' && pipeline.accountProfile) {
      const ap = pipeline.accountProfile as Record<string, unknown>
      const parts: string[] = []
      const name = String(ap.own_account || ap.category_keyword || '')
      if (name) parts.push(name)
      if (ap.platform) parts.push(`平台：${String(ap.platform)}`)
      const ep = (ap.enterprise_project || {}) as Record<string, unknown>
      if (ep.niche_overview) parts.push(String(ep.niche_overview).slice(0, 60))
      const pa = (ap.persona_archivist || {}) as Record<string, unknown>
      if (pa.persona_features) parts.push(`人设：${String(pa.persona_features).slice(0, 50)}`)
      const pp = (ap.product_profiler || {}) as Record<string, unknown>
      if (pp.core_selling_points && Array.isArray(pp.core_selling_points)) {
        const top3 = (pp.core_selling_points as string[]).slice(0, 3).map((s) => s.split(/[——\-,，。；;]/)[0].slice(0, 15))
        parts.push(`卖点：${top3.join('、')}`)
      }
      if (ap.market_size) parts.push(String(ap.market_size).slice(0, 40))
      if (ap.competition_summary) parts.push(String(ap.competition_summary).slice(0, 40))
      if (ap.user_profile) parts.push(`用户：${String(ap.user_profile).slice(0, 40)}`)
      if (parts.length > 0) setInputValue('accountInfo', parts.join('\n'))
    }
    if (activeWorkflow === 'market' && pipeline.accountProfile) {
      const ap = pipeline.accountProfile as Record<string, unknown>
      if (ap.analysis_type === 'category') {
        setInputValue('dimension', String(ap.category_keyword || ''))
      }
    }
  }, [activeWorkflow, pipeline.scriptData, pipeline.accountProfile, pipeline.selectedTopic])

  useEffect(() => {
    if (activeWorkflow === 'boss' && pipeline.projectId) {
      const fetchReport = async () => {
        try {
          const res = await fetch(`${API_BASE}/api/v1/project/${pipeline.projectId}/context`)
          if (res.ok) {
            const json = await res.json()
            setResult({
              project_id: json.project_id,
              current_step: json.current_step,
              account_profile: json.account_profile,
              selected_topic: json.selected_topic,
              script_data: json.script_data,
              video_assets: json.video_assets,
              sections: [
                { title: '账号定位', content: JSON.stringify(json.account_profile, null, 2) },
                { title: '选题数据', content: JSON.stringify(json.selected_topic, null, 2) },
                { title: '文案产出', content: JSON.stringify(json.script_data, null, 2) },
                { title: '视频资产', content: JSON.stringify(json.video_assets, null, 2) },
              ],
            })
            showToast('全链路报告已加载', 'success')
          }
        } catch (err) {
          showToast('报告加载失败', 'error')
        }
      }
      fetchReport()
    }
  }, [activeWorkflow, pipeline.projectId])

  const handleGoNext = () => {
    const nextPath = pipeline.proceedToNext(activeWorkflow)
    if (nextPath) {
      navigate(nextPath)
      showToast('已进入下一步', 'success')
    }
  }

  const nextStep = pipeline.getNextStep(activeWorkflow)
  const isCurrentCompleted = pipeline.isStepCompleted(activeWorkflow)

  const wf = getWorkflowDef(activeWorkflow)
  if (!wf) return null

  if (activeWorkflow === 'positioning') {
    return (
      <div className="flex h-screen bg-[#F5F5F7]">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[860px] mx-auto px-4 md:px-8 py-6 md:py-8 pt-16 md:pt-8">
            <motion.div
              key="positioning"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <div className="mb-6">
                <Breadcrumb />
              </div>
              <PositioningPanel />
              <PositioningResult />
            </motion.div>
          </div>
        </main>
        <Toast />
      </div>
    )
  }

  if (activeWorkflow === 'category') {
    return (
      <div className="flex h-screen bg-[#F5F5F7]">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[860px] mx-auto px-4 md:px-8 py-6 md:py-8 pt-16 md:pt-8">
            <motion.div
              key="category"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <div className="mb-6">
                <Breadcrumb />
              </div>
              <CategoryPositioningPanel />
            </motion.div>
          </div>
        </main>
        <Toast />
      </div>
    )
  }

  if (activeWorkflow === 'market') {
    return (
      <div className="flex h-screen bg-[#F5F5F7]">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[860px] mx-auto px-4 md:px-8 py-6 md:py-8 pt-16 md:pt-8">
            <motion.div
              key="market"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <div className="mb-6">
                <Breadcrumb />
              </div>
              <div className="px-4 py-5 md:px-7 md:py-7 rounded-2xl bg-white border border-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-5 md:space-y-7">
                <DynamicInputs inputs={wf.inputs} />
                <DynamicStyleSelector
                  styles={wf.styles}
                  stepLabel="第一步"
                />
                <DynamicAgentToggles
                  agents={wf.agents}
                  stepLabel="第二步"
                />
                <GenerateButton />
              </div>
              <GenericResultPanel />
            </motion.div>
          </div>
        </main>
        <Toast />
      </div>
    )
  }

  const hasStyles = wf.styles.length > 0
  const stepLabels = ['第一步', '第二步', '第三步', '第四步']
  const styleStepIndex = wf.inputs.length
  const agentStepIndex = hasStyles ? styleStepIndex + 1 : styleStepIndex

  return (
    <div className="flex h-screen bg-[#F5F5F7]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[860px] mx-auto px-4 md:px-8 py-6 md:py-8 pt-16 md:pt-8">
          <motion.div
            key={activeWorkflow}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="mb-6">
              <Breadcrumb />
            </div>

            <div className="px-7 py-7 rounded-2xl bg-white border border-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-7">
              <DynamicInputs inputs={wf.inputs} />

              {hasStyles && (
                <DynamicStyleSelector
                  styles={wf.styles}
                  stepLabel={stepLabels[styleStepIndex]}
                />
              )}

              {activeWorkflow === 'script' ? (
                <ScriptExpertPanel />
              ) : activeWorkflow === 'video' ? (
                <VideoExpertChainPanel />
              ) : activeWorkflow === 'private' ? (
                <PrivateDomainExpertPanel />
              ) : activeWorkflow === 'videoDeconstruct' ? (
                <VideoDeconstructPanel />
              ) : activeWorkflow === 'viralFollowUp' ? (
                <ViralFollowUpPanel />
              ) : activeWorkflow === 'resource' ? (
                <ResourceManagementPanel />
              ) : activeWorkflow === 'channel' ? (
                <ChannelTaskPanel />
              ) : (
                <>
                  <DynamicAgentToggles
                    agents={wf.agents}
                    stepLabel={stepLabels[agentStepIndex]}
                  />
                  <GenerateButton />
                </>
              )}
            </div>

            <GenericResultPanel />

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
        </div>
      </main>
      <Toast />
    </div>
  )
}
