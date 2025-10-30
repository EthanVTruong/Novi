import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Buffer } from "buffer";

// Polyfill Buffer for browser environment (required by Solana libraries)
// Only set if not already defined to avoid conflicts with Vite dev server
if (typeof window !== "undefined" && !window.Buffer) {
  (window as any).Buffer = Buffer;
}

createRoot(document.getElementById("root")!).render(<App />);
