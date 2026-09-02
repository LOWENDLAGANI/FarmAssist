"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-[50vh] items-center justify-center p-6">
          <div className="w-full max-w-sm rounded-2xl border border-red-500/30 bg-[#0c1a2e] p-6 text-center shadow-2xl shadow-red-950/50">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15">
              <AlertTriangle className="h-7 w-7 text-red-400" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-white">Something went wrong</h3>
            <p className="mb-4 text-sm text-slate-400">
              An unexpected error occurred. You can try reloading this section.
            </p>
            {this.state.error && (
              <p className="mb-4 rounded-xl bg-red-950/30 p-3 font-mono text-xs text-red-400">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={this.handleReset}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-cyan-500 active:scale-[0.98]"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
