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
    const label = searchParams.get("label");

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
      setTransactionStatus("processing");

      // Parse recipient address
      const recipientPubkey = new PublicKey(recipient);

      // Get the sender's USDC token account
      const senderTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        publicKey
      );

      // CHECK IF SENDER HAS USDC ACCOUNT
      let senderAccountExists = false;
      let senderBalance = 0;
      try {
        const senderAccountInfo = await getAccount(connection, senderTokenAccount);
        senderAccountExists = true;
        senderBalance = Number(senderAccountInfo.amount) / Math.pow(10, USDC_DECIMALS);
        console.log(`✓ Sender USDC account exists. Balance: ${senderBalance} USDC`);
        console.log(`✓ Sender token account: ${senderTokenAccount.toBase58()}`);
      } catch (error) {
        console.error("✗ Sender USDC account not found for mint:", USDC_MINT.toBase58());
        console.error("Error details:", error);

        // Provide helpful error message
        const network = connection.rpcEndpoint.includes('devnet') ? 'devnet' : 'mainnet';
        toast.error(
          `You don't have the correct USDC token for ${network}. ` +
          `Expected mint: ${USDC_MINT.toBase58().substring(0, 8)}...`
        );

        console.log("💡 TIP: Check your wallet's USDC token mint address and update USDC_MINT_DEVNET in TransferRedirect.tsx");
        setIsProcessing(false);
        return;
      }

      // Check if sender has enough USDC
      const requiredAmount = parseFloat(amount);
      if (senderBalance < requiredAmount) {
        toast.error(`Insufficient USDC balance. You have ${senderBalance} USDC but need ${requiredAmount} USDC`);
        setIsProcessing(false);
        return;
      }

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
      toast.info(`Preparing to send ${amount} USDC`);

      // Create transaction
      const transaction = new Transaction();
      console.log("=== BUILDING TRANSACTION ===");

      // Check if recipient's USDC account exists, if not create it
      let recipientAccountExists = false;
      try {
        await getAccount(connection, recipientTokenAccount);
        recipientAccountExists = true;
        console.log("✓ Recipient USDC account exists");
      } catch (error) {
        // Account doesn't exist, need to create it
        console.log("✓ Adding instruction: Create recipient's USDC account");
        toast.info("Creating recipient's USDC account...");
        transaction.add(
          createAssociatedTokenAccountInstruction(
            publicKey, // payer
            recipientTokenAccount, // ata
            recipientPubkey, // owner
            USDC_MINT // mint
          )
        );
      }

      // Add USDC transfer instruction
      console.log(`✓ Adding instruction: Transfer ${amount} USDC (${amountInTokenUnits} base units)`);
      console.log(`  From: ${senderTokenAccount.toBase58()}`);
      console.log(`  To: ${recipientTokenAccount.toBase58()}`);

      transaction.add(
        createTransferInstruction(
          senderTokenAccount,
          recipientTokenAccount,
          publicKey,
          amountInTokenUnits
        )
      );

      console.log(`Total instructions in transaction: ${transaction.instructions.length}`);

      // Log each instruction type
      transaction.instructions.forEach((instruction, index) => {
        console.log(`Instruction ${index + 1}:`, {
          programId: instruction.programId.toBase58(),
          keys: instruction.keys.length,
          data: instruction.data.length
        });
      });

      // Send transaction
      console.log("Sending transaction...");
      const signature = await sendTransaction(transaction, connection);
      console.log("Transaction sent! Signature:", signature);
      const network = connection.rpcEndpoint.includes('devnet') ? 'devnet' : 'mainnet';
      console.log(`View transaction: https://solscan.io/tx/${signature}?cluster=${network}`);

      // Store signature immediately
      setTransactionSignature(signature);

      // Wait for finalization
      toast.loading("Finalizing transaction on-chain...", { id: "tx-confirm" });

      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      }, "finalized"); // Using 'finalized' for full confirmation

      console.log("Transaction finalized!");

      // Verify balance changed
      try {
        const newSenderAccountInfo = await getAccount(connection, senderTokenAccount);
        const newSenderBalance = Number(newSenderAccountInfo.amount) / Math.pow(10, USDC_DECIMALS);
        console.log(`Old balance: ${senderBalance} USDC`);
        console.log(`New balance: ${newSenderBalance} USDC`);
        console.log(`Difference: ${senderBalance - newSenderBalance} USDC`);

        if (newSenderBalance === senderBalance) {
          console.warn("⚠️ WARNING: Balance didn't change! USDC may not have transferred.");
        }
      } catch (error) {
        console.error("Could not verify balance change:", error);
      }

      console.log(`View on Solscan: https://solscan.io/tx/${signature}?cluster=${network}`);

      // Update status to success
      setTransactionStatus("success");
      toast.dismiss("tx-confirm");
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

  // SUCCESS STATE: Show success message after transaction is finalized
  if (transactionStatus === "success") {
    const amount = searchParams.get("amount");
    const label = searchParams.get("label");
    const network = connection.rpcEndpoint.includes('devnet') ? 'devnet' : 'mainnet';
    const explorerUrl = `https://solscan.io/tx/${transactionSignature}?cluster=${network}`;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-8">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
              <div className="text-5xl">✅</div>
            </div>
          </div>

          {/* Success Message */}
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-foreground">
              Payment Successful!
            </h1>
            <p className="text-lg text-muted-foreground">
              Your payment has been finalized on-chain
            </p>
          </div>

          {/* Payment Details */}
          <div className="bg-input/50 rounded-lg p-6 space-y-4">
            {amount && (
              <div>
                <div className="text-sm text-muted-foreground">Amount</div>
                <div className="text-2xl font-bold text-foreground">
                  ${amount} USDC
                </div>
              </div>
            )}
            {label && (
              <div>
                <div className="text-sm text-muted-foreground">For</div>
                <div className="text-lg text-foreground">{label}</div>
              </div>
            )}
            <div>
              <div className="text-sm text-muted-foreground">Transaction Signature</div>
              <div className="text-xs text-foreground font-mono break-all mt-1">
                {transactionSignature}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              variant="default"
              size="lg"
              className="w-full"
              onClick={() => window.open(explorerUrl, '_blank')}
            >
              View on Solana Explorer
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-8">
          {/* Error Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
              <div className="text-5xl">❌</div>
            </div>
          </div>

          {/* Error Message */}
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-foreground">
              Payment Failed
            </h1>
            <p className="text-lg text-muted-foreground">
              {transactionError || "The transaction could not be completed"}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              variant="default"
              size="lg"
              className="w-full"
              onClick={() => {
                setTransactionStatus("idle");
                setTransactionError("");
                setTransactionSignature("");
              }}
            >
              Try Again
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
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
