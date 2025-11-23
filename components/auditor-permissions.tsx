'use client';

import { useState } from 'react';
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from 'wagmi';
import { Address, isAddress } from 'viem';
import { Button } from '@/components/ui/button';
import { getContractAddress } from '@/constants/address';
import uRWA20Abi from '@/constants/uRWA20-abi.json';
import { useNetwork } from '@/contexts/NetworkContext';
import { formatAddressShort } from '@/lib/encryption-utils';

export function AuditorPermissions() {
  const { address, isConnected } = useAccount();
  const { network } = useNetwork();
  const contractAddress = getContractAddress(network);

  const [auditorAddress, setAuditorAddress] = useState('');
  const [duration, setDuration] = useState('3600'); // 1 hour default
  const [fullAccess, setFullAccess] = useState(false);
  const [addressList, setAddressList] = useState('');
  const [checkAddress, setCheckAddress] = useState('');
  const [checkTarget, setCheckTarget] = useState('');
  const [error, setError] = useState<string | null>(null);

  const {
    writeContract,
    data: hash,
    isPending: isWritePending,
    reset: resetWrite,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Read permission status
  const { data: permissionData, refetch: refetchPermission } = useReadContract({
    address: contractAddress,
    abi: uRWA20Abi,
    functionName: 'checkAuditorPermission',
    args:
      checkAddress && checkTarget && isAddress(checkAddress) && isAddress(checkTarget)
        ? [checkAddress as Address, checkTarget as Address]
        : undefined,
  });

  // Read auditor permission details
  const { data: auditorPermissionDetails, refetch: refetchDetails } = useReadContract({
    address: contractAddress,
    abi: uRWA20Abi,
    functionName: 'auditorPermissions',
    args: checkAddress && isAddress(checkAddress) ? [checkAddress as Address] : undefined,
  });

  const handleGrantPermission = async () => {
    if (!auditorAddress || !isConnected) return;

    setError(null);

    try {
      // Validate auditor address
      if (!isAddress(auditorAddress)) {
        setError('Invalid auditor address');
        return;
      }

      // Parse address list
      const addresses: Address[] = [];
      if (addressList.trim() && !fullAccess) {
        const parts = addressList.split(',').map((a) => a.trim());
        for (const addr of parts) {
          if (!isAddress(addr)) {
            setError(`Invalid address in list: ${addr}`);
            return;
          }
          addresses.push(addr as Address);
        }
      }

      await writeContract({
        address: contractAddress,
        abi: uRWA20Abi,
        functionName: 'grantAuditorPermission',
        args: [
          auditorAddress as Address,
          BigInt(duration),
          fullAccess,
          addresses,
        ],
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to grant permission');
      console.error('Grant permission error:', err);
    }
  };

  const handleRevokePermission = async () => {
    if (!auditorAddress || !isConnected) return;

    setError(null);

    try {
      if (!isAddress(auditorAddress)) {
        setError('Invalid auditor address');
        return;
      }

      await writeContract({
        address: contractAddress,
        abi: uRWA20Abi,
        functionName: 'revokeAuditorPermission',
        args: [auditorAddress as Address],
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to revoke permission');
      console.error('Revoke permission error:', err);
    }
  };

  const handleCheckPermission = () => {
    refetchPermission();
    refetchDetails();
  };

  const handleReset = () => {
    setAuditorAddress('');
    setDuration('3600');
    setFullAccess(false);
    setAddressList('');
    setError(null);
    resetWrite();
  };

  return (
    <div className="w-full border rounded-lg p-6 space-y-6">
      <h3 className="text-xl font-semibold">Auditor Permission Management</h3>

      {/* Grant Permission Section */}
      <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
        <h4 className="font-semibold">Grant Auditor Permission</h4>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Auditor Address</label>
            <input
              type="text"
              value={auditorAddress}
              onChange={(e) => setAuditorAddress(e.target.value)}
              placeholder="0x..."
              className="w-full p-2 border rounded font-mono text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Duration (seconds)</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="3600"
              className="w-full p-2 border rounded"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Examples: 3600 = 1 hour, 86400 = 1 day, 604800 = 1 week
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="fullAccess"
              checked={fullAccess}
              onChange={(e) => setFullAccess(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="fullAccess" className="text-sm font-medium">
              Full Access (can decrypt all transactions)
            </label>
          </div>

          {!fullAccess && (
            <div>
              <label className="text-sm font-medium">
                Allowed Addresses (comma-separated)
              </label>
              <textarea
                value={addressList}
                onChange={(e) => setAddressList(e.target.value)}
                placeholder="0x123..., 0x456..."
                className="w-full p-2 border rounded font-mono text-sm"
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Auditor will only be able to decrypt transactions involving these addresses
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleGrantPermission}
              disabled={!auditorAddress || isWritePending || isConfirming || !isConnected}
            >
              {isWritePending
                ? 'Confirming...'
                : isConfirming
                ? 'Processing...'
                : 'Grant Permission'}
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Revoke Permission Section */}
      <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
        <h4 className="font-semibold">Revoke Auditor Permission</h4>

        <div className="flex gap-2">
          <Button
            variant="destructive"
            onClick={handleRevokePermission}
            disabled={!auditorAddress || isWritePending || isConfirming || !isConnected}
          >
            Revoke Permission
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Uses the same auditor address from the form above
        </p>
      </div>

      {/* Check Permission Section */}
      <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
        <h4 className="font-semibold">Check Permission Status</h4>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Auditor Address</label>
            <input
              type="text"
              value={checkAddress}
              onChange={(e) => setCheckAddress(e.target.value)}
              placeholder="0x..."
              className="w-full p-2 border rounded font-mono text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Target Address (optional)</label>
            <input
              type="text"
              value={checkTarget}
              onChange={(e) => setCheckTarget(e.target.value)}
              placeholder="0x..."
              className="w-full p-2 border rounded font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Check if auditor has permission for a specific address
            </p>
          </div>

          <Button onClick={handleCheckPermission} variant="outline">
            Check Permission
          </Button>

          {/* Permission Result */}
          {checkAddress && auditorPermissionDetails && (
            <div className="p-3 bg-muted rounded space-y-2 text-sm">
              <div className="font-semibold">Permission Details:</div>
              <div className="grid gap-1">
                <div>
                  <span className="text-muted-foreground">Expiry:</span>{' '}
                  {auditorPermissionDetails[0] > 0
                    ? new Date(Number(auditorPermissionDetails[0]) * 1000).toLocaleString()
                    : 'Not set'}
                </div>
                <div>
                  <span className="text-muted-foreground">Full Access:</span>{' '}
                  {auditorPermissionDetails[1] ? 'Yes' : 'No'}
                </div>
              </div>
            </div>
          )}

          {/* Permission Check Result */}
          {checkAddress && checkTarget && permissionData !== undefined && (
            <div
              className={`p-3 rounded ${
                permissionData
                  ? 'bg-green-50 dark:bg-green-950 text-green-900 dark:text-green-100'
                  : 'bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-100'
              }`}
            >
              {permissionData
                ? `✓ Auditor ${formatAddressShort(checkAddress)} has permission for ${formatAddressShort(checkTarget)}`
                : `✗ Auditor ${formatAddressShort(checkAddress)} does NOT have permission for ${formatAddressShort(checkTarget)}`}
            </div>
          )}
        </div>
      </div>

      {/* Transaction Status */}
      {hash && (
        <div className="p-3 bg-muted rounded text-sm">
          <div className="font-medium mb-1">Transaction Hash:</div>
          <div className="font-mono break-all text-xs">{hash}</div>
          {isConfirmed && (
            <div className="text-green-600 dark:text-green-400 mt-2">
              Transaction confirmed!
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive rounded">
          <h4 className="font-medium text-destructive mb-1">Error:</h4>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Info */}
      <div className="p-3 bg-muted/50 rounded text-sm text-muted-foreground">
        <p className="font-medium mb-2">About Auditor Permissions:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Only contract admins can grant/revoke auditor permissions</li>
          <li>Full access allows decrypting all encrypted transactions</li>
          <li>Limited access restricts to specific addresses only</li>
          <li>Permissions expire after the specified duration</li>
        </ul>
      </div>
    </div>
  );
}
