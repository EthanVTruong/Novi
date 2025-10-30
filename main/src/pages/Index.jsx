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
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "#f6f3f0" }}
    >
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary mb-4 overflow-hidden">
            <img
              src="/NoviLogo.PNG"
              alt="Novi Logo"
              className="w-12 h-12 object-contain"
            />
          </div>
          <h1 className="text-4xl font-bold text-foreground">Novi</h1>
          <p className="text-muted-foreground">Payments via Text</p>

          <div className="mt-2">
            {connected ? (
              <div className="text-sm">Connected: {publicKey?.slice(0, 6)}…</div>
            ) : (
              <Button onClick={handleConnectClick} size="sm">
                Connect Wallet
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-4 pt-8">
          <Button
            variant="default"
            size="lg"
            className="w-full h-16 text-lg"
            onClick={() => navigate("/request")}
          >
            <ArrowDownToLine className="w-5 h-5 mr-2" />
            Request
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full h-16 text-lg"
            onClick={() => navigate("/pay")}
          >
            <ArrowUpFromLine className="w-5 h-5 mr-2" />
            Pay Someone
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground pt-8">
          Powered By Solana • Instant settlement
        </p>
      </div>
    </div>
  );
};

export default Index;
