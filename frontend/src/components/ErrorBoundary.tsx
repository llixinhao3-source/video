import { Component, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-[#F5F5F7]">
          <div className="max-w-[420px] w-full px-6">
            <div className="text-center px-8 py-10 rounded-3xl bg-white border border-black/[0.04] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#FF6B6B]/10 mb-5">
                <AlertTriangle className="w-7 h-7 text-[#FF6B6B]" />
              </div>
              <h2 className="text-[18px] font-semibold text-[#1D1D1F] mb-2">页面出现异常</h2>
              <p className="text-[14px] text-[#86868B] mb-4 leading-relaxed">
                抱歉，页面渲染时遇到了一个错误。请尝试刷新页面。
              </p>
              {this.state.error && (
                <div className="mb-5 px-4 py-3 rounded-xl bg-[#F5F5F7] text-left">
                  <p className="text-[12px] text-[#FF6B6B] font-mono break-all">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 h-[44px] px-6 rounded-2xl bg-[#1D1D1F] text-white text-[14px] font-medium hover:bg-[#333338] active:scale-[0.98] transition-all duration-200"
              >
                <RotateCcw className="w-4 h-4" />
                重试
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
