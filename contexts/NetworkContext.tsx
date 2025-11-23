'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { oasisSapphireLocalnet, oasisSapphireTestnet } from '@/app/wagmiConfig';

export type NetworkType = 'localhost' | 'testnet';

interface NetworkContextType {
  network: NetworkType;
  setNetwork: (network: NetworkType) => void;
  currentChain: typeof oasisSapphireLocalnet | typeof oasisSapphireTestnet;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [network, setNetworkState] = useState<NetworkType>(() => {
    // Check localStorage for saved preference, default to localhost
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('network');
      if (saved === 'testnet' || saved === 'localhost') {
        return saved;
      }
    }
    return 'localhost';
  });

  const setNetwork = (newNetwork: NetworkType) => {
    setNetworkState(newNetwork);
    if (typeof window !== 'undefined') {
      localStorage.setItem('network', newNetwork);
    }
  };

  const currentChain = network === 'testnet' ? oasisSapphireTestnet : oasisSapphireLocalnet;

  return (
    <NetworkContext.Provider value={{ network, setNetwork, currentChain }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}



