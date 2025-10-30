import { useEffect, useState } from "react";
import { getPhantomProvider } from "@/utils/solana";

export default function useWallet() {
  const [provider, setProvider] = useState(null);
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState(null);

  useEffect(() => {
    const p = getPhantomProvider();
    if (p) {
      setProvider(p);
      const handleConnect = () => {
        setConnected(true);
        setPublicKey(p.publicKey?.toString?.() ?? null);
      };
      const handleDisconnect = () => {
        setConnected(false);
        setPublicKey(null);
      };
      try {
        p.on("connect", handleConnect);
        p.on("disconnect", handleDisconnect);
      } catch (e) {
        // Some providers may not support .on; ignore safely
      }
      if (p.isConnected) handleConnect();
      return () => {
        try {
          p.removeListener("connect", handleConnect);
          p.removeListener("disconnect", handleDisconnect);
        } catch (e) {
          // ignore
        }
      };
    }
  }, []);

  async function connect() {
    try {
      const p = getPhantomProvider();
      if (!p) throw new Error("Phantom not available");
      const resp = await p.connect();
      setConnected(true);
      setPublicKey(resp.publicKey?.toString?.() ?? null);
      return resp;
    } catch (err) {
      console.error("Wallet connect failed:", err);
      throw err;
    }
  }

  async function disconnect() {
    try {
      const p = getPhantomProvider();
      if (p && p.disconnect) await p.disconnect();
      setConnected(false);
      setPublicKey(null);
    } catch (err) {
      console.error("Disconnect error:", err);
    }
  }

  return { provider, connected, publicKey, connect, disconnect };
}
