import { motion } from 'motion/react'
import { useWorkflowGeneration } from '@/hooks/useScriptGeneration'
import { useAppStore } from '@/store/useAppStore'
import { Sparkles, Loader2, XCircle } from 'lucide-react'

export default function GenerateButton() {
  const { generate, isGenerating } = useWorkflowGeneration()
  const cancelGeneration = useAppStore((s) => s.cancelGeneration)

  if (isGenerating) {
    return (
      <div className="flex gap-3">
        <div className="flex-1 h-[52px] rounded-2xl bg-[#1D1D1F]/70 text-white text-[15px] font-medium flex items-center justify-center gap-2.5">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>AI 生成中...</span>
        </div>
        <motion.button
          onClick={cancelGeneration}
          className="h-[52px] px-5 rounded-2xl bg-[#FF6B6B]/10 text-[#FF6B6B] text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-[#FF6B6B]/20 active:scale-[0.98] transition-all duration-200"
          whileTap={{ scale: 0.98 }}
        >
          <XCircle className="w-4 h-4" />
          取消
        </motion.button>
      </div>
    )
  }

  return (
    <motion.button
      onClick={generate}
      className="w-full h-[52px] rounded-2xl text-[15px] font-medium text-white flex items-center justify-center gap-2.5 bg-[#1D1D1F] hover:bg-[#333338] active:scale-[0.985] transition-all duration-300"
      whileTap={{ scale: 0.985 }}
    >
      <Sparkles className="w-5 h-5" />
      <span>开始生成</span>
    </motion.button>
  )
}
