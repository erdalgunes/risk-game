'use client';

import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch and handle React errors gracefully
 * Prevents the entire app from crashing due to component errors
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught error:', error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      return <DefaultErrorFallback error={this.state.error} reset={this.reset} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md rounded-lg border border-red-500 bg-gray-800 p-8 shadow-xl">
        <div className="mb-4 flex items-center">
          <svg
            className="mr-3 h-8 w-8 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="text-2xl font-bold text-white">Something went wrong</h2>
        </div>

        <p className="mb-4 text-gray-300">
          An unexpected error occurred. This has been logged and will be investigated.
        </p>

        <details className="mb-6">
          <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
            Error details
          </summary>
          <pre className="mt-2 max-h-40 overflow-auto rounded bg-gray-900 p-3 text-xs text-red-400">
            {error.message}
            {error.stack && `\n\n${error.stack}`}
          </pre>
        </details>

        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 rounded bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
          >
            Try Again
          </button>
          <button
            onClick={() => (window.location.href = '/')}
            className="flex-1 rounded bg-gray-700 px-4 py-2 font-semibold text-white transition hover:bg-gray-600"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Game-specific error fallback with context about game state
 */
export function GameErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  const isNetworkError =
    error.message.toLowerCase().includes('network') ||
    error.message.toLowerCase().includes('fetch');

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md rounded-lg border border-red-500 bg-gray-800 p-8 shadow-xl">
        <div className="mb-4 flex items-center">
          <svg
            className="mr-3 h-8 w-8 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="text-2xl font-bold text-white">
            {isNetworkError ? 'Connection Error' : 'Game Error'}
          </h2>
        </div>

        <p className="mb-4 text-gray-300">
          {isNetworkError
            ? 'Unable to connect to the game server. Please check your internet connection.'
            : 'An error occurred while loading the game. Your game state has been preserved.'}
        </p>

        <details className="mb-6">
          <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
            Technical details
          </summary>
          <pre className="mt-2 max-h-40 overflow-auto rounded bg-gray-900 p-3 text-xs text-red-400">
            {error.message}
          </pre>
        </details>

        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 rounded bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
          >
            Retry
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 rounded bg-gray-700 px-4 py-2 font-semibold text-white transition hover:bg-gray-600"
          >
            Refresh Page
          </button>
        </div>
      </div>
    </div>
  );
}
