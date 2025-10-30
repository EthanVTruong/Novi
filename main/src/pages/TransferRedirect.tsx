import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PublicKey, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddress, createTransferInstruction } from "@solana/spl-token";
import { encodeURL, TransferRequestURLFields } from "@solana/pay";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import BigNumber from "bignumber.js";

// USDC Mint Address (Mainnet)
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const USDC_DECIMALS = 6; // USDC has 6 decimals

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

  useEffect(() => {
    // Extract query parameters from URL
    const recipient = searchParams.get("recipient");
    const amount = searchParams.get("amount");
    const label = searchParams.get("label");
    const message = searchParams.get("message");

    // VALIDATION: Check if recipient exists
    if (!recipient) {
      setError("Missing required parameter: recipient wallet address");
      toast.error("Missing recipient wallet address");
      return;
    }

    // VALIDATION: Verify the recipient is a valid Solana PublicKey
    let recipientPublicKey: PublicKey;
    try {
      recipientPublicKey = new PublicKey(recipient);
    } catch (err) {
      setError("Invalid recipient wallet address");
      toast.error("Invalid Solana wallet address");
      return;
    }

    // BUILD SOLANA PAY DEEP LINK using the official @solana/pay library
    // This ensures proper formatting and compatibility with all Solana wallets
    try {
      const urlFields: TransferRequestURLFields = {
        recipient: recipientPublicKey,
        splToken: USDC_MINT, // Specify USDC as the SPL token
      };

      // Add amount if provided (convert to BigNumber)
      if (amount) {
        urlFields.amount = new BigNumber(amount);
      }

      // Add optional label parameter
      if (label) {
        urlFields.label = label;
      }

      // Add optional message parameter
      if (message) {
        urlFields.message = message;
      }

      // Use the official encodeURL function to create a proper Solana Pay URL
      const url = encodeURL(urlFields);
      const solanaLink = url.toString();
      setSolanaPayLink(solanaLink);

      console.log("Generated Solana Pay link:", solanaLink);
    } catch (err) {
      console.error("Failed to generate Solana Pay URL:", err);
      setError("Failed to generate payment link");
      toast.error("Failed to generate payment link");
    }
  }, [searchParams]);

  // Function to handle the USDC payment transaction
  const handlePayment = async () => {
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet first");
      return;
    }

    const recipient = searchParams.get("recipient");
    const amount = searchParams.get("amount");

    console.log("=== PAYMENT DEBUG ===");
    console.log("Raw amount from URL:", amount);
    console.log("Parsed amount:", parseFloat(amount || "0"));

    if (!recipient) {
      toast.error("Missing recipient address");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Invalid amount");
      return;
    }

    try {
      setIsProcessing(true);

      // Parse recipient address
      const recipientPubkey = new PublicKey(recipient);

      // Get the sender's USDC token account
      const senderTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        publicKey
      );

      // Get the recipient's USDC token account
      const recipientTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        recipientPubkey
      );

      // Convert amount to token units (USDC has 6 decimals)
      const amountInTokenUnits = Math.floor(
        parseFloat(amount) * Math.pow(10, USDC_DECIMALS)
      );

      console.log(`Converting $${amount} USDC to ${amountInTokenUnits} base units`);
      console.log(`This equals: ${amountInTokenUnits / Math.pow(10, USDC_DECIMALS)} USDC`);

      // Show user-friendly confirmation
      toast.info(`Preparing to send ${amount} USDC (${amountInTokenUnits} base units)`);

      // Create transaction
      const transaction = new Transaction();

      // Add USDC transfer instruction
      transaction.add(
        createTransferInstruction(
          senderTokenAccount,
          recipientTokenAccount,
          publicKey,
          amountInTokenUnits
        )
      );

      // Send transaction
      const signature = await sendTransaction(transaction, connection);

      // Wait for confirmation
      toast.loading("Confirming transaction...", { id: "tx-confirm" });
      await connection.confirmTransaction(signature, "confirmed");

      toast.success("Payment successful!", { id: "tx-confirm" });
      console.log("Transaction signature:", signature);
    } catch (err: any) {
      console.error("Payment error:", err);

      // Provide more helpful error messages
      if (err.message?.includes("could not find account")) {
        toast.error("USDC account not found. Make sure both wallets have USDC accounts.");
      } else if (err.message?.includes("insufficient funds")) {
        toast.error("Insufficient USDC balance");
      } else {
        toast.error(err.message || "Payment failed");
      }
    } finally {
      setIsProcessing(false);
    }
  };

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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="text-3xl font-bold text-foreground">
              Ready to Pay
            </div>
            <p className="text-lg text-muted-foreground">
              {connected
                ? "Review the payment details and confirm"
                : "Connect your wallet to complete the payment"}
            </p>
          </div>

          {/* Payment details */}
          {searchParams.get("amount") && (
            <div className="bg-input/50 rounded-lg p-6 space-y-2">
              <div className="text-sm text-muted-foreground">Amount</div>
              <div className="text-4xl font-bold text-foreground">
                ${searchParams.get("amount")} USDC
              </div>
              {searchParams.get("label") && (
                <div className="text-muted-foreground pt-2">
                  {searchParams.get("label")}
                </div>
              )}
            </div>
          )}

          {/* Wallet connection / Payment button */}
          {!connected ? (
            <div className="flex justify-center">
              <WalletMultiButton className="!bg-primary !text-primary-foreground hover:!bg-primary/90 !rounded-lg !px-6 !py-3 !text-lg !font-semibold" />
            </div>
          ) : (
            <Button
              variant="default"
              size="lg"
              className="w-full text-lg py-6"
              onClick={handlePayment}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Processing...
                </div>
              ) : (
                `Pay $${searchParams.get("amount") || "0"} USDC`
              )}
            </Button>
          )}
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
