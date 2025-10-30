import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';

interface WalletContextType {
  isAuthenticated: boolean;
  walletAddress: string | null;
  signIn: () => Promise<void>;
  signOut: () => void;
  requireSignIn: (callback: () => void) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider = ({ children }: WalletProviderProps) => {
  const { publicKey, signMessage, connected, disconnect } = useWallet();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    // Check if there's a stored authenticated session
    const storedAuth = localStorage.getItem('wallet_authenticated');
    const storedAddress = localStorage.getItem('wallet_address');

    if (storedAuth === 'true' && storedAddress && connected && publicKey?.toBase58() === storedAddress) {
      setIsAuthenticated(true);
      setWalletAddress(storedAddress);
    }
  }, [connected, publicKey]);

  useEffect(() => {
    // Reset authentication if wallet is disconnected
    if (!connected) {
      setIsAuthenticated(false);
      setWalletAddress(null);
      localStorage.removeItem('wallet_authenticated');
      localStorage.removeItem('wallet_address');
    }
  }, [connected]);

  const signIn = async () => {
    if (!publicKey || !signMessage) {
      throw new Error('Wallet not connected');
    }

    try {
      // Create a message to sign
      const message = new TextEncoder().encode(
        `Sign in to Novi Pay\n\nWallet: ${publicKey.toBase58()}\nTimestamp: ${Date.now()}`
      );

      // Request signature from wallet
      const signature = await signMessage(message);

      // Verify the signature (in a real app, you'd verify this on the backend)
      const signatureBase58 = bs58.encode(signature);

      // Store authentication
      const address = publicKey.toBase58();
      setIsAuthenticated(true);
      setWalletAddress(address);
      localStorage.setItem('wallet_authenticated', 'true');
      localStorage.setItem('wallet_address', address);
      localStorage.setItem('wallet_signature', signatureBase58);

      console.log('Wallet authenticated:', address);
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    }
  };

  const signOut = () => {
    setIsAuthenticated(false);
    setWalletAddress(null);
    localStorage.removeItem('wallet_authenticated');
    localStorage.removeItem('wallet_address');
    localStorage.removeItem('wallet_signature');
    disconnect();
  };

  const requireSignIn = (callback: () => void) => {
    if (isAuthenticated) {
      callback();
    }
  };

  return (
    <WalletContext.Provider
      value={{
        isAuthenticated,
        walletAddress,
        signIn,
        signOut,
        requireSignIn,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWalletAuth = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWalletAuth must be used within a WalletProvider');
  }
  return context;
};
