'use client';

import { useEffect } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { useWallets } from '@privy-io/react-auth';
import { useNetwork } from '@/contexts/NetworkContext';

export function NetworkSwitch() {
  const { currentChain } = useNetwork();
  const { address, chainId, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const { wallets } = useWallets();
  const wallet = wallets[0];

  // Switch chain when wallet is connected and on wrong chain
  useEffect(() => {
    if (isConnected && address && chainId && chainId !== currentChain.id) {
      const switchToChain = async () => {
        try {
          // Use Privy's wallet chain switching if available, otherwise use wagmi
          if (wallet?.setChain) {
            const result = wallet.setChain(currentChain.id);
            if (result && typeof result.catch === 'function') {
              await result;
            }
          } else if (switchChain) {
            const result = switchChain({ chainId: currentChain.id });
            if (result && typeof result.catch === 'function') {
              await result;
            }
          }
        } catch (error) {
          console.error('Failed to switch chain:', error);
        }
      };
      switchToChain();
    }
  }, [isConnected, address, chainId, currentChain.id, wallet, switchChain]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Network:</span>
      <span className="text-sm font-medium">Testnet</span>
    </div>
  );
}

