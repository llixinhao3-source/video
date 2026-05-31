import { useAppStore } from '@/store/useAppStore'
import { WORKFLOWS } from '@/types'
import { Film, CheckCircle2, Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useProjectPipeline, SOP_FLOW, VIDEO_TOOLS_FLOW, AUX_FLOW } from '@/hooks/useProjectPipeline'
import { useState, useEffect } from 'react'

const WORKFLOW_ID_TO_PATH: Record<string, string> = {
  positioning: '/account-profile',
  category: '/category-positioning',
  topic: '/topic-selection',
  script: '/script-creation',
  video: '/video-production',
  videoDeconstruct: '/video-deconstruct',
  viralFollowUp: '/viral-follow-up',
  private: '/private-domain',
  market: '/market-analysis',
  boss: '/boss-helper',
  resource: '/resource-management',
  channel: '/channel-task',
}

export default function Sidebar() {
  const { activeWorkflow, setActiveWorkflow } = useAppStore()
  const navigate = useNavigate()
  const location = useLocation()
  const pipeline = useProjectPipeline()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleClick = (wfId: string) => {
    setActiveWorkflow(wfId)
    const path = WORKFLOW_ID_TO_PATH[wfId] || '/'
    navigate(path)
    setMobileOpen(false)
  }

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const sidebarContent = (
    <>
      <div className="px-6 pt-7 pb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#1D1D1F] flex items-center justify-center">
            <Film className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold text-[#1D1D1F] tracking-tight">AI Video SOP</h1>
            <p className="text-[11px] text-[#86868B] mt-0.5">短视频智能运营</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 pb-4 overflow-y-auto">
        <div className="mb-2 px-3.5">
          <span className="text-[10px] font-semibold text-[#86868B] uppercase tracking-wider">核心流水线</span>
        </div>
        <div className="flex flex-col gap-0.5 mb-4">
          {SOP_FLOW.map((step, idx) => {
            const isActive = activeWorkflow === step.id
            const isCompleted = pipeline.isStepCompleted(step.id)
            return (
              <button
                key={step.id}
                onClick={() => handleClick(step.id)}
                className="relative w-full flex items-center gap-3 px-3.5 h-[42px] rounded-xl text-[13.5px] text-left"
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-bg"
                    className="absolute inset-0 rounded-xl bg-[#F5F5F7]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10 text-[16px]">{step.emoji}</span>
                <span
                  className={`relative z-10 flex-1 transition-colors duration-200 ${
                    isActive ? 'text-[#1D1D1F] font-medium' : 'text-[#86868B]'
                  }`}
                >
                  {step.label}
                </span>
                {isCompleted && !isActive && (
                  <CheckCircle2 className="relative z-10 w-3.5 h-3.5 text-[#34C759]" />
                )}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-dot"
                    className="absolute right-3 w-1.5 h-1.5 rounded-full bg-[#1D1D1F] z-10"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </div>

        <div className="mb-2 px-3.5">
          <span className="text-[10px] font-semibold text-[#86868B] uppercase tracking-wider">视频工具</span>
        </div>
        <div className="flex flex-col gap-0.5 mb-4">
          {VIDEO_TOOLS_FLOW.map((step) => {
            const isActive = activeWorkflow === step.id
            return (
              <button
                key={step.id}
                onClick={() => handleClick(step.id)}
                className="relative w-full flex items-center gap-3 px-3.5 h-[42px] rounded-xl text-[13.5px] text-left"
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-bg-video"
                    className="absolute inset-0 rounded-xl bg-[#F5F5F7]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10 text-[16px]">{step.emoji}</span>
                <span
                  className={`relative z-10 transition-colors duration-200 ${
                    isActive ? 'text-[#1D1D1F] font-medium' : 'text-[#86868B]'
                  }`}
                >
                  {step.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-dot-video"
                    className="absolute right-3 w-1.5 h-1.5 rounded-full bg-[#1D1D1F] z-10"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </div>

        <div className="mb-2 px-3.5">
          <span className="text-[10px] font-semibold text-[#86868B] uppercase tracking-wider">辅助工具</span>
        </div>
        <div className="flex flex-col gap-0.5">
          {AUX_FLOW.map((step) => {
            const isActive = activeWorkflow === step.id
            return (
              <button
                key={step.id}
                onClick={() => handleClick(step.id)}
                className="relative w-full flex items-center gap-3 px-3.5 h-[42px] rounded-xl text-[13.5px] text-left"
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-bg-aux"
                    className="absolute inset-0 rounded-xl bg-[#F5F5F7]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10 text-[16px]">{step.emoji}</span>
                <span
                  className={`relative z-10 transition-colors duration-200 ${
                    isActive ? 'text-[#1D1D1F] font-medium' : 'text-[#86868B]'
                  }`}
                >
                  {step.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-dot-aux"
                    className="absolute right-3 w-1.5 h-1.5 rounded-full bg-[#1D1D1F] z-10"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </nav>

      <div className="px-5 pb-5">
        <div className="h-px bg-black/[0.04] mb-4" />
        <div className="flex items-center gap-2.5 px-1">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center text-white text-[11px] font-medium">
            U
          </div>
          <div>
            <p className="text-[12px] font-medium text-[#1D1D1F]">运营团队</p>
            <p className="text-[10.5px] text-[#86868B]">Pro 会员</p>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <>
      <aside className="hidden md:flex w-[280px] min-w-[280px] h-screen bg-white flex-col border-r border-black/[0.04]">
        {sidebarContent}
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="fixed left-0 top-0 w-[280px] h-screen bg-white flex flex-col border-r border-black/[0.04] z-50 md:hidden"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F5F5F7] z-50"
              >
                <X className="w-4 h-4 text-[#86868B]" />
              </button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-black/[0.04] shadow-sm z-30 md:hidden"
      >
        <Menu className="w-5 h-5 text-[#1D1D1F]" />
      </button>
    </>
  )
}
