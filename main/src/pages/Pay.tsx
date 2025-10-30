import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PublicKey } from "@solana/web3.js";

const Pay = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [recipient, setRecipient] = useState<string>("");
  const [paymentUrl, setPaymentUrl] = useState<string>("");

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9.]/g, "");
    if (value.length > 5) value = value.slice(0, 5); // cap at 5 digits
    setAmount(value);
  };

  const handlePay = async () => {
    // Validate amount
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter an amount");
      return;
    }

    // Validate recipient
    if (!recipient.trim()) {
      toast.error("Please enter a recipient");
      return;
    }

    // Validate description
    if (!description.trim()) {
      toast.error("Please add what this is for");
      return;
    }

    // Validate recipient is a valid Solana PublicKey
    let recipientPublicKey: PublicKey;
    try {
      recipientPublicKey = new PublicKey(recipient.trim());
    } catch (error) {
      toast.error("Invalid recipient wallet address");
      return;
    }

    try {
      // Build the transfer redirect URL with query parameters
      const transferParams = new URLSearchParams({
        recipient: recipient.trim(),
        amount: amount,
        label: description,
        message: `Payment for ${description}`,
      });

      // Create the full transfer URL
      const transferUrl = `${window.location.origin}/transfer?${transferParams.toString()}`;
      setPaymentUrl(transferUrl);

      // Copy to clipboard
      await navigator.clipboard.writeText(transferUrl);

      toast.success("Payment link copied to clipboard!");
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

          {/* Recipient Input */}
          <div className="space-y-3">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Recipient</label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Wallet address"
              className="w-full px-4 py-3 bg-muted/30 border border-border/50 rounded-2xl text-foreground text-center outline-none focus:border-primary/50 placeholder:text-muted-foreground font-mono text-sm transition-colors"
            />
          </div>
        </div>

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