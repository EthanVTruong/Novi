import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PublicKey, Transaction, clusterApiUrl } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount
} from "@solana/spl-token";
import { encodeURL, TransferRequestURLFields } from "@solana/pay";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import BigNumber from "bignumber.js";

// USDC Mint Addresses
const USDC_MINT_MAINNET = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
// Devnet USDC - If you're using a different devnet USDC token, update this address:
const USDC_MINT_DEVNET = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const USDC_DECIMALS = 6; // USDC has 6 decimals

// To find your devnet USDC mint address:
// 1. Open your wallet
// 2. Click on your USDC token
// 3. Look for "Token Address" or "Mint Address"
// 4. Update USDC_MINT_DEVNET above with that address

/**
 * TransferRedirect Component
 *
 * This component handles Solana Pay deep link redirects by:
 * 1. Reading query parameters from the URL (recipient, amount, label, message)
 * 2. Validating the recipient wallet address
 * 3. Building a valid Solana Pay deep link
 * 4. Automatically redirecting the user to open their wallet
 * 5. Showing a fallback message if the wallet doesn't open
 */
const TransferRedirect = () => {
  // Get URL query parameters using React Router's useSearchParams hook
  const [searchParams] = useSearchParams();

  // Wallet adapter hooks for connecting wallet and sending transactions
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();

  // State to store the generated Solana Pay link
  const [solanaPayLink, setSolanaPayLink] = useState<string>("");

  // State to track if there's an error (e.g., missing recipient)
  const [error, setError] = useState<string>("");

  // State to track transaction status
  const [isProcessing, setIsProcessing] = useState(false);

  // Transaction success/failure states
  const [transactionStatus, setTransactionStatus] = useState<"idle" | "processing" | "success" | "failed">("idle");
  const [transactionSignature, setTransactionSignature] = useState<string>("");
  const [transactionError, setTransactionError] = useState<string>("");

  // Detect network and use appropriate USDC mint
  const USDC_MINT = connection.rpcEndpoint.includes('devnet')
    ? USDC_MINT_DEVNET
    : USDC_MINT_MAINNET;

  useEffect(() => {
    console.log("=== NETWORK INFO ===");
    console.log("RPC Endpoint:", connection.rpcEndpoint);
    console.log("Using USDC Mint:", USDC_MINT.toBase58());
    console.log("Network:", connection.rpcEndpoint.includes('devnet') ? 'DEVNET' : 'MAINNET');
  }, []);

  useEffect(() => {
    // Extract query parameters from URL
    const amount = searchParams.get("amount");
    const label = searchParams.get("label");
    const message = searchParams.get("message");

    // VALIDATION: Check if amount exists
    if (!amount || parseFloat(amount) <= 0) {
      setError("Missing or invalid amount parameter");
      toast.error("Please provide a valid amount in the URL");
      return;
    }

    // Solana Pay link will be generated using the connected wallet as recipient
    console.log("Payment request initialized for amount:", amount);
  }, [searchParams]);

  // Function to generate a Solana Pay link for payment request
  const handleGeneratePaymentLink = async () => {
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet first");
      return;
    }

    const amount = searchParams.get("amount");
    const label = searchParams.get("label");
    const message = searchParams.get("message");

    console.log("=== PAYMENT REQUEST DEBUG ===");
    console.log("Raw amount from URL:", amount);
    console.log("Parsed amount:", parseFloat(amount || "0"));
    console.log("Connected wallet (recipient):", publicKey.toBase58());

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Invalid amount");
      return;
    }

    try {
      setIsProcessing(true);

      // Build Solana Pay URL with connected wallet as recipient
      const urlFields: TransferRequestURLFields = {
        recipient: recipientPubkey,
        splToken: USDC_MINT,
      };

      if (amount) {
        urlFields.amount = new BigNumber(amount);
      }

      if (label) {
        urlFields.label = label;
      }

      if (message) {
        urlFields.message = message;
      }

      const solanaPayUrl = encodeURL(urlFields);
      const paymentLink = solanaPayUrl.toString();

      console.log("Generated Solana Pay URL:", paymentLink);

      // Copy to clipboard
      await navigator.clipboard.writeText(paymentLink);

      toast.success("Payment request link copied! Share this with the payer.", { duration: 5000 });
      setTransactionStatus("success");
      setTransactionSignature(paymentLink); // Store the link instead of signature
      setIsProcessing(false);
    } catch (err: any) {
      console.error("Payment error:", err);
      console.error("Full error object:", JSON.stringify(err, null, 2));

      // Provide more helpful error messages
      let errorMessage = "Payment failed";

      if (err.message?.includes("could not find account") || err.message?.includes("TokenAccountNotFoundError")) {
        errorMessage = "Your USDC account not found. Make sure you have USDC in your wallet.";
      } else if (err.message?.includes("insufficient funds") || err.message?.includes("Attempt to debit an account but found no record")) {
        errorMessage = "Insufficient USDC balance or SOL for transaction fees";
      } else if (err.message?.includes("User rejected") || err.message?.includes("User canceled")) {
        errorMessage = "Transaction cancelled by user";
      } else if (err.message) {
        errorMessage = err.message;
      }

      // Update status to failed
      setTransactionStatus("failed");
      setTransactionError(errorMessage);
      toast.dismiss("tx-confirm");
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // SUCCESS STATE: Show success message after link is generated
  if (transactionStatus === "success") {
    const amount = searchParams.get("amount");
    const label = searchParams.get("label");

    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-6">
        <div className="max-w-lg w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center shadow-lg">
              <div className="text-6xl">✅</div>
            </div>
          </div>

          {/* Success Message */}
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-foreground tracking-tight">
              Link Generated!
            </h1>
            <p className="text-base text-muted-foreground">
              Share this Solana Pay link with the payer
            </p>
          </div>

          {/* Payment Details Card */}
          <div className="bg-card border border-border/50 rounded-3xl p-8 shadow-xl space-y-6 backdrop-blur-sm">
            {amount && (
              <div className="pb-4 border-b border-border/50">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Requesting</div>
                <div className="text-4xl font-bold text-foreground">
                  ${amount} <span className="text-2xl font-normal text-muted-foreground">USDC</span>
                </div>
              </div>
            )}
            {label && (
              <div className="pb-4 border-b border-border/50">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Description</div>
                <div className="text-lg text-foreground">{label}</div>
              </div>
            )}
            {connected && publicKey && (
              <div className="pb-4 border-b border-border/50">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">To Wallet</div>
                <div className="text-sm text-foreground font-mono break-all">
                  {publicKey.toBase58()}
                </div>
              </div>
            )}
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Payment Link</div>
              <div className="text-xs text-muted-foreground/70 font-mono break-all bg-muted/30 rounded-2xl p-4">
                {transactionSignature}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Link copied to clipboard!
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <Button
              variant="default"
              size="lg"
              className="w-full h-14 rounded-2xl text-base font-semibold shadow-lg hover:shadow-xl transition-all"
              onClick={async () => {
                await navigator.clipboard.writeText(transactionSignature);
                toast.success("Link copied again!");
              }}
            >
              Copy Link Again
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="w-full h-14 rounded-2xl text-base"
              onClick={() => window.location.href = '/'}
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // FAILURE STATE: Show error message if transaction failed
  if (transactionStatus === "failed") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-destructive/5 flex items-center justify-center p-6">
        <div className="max-w-lg w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Error Icon */}
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-red-500/20 to-red-600/10 flex items-center justify-center shadow-lg">
              <div className="text-6xl">❌</div>
            </div>
          </div>

          {/* Error Message */}
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-foreground tracking-tight">
              Payment Failed
            </h1>
            <p className="text-base text-muted-foreground max-w-md mx-auto">
              {transactionError || "The transaction could not be completed"}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            <Button
              variant="default"
              size="lg"
              className="w-full h-14 rounded-2xl text-base font-semibold shadow-lg hover:shadow-xl transition-all"
              onClick={() => {
                setTransactionStatus("idle");
                setTransactionError("");
                setTransactionSignature("");
              }}
            >
              Try Again
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="w-full h-14 rounded-2xl text-base"
              onClick={() => window.location.href = '/'}
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ERROR STATE: Show error message if validation failed
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="text-red-500 text-lg font-semibold">Error</div>
          <p className="text-foreground">{error}</p>
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="mt-4"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // MAIN STATE: Show wallet connection and payment interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-foreground tracking-tight">
              Payment Request
            </h1>
            <p className="text-base text-muted-foreground">
              {connected
                ? "Generate a payment link to your wallet"
                : "Connect wallet to create request"}
            </p>
          </div>

          {/* Payment Details Card */}
          {searchParams.get("amount") && (
            <div className="bg-card border border-border/50 rounded-3xl p-8 shadow-xl backdrop-blur-sm space-y-6">
              <div className="pb-4 border-b border-border/50">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Amount</div>
                <div className="text-5xl font-bold text-foreground">
                  ${searchParams.get("amount")}
                </div>
                <div className="text-xl text-muted-foreground mt-2">USDC</div>
              </div>
              {searchParams.get("label") && (
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Description</div>
                  <div className="text-lg text-foreground">
                    {searchParams.get("label")}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Wallet connection / Payment button */}
          <div className="pt-2">
            {!connected ? (
              <div className="flex justify-center">
                <WalletMultiButton className="!bg-primary !text-primary-foreground hover:!bg-primary/90 !rounded-2xl !px-8 !py-4 !h-14 !text-base !font-semibold !shadow-lg hover:!shadow-xl !transition-all" />
              </div>
            ) : (
              <Button
                variant="default"
                size="lg"
                className="w-full h-14 text-base font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all"
                onClick={handleGeneratePaymentLink}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Generating...
                  </div>
                ) : (
                  `Generate Link • $${searchParams.get("amount") || "0"}`
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransferRedirect;

/*
 * SETUP INSTRUCTIONS
 * ==================
 *
 * 1. ADD ROUTE TO APP.TSX
 *    Open src/App.tsx and add this route inside the <Routes> component:
 *
 *    <Route path="/transfer" element={<TransferRedirect />} />
 *
 *    Make sure to also add the import at the top:
 *    import TransferRedirect from "./pages/TransferRedirect";
 *
 *    Example placement (before the catch-all route):
 *    ```tsx
 *    <Route path="/" element={<Index />} />
 *    <Route path="/request" element={<Request />} />
 *    <Route path="/pay" element={<Pay />} />
 *    <Route path="/transfer" element={<TransferRedirect />} />
 *    <Route path="*" element={<NotFound />} />
 *    ```
 *
 * 2. RUN DEVELOPMENT SERVER
 *    ```bash
 *    npm run dev
 *    ```
 *
 * 3. TEST THE COMPONENT
 *    Visit a URL like this in your browser:
 *    http://localhost:5173/transfer?recipient=GJyX7wS27fECdBRWZhsUMeAzvGPVnc3nQrAqm3EdMST3&amount=0.5&label=Payment&message=Thank%20you
 *
 *    Required parameter:
 *    - recipient: Solana wallet address
 *
 *    Optional parameters:
 *    - amount: Amount in USDC (e.g., 10.50)
 *    - label: Short description
 *    - message: Detailed message
 *
 * 4. INTEGRATION WITH PAY BUTTON
 *    When a user clicks "Pay" in your Pay.tsx component, instead of just
 *    copying the link to clipboard, you can redirect them to:
 *
 *    navigate(`/transfer?recipient=${recipient}&amount=${amount}&label=${encodeURIComponent(description)}`);
 *
 *    This will automatically prompt the payer to complete the transaction
 *    in their wallet.
 */
