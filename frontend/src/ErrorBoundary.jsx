import { Component } from "react";

// Without this, any exception thrown while rendering a page (a bad API
// response shape, a missing field on older data, etc.) unmounts the whole
// React tree and the user is left staring at a completely blank white
// page with no clue what happened. This catches that and shows a real
// message + a way to recover instead.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("Unhandled render error:", error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ maxWidth: 520, margin: "80px auto", padding: 24, textAlign: "center", fontFamily: "sans-serif" }}>
          <h2 style={{ marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ color: "#6b7280", marginBottom: 20 }}>
            This page hit an unexpected error. Try reloading — if it keeps happening, going back to the dashboard usually helps.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button type="button" onClick={() => window.location.reload()}>Reload</button>
            <button type="button" onClick={() => { window.location.href = "/dashboard"; }}>Back to dashboard</button>
          </div>
          {import.meta.env.DEV && (
            <pre style={{ textAlign: "left", marginTop: 24, padding: 12, background: "#f3f4f6", overflow: "auto", fontSize: 12 }}>
              {String(this.state.error?.stack || this.state.error)}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
