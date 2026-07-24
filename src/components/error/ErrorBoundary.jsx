import React, { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service
    console.error('UI Error:', error, errorInfo);

    // Try to send to Sentry if available
    try {
      // Dynamically import Sentry to avoid bundling if not used
      import('@sentry/react').then(({ captureException }) => {
        captureException(error, { extra: errorInfo });
      }).catch((importError) => {
        // Sentry not available or failed to load, ignore silently
        console.debug('Sentry not available:', importError);
      });
    } catch (importError) {
      // Dynamic import failed (e.g., in environments without dynamic import support)
      console.debug('Sentry dynamic import failed:', importError);
    }
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="error-boundary p-6 bg-red-50 border-l-4 border-red-500 text-red-700">
          <h2 className="text-xl font-bold mb-4">Something went wrong.</h2>
          <div className="mb-4">
            <p className="mb-2">
              We're sorry, but there was an error in the application. Our team has been notified.
            </p>
            <p className="text-sm">
              If this problem persists, please try refreshing the page or contact support.
            </p>
          </div>

          {/* Show error details in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-4 bg-white border rounded">
              <h3 className="font-semibold mb-2">Error Details:</h3>
              <pre className="text-xs overflow-auto max-h-60">{this.state.error.toString()}</pre>
              {this.state.errorInfo && (
                <div className="mt-2">
                  <h4 className="font-semibold mb-1">Component Stack:</h4>
                  <pre className="text-xs overflow-auto max-h-40">{this.state.errorInfo.componentStack}</pre>
                </div>
              )}
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;