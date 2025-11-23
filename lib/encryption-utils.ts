import { decodeEventLog, Log, Hex } from 'viem';
import uRWA20Abi from '@/constants/uRWA20-abi.json';

/**
 * Decrypted transaction data structure
 * Matches the return type from viewLastDecryptedData
 */
export interface DecryptedData {
  from: string;
  to: string;
  amount: bigint;
  action: string;
}

/**
 * Encrypted event types
 */
export type EncryptedEventName =
  | 'EncryptedTransfer'
  | 'EncryptedApproval'
  | 'EncryptedForcedTransfer'
  | 'EncryptedFrozen'
  | 'EncryptedWhitelisted';

/**
 * Extract encrypted data from an event log
 */
export function extractEncryptedData(log: Log): Hex | null {
  try {
    const decoded = decodeEventLog({
      abi: uRWA20Abi,
      data: log.data,
      topics: log.topics,
    });

    // All encrypted events have an 'encryptedData' field
    if (decoded.args && 'encryptedData' in decoded.args) {
      return decoded.args.encryptedData as Hex;
    }

    return null;
  } catch (error) {
    console.error('Failed to decode event log:', error);
    return null;
  }
}

/**
 * Format decrypted data for display
 */
export function formatDecryptedData(data: any): DecryptedData {
  // viewLastDecryptedData returns [from, to, amount, action]
  return {
    from: data[0] as string,
    to: data[1] as string,
    amount: BigInt(data[2]),
    action: data[3] as string,
  };
}

/**
 * Check if an event is an encrypted event
 */
export function isEncryptedEvent(eventName: string): boolean {
  return eventName.startsWith('Encrypted');
}

/**
 * Get event name from log topics
 */
export function getEventName(log: Log): string | null {
  try {
    const decoded = decodeEventLog({
      abi: uRWA20Abi,
      data: log.data,
      topics: log.topics,
    });
    return decoded.eventName ? String(decoded.eventName) : null;
  } catch {
    return null;
  }
}

/**
 * Format address for display
 */
export function formatAddressShort(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format amount with decimals (assumes 18 decimals like standard ERC20)
 */
export function formatTokenAmount(amount: bigint, decimals = 18): string {
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const remainder = amount % divisor;

  if (remainder === BigInt(0)) {
    return whole.toString();
  }

  const remainderStr = remainder.toString().padStart(decimals, '0');
  const trimmed = remainderStr.replace(/0+$/, '');
  return `${whole}.${trimmed}`;
}
