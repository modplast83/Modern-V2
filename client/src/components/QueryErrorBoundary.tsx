import React from "react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface QueryErrorBoundaryProps {
  children: React.ReactNode;
}

export function QueryErrorBoundary({ children }: QueryErrorBoundaryProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          fallbackRender={({ error, resetErrorBoundary }) => (
            <Alert variant="destructive" className="m-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>خطأ في البيانات</AlertTitle>
              <AlertDescription className="mt-2">
                فشل في تحميل البيانات. يرجى المحاولة مرة أخرى.
                {process.env.NODE_ENV === "development" && (
                  <details className="mt-2 text-xs">
                    <summary>تفاصيل الخطأ:</summary>
                    <pre className="mt-1 whitespace-pre-wrap">
                      {error?.message}
                    </pre>
                  </details>
                )}
              </AlertDescription>
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    reset();
                    resetErrorBoundary();
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  إعادة المحاولة
                </Button>
              </div>
            </Alert>
          )}
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

// Simple error boundary component
class ErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    fallbackRender: ({ error, resetErrorBoundary }: any) => React.ReactElement;
  },
  { hasError: boolean; error: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Query error boundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallbackRender({
        error: this.state.error,
        resetErrorBoundary: () =>
          this.setState({ hasError: false, error: null }),
      });
    }

    return this.props.children;
  }
}
