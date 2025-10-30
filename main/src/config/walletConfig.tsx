import { useMemo } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { SolanaMobileWalletAdapter } from '@solana-mobile/wallet-adapter-mobile';
import { clusterApiUrl } from '@solana/web3.js';

export const useWalletConfig = () => {
  // Set network to mainnet-beta for production, devnet for development
  const network = WalletAdapterNetwork.Devnet;

  // RPC endpoint - you can use custom RPC endpoints for better performance
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // Configure wallet adapters with mobile support
  // Mobile Wallet Adapter enables deep linking to mobile wallets like Phantom
  const wallets = useMemo(
    () => [
      /**
       * Wallets that implement either the Mobile Wallet Adapter Protocol
       * or the Wallet Standard will be available through `SolanaMobileWalletAdapter`
       */
      new SolanaMobileWalletAdapter({
        addressSelector: {
          uriPrefix: window.location.href.split('?')[0],
        },
        appIdentity: {
          name: 'Novi Pay',
          uri: window.location.origin,
          icon: '/NoviLogo.PNG',
        },
        authorizationResultCache: {
          get: async () => {
            const value = localStorage.getItem('walletAuthCache');
            return value ? JSON.parse(value) : undefined;
          },
          set: async (value) => {
            localStorage.setItem('walletAuthCache', JSON.stringify(value));
          },
          clear: async () => {
            localStorage.removeItem('walletAuthCache');
          },
        },
        cluster: network,
      }),

      // Desktop/Browser extension wallets
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
    ],
    [network]
  );

  return { endpoint, wallets };
};
