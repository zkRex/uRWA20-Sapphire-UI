import { http } from 'wagmi';
import { sapphireTestnet } from 'wagmi/chains';

import { createConfig } from '@privy-io/wagmi';

// Use wagmi's built-in Sapphire Testnet chain for proper gas handling
export const oasisSapphireTestnet = sapphireTestnet;

export const wagmiConfig = createConfig({
  chains: [oasisSapphireTestnet],
  transports: {
    [oasisSapphireTestnet.id]: http('https://testnet.sapphire.oasis.io'),
  },
});



