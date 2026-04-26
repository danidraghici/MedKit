import React from "react";

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-8">
          <div className="max-w-xl w-full rounded-xl border border-destructive/40 bg-destructive/5 p-6">
            <h1 className="text-lg font-semibold text-destructive mb-2">Eroare de aplicație</h1>
            <p className="text-sm text-muted-foreground mb-4">
              Aplicația a întâmpinat o eroare:
            </p>
            <pre className="text-xs bg-muted rounded-lg p-4 overflow-auto whitespace-pre-wrap break-all text-foreground">
              {this.state.error?.toString()}
              {"\n\n"}
              {this.state.error?.stack}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
