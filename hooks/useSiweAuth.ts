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
  const contractAddress = useMemo(() => {
    try {
      return getContractAddress(network);
    } catch (error) {
      console.error('Failed to get contract address:', error);
      return undefined;
    }
  }, [network]);
  const [state, setState] = useState<SiweAuthState>({
    authToken: null,
    isLoading: false,
    error: null,
  });

  // Read the domain from the contract
  const { data: domain, refetch: refetchDomain, error: domainError } = useReadContract({
    address: contractAddress,
    abi: uRWA20Abi,
    functionName: 'domain',
    query: {
      enabled: !!contractAddress,
    },
  });

  const [loginArgs, setLoginArgs] = useState<[string, { r: `0x${string}`; s: `0x${string}`; v: bigint }] | undefined>(undefined);

  // Call login function to get auth token
  const { data: authTokenData, refetch: refetchLogin, error: loginError } = useReadContract({
    address: contractAddress,
    abi: uRWA20Abi,
    functionName: 'login',
    args: loginArgs,
    query: {
      enabled: !!loginArgs,
    },
  });

  // Update auth token when login returns
  useEffect(() => {
    if (authTokenData) {
      console.log('SIWE Auth: Received auth token:', authTokenData);
      // viem returns bytes as hex string, but we need to ensure it's properly formatted
      const tokenHex = typeof authTokenData === 'string' 
        ? authTokenData 
        : `0x${Array.from(new Uint8Array(authTokenData as any))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')}`;
      
      console.log('SIWE Auth: Formatted token:', tokenHex);
      setState(prev => ({
        ...prev,
        authToken: tokenHex,
        isLoading: false,
        error: null,
      }));
    }
  }, [authTokenData]);

  // Handle contract address errors
  useEffect(() => {
    if (!contractAddress) {
      const envVar = 'NEXT_PUBLIC_URWA20_TESTNET_CONTRACT_ADDRESS';
      console.error(`Contract address not available. Please set ${envVar} in your .env.local file`);
      setState(prev => ({
        ...prev,
        error: new Error(`Contract address not configured for testnet. Please set ${envVar} in your .env.local file`),
      }));
    }
  }, [contractAddress, network]);

  // Handle domain errors
  useEffect(() => {
    if (domainError) {
      console.error('Domain fetch error:', domainError);
      console.error('Contract address:', contractAddress);
      console.error('Network:', network);
    }
  }, [domainError, contractAddress, network]);

  // Handle login errors
  useEffect(() => {
    if (loginError) {
      console.error('Login error:', loginError);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: loginError instanceof Error ? loginError : new Error('Login failed'),
      }));
    }
  }, [loginError]);

  const authenticate = async (): Promise<void> => {
    if (!address || !chainId) {
      throw new Error('Wallet not connected');
    }

    if (!contractAddress) {
      const envVar = 'NEXT_PUBLIC_URWA20_TESTNET_CONTRACT_ADDRESS';
      throw new Error(`Contract address not configured for testnet. Please set ${envVar} in your .env.local file`);
    }

    console.log('SIWE Auth: Starting authentication...');
    console.log('SIWE Auth: Contract address:', contractAddress);
    console.log('SIWE Auth: Network:', network);
    console.log('SIWE Auth: Current domain:', domain);

    let currentDomain = domain;
    if (!currentDomain) {
      console.log('SIWE Auth: Domain not loaded, refetching...');
      const result = await refetchDomain();
      console.log('SIWE Auth: Refetch result:', result);
      currentDomain = result.data;
      if (!currentDomain) {
        console.error('SIWE Auth: Failed to retrieve domain from contract');
        console.error('SIWE Auth: Domain error:', result.error);
        throw new Error('Unable to retrieve domain from contract');
      }
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Create SIWE message with all required fields
      const domainString = typeof currentDomain === 'string' ? currentDomain : String(currentDomain);
      const uri = typeof window !== 'undefined' ? window.location.origin : `http://${domainString}`;
      
      const message = new SiweMessage({
        domain: domainString,
        address,
        uri,
        version: '1',
        chainId,
        nonce: Math.random().toString(36).substring(2, 15), // Generate a random nonce
        issuedAt: new Date().toISOString(),
        expirationTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      }).toMessage();

      console.log('SIWE Auth: Created message:', message);
      
      // Sign the message
      const sig = await signMessageAsync({ message });
      console.log('SIWE Auth: Signed message, signature:', sig);
      
      const parsedSig = parseSignature(sig);
      console.log('SIWE Auth: Parsed signature:', parsedSig);
      
      // Format signature for contract call - ensure v is a bigint
      const signatureRSV = {
        r: parsedSig.r,
        s: parsedSig.s,
        v: BigInt(parsedSig.v),
      };

      console.log('SIWE Auth: Formatted signature for contract:', signatureRSV);
      console.log('SIWE Auth: Calling login with args:', [message, signatureRSV]);

      // Set login args which will trigger the login contract call
      setLoginArgs([message, signatureRSV]);
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
    setLoginArgs(undefined);
  };

  return {
    ...state,
    authenticate,
    clearAuth,
    isAuthenticated: !!state.authToken,
  };
}

