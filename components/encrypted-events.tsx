'use client';

import { useState, useEffect } from 'react';
import { usePublicClient, useAccount } from 'wagmi';
import { Hex, formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { getContractAddress } from '@/constants/address';
import uRWA20Abi from '@/constants/uRWA20-abi.json';
import { useNetwork } from '@/contexts/NetworkContext';
import { DecryptionViewer } from '@/components/decryption-viewer';
import {
  extractEncryptedData,
  getEventName,
  formatAddressShort,
} from '@/lib/encryption-utils';

interface EncryptedEvent {
  eventName: string;
  encryptedData: Hex;
  blockNumber: bigint;
  transactionHash: string;
  timestamp?: number;
}

export function EncryptedEvents() {
  const { address } = useAccount();
  const { network } = useNetwork();
  const contractAddress = getContractAddress(network);
  const publicClient = usePublicClient();

  const [events, setEvents] = useState<EncryptedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EncryptedEvent | null>(null);
  const [fromBlock, setFromBlock] = useState<string>('');

  const fetchEvents = async () => {
    if (!publicClient) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get current block number
      const currentBlock = await publicClient.getBlockNumber();

      // Default to last 1000 blocks if not specified
      const startBlock = fromBlock
        ? BigInt(fromBlock)
        : currentBlock - BigInt(1000);

      // Fetch all encrypted event logs
      const logs = await publicClient.getLogs({
        address: contractAddress,
        events: [
          {
            type: 'event',
            name: 'EncryptedTransfer',
            inputs: [{ type: 'bytes', name: 'encryptedData', indexed: false }],
          },
          {
            type: 'event',
            name: 'EncryptedApproval',
            inputs: [{ type: 'bytes', name: 'encryptedData', indexed: false }],
          },
          {
            type: 'event',
            name: 'EncryptedForcedTransfer',
            inputs: [{ type: 'bytes', name: 'encryptedData', indexed: false }],
          },
          {
            type: 'event',
            name: 'EncryptedFrozen',
            inputs: [{ type: 'bytes', name: 'encryptedData', indexed: false }],
          },
          {
            type: 'event',
            name: 'EncryptedWhitelisted',
            inputs: [{ type: 'bytes', name: 'encryptedData', indexed: false }],
          },
        ],
        fromBlock: startBlock,
        toBlock: 'latest',
      });

      // Process logs
      const processedEvents: EncryptedEvent[] = [];

      for (const log of logs) {
        const eventName = getEventName(log);
        const encryptedData = extractEncryptedData(log);

        if (eventName && encryptedData) {
          processedEvents.push({
            eventName,
            encryptedData,
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
          });
        }
      }

      // Sort by block number (most recent first)
      processedEvents.sort((a, b) => Number(b.blockNumber - a.blockNumber));

      setEvents(processedEvents);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch events');
      console.error('Event fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fetch events on mount
  useEffect(() => {
    if (publicClient) {
      fetchEvents();
    }
  }, [publicClient, contractAddress]);

  const handleDecryptEvent = (event: EncryptedEvent) => {
    setSelectedEvent(event);
  };

  const handleCloseDecryption = () => {
    setSelectedEvent(null);
  };

  return (
    <div className="w-full border rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Encrypted Events</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={fromBlock}
            onChange={(e) => setFromBlock(e.target.value)}
            placeholder="From block (optional)"
            className="w-40 p-2 border rounded text-sm"
          />
          <Button onClick={fetchEvents} disabled={isLoading} size="sm">
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive rounded">
          <h4 className="font-medium text-destructive mb-1">Error:</h4>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Events List */}
      {events.length > 0 ? (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {events.map((event, idx) => (
            <div
              key={`${event.transactionHash}-${idx}`}
              className="p-4 border rounded hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{event.eventName}</span>
                    <span className="text-xs text-muted-foreground">
                      Block #{event.blockNumber.toString()}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    Tx: {formatAddressShort(event.transactionHash)}
                  </div>
                  <div className="text-xs font-mono bg-muted p-2 rounded overflow-x-auto">
                    {event.encryptedData.slice(0, 66)}
                    {event.encryptedData.length > 66 && '...'}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDecryptEvent(event)}
                >
                  Decrypt
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-8">
          {isLoading ? 'Loading events...' : 'No encrypted events found'}
        </div>
      )}

      {/* Event count */}
      {events.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          Showing {events.length} encrypted event{events.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Decryption Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-lg shadow-lg">
            <div className="p-4 border-b">
              <h3 className="font-semibold">
                Decrypt {selectedEvent.eventName}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Transaction: {selectedEvent.transactionHash}
              </p>
            </div>
            <div className="p-4">
              <DecryptionViewer
                encryptedData={selectedEvent.encryptedData}
                onClose={handleCloseDecryption}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
