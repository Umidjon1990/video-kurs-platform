import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex items-center justify-center bg-background" data-testid="error-boundary-fallback">
          <div className="text-center space-y-4 p-8 max-w-md">
            <AlertTriangle className="w-16 h-16 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">
              {this.props.fallbackMessage || "Xatolik yuz berdi"}
            </h2>
            <p className="text-muted-foreground text-sm">
              Sahifani qayta yuklang yoki bosh sahifaga qayting
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                data-testid="button-reload-page"
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                Qayta yuklash
              </Button>
              <Button
                variant="default"
                onClick={() => window.location.href = "/"}
                data-testid="button-go-home"
              >
                <Home className="w-4 h-4 mr-2" />
                Bosh sahifa
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
