import { defineChain } from 'viem';
import { http, webSocket } from 'wagmi';

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

// Oasis Sapphire Testnet configuration
// Chain ID: 0x5aff (23295 in decimal)
export const oasisSapphireTestnet = defineChain({
  id: 23295, // 0x5aff
  name: 'Oasis Sapphire Testnet',
  network: 'oasis-sapphire-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'ROSE',
    symbol: 'ROSE',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet.sapphire.oasis.io'],
      webSocket: ['wss://testnet.sapphire.oasis.io/ws'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Oasis Explorer',
      url: 'https://explorer.oasis.io/testnet/sapphire',
    },
  },
});

export const wagmiConfig = createConfig({
  chains: [oasisSapphireLocalnet, oasisSapphireTestnet],
  transports: {
    [oasisSapphireLocalnet.id]: http('http://localhost:8545'),
    [oasisSapphireTestnet.id]: http('https://testnet.sapphire.oasis.io'),
  },
});



