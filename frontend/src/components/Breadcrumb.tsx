import { ChevronRight } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { getWorkflowDef } from '@/types'

export default function Breadcrumb() {
  const { activeWorkflow } = useAppStore()
  const current = getWorkflowDef(activeWorkflow)

  return (
    <div className="flex items-center gap-1.5 text-[13px] text-[#86868B]">
      <span>工作流</span>
      <ChevronRight className="w-3.5 h-3.5" />
      <span className="text-[#1D1D1F] font-medium">{current?.label ?? ''}</span>
    </div>
  )
}
