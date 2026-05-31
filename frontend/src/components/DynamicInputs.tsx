import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import type { InputDef } from '@/types'
import { PenLine, ChevronDown, ChevronUp } from 'lucide-react'

function ExpandableInput({ inp, value, onChange }: {
  inp: InputDef
  value: string
  onChange: (v: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isLong = value.length > 60

  if (inp.multiline) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={inp.placeholder}
        className="w-full h-[120px] px-4 py-3.5 rounded-2xl border border-black/[0.06] bg-[#FAFAFA] text-[14px] text-[#1D1D1F] placeholder:text-[#C7C7CC] resize-none focus:outline-none focus:border-[#007AFF] focus:bg-white focus:ring-[3px] focus:ring-[#007AFF]/10 transition-all duration-200"
      />
    )
  }

  if (expanded) {
    return (
      <div className="rounded-2xl border border-[#007AFF] bg-white ring-[3px] ring-[#007AFF]/10 transition-all duration-200 overflow-hidden">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={inp.placeholder}
          autoFocus
          rows={4}
          className="w-full px-4 py-3 bg-transparent text-[14px] text-[#1D1D1F] placeholder:text-[#C7C7CC] resize-none focus:outline-none"
        />
        <div className="flex items-center justify-end px-3 pb-2.5">
          <button
            onClick={() => setExpanded(false)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] text-[#007AFF] hover:bg-[#007AFF]/5 transition-colors"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            收起
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={inp.placeholder}
        className="w-full h-[46px] px-4 pr-10 rounded-2xl border border-black/[0.06] bg-[#FAFAFA] text-[14px] text-[#1D1D1F] placeholder:text-[#C7C7CC] focus:outline-none focus:border-[#007AFF] focus:bg-white focus:ring-[3px] focus:ring-[#007AFF]/10 transition-all duration-200"
      />
      {isLong && (
        <button
          onClick={() => setExpanded(true)}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-2 py-1 rounded-lg text-[11px] text-[#86868B] hover:text-[#007AFF] hover:bg-[#007AFF]/5 transition-colors"
          title="展开编辑"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          展开
        </button>
      )}
    </div>
  )
}

export default function DynamicInputs({ inputs }: { inputs: InputDef[] }) {
  const { inputValues, setInputValue } = useAppStore()

  return (
    <div className="space-y-5">
      {inputs.map((inp, i) => (
        <div key={inp.key}>
          <label className="flex items-center gap-2 text-[13px] font-medium text-[#1D1D1F] mb-3">
            <PenLine className="w-4 h-4 text-[#86868B]" />
            {i === 0 ? '第一步' : `第${['一', '二', '三', '四'][i]}步`}：{inp.label}
          </label>
          <ExpandableInput
            inp={inp}
            value={inputValues[inp.key] || ''}
            onChange={(v) => setInputValue(inp.key, v)}
          />
        </div>
      ))}
    </div>
  )
}
