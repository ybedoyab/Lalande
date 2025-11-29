import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    if (this.props.onError) {
      this.props.onError();
    }
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="alert alert-error">
          <div>
            <h3 className="font-bold">Algo salió mal</h3>
            <div className="text-xs">
              {this.state.error?.message || 'Ocurrió un error inesperado'}
            </div>
            <button
              className="btn btn-sm btn-primary mt-2"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

