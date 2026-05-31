import { useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useAppStore } from '@/store/useAppStore'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'

export default function Toast() {
  const { toast, hideToast } = useAppStore()

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(hideToast, 3500)
      return () => clearTimeout(timer)
    }
  }, [toast, hideToast])

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-white/90 backdrop-blur-xl shadow-lg border border-black/[0.04]"
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-[#34C759] flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-[#FF6B6B] flex-shrink-0" />
          )}
          <span className="text-[13.5px] text-[#1D1D1F] font-medium">{toast.message}</span>
          <button
            onClick={hideToast}
            className="ml-2 text-[#86868B] hover:text-[#1D1D1F] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
