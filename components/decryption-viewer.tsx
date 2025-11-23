'use client';

import { useState, useEffect } from 'react';
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from 'wagmi';
import { Hex, readContract } from 'viem';
import { Button } from '@/components/ui/button';
import { getContractAddress } from '@/constants/address';
import uRWA20Abi from '@/constants/uRWA20-abi.json';
import { useNetwork } from '@/contexts/NetworkContext';
import {
  formatDecryptedData,
  formatAddressShort,
  formatTokenAmount,
  DecryptedData,
} from '@/lib/encryption-utils';

interface DecryptionViewerProps {
  encryptedData?: Hex;
  onClose?: () => void;
}

export function DecryptionViewer({ encryptedData: initialData, onClose }: DecryptionViewerProps) {
  const { address, isConnected } = useAccount();
  const { network } = useNetwork();
  const contractAddress = getContractAddress(network);
  const publicClient = usePublicClient();

  const [encryptedData, setEncryptedData] = useState<string>(initialData || '');
  const [decryptedData, setDecryptedData] = useState<DecryptedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);

  const {
    writeContract,
    data: hash,
    isPending: isWritePending,
    reset: resetWrite,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Auto-fetch decrypted data after processDecryption is confirmed
  useEffect(() => {
    if (isConfirmed && hash && publicClient && address) {
      fetchDecryptedData();
    }
  }, [isConfirmed, hash, publicClient, address]);

  const handleDecrypt = async () => {
    if (!encryptedData || !isConnected) return;

    setError(null);
    setDecryptedData(null);

    try {
      // Ensure encryptedData is in correct format
      const data = encryptedData.startsWith('0x')
        ? (encryptedData as Hex)
        : (`0x${encryptedData}` as Hex);

      await writeContract({
        address: contractAddress,
        abi: uRWA20Abi,
        functionName: 'processDecryption',
        args: [data],
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to process decryption');
      console.error('Decryption error:', err);
    }
  };

  const fetchDecryptedData = async () => {
    if (!publicClient || !address) return;

    setIsReading(true);
    setError(null);

    try {
      const result = await readContract(publicClient, {
        address: contractAddress,
        abi: uRWA20Abi,
        functionName: 'viewLastDecryptedData',
        args: ['0x'], // Empty bytes for session token (testnet mode)
      });

      const formatted = formatDecryptedData(result);
      setDecryptedData(formatted);
    } catch (err: any) {
      setError(err?.message || 'Failed to read decrypted data');
      console.error('Read error:', err);
    } finally {
      setIsReading(false);
    }
  };

  const handleClear = async () => {
    if (!isConnected) return;

    setError(null);

    try {
      await writeContract({
        address: contractAddress,
        abi: uRWA20Abi,
        functionName: 'clearLastDecryptedData',
        args: [],
      });

      // Reset local state
      setDecryptedData(null);
      setEncryptedData('');
      resetWrite();
    } catch (err: any) {
      setError(err?.message || 'Failed to clear data');
      console.error('Clear error:', err);
    }
  };

  const handleReset = () => {
    setDecryptedData(null);
    setEncryptedData('');
    setError(null);
    resetWrite();
  };

  return (
    <div className="w-full border rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Decrypt Transaction Data</h3>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      {/* Input Section */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Encrypted Data (hex bytes)</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={encryptedData}
            onChange={(e) => setEncryptedData(e.target.value)}
            placeholder="0x..."
            className="flex-1 p-2 border rounded font-mono text-sm"
            disabled={isWritePending || isConfirming}
          />
          <Button
            onClick={handleDecrypt}
            disabled={!encryptedData || isWritePending || isConfirming || !isConnected}
          >
            {isWritePending
              ? 'Confirming...'
              : isConfirming
              ? 'Processing...'
              : 'Decrypt'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Paste encrypted data from an EncryptedTransfer event
        </p>
      </div>

      {/* Transaction Status */}
      {hash && (
        <div className="p-3 bg-muted rounded text-sm">
          <div className="font-medium mb-1">Transaction Hash:</div>
          <div className="font-mono break-all text-xs">{hash}</div>
          {isConfirmed && (
            <div className="text-green-600 dark:text-green-400 mt-2">
              Decryption processed! {isReading ? 'Reading data...' : 'Fetching decrypted data...'}
            </div>
          )}
        </div>
      )}

      {/* Decrypted Data Display */}
      {decryptedData && (
        <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded space-y-3">
          <h4 className="font-semibold text-green-900 dark:text-green-100">
            Decrypted Transaction
          </h4>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">From:</span>
              <span className="font-mono" title={decryptedData.from}>
                {formatAddressShort(decryptedData.from)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">To:</span>
              <span className="font-mono" title={decryptedData.to}>
                {formatAddressShort(decryptedData.to)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-semibold">
                {formatTokenAmount(decryptedData.amount)} tokens
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Action:</span>
              <span className="font-medium capitalize">{decryptedData.action}</span>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={handleClear}>
              Clear Data
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              Decrypt Another
            </Button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive rounded">
          <h4 className="font-medium text-destructive mb-1">Error:</h4>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Info Box */}
      {!decryptedData && !error && (
        <div className="p-3 bg-muted/50 rounded text-sm text-muted-foreground">
          <p>
            Only authorized users can decrypt transaction data. You must be either:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>The sender of the transaction</li>
            <li>The receiver of the transaction</li>
            <li>An authorized auditor with proper permissions</li>
          </ul>
        </div>
      )}
    </div>
  );
}
