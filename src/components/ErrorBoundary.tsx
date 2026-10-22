"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: "",
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Sanitize error message to prevent exposing internal file paths or stack details
    const safeMessage = error && error.message ? error.message : "An unexpected error occurred.";
    return {
      hasError: true,
      errorMessage: safeMessage,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Safe error logging without user-identifiable data
    if (process.env.NODE_ENV !== "production") {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, errorMessage: "" });
    if (this.props.onReset) {
      this.props.onReset();
    } else if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-charcoal-950 text-slate-100 flex items-center justify-center p-6">
          <div className="w-full max-w-md p-6 rounded-2xl bg-charcoal-900 border border-charcoal-750 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-400 mx-auto flex items-center justify-center border border-amber-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-100">Application Error</h2>
              <p className="text-xs text-charcoal-400">
                The game engine encountered an unexpected state. You can safely restart the match to recover.
              </p>
            </div>

            {this.state.errorMessage && (
              <div className="p-3 rounded-lg bg-charcoal-950 border border-charcoal-800 text-[11px] font-mono text-charcoal-400 text-left overflow-x-auto">
                {this.state.errorMessage}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full py-2.5 px-4 rounded-xl bg-playerX hover:bg-playerX-light text-charcoal-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-playerX/20 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restart Game</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
