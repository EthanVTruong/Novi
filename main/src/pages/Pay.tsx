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
    <div className="min-h-screen bg-background p-4 flex items-start justify-center">
      <div className="max-w-md w-full pt-12 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Pay</h1>
        </div>

        {/* Amount Input - $ closer and capped */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center text-foreground">
            {/* $ slightly closer */}
            <span className="text-5xl font-light -mr-2">$</span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0"
              className="text-6xl font-light bg-transparent border-none outline-none text-center w-auto"
              style={{ width: `${Math.max(amount.length, 1) + 1}ch` }}
              autoFocus
            />
          </div>
        </div>

        {/* Description Input */}
        <div className="text-center">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's it for?"
            className="text-lg text-foreground bg-transparent border-none outline-none text-center w-full placeholder:text-muted-foreground"
          />
        </div>

        {/* Recipient Input */}
        <div className="pt-4">
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="To (wallet address or username)"
            className="w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground outline-none focus:border-primary placeholder:text-muted-foreground"
          />
        </div>

        {/* Pay Button */}
        <div className="pt-8">
          <Button
            variant="default"
            size="lg"
            className="w-full"
            onClick={handlePay}
          >
            Pay ${amount || "0"} USDC
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Pay;