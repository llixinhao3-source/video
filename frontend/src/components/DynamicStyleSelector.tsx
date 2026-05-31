import { motion } from 'motion/react'
import { useAppStore } from '@/store/useAppStore'
import type { StyleDef } from '@/types'
import { Palette } from 'lucide-react'

export default function DynamicStyleSelector({ styles, stepLabel }: { styles: StyleDef[]; stepLabel: string }) {
  const { style, setStyle } = useAppStore()

  if (styles.length === 0) return null

  return (
    <div>
      <label className="flex items-center gap-2 text-[13px] font-medium text-[#1D1D1F] mb-3">
        <Palette className="w-4 h-4 text-[#86868B]" />
        {stepLabel}：选择参数
      </label>
      <div className="flex gap-2 flex-wrap">
        {styles.map((opt) => (
          <motion.button
            key={opt.value}
            onClick={() => setStyle(opt.value)}
            className={`relative flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] transition-colors duration-200 ${
              style === opt.value ? 'text-white font-medium' : 'text-[#86868B] bg-[#F5F5F7] hover:bg-[#EAEAEC]'
            }`}
            whileTap={{ scale: 0.97 }}
          >
            {style === opt.value && (
              <motion.div
                layoutId="style-active"
                className="absolute inset-0 bg-[#1D1D1F] rounded-xl"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10 text-[15px]">{opt.emoji}</span>
            <span className="relative z-10">{opt.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
