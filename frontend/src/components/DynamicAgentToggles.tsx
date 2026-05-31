import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { useAppStore } from '@/store/useAppStore'
import type { AgentDef } from '@/types'
import { Workflow, User } from 'lucide-react'
import AvatarCenterModal from '@/components/AvatarCenterModal'

const AVATAR_AGENT_KEYS = ['smart_cut', 'avatar_video']

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle() }}
      className={`relative w-[44px] h-[26px] rounded-full transition-colors duration-300 flex-shrink-0 ${
        enabled ? 'bg-[#34C759]' : 'bg-[#E5E5EA]'
      }`}
    >
      <div
        className={`absolute top-[3px] w-[20px] h-[20px] rounded-full bg-white shadow-sm transition-transform duration-300 ${
          enabled ? 'translate-x-[21px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  )
}

function AgentCard({
  agent,
  enabled,
  onToggle,
  onCardClick,
  boundName,
}: {
  agent: AgentDef
  enabled: boolean
  onToggle: () => void
  onCardClick?: () => void
  boundName?: string
}) {
  const clickable = !!onCardClick

  return (
    <div
      onClick={clickable ? onCardClick : undefined}
      className={`flex items-center justify-between px-3.5 py-3 rounded-xl bg-[#F5F5F7] group hover:bg-[#EAEAEC] transition-colors duration-200 ${
        clickable ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex flex-col min-w-0 mr-3">
        <span className="text-[13px] text-[#1D1D1F] font-medium truncate">{agent.label}</span>
        <span className="text-[11px] text-[#86868B] mt-0.5">{agent.desc}</span>
        {boundName && (
          <div className="flex items-center gap-1 mt-1.5">
            <User className="w-3 h-3 text-[#007AFF]" />
            <span className="text-[11px] text-[#007AFF] font-medium truncate">已绑定：{boundName}</span>
          </div>
        )}
      </div>
      <Toggle enabled={enabled} onToggle={onToggle} />
    </div>
  )
}

export default function DynamicAgentToggles({ agents, stepLabel }: { agents: AgentDef[]; stepLabel: string }) {
  const { agents: agentState, toggleAgent, selectedAvatar } = useAppStore()
  const [showAvatarModal, setShowAvatarModal] = useState(false)

  const cols = agents.length <= 3 ? 1 : 2

  return (
    <div>
      <label className="flex items-center gap-2 text-[13px] font-medium text-[#1D1D1F] mb-3">
        <Workflow className="w-4 h-4 text-[#86868B]" />
        {stepLabel}：定制专家链
      </label>
      <div className={`grid grid-cols-${cols} gap-2.5`}>
        {agents.map((agent) => {
          const isAvatarAgent = AVATAR_AGENT_KEYS.includes(agent.key)

          return (
            <AgentCard
              key={agent.key}
              agent={agent}
              enabled={!!agentState[agent.key]}
              onToggle={() => toggleAgent(agent.key)}
              onCardClick={isAvatarAgent ? () => setShowAvatarModal(true) : undefined}
              boundName={isAvatarAgent ? selectedAvatar?.name : undefined}
            />
          )
        })}
      </div>

      <AnimatePresence>
        {showAvatarModal && (
          <AvatarCenterModal onClose={() => setShowAvatarModal(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
