'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAccount, useReadContract, useSignMessage } from 'wagmi';
import { SiweMessage } from 'siwe';
import { parseSignature } from 'viem';
import { getContractAddress } from '@/constants/address';
import uRWA20Abi from '@/constants/uRWA20-abi.json';
import { useNetwork } from '@/contexts/NetworkContext';

interface SiweAuthState {
  authToken: string | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook for managing SIWE authentication with the uRWA20 contract
 * Handles creating SIWE messages, signing them, and obtaining auth tokens
 */
export function useSiweAuth() {
  const { address, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { network } = useNetwork();
  const contractAddress = useMemo(() => getContractAddress(network), [network]);
  const [state, setState] = useState<SiweAuthState>({
    authToken: null,
    isLoading: false,
    error: null,
  });

  // Read the domain from the contract
  const { data: domain, refetch: refetchDomain } = useReadContract({
    address: contractAddress,
    abi: uRWA20Abi,
    functionName: 'domain',
  });

  const [siweMessage, setSiweMessage] = useState<string | null>(null);
  const [signature, setSignature] = useState<any | null>(null);

  // Call login function to get auth token
  const { data: authTokenData, refetch: refetchLogin } = useReadContract({
    address: contractAddress,
    abi: uRWA20Abi,
    functionName: 'login',
    args: siweMessage && signature ? [siweMessage, signature] : undefined,
    query: {
      enabled: !!siweMessage && !!signature,
    },
  });

  // Update auth token when login returns
  useEffect(() => {
    if (authTokenData) {
      // viem returns bytes as hex string, but we need to ensure it's properly formatted
      const tokenHex = typeof authTokenData === 'string' 
        ? authTokenData 
        : `0x${Array.from(new Uint8Array(authTokenData as any))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')}`;
      
      setState(prev => ({
        ...prev,
        authToken: tokenHex,
        isLoading: false,
        error: null,
      }));
    }
  }, [authTokenData]);

  const authenticate = async (): Promise<void> => {
    if (!address || !chainId) {
      throw new Error('Wallet not connected');
    }

    if (!domain) {
      await refetchDomain();
      throw new Error('Unable to retrieve domain from contract');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Create SIWE message
      const message = new SiweMessage({
        domain: typeof domain === 'string' ? domain : '',
        address,
        uri: typeof window !== 'undefined' ? window.location.origin : `http://${domain}`,
        version: '1',
        chainId,
      }).toMessage();

      // Sign the message
      const sig = await signMessageAsync({ message });
      const signatureRSV = parseSignature(sig);

      setSiweMessage(message);
      setSignature(signatureRSV);

      // Trigger login call
      await refetchLogin();
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Authentication failed'),
      }));
      throw error;
    }
  };

  const clearAuth = () => {
    setState({
      authToken: null,
      isLoading: false,
      error: null,
    });
    setSiweMessage(null);
    setSignature(null);
  };

  return {
    ...state,
    authenticate,
    clearAuth,
    isAuthenticated: !!state.authToken,
  };
}

