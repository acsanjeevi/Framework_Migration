import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error)
    return { hasError: true, message }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center p-8 bg-background text-foreground">
          <div className="max-w-md space-y-4 text-center">
            <h1 className="text-2xl font-bold text-destructive">Something went wrong</h1>
            <p className="text-sm text-muted-foreground font-mono bg-muted rounded-md px-4 py-2 text-left">
              {this.state.message || 'An unexpected error occurred.'}
            </p>
            <button
              className="text-sm underline hover:text-foreground text-muted-foreground"
              onClick={() => { this.setState({ hasError: false, message: '' }); window.location.href = '/upload' }}
            >
              Return to Upload page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
