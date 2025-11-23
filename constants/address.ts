/**
 * Contract addresses configuration
 * Reads from environment variables with proper type safety
 * Supports both localhost and testnet environments
 */

const localhostContractAddress = process.env.NEXT_PUBLIC_URWA20_CONTRACT_ADDRESS;
const testnetContractAddress = process.env.NEXT_PUBLIC_URWA20_TESTNET_CONTRACT_ADDRESS;

// Validate localhost address if provided
if (localhostContractAddress && !/^0x[a-fA-F0-9]{40}$/.test(localhostContractAddress)) {
  throw new Error(
    `Invalid localhost contract address format: ${localhostContractAddress}. Must be a valid Ethereum address (0x followed by 40 hex characters)`
  );
}

// Validate testnet address if provided
if (testnetContractAddress && !/^0x[a-fA-F0-9]{40}$/.test(testnetContractAddress)) {
  throw new Error(
    `Invalid testnet contract address format: ${testnetContractAddress}. Must be a valid Ethereum address (0x followed by 40 hex characters)`
  );
}

export const LOCALHOST_CONTRACT_ADDRESS = localhostContractAddress as `0x${string}` | undefined;
export const TESTNET_CONTRACT_ADDRESS = testnetContractAddress as `0x${string}` | undefined;

/**
 * Get contract address for a specific network
 * @param network - 'localhost' or 'testnet'
 * @returns Contract address for the specified network
 */
export function getContractAddress(network: 'localhost' | 'testnet'): `0x${string}` {
  const address = network === 'testnet' ? testnetContractAddress : localhostContractAddress;
  
  if (!address) {
    const envVar = network === 'testnet' 
      ? 'NEXT_PUBLIC_URWA20_TESTNET_CONTRACT_ADDRESS'
      : 'NEXT_PUBLIC_URWA20_CONTRACT_ADDRESS';
    throw new Error(
      `${envVar} is not set in environment variables`
    );
  }
  
  return address as `0x${string}`;
}


