'use client';

import { useEffect } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { useWallets } from '@privy-io/react-auth';
import { useNetwork } from '@/contexts/NetworkContext';
import { Button } from '@/components/ui/button';
import { oasisSapphireLocalnet, oasisSapphireTestnet } from '@/app/wagmiConfig';

export function NetworkSwitch() {
  const { network, setNetwork, currentChain } = useNetwork();
  const { address, chainId, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const { wallets } = useWallets();
  const wallet = wallets[0];

  // Switch chain when network changes and wallet is connected
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
  }, [network, isConnected, address, chainId, currentChain.id, wallet, switchChain]);

  const handleNetworkChange = (newNetwork: 'localhost' | 'testnet') => {
    setNetwork(newNetwork);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Network:</span>
      <div className="flex gap-1 border rounded-md p-1 bg-background">
        <Button
          variant={network === 'localhost' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleNetworkChange('localhost')}
          className="h-7 px-3 text-xs"
        >
          Localhost
        </Button>
        <Button
          variant={network === 'testnet' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleNetworkChange('testnet')}
          className="h-7 px-3 text-xs"
        >
          Testnet
        </Button>
      </div>
    </div>
  );
}

