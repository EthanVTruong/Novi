import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-lg text-center">
            <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
            <pre className="whitespace-pre-wrap text-sm bg-white p-2 rounded">{String(this.state.error)}</pre>
            <p className="mt-4">Open console for more details.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
