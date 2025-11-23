/**
 * Contract addresses configuration
 * Reads from environment variables with proper type safety
 */

const contractAddress = process.env.NEXT_PUBLIC_URWA20_CONTRACT_ADDRESS;

if (!contractAddress) {
  throw new Error(
    'NEXT_PUBLIC_URWA20_CONTRACT_ADDRESS is not set in environment variables'
  );
}

// Validate address format
if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
  throw new Error(
    `Invalid contract address format: ${contractAddress}. Must be a valid Ethereum address (0x followed by 40 hex characters)`
  );
}

export const URWA20_CONTRACT_ADDRESS = contractAddress as `0x${string}`;

