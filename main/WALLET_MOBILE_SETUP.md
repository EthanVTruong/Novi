# Solana Wallet Adapter - Mobile Deep Linking Setup

This app uses the official Solana Wallet Adapter libraries that provide full mobile wallet support through deep linking.

## Features

### ✅ Mobile Deep Linking (solana: URI)
- Automatically opens mobile wallet apps when users need to connect or sign transactions
- Uses the `solana:` URI scheme (similar to `mailto:` or `tel:`)
- Seamlessly redirects users back to your app after wallet interactions

### ✅ Mobile Wallet Detection
- Detects if user is on mobile vs desktop
- Shows appropriate wallet options based on device
- Gracefully handles both browser extensions and mobile apps

### ✅ Automatic Redirects
- User clicks "Connect" → Opens wallet app
- User approves in wallet → Returns to your app
- Transaction signing follows the same flow

## Supported Wallets

The following wallets are configured with mobile support:

1. **Phantom** - Popular wallet with excellent mobile deep linking
2. **Solflare** - Full-featured wallet with mobile app
3. **Torus** - Web-based wallet (works on mobile browsers)
4. **Ledger** - Hardware wallet support

## How It Works

### Connection Flow (Mobile)

```
1. User clicks "Connect Wallet" button
   ↓
2. Wallet Adapter detects mobile device
   ↓
3. Opens wallet app via: solana:connect?app_url=https://yourapp.com
   ↓
4. User approves connection in wallet app
   ↓
5. Wallet app redirects back: https://yourapp.com?wallet_connected=true
   ↓
6. App is now connected to wallet
```

### Transaction Flow (Mobile)

```
1. User initiates payment/transaction
   ↓
2. App creates transaction and requests signature
   ↓
3. Opens wallet app via: solana:signTransaction?transaction=...
   ↓
4. User reviews and approves in wallet app
   ↓
5. Wallet signs and redirects back with signature
   ↓
6. App receives signed transaction and submits to blockchain
```

## Implementation

### 1. Wallet Configuration (`src/config/walletConfig.tsx`)

```typescript
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';

// These adapters automatically handle mobile deep linking
const wallets = [
  new PhantomWalletAdapter(),  // Mobile deep linking enabled
  new SolflareWalletAdapter(), // Mobile deep linking enabled
];
```

### 2. Provider Setup (`src/App.tsx`)

```typescript
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';

<ConnectionProvider endpoint={endpoint}>
  <WalletProvider wallets={wallets} autoConnect>
    <WalletModalProvider>
      {/* Your app */}
    </WalletModalProvider>
  </WalletProvider>
</ConnectionProvider>
```

### 3. Using the Wallet Button

```typescript
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

// This button automatically handles mobile deep linking
<WalletMultiButton />
```

## Testing Mobile Wallet Connection

### Prerequisites
1. Install a Solana wallet app on your mobile device (e.g., Phantom from App Store/Play Store)
2. Have some SOL in your wallet (use devnet for testing)

### Test Steps

1. **Open your app on mobile device**
   - Navigate to your app URL on mobile browser
   - Click "Connect Wallet" button

2. **Connection will trigger deep link**
   - Your mobile OS will prompt: "Open in Phantom?" (or your wallet app)
   - Tap "Open"

3. **Approve in wallet app**
   - Wallet app opens with connection request
   - Review the connection details
   - Tap "Connect" or "Approve"

4. **Redirect back to app**
   - Wallet automatically redirects back to your app
   - You should see "Connected" status
   - Wallet address should be displayed

5. **Test transaction**
   - Initiate a payment or transaction
   - App will deep link to wallet again
   - Approve transaction in wallet
   - Wallet redirects back with signed transaction

## Network Configuration

Current network: **Devnet** (for development)

To switch to mainnet for production:

```typescript
// src/config/walletConfig.tsx
const network = WalletAdapterNetwork.Mainnet; // Change from Devnet
```

## Troubleshooting

### Deep link not opening wallet app
- Ensure wallet app is installed on mobile device
- Check that app URL scheme is registered correctly
- Try force-closing and reopening browser

### Wallet connects but doesn't redirect back
- Check your app's redirect URL configuration
- Ensure your app is served over HTTPS (required for some wallets)
- Verify wallet app is up to date

### Desktop browser shows mobile wallets
- This is normal - the adapter shows all available options
- Desktop users can still use browser extensions
- Mobile-only wallets will be disabled on desktop

## Packages Installed

```json
{
  "@solana/wallet-adapter-react": "Wallet hooks and context",
  "@solana/wallet-adapter-react-ui": "Pre-built UI components",
  "@solana/wallet-adapter-wallets": "Wallet adapters (Phantom, Solflare, etc.)",
  "@solana/wallet-adapter-base": "Base adapter types",
  "@solana/web3.js": "Solana blockchain interaction",
  "bs58": "Base58 encoding for signatures"
}
```

## Learn More

- [Solana Wallet Adapter Docs](https://github.com/solana-labs/wallet-adapter)
- [Solana Mobile Stack](https://solanamobile.com/)
- [Mobile Wallet Adapter Spec](https://github.com/solana-mobile/mobile-wallet-adapter)
