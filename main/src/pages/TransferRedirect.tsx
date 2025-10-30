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
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

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
 * TransferRedirect Component - Payment Checkout Page
 *
 * This is the recipient-facing payment page shown when a payer clicks a payment link.
 * It acts as a checkout page that:
 * 1. Reads payment details from URL (recipient, amount, label, message)
 * 2. Displays payment details clearly to the payer
 * 3. Shows recipient wallet for verification
 * 4. Prompts payer to connect wallet and confirm payment
 * 5. Processes USDC transfer from payer to recipient
 * 6. Shows success/failure confirmation with transaction details
 */
const TransferRedirect = () => {
  // Get URL query parameters using React Router's useSearchParams hook
  const [searchParams] = useSearchParams();

  // Wallet adapter hooks for connecting wallet and sending transactions
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();

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

    console.log("=== PAYMENT LINK OPENED ===");
    console.log("Recipient:", recipient);
    console.log("Amount:", amount);
    console.log("Label:", label);
    console.log("Message:", message);

    // VALIDATION: Check if recipient exists
    if (!recipient) {
      setError("Missing required parameter: recipient wallet address");
      toast.error("Missing recipient wallet address");
      return;
    }

    // VALIDATION: Verify the recipient is a valid Solana PublicKey
    try {
      new PublicKey(recipient);
    } catch (err) {
      setError("Invalid recipient wallet address");
      toast.error("Invalid Solana wallet address");
      return;
    }

    // VALIDATION: Check if amount exists
    if (!amount || parseFloat(amount) <= 0) {
      setError("Missing or invalid amount parameter");
      toast.error("Please provide a valid amount in the URL");
      return;
    }

    console.log("✓ Payment link validated successfully");
  }, [searchParams]);

  // Function to process the USDC payment (payer sends to recipient from URL)
  const handlePayment = async () => {
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet first");
      return;
    }

    const recipient = searchParams.get("recipient");
    const amount = searchParams.get("amount");
    const label = searchParams.get("label");

    console.log("=== PROCESSING PAYMENT ===");
    console.log("From (payer - you):", publicKey.toBase58());
    console.log("To (recipient):", recipient);
    console.log("Amount:", amount, "USDC");

    if (!recipient || !amount || parseFloat(amount) <= 0) {
      toast.error("Invalid payment parameters");
      return;
    }

    try {
      setIsProcessing(true);
      setTransactionStatus("processing");

      // Parse recipient address from URL
      const recipientPubkey = new PublicKey(recipient);

      // Get the payer's USDC token account
      const payerTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        publicKey
      );

      // CHECK IF PAYER HAS USDC ACCOUNT
      let payerBalance = 0;
      try {
        const payerAccountInfo = await getAccount(connection, payerTokenAccount);
        payerBalance = Number(payerAccountInfo.amount) / Math.pow(10, USDC_DECIMALS);
        console.log(`✓ Your USDC account exists. Balance: ${payerBalance} USDC`);
      } catch (error) {
        console.error("✗ Your USDC account not found for mint:", USDC_MINT.toBase58());
        const network = connection.rpcEndpoint.includes('devnet') ? 'devnet' : 'mainnet';
        toast.error(
          `You don't have a USDC account for ${network}. Please add USDC to your wallet first.`
        );
        setIsProcessing(false);
        return;
      }

      // Check if payer has enough USDC
      const requiredAmount = parseFloat(amount);
      if (payerBalance < requiredAmount) {
        toast.error(`Insufficient USDC balance. You have ${payerBalance} USDC but need ${requiredAmount} USDC`);
        setIsProcessing(false);
        return;
      }

      // Get the recipient's USDC token account
      const recipientTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        recipientPubkey
      );

      // Convert amount to token units (USDC has 6 decimals)
      // This safely converts decimal amount (e.g., "10.50") to smallest units
      // For USDC: $10.50 → 10.50 * 10^6 = 10,500,000 base units
      // For split payments: amount already represents the per-share calculated with cents math
      const amountInTokenUnits = Math.floor(
        parseFloat(amount) * Math.pow(10, USDC_DECIMALS)
      );

      console.log(`Converting $${amount} USDC to ${amountInTokenUnits} base units`);

      // Show user-friendly confirmation
      toast.info(`Preparing to send ${amount} USDC to ${recipient.substring(0, 8)}...`);

      // Create transaction
      const transaction = new Transaction();
      console.log("=== BUILDING TRANSACTION ===");

      // Check if recipient's USDC account exists, if not create it
      try {
        await getAccount(connection, recipientTokenAccount);
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
      console.log(`  From: ${payerTokenAccount.toBase58()}`);
      console.log(`  To: ${recipientTokenAccount.toBase58()}`);

      transaction.add(
        createTransferInstruction(
          payerTokenAccount,
          recipientTokenAccount,
          publicKey,
          amountInTokenUnits
        )
      );

      console.log(`Total instructions in transaction: ${transaction.instructions.length}`);

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
      }, "finalized");

      console.log("Transaction finalized!");

      // Verify balance changed
      try {
        const newPayerAccountInfo = await getAccount(connection, payerTokenAccount);
        const newPayerBalance = Number(newPayerAccountInfo.amount) / Math.pow(10, USDC_DECIMALS);
        console.log(`Old balance: ${payerBalance} USDC`);
        console.log(`New balance: ${newPayerBalance} USDC`);
        console.log(`Sent: ${payerBalance - newPayerBalance} USDC`);

        if (newPayerBalance === payerBalance) {
          console.warn("⚠️ WARNING: Balance didn't change!");
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

  // SUCCESS STATE: Show success message after payment is completed
  if (transactionStatus === "success") {
    const amount = searchParams.get("amount");
    const label = searchParams.get("label");
    const recipient = searchParams.get("recipient");
    const total = searchParams.get("total");
    const splitCount = searchParams.get("splitCount");
    const shareIndex = searchParams.get("shareIndex");
    const network = connection.rpcEndpoint.includes('devnet') ? 'devnet' : 'mainnet';
    const explorerUrl = `https://solscan.io/tx/${transactionSignature}?cluster=${network}`;

    const isSplitPayment = splitCount && total;

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
              Payment Complete
            </h1>
            <p className="text-base text-muted-foreground">
              {isSplitPayment
                ? `Your share (${shareIndex ? `#${Number(shareIndex) + 1}` : "1"} of ${splitCount}) has been paid`
                : "Transaction finalized on Solana"}
            </p>
          </div>

          {/* Payment Details Card */}
          <div className="bg-card border border-border/50 rounded-3xl p-8 shadow-xl space-y-6 backdrop-blur-sm">
            {amount && (
              <div className="pb-4 border-b border-border/50">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  {isSplitPayment ? "Your Share Paid" : "Amount Sent"}
                </div>
                <div className="text-4xl font-bold text-foreground">
                  ${amount} <span className="text-2xl font-normal text-muted-foreground">USDC</span>
                </div>
                {isSplitPayment && (
                  <div className="mt-3 text-sm text-muted-foreground">
                    Part of ${total} total split among {splitCount} people
                  </div>
                )}
              </div>
            )}
            {label && (
              <div className="pb-4 border-b border-border/50">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Description</div>
                <div className="text-lg text-foreground">{label}</div>
              </div>
            )}
            {recipient && (
              <div className="pb-4 border-b border-border/50">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Recipient</div>
                <div className="text-sm text-foreground font-mono break-all">
                  {recipient}
                </div>
              </div>
            )}
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Transaction</div>
              <div className="text-xs text-muted-foreground/70 font-mono break-all bg-muted/30 rounded-2xl p-4">
                {transactionSignature}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <Button
              variant="default"
              size="lg"
              className="w-full h-14 rounded-2xl text-base font-semibold shadow-lg hover:shadow-xl transition-all"
              onClick={() => window.open(explorerUrl, '_blank')}
            >
              View on Explorer
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
  const recipient = searchParams.get("recipient");
  const amount = searchParams.get("amount");
  const label = searchParams.get("label");
  const message = searchParams.get("message");
  const total = searchParams.get("total");
  const splitCount = searchParams.get("splitCount");
  const shareIndex = searchParams.get("shareIndex");

  // Determine if this is a split payment
  const isSplitPayment = splitCount && total;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-6">
      <div className="max-w-lg w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold text-foreground tracking-tight">
            Complete Your Payment
          </h1>
          <p className="text-base text-muted-foreground">
            {isSplitPayment
              ? `This is a split payment — you're paying ${shareIndex ? `share #${Number(shareIndex) + 1}` : "your share"} of ${splitCount}`
              : "You've been requested to pay the following amount:"}
          </p>
        </div>

        {/* Payment Details Card */}
        <div className="bg-card border border-border/50 rounded-3xl p-8 shadow-xl backdrop-blur-sm space-y-6">
          {/* Amount Section */}
          <div className="text-center pb-6 border-b border-border/50">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">You owe</div>
            <div className="text-6xl font-bold text-foreground">
              ${amount || "0"}
            </div>
            <div className="text-xl text-muted-foreground mt-2">USDC</div>

            {/* Split Context */}
            {isSplitPayment && (
              <div className="mt-4 pt-4 border-t border-border/30">
                <div className="text-sm text-muted-foreground">
                  1 of {splitCount} shares
                </div>
                <div className="text-xs text-muted-foreground/70 mt-1">
                  Total: ${total} split among {splitCount} people
                </div>
              </div>
            )}
          </div>

          {/* Description/Label */}
          {label && (
            <div className="pb-6 border-b border-border/50">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Description</div>
              <div className="text-lg text-foreground font-medium">
                {label}
              </div>
            </div>
          )}

          {/* Message/Note */}
          {message && (
            <div className="pb-6 border-b border-border/50">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Note</div>
              <div className="text-base text-foreground">
                {message}
              </div>
            </div>
          )}

          {/* Recipient Wallet - Always show so payer can verify */}
          {recipient && (
            <div className="bg-muted/30 rounded-2xl p-4 border border-border/30">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Recipient Wallet</div>
              <div className="text-sm text-foreground font-mono break-all mb-2">
                {recipient}
              </div>
              <div className="text-xs text-muted-foreground/70 italic">
                ⚠️ Verify before confirming your payment
              </div>
            </div>
          )}

          {/* Connected Wallet (Payer) - Show for transparency */}
          {connected && publicKey && (
            <div className="bg-primary/10 rounded-2xl p-4 border border-primary/20">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Your Wallet (Paying From)</div>
              <div className="text-sm text-foreground font-mono break-all">
                {publicKey.toBase58()}
              </div>
            </div>
          )}
        </div>

        {/* Wallet Connection / Pay Button */}
        <div className="space-y-3">
          {!connected ? (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">Connect your wallet to complete this payment</p>
                <WalletMultiButton className="!bg-primary !text-primary-foreground hover:!bg-primary/90 !rounded-2xl !px-8 !py-4 !h-14 !text-base !font-semibold !shadow-lg hover:!shadow-xl !transition-all" />
              </div>
            </div>
          ) : (
            <Button
              variant="default"
              size="lg"
              className="w-full h-16 text-lg font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all bg-gradient-to-r from-primary to-primary/90"
              onClick={handlePayment}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  <span>Processing Payment...</span>
                </div>
              ) : (
                `Pay $${amount || "0"} Now`
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
 * PAYMENT CHECKOUT PAGE - USAGE GUIDE
 * ====================================
 *
 * This is the checkout page where payers complete payment requests.
 *
 * FLOW:
 * 1. Recipient creates payment link on /pay page (generates /transfer URL with params)
 * 2. Recipient shares the payment link
 * 3. Payer clicks the link and lands on this page
 * 4. Payer sees payment details (amount, description, recipient wallet)
 * 5. Payer connects wallet and clicks "Pay $X Now"
 * 6. USDC transfers from payer → recipient
 * 7. Success screen shows transaction confirmation
 *
 * URL FORMAT:
 * https://yourapp.com/transfer?recipient=WALLET&amount=10&label=Coffee&message=Thanks
 *
 * URL PARAMETERS:
 * - recipient (required): Recipient's Solana wallet address
 * - amount (required): Amount in USDC (e.g., 10.50)
 * - label (optional): Short description shown to payer
 * - message (optional): Additional note/context for payment
 *
 * EXAMPLE PAYMENT LINK:
 * /transfer?recipient=GJyX7wS27fECdBRWZhsUMeAzvGPVnc3nQrAqm3EdMST3&amount=5.00&label=Lunch&message=Split%20bill
 *
 * INTEGRATION:
 * Payment links are automatically generated in Pay.tsx when recipients click
 * "Generate Payment Link". The link is copied to clipboard for easy sharing
 * via text, email, social media, etc.
 */
