import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { CARD_STYLES } from '../utils/styles'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950/30">
          <div className={`text-center max-w-md ${CARD_STYLES.panel}`}>
            <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/30 inline-block mb-4">
              <AlertTriangle size={32} className="text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-3">
              出现了一些问题
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm leading-relaxed">
              应用遇到了一个错误，请刷新页面重试
            </p>
            <pre className="text-left text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl p-4 mb-6 overflow-auto max-h-48 border border-red-200/50 dark:border-red-800/30">
              {this.state.error?.message ?? '未知错误'}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors active:scale-[0.97] text-sm font-medium"
            >
              刷新页面
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
