'use client';

import { useState, useEffect } from 'react';
import { usePublicClient, useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Hex } from 'viem';
import { readContract } from 'viem/actions';
import { Button } from '@/components/ui/button';
import { getContractAddress } from '@/constants/address';
import uRWA20Abi from '@/constants/uRWA20-abi.json';
import { useNetwork } from '@/contexts/NetworkContext';
import {
  extractEncryptedData,
  getEventName,
  formatAddressShort,
  formatTokenAmount,
  formatDecryptedData,
  DecryptedData,
} from '@/lib/encryption-utils';

interface Transaction {
  blockNumber: bigint;
  transactionHash: string;
  eventName: string;
  encryptedData: Hex | null;
  timestamp?: number;
  decrypted?: DecryptedData;
  isDecrypting?: boolean;
}

export function TransactionHistory() {
  const { address } = useAccount();
  const { network } = useNetwork();
  const contractAddress = getContractAddress(network);
  const publicClient = usePublicClient();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromBlock, setFromBlock] = useState<string>('');
  const [filterAddress, setFilterAddress] = useState<string>('');

  const {
    writeContract,
    data: hash,
    isPending: isWritePending,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const fetchTransactions = async () => {
    if (!publicClient) return;

    setIsLoading(true);
    setError(null);

    try {
      const currentBlock = await publicClient.getBlockNumber();
      const startBlock = fromBlock ? BigInt(fromBlock) : currentBlock - BigInt(1000);

      // Fetch all relevant events
      const logs = await publicClient.getLogs({
        address: contractAddress,
        fromBlock: startBlock,
        toBlock: 'latest',
      });

      const txMap = new Map<string, Transaction>();

      for (const log of logs) {
        const eventName = getEventName(log);
        if (!eventName) continue;

        const encryptedData = extractEncryptedData(log);

        // Filter by address if specified (check topics for indexed addresses)
        if (filterAddress) {
          const hasAddress = log.topics.some(
            (topic) =>
              topic.toLowerCase().includes(filterAddress.toLowerCase().replace('0x', ''))
          );
          if (!hasAddress) continue;
        }

        const tx: Transaction = {
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          eventName,
          encryptedData,
        };

        txMap.set(log.transactionHash, tx);
      }

      // Convert to array and sort by block number
      const txArray = Array.from(txMap.values()).sort(
        (a, b) => Number(b.blockNumber - a.blockNumber)
      );

      setTransactions(txArray);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch transactions');
      console.error('Transaction fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (publicClient) {
      fetchTransactions();
    }
  }, [publicClient, contractAddress]);

  const handleDecrypt = async (tx: Transaction) => {
    if (!tx.encryptedData || !publicClient || !address) return;

    // Mark as decrypting
    setTransactions((prev) =>
      prev.map((t) =>
        t.transactionHash === tx.transactionHash ? { ...t, isDecrypting: true } : t
      )
    );

    try {
      // Call processDecryption
      await writeContract({
        address: contractAddress,
        abi: uRWA20Abi,
        functionName: 'processDecryption',
        args: [tx.encryptedData],
      });

      // Wait a bit for transaction to confirm, then fetch decrypted data
      setTimeout(async () => {
        try {
          const result = await readContract(publicClient, {
            address: contractAddress,
            abi: uRWA20Abi,
            functionName: 'viewLastDecryptedData',
            args: ['0x'],
          });

          const decrypted = formatDecryptedData(result);

          setTransactions((prev) =>
            prev.map((t) =>
              t.transactionHash === tx.transactionHash
                ? { ...t, decrypted, isDecrypting: false }
                : t
            )
          );
        } catch (err) {
          console.error('Failed to read decrypted data:', err);
          setTransactions((prev) =>
            prev.map((t) =>
              t.transactionHash === tx.transactionHash ? { ...t, isDecrypting: false } : t
            )
          );
        }
      }, 3000);
    } catch (err: any) {
      console.error('Decryption error:', err);
      setTransactions((prev) =>
        prev.map((t) =>
          t.transactionHash === tx.transactionHash ? { ...t, isDecrypting: false } : t
        )
      );
    }
  };

  const getEventBadgeColor = (eventName: string) => {
    if (eventName.includes('Transfer')) return 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100';
    if (eventName.includes('Approval')) return 'bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100';
    if (eventName.includes('Frozen')) return 'bg-orange-100 dark:bg-orange-900 text-orange-900 dark:text-orange-100';
    if (eventName.includes('Whitelist')) return 'bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-100';
    return 'bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100';
  };

  return (
    <div className="w-full border rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Transaction History</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={filterAddress}
            onChange={(e) => setFilterAddress(e.target.value)}
            placeholder="Filter by address"
            className="w-48 p-2 border rounded text-sm font-mono"
          />
          <input
            type="text"
            value={fromBlock}
            onChange={(e) => setFromBlock(e.target.value)}
            placeholder="From block"
            className="w-32 p-2 border rounded text-sm"
          />
          <Button onClick={fetchTransactions} disabled={isLoading} size="sm">
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive rounded">
          <h4 className="font-medium text-destructive mb-1">Error:</h4>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {transactions.length > 0 ? (
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {transactions.map((tx) => (
            <div
              key={tx.transactionHash}
              className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${getEventBadgeColor(
                        tx.eventName
                      )}`}
                    >
                      {tx.eventName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Block #{tx.blockNumber.toString()}
                    </span>
                    {tx.encryptedData && (
                      <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100 rounded">
                        Encrypted
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {formatAddressShort(tx.transactionHash)}
                  </div>
                </div>

                {tx.encryptedData && !tx.decrypted && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDecrypt(tx)}
                    disabled={tx.isDecrypting || isWritePending || isConfirming}
                  >
                    {tx.isDecrypting ? 'Decrypting...' : 'Decrypt'}
                  </Button>
                )}
              </div>

              {tx.decrypted && (
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded">
                  <div className="text-xs font-semibold text-green-900 dark:text-green-100 mb-2">
                    Decrypted Data:
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">From:</span>
                      <div className="font-mono" title={tx.decrypted.from}>
                        {formatAddressShort(tx.decrypted.from)}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">To:</span>
                      <div className="font-mono" title={tx.decrypted.to}>
                        {formatAddressShort(tx.decrypted.to)}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Amount:</span>
                      <div className="font-semibold">
                        {formatTokenAmount(tx.decrypted.amount)}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Action:</span>
                      <div className="font-medium capitalize">{tx.decrypted.action}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-8">
          {isLoading ? 'Loading transactions...' : 'No transactions found'}
        </div>
      )}

      {transactions.length > 0 && (
        <div className="text-sm text-muted-foreground text-center pt-2 border-t">
          Showing {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
