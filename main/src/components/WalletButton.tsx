import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';

interface WalletButtonProps {
  className?: string;
}

/**
 * Enhanced WalletMultiButton with mobile deep linking support.
 *
 * This component uses Solana Wallet Adapter which automatically handles:
 * - Mobile deep linking via solana: URI scheme
 * - Wallet detection (browser extension vs mobile wallet)
 * - Redirecting to wallet app on mobile for transaction approval
 * - Automatic redirect back to your app after approval
 *
 * Supported mobile wallets:
 * - Phantom (phantom.app)
 * - Solflare (solflare.com)
 * - Other wallets that support the Solana Mobile Wallet Adapter standard
 *
 * How it works:
 * 1. User clicks "Connect Wallet"
 * 2. On mobile: Wallet adapter detects no browser extension and uses deep linking
 * 3. Opens wallet app via solana: URI (e.g., solana:connect?app_url=...)
 * 4. User approves connection in their wallet app
 * 5. Wallet app redirects back to your app with connection details
 * 6. Your app is now connected and can request transactions
 *
 * For transactions:
 * 1. App creates transaction and requests signature
 * 2. Wallet adapter opens wallet app via solana: URI
 * 3. User reviews and approves transaction
 * 4. Wallet app signs and returns to your app
 * 5. Your app submits the signed transaction
 */
export const WalletButton = ({ className }: WalletButtonProps) => {
  const { connected, publicKey } = useWallet();

  return (
    <div className="flex items-center gap-2">
      <WalletMultiButton className={className} />
      {connected && publicKey && (
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
        </span>
      )}
    </div>
  );
};
