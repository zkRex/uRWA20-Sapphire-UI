'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider } from '@privy-io/wagmi';
import { wagmiConfig, oasisSapphireLocalnet, oasisSapphireTestnet } from './wagmiConfig';
import { NetworkProvider } from '@/contexts/NetworkContext';

const queryClient = new QueryClient();

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

if (!privyAppId || privyAppId === 'your-privy-app-id') {
  throw new Error(
    'Missing Privy App ID. Please set NEXT_PUBLIC_PRIVY_APP_ID in your .env.local file. ' +
    'Get your App ID from https://dashboard.privy.io'
  );
}

// TypeScript assertion: privyAppId is guaranteed to be a string after the check above
const validatedAppId: string = privyAppId;

export default function Providers({ children }: { children: React.ReactNode }) {
  const privyClientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID;
  
  const privyProps = {
    appId: validatedAppId,
    ...(privyClientId ? { clientId: privyClientId } : {}),
    // Configure Privy to support both Oasis Sapphire Localnet and Testnet chains
    config: {
      // Configure supported chains - must be inside config object
      supportedChains: [oasisSapphireLocalnet, oasisSapphireTestnet],
      defaultChain: oasisSapphireLocalnet,
      // Create embedded wallets for users who don't have a wallet
      embeddedWallets: {
        ethereum: {
          createOnLogin: 'users-without-wallets' as const,
          noPromptOnSignature: false,
        },
      },
    },
  };
  
  return (
    <NetworkProvider>
      <PrivyProvider {...privyProps}>
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
        </QueryClientProvider>
      </PrivyProvider>
    </NetworkProvider>
  );
}

