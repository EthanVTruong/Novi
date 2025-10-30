import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import useWallet from "@/hooks/useWallet";

const Pay = () => {
  const navigate = useNavigate();
  const { publicKey, connected } = useWallet();
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [paymentUrl, setPaymentUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9.]/g, "");
    if (value.length > 5) value = value.slice(0, 5); // cap at 5 digits
    setAmount(value);
  };

  // Reusable copy helper with fallback
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Payment link copied to clipboard!");
      setCopied(true);
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      console.warn("Clipboard API failed, using fallback:", err);
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        toast.success("Payment link copied (fallback)!");
        setCopied(true);
      } catch (fallbackErr) {
        console.error("Fallback copy failed:", fallbackErr);
        toast.error("Failed to copy link. Please try again.");
      }
    }
  };

  const handlePay = async () => {
    // Validate wallet is connected
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet first");
      return;
    }

    // Validate amount
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter an amount");
      return;
    }

    // Validate description
    if (!description.trim()) {
      toast.error("Please add what this is for");
      return;
    }

    try {
      // Build the transfer redirect URL with query parameters
      // Use connected wallet as the recipient
      const transferParams = new URLSearchParams({
        recipient: publicKey,
        amount: amount,
        label: description,
        message: `Payment for ${description}`,
      });

      // Create the full transfer URL (absolute URL for sharing)
      const transferUrl = `${window.location.origin}/transfer?${transferParams.toString()}`;

      // Store the URL in state
      setPaymentUrl(transferUrl);

      // Reset copied state when generating new link
      setCopied(false);

      // Automatically copy to clipboard
      await copyToClipboard(transferUrl);
    } catch (error) {
      toast.error("Failed to generate payment link");
      console.error("Payment link generation error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6 flex items-center justify-center">
      <div className="max-w-lg w-full space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="rounded-2xl w-12 h-12 hover:bg-card transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Request Payment</h1>
        </div>

        {/* Main Card */}
        <div className="bg-card border border-border/50 rounded-3xl p-8 shadow-xl backdrop-blur-sm space-y-8">
          {/* Amount Input */}
          <div className="text-center space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Amount</div>
            <div className="inline-flex items-center justify-center text-foreground">
              <span className="text-5xl font-light text-muted-foreground -mr-2">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0"
                className="text-7xl font-light bg-transparent border-none outline-none text-center w-auto"
                style={{ width: `${Math.max(amount.length, 1) + 1}ch` }}
                autoFocus
              />
            </div>
            <div className="text-sm text-muted-foreground">USDC</div>
          </div>

          {/* Divider */}
          <div className="border-t border-border/50"></div>

          {/* Description Input */}
          <div className="space-y-3">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's it for?"
              className="w-full px-4 py-3 bg-muted/30 border border-border/50 rounded-2xl text-foreground text-center outline-none focus:border-primary/50 placeholder:text-muted-foreground transition-colors"
            />
          </div>

          {/* Wallet Info Display */}
          {connected && publicKey && (
            <div className="bg-primary/10 rounded-2xl p-4 border border-primary/20">
              <div className="text-xs text-muted-foreground mb-1 text-center">Payment will be sent to</div>
              <div className="text-sm font-mono text-foreground text-center break-all">
                {publicKey.slice(0, 8)}...{publicKey.slice(-8)}
              </div>
            </div>
          )}
        </div>

        {/* Payment Link Ready UI */}
        {paymentUrl && (
          <div className="bg-card border border-border/50 rounded-3xl p-6 shadow-xl backdrop-blur-sm space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground">Payment Link Ready</div>
              <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <span>✓</span>
                <span>Copied</span>
              </div>
            </div>
            <div className="bg-muted/50 rounded-2xl p-3 text-xs font-mono text-foreground/70 break-all border border-border/30">
              {paymentUrl}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 rounded-2xl"
                onClick={() => {
                  setCopied(false);
                  copyToClipboard(paymentUrl);
                }}
              >
                {copied ? "Copied!" : "Copy Again"}
              </Button>
              <Button
                variant="default"
                size="sm"
                className="flex-1 rounded-2xl"
                onClick={() => {
                  window.open(paymentUrl, '_blank');
                }}
              >
                Open Payment Page
              </Button>
            </div>
          </div>
        )}

        {/* Pay Button */}
        <Button
          variant="default"
          size="lg"
          className="w-full h-14 text-base font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all"
          onClick={handlePay}
        >
          Generate Payment Link • ${amount || "0"} USDC
        </Button>
      </div>
    </div>
  );
};

export default Pay;