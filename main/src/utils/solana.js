export function getPhantomProvider() {
  if (typeof window === "undefined") return null;
  const p = window.solana;
  if (p && p.isPhantom) return p;
  return null;
}
