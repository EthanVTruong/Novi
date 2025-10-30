import { Button } from "@/components/ui/button";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useWallet from "@/hooks/useWallet";

const Index = () => {
  const navigate = useNavigate();
  const { provider, connected, publicKey, connect } = useWallet();

  async function handleConnectClick() {
    try {
      if (!provider) {
        alert("Please install Phantom Wallet: https://phantom.app/");
        return;
      }
      await connect();
    } catch (err) {
      console.error("Connect failed:", err);
      alert("Could not connect wallet. See console for details.");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Logo & Header */}
        <div className="text-center space-y-4"> {/* reduced from space-y-6 to space-y-4 */}
          <div className="inline-flex justify-center mb-1 overflow-hidden"> {/* reduced mb from 2 to 1 */}
            <img
              src="/NoviLogoInvert.png"
              alt="Novi Logo"
              className="w-[100px] h-[100px] rounded-[24px] object-contain"
            />
          </div>
          <div className="space-y-1"> {/* reduced from space-y-2 to space-y-1 */}
            <h1 className="text-5xl font-bold text-foreground tracking-tight">Novi</h1>
            <p className="text-lg text-muted-foreground">Pay via Text</p> {/* updated text */}
          </div>
        </div>
          {/* Wallet Connection Status */}
          <div className="pt-2">
            {connected ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-card border border-border/50 shadow-md">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-sm font-medium">{publicKey?.slice(0, 6)}...{publicKey?.slice(-4)}</span>
              </div>
            ) : (
              <Button
                onClick={handleConnectClick}
                size="lg"
                className="rounded-2xl px-8 h-12 shadow-lg hover:shadow-xl transition-all"
              >
                Connect Wallet
              </Button>
            )}
          </div>
        </div>

        {/* Action Cards */}
        <div className="space-y-4">
          <button
            onClick={() => navigate("/pay")}
            className="group w-full bg-card border border-border/50 hover:border-primary/50 rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <ArrowUpFromLine className="w-6 h-6 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-xl font-semibold text-foreground">Request</div>
                  <div className="text-sm text-muted-foreground">Get paid via link</div>
                </div>
              </div>
              <div className="text-muted-foreground group-hover:translate-x-1 transition-transform">→</div>
            </div>
          </button>

          <button
            onClick={() => navigate("/request")}
            className="group w-full bg-card border border-border/50 hover:border-primary/50 rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <ArrowDownToLine className="w-6 h-6 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-xl font-semibold text-foreground">Split Bill</div>
                  <div className="text-sm text-muted-foreground">Divide costs easily</div>
                </div>
              </div>
              <div className="text-muted-foreground group-hover:translate-x-1 transition-transform">→</div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="text-center pt-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-muted/30 backdrop-blur-sm">
            <span className="text-xs text-muted-foreground">Powered by Solana</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">Instant settlement</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;