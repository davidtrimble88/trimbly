import { Component, ReactNode } from "react";
import { reportError } from "@/lib/errorReporting";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props { children: ReactNode }
interface State { hasError: boolean; message?: string }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    reportError({
      message: error.message,
      stack: error.stack,
      source: "boundary",
      metadata: { componentStack: info.componentStack?.slice(0, 4000) },
    });
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="max-w-md w-full text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="font-display text-xl font-bold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">
            We've logged this error and will look into it. You can try again or head home.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => this.setState({ hasError: false })}>Try again</Button>
            <Button variant="outline" onClick={() => (window.location.href = "/")}>Go home</Button>
          </div>
        </div>
      </div>
    );
  }
}
