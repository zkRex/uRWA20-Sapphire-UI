import { defineChain } from 'viem';
import { http } from 'wagmi';
import { sapphireTestnet } from 'wagmi/chains';

import { createConfig } from '@privy-io/wagmi';

// Oasis Sapphire Localnet configuration
// Chain ID: 0x5afd (23293 in decimal)
export const oasisSapphireLocalnet = defineChain({
  id: 23293, // 0x5afd
  name: 'Oasis Sapphire Localnet',
  network: 'oasis-sapphire-localnet',
  nativeCurrency: {
    decimals: 18,
    name: 'ROSE',
    symbol: 'ROSE',
  },
  rpcUrls: {
    default: {
      http: ['http://localhost:8545'],
      webSocket: ['ws://localhost:8546'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Local Explorer',
      url: 'http://localhost:8545',
    },
  },
});

// Use wagmi's built-in Sapphire Testnet chain for proper gas handling
export const oasisSapphireTestnet = sapphireTestnet;

export const wagmiConfig = createConfig({
  chains: [oasisSapphireLocalnet, oasisSapphireTestnet],
  transports: {
    [oasisSapphireLocalnet.id]: http('http://localhost:8545'),
    [oasisSapphireTestnet.id]: http('https://testnet.sapphire.oasis.io'),
  },
});



