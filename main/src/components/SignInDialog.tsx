import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useWalletAuth } from '@/contexts/WalletContext';
import { toast } from 'sonner';

interface SignInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const SignInDialog = ({ open, onOpenChange, onSuccess }: SignInDialogProps) => {
  const { connected, publicKey } = useWallet();
  const { signIn } = useWalletAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsSigningIn(true);
    try {
      await signIn();
      toast.success('Successfully signed in!');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Sign in error:', error);
      toast.error('Failed to sign in. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign In with Wallet</DialogTitle>
          <DialogDescription>
            Connect and sign with your Solana wallet to continue with this transaction.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!connected ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Step 1: Connect your wallet
              </p>
              <div className="flex justify-center">
                <WalletMultiButton className="!bg-primary hover:!bg-primary/90 !h-12" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Connected wallet:
                </p>
                <p className="text-sm font-mono bg-muted p-2 rounded break-all">
                  {publicKey?.toBase58()}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Step 2: Sign the message to authenticate
                </p>
                <Button
                  onClick={handleSignIn}
                  disabled={isSigningIn}
                  className="w-full"
                  size="lg"
                >
                  {isSigningIn ? 'Signing...' : 'Sign Message'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SignInDialog;
