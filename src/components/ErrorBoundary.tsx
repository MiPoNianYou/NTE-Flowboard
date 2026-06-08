import { Component, ErrorInfo, ReactNode } from 'react'
import { CARD_STYLES } from '../utils/styles'
import { Button } from './base/Button'
import NanallyError from '../assets/Nanally Error.png'

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
        <div className="min-h-screen flex items-center justify-center" style={{
            background: `
              radial-gradient(900px 600px at 88% 12%, rgba(91, 107, 255, 0.22), transparent 60%),
              radial-gradient(700px 500px at 6% 92%, rgba(61, 215, 229, 0.10), transparent 60%),
              radial-gradient(500px 400px at 60% 80%, rgba(255, 58, 92, 0.05), transparent 60%),
              linear-gradient(180deg, #0A0B0F 0%, #06070A 100%)
            `,
          }}>
          <div className={`text-center max-w-md ${CARD_STYLES.panel} p-6`}>
            <div className="flex justify-center mb-2">
              <div className="w-28 h-28 rounded-full overflow-hidden">
                <img src={NanallyError} alt="Nanally" className="w-full h-full object-cover" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              出现了一些问题
            </h2>
            <p className="text-text-secondary mb-4 text-sm leading-relaxed">
              网站遇到了一个错误，请刷新页面重试
            </p>
            <pre className="text-left text-xs text-danger bg-danger-soft rounded-lg p-4 mb-6 overflow-auto max-h-48 border border-danger/30">
              {this.state.error?.message ?? '未知错误'}
            </pre>
            <div className="flex justify-center">
              <Button
                onClick={() => window.location.reload()}
                className="px-6"
              >
                刷新页面
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
