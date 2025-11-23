'use client';

import { useState, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { AbiFunction } from 'viem';
import { Button } from '@/components/ui/button';
import { getContractAddress } from '@/constants/address';
import uRWA20Abi from '@/constants/uRWA20-abi.json';
import {
  getFunctions,
  groupFunctionsByType,
  requiresSiweToken,
  parseFunctionInputs,
  formatOutputValue,
  getFunctionSignature,
  getGasConfig,
} from '@/lib/contract-utils';
import { useSiweAuth } from '@/hooks/useSiweAuth';
import { formatAddress } from '@/lib/utils';
import { useNetwork } from '@/contexts/NetworkContext';

export function ContractInterface() {
  const { address, isConnected } = useAccount();
  const { network } = useNetwork();
  const contractAddress = useMemo(() => getContractAddress(network), [network]);
  const { writeContract, data: hash, isPending: isWritePending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });
  const { authToken, authenticate, clearAuth, isAuthenticated, isLoading: isAuthLoading } = useSiweAuth();

  const [selectedFunction, setSelectedFunction] = useState<AbiFunction | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [readResult, setReadResult] = useState<any>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);

  const functions = useMemo(() => getFunctions(uRWA20Abi as any), []);
  const { viewFunctions, writeFunctions } = useMemo(
    () => groupFunctionsByType(functions),
    [functions]
  );

  const handleInputChange = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleFunctionSelect = (fn: AbiFunction) => {
    setSelectedFunction(fn);
    setFormValues({});
    setReadResult(null);
    setReadError(null);
  };

  const publicClient = usePublicClient();

  const handleRead = async () => {
    if (!selectedFunction || !publicClient) return;

    setIsReading(true);
    setReadError(null);
    setReadResult(null);

    try {
      const args = parseFunctionInputs(selectedFunction, formValues, authToken || undefined);

      const result = await publicClient.readContract({
        address: contractAddress,
        abi: uRWA20Abi,
        functionName: selectedFunction.name as any,
        args: args.length > 0 ? args : undefined,
      });

      setReadResult(result);
    } catch (error: any) {
      setReadError(error?.message || 'Failed to read contract');
    } finally {
      setIsReading(false);
    }
  };

  const handleWrite = async () => {
    if (!selectedFunction || !publicClient) return;

    try {
      const args = parseFunctionInputs(selectedFunction, formValues);
      
      // Get gas configuration for Sapphire testnet
      const gasConfig = await getGasConfig(publicClient);
      console.log('Gas configuration:', gasConfig);

      // Estimate gas limit with buffer
      let gasLimit: bigint | undefined;
      try {
        const estimatedGas = await publicClient.estimateContractGas({
          address: contractAddress,
          abi: uRWA20Abi,
          functionName: selectedFunction.name as any,
          args: args.length > 0 ? args : undefined,
          value: selectedFunction.stateMutability === 'payable' ? BigInt(formValues.value || '0') : undefined,
          account: address,
          ...gasConfig
        });
        gasLimit = (estimatedGas * BigInt(120)) / BigInt(100); // 20% buffer
        console.log('Estimated gas limit:', gasLimit);
      } catch (e) {
        console.warn('Gas estimation failed, falling back to default:', e);
        // Don't set gasLimit if estimation fails, let wallet handle it or fail
      }

      const txParams = {
        address: contractAddress,
        abi: uRWA20Abi,
        functionName: selectedFunction.name as any,
        args: args.length > 0 ? args : undefined,
        value: selectedFunction.stateMutability === 'payable' ? BigInt(formValues.value || '0') : undefined,
        ...gasConfig,
        ...(gasLimit ? { gas: gasLimit } : {}),
      };
      
      console.log('Transaction params:', txParams);

      await writeContract(txParams);
    } catch (error: any) {
      console.error('Write contract error:', error);
      setReadError(error?.message || 'Failed to write contract');
    }
  };

  const needsAuth = selectedFunction && requiresSiweToken(selectedFunction);

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold mb-2">uRWA20 Contract Interface</h2>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Contract: {formatAddress(contractAddress, 10)}</span>
          {isConnected && address && (
            <span>Wallet: {formatAddress(address, 10)}</span>
          )}
        </div>
      </div>

      {/* SIWE Authentication Section */}
      {needsAuth && (
        <div className="p-4 border rounded-lg bg-muted/50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">SIWE Authentication Required</h3>
            {isAuthenticated ? (
              <Button variant="outline" size="sm" onClick={clearAuth}>
                Clear Auth
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={authenticate}
                disabled={isAuthLoading || !isConnected}
              >
                {isAuthLoading ? 'Authenticating...' : 'Authenticate'}
              </Button>
            )}
          </div>
          {isAuthenticated ? (
            <p className="text-sm text-green-600 dark:text-green-400">
              Authenticated - You can now call view functions
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              This function requires VIEWER_ROLE. Please authenticate to proceed.
            </p>
          )}
        </div>
      )}

      {/* Function Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* View Functions */}
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">View Functions ({viewFunctions.length})</h3>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {viewFunctions.map((fn, idx) => (
              <button
                key={`view-${idx}`}
                onClick={() => handleFunctionSelect(fn)}
                className={`w-full text-left p-2 rounded border text-sm transition-colors ${
                  selectedFunction?.name === fn.name
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <div className="font-mono">{fn.name}</div>
                {requiresSiweToken(fn) && (
                  <div className="text-xs opacity-75 mt-1">Requires SIWE</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Write Functions */}
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Write Functions ({writeFunctions.length})</h3>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {writeFunctions.map((fn, idx) => (
              <button
                key={`write-${idx}`}
                onClick={() => handleFunctionSelect(fn)}
                className={`w-full text-left p-2 rounded border text-sm transition-colors ${
                  selectedFunction?.name === fn.name
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <div className="font-mono">{fn.name}</div>
                <div className="text-xs opacity-75 mt-1">
                  {fn.stateMutability === 'payable' ? 'Payable' : 'Non-payable'}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Function Details and Input Form */}
      {selectedFunction && (
        <div className="border rounded-lg p-6 space-y-4">
          <div>
            <h3 className="font-semibold text-lg mb-2">{selectedFunction.name}</h3>
            <p className="text-sm text-muted-foreground font-mono">
              {getFunctionSignature(selectedFunction)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              State Mutability: {selectedFunction.stateMutability}
            </p>
          </div>

          {/* Input Fields */}
          {selectedFunction.inputs.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Parameters:</h4>
              {selectedFunction.inputs.map((input, idx) => {
                const key = `param_${idx}`;
                const isTokenParam = requiresSiweToken(selectedFunction) && idx === selectedFunction.inputs.length - 1;

                return (
                  <div key={idx} className="space-y-1">
                    <label className="text-sm font-medium">
                      {input.name || `Parameter ${idx + 1}`} ({input.type})
                      {isTokenParam && <span className="text-muted-foreground ml-2">(SIWE Token)</span>}
                    </label>
                    {isTokenParam && isAuthenticated ? (
                      <input
                        type="text"
                        value={authToken || ''}
                        disabled
                        className="w-full p-2 border rounded bg-muted"
                        placeholder="SIWE token will be used automatically"
                      />
                    ) : (
                      <input
                        type="text"
                        value={formValues[key] || ''}
                        onChange={(e) => handleInputChange(key, e.target.value)}
                        placeholder={`Enter ${input.type}`}
                        className="w-full p-2 border rounded"
                        disabled={isTokenParam}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Value input for payable functions */}
          {selectedFunction.stateMutability === 'payable' && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Value (in wei)</label>
              <input
                type="text"
                value={formValues.value || ''}
                onChange={(e) => handleInputChange('value', e.target.value)}
                placeholder="0"
                className="w-full p-2 border rounded"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {(selectedFunction.stateMutability === 'view' ||
              selectedFunction.stateMutability === 'pure') && (
              <Button
                onClick={handleRead}
                disabled={isReading || (needsAuth && !isAuthenticated)}
              >
                {isReading ? 'Reading...' : 'Read'}
              </Button>
            )}
            {(selectedFunction.stateMutability === 'nonpayable' ||
              selectedFunction.stateMutability === 'payable') && (
              <Button
                onClick={handleWrite}
                disabled={isWritePending || isConfirming || !isConnected}
              >
                {isWritePending
                  ? 'Confirming...'
                  : isConfirming
                  ? 'Waiting for confirmation...'
                  : 'Write'}
              </Button>
            )}
          </div>

          {/* Read Results */}
          {readResult !== null && (
            <div className="p-4 bg-muted rounded">
              <h4 className="font-medium mb-2">Result:</h4>
              <pre className="text-sm overflow-auto">
                {formatOutputValue(readResult)}
              </pre>
            </div>
          )}

          {/* Errors */}
          {readError && (
            <div className="p-4 bg-destructive/10 border border-destructive rounded">
              <h4 className="font-medium text-destructive mb-1">Error:</h4>
              <p className="text-sm">{readError}</p>
            </div>
          )}

          {/* Write Transaction Status */}
          {hash && (
            <div className="p-4 bg-muted rounded">
              <h4 className="font-medium mb-2">Transaction:</h4>
              <p className="text-sm font-mono break-all">{hash}</p>
              {isConfirmed && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                  Transaction confirmed!
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {!selectedFunction && (
        <div className="text-center text-muted-foreground py-8">
          Select a function from the lists above to interact with it
        </div>
      )}
    </div>
  );
}

