// Polyfills for Solana wallet adapter
if (typeof window !== "undefined") {
  // Only add mock wallet in dev mode if no real wallet exists
  if (import.meta.env.DEV && !window.solana) {
    console.log("[Dev] Mock Solana wallet injected for development");
    window.solana = {
      isPhantom: false,
      isConnected: false,
      connect: async () => {
        window.solana.isConnected = true;
        return { publicKey: { toString: () => "DevMockPubKey1234" } };
      },
      disconnect: async () => {
        window.solana.isConnected = false;
      },
      on: () => {},
      removeListener: () => {},
    };
  }
}
