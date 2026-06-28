import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'
import { pageGradient } from '../../utils/colors'
import { Button } from './Button'
import NanallyError from '../../assets/nanally-error.webp'

interface ErrorBoundaryProps {
  children: ReactNode
}
interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-[100dvh] flex items-center justify-center page-gradient"
          style={{ background: pageGradient() }}
        >
          <div className="text-center w-full max-w-[680px] max-h-[85dvh] glass-strong border border-border rounded-2xl p-6 shadow-glass flex flex-col overflow-auto">
            <div className="flex flex-col items-center">
              <div className="flex justify-center mb-4">
                <div className="w-32 h-32 overflow-hidden">
                  <img src={NanallyError} alt="Nanally" className="w-full h-full object-cover" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2">出现了一些问题</h2>
              <p className="text-text-secondary mb-6 text-sm leading-relaxed">
                网站遇到了一个错误，请刷新页面重试
              </p>
              <div className="max-w-lg mx-auto w-full mb-8">
                <div className="flex items-center gap-3 text-left text-sm bg-danger/10 rounded-xl p-4 border border-danger/20">
                  <AlertCircle className="text-danger shrink-0" size={18} />
                  <span className="block text-xs text-danger whitespace-pre-wrap break-words overflow-auto max-h-48 flex-1 m-0">
                    {this.state.error?.message ?? '未知错误'}
                  </span>
                </div>
              </div>
              <div className="flex justify-center">
                <Button onClick={() => window.location.reload()} className="px-10 py-4">
                  <RotateCcw size={16} />
                  刷新页面
                </Button>
              </div>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
