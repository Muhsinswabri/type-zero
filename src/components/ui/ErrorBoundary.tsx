import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface BoundaryState {
  failed: boolean;
}

/** Catches render errors so users see a friendly message instead of a blank page or a stack trace. */
export default class ErrorBoundary extends Component<Props, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('TypeZero render error', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="text-mute">
          TypeZero hit an unexpected problem. Your saved progress has not been touched. Reloading the page usually fixes it.
        </p>
        <div className="flex gap-3">
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            Reload page
          </button>
          <a className="btn btn-secondary" href="/">
            Go to dashboard
          </a>
        </div>
      </div>
    );
  }
}
