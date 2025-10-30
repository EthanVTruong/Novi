import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PublicKey } from "@solana/web3.js";
import { encodeURL, TransferRequestURLFields } from "@solana/pay";
import BigNumber from "bignumber.js";

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

  // State to store the generated Solana Pay link
  const [solanaPayLink, setSolanaPayLink] = useState<string>("");

  // State to track if there's an error (e.g., missing recipient)
  const [error, setError] = useState<string>("");

  // State to track if wallet opening was attempted
  const [walletOpened, setWalletOpened] = useState(false);

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

  // Function to handle opening the wallet
  const handleOpenWallet = () => {
    if (solanaPayLink) {
      setWalletOpened(true);
      window.location.href = solanaPayLink;
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

  // MAIN STATE: Show button to open wallet
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        {!walletOpened ? (
          // Before wallet is opened - show call to action
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="text-3xl font-bold text-foreground">
                Ready to Pay
              </div>
              <p className="text-lg text-muted-foreground">
                Click the button below to open your Solana wallet and complete the payment
              </p>
            </div>

            {/* Payment details */}
            {searchParams.get("amount") && (
              <div className="bg-input/50 rounded-lg p-6 space-y-2">
                <div className="text-sm text-muted-foreground">Amount</div>
                <div className="text-4xl font-bold text-foreground">
                  {searchParams.get("amount")} SOL
                </div>
                {searchParams.get("label") && (
                  <div className="text-muted-foreground pt-2">
                    {searchParams.get("label")}
                  </div>
                )}
              </div>
            )}

            {/* Open Wallet Button */}
            <Button
              variant="default"
              size="lg"
              className="w-full text-lg py-6"
              onClick={handleOpenWallet}
            >
              Open Wallet to Pay
            </Button>
          </div>
        ) : (
          // After clicking button - show waiting state
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="text-2xl font-semibold text-foreground">
                Opening your wallet...
              </div>
              <p className="text-muted-foreground">
                If your wallet didn't open, click the button below to try again
              </p>
              {/* Loading spinner */}
              <div className="flex justify-center pt-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            </div>

            {/* Retry button */}
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={handleOpenWallet}
            >
              Try Again
            </Button>
          </div>
        )}
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
 *    - amount: Amount in SOL (e.g., 0.5)
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
