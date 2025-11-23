'use client';

import { createContext, useContext, ReactNode } from 'react';
import { oasisSapphireTestnet } from '@/app/wagmiConfig';

export type NetworkType = 'testnet';

interface NetworkContextType {
  network: NetworkType;
  currentChain: typeof oasisSapphireTestnet;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const network: NetworkType = 'testnet';
  const currentChain = oasisSapphireTestnet;

  return (
    <NetworkContext.Provider value={{ network, currentChain }}>
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



