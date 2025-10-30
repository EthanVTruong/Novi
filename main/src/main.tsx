import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Buffer } from "buffer";

// Polyfill Buffer for browser environment (required by Solana libraries)
window.Buffer = Buffer;

createRoot(document.getElementById("root")!).render(<App />);
