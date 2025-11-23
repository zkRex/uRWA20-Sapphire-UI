/**
 * Contract addresses configuration
 * Reads from environment variables with proper type safety
 * Supports testnet environment
 */

const testnetContractAddress = process.env.NEXT_PUBLIC_URWA20_TESTNET_CONTRACT_ADDRESS;

// Validate testnet address if provided
if (testnetContractAddress && !/^0x[a-fA-F0-9]{40}$/.test(testnetContractAddress)) {
  throw new Error(
    `Invalid testnet contract address format: ${testnetContractAddress}. Must be a valid Ethereum address (0x followed by 40 hex characters)`
  );
}

export const TESTNET_CONTRACT_ADDRESS = testnetContractAddress as `0x${string}` | undefined;

/**
 * Get contract address for testnet
 * @param network - 'testnet'
 * @returns Contract address for testnet
 */
export function getContractAddress(network: 'testnet'): `0x${string}` {
  if (!testnetContractAddress) {
    throw new Error(
      'NEXT_PUBLIC_URWA20_TESTNET_CONTRACT_ADDRESS is not set in environment variables'
    );
  }
  
  return testnetContractAddress as `0x${string}`;
}


