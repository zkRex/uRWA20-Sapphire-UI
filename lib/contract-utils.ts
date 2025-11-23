import { Abi, AbiFunction, AbiParameter, PublicClient } from 'viem';

/**
 * Type guard to check if an ABI item is a function
 */
export function isFunction(item: any): item is AbiFunction {
  return item.type === 'function';
}

/**
 * Get all functions from an ABI
 */
export function getFunctions(abi: Abi): AbiFunction[] {
  return abi.filter(isFunction);
}

/**
 * Group functions by state mutability
 */
export function groupFunctionsByType(functions: AbiFunction[]) {
  const viewFunctions: AbiFunction[] = [];
  const writeFunctions: AbiFunction[] = [];

  functions.forEach((fn) => {
    if (fn.stateMutability === 'view' || fn.stateMutability === 'pure') {
      viewFunctions.push(fn);
    } else {
      writeFunctions.push(fn);
    }
  });

  return { viewFunctions, writeFunctions };
}

/**
 * Check if a function requires SIWE token based on its parameters
 * Functions that require VIEWER_ROLE typically have a `bytes` parameter named `token` at the end
 */
export function requiresSiweToken(fn: AbiFunction): boolean {
  const lastParam = fn.inputs[fn.inputs.length - 1];
  return (
    lastParam?.type === 'bytes' &&
    (lastParam.name === 'token' || lastParam.name === 'authToken')
  );
}

/**
 * Format parameter value based on its type
 */
export function formatParameterValue(value: string, type: string): any {
  if (type.startsWith('uint') || type.startsWith('int')) {
    return BigInt(value || '0');
  }
  if (type === 'bool') {
    return value === 'true' || value === '1';
  }
  if (type === 'address') {
    if (!value.startsWith('0x')) {
      return `0x${value}`;
    }
    return value;
  }
  if (type === 'bytes') {
    if (value.startsWith('0x')) {
      return value as `0x${string}`;
    }
    // If it's already a hex string without 0x prefix, add it
    if (/^[a-fA-F0-9]+$/.test(value)) {
      return `0x${value}` as `0x${string}`;
    }
    // Convert string to hex bytes
    return `0x${Buffer.from(value, 'utf8').toString('hex')}` as `0x${string}`;
  }
  if (type.startsWith('bytes')) {
    // Fixed-size bytes array
    return value.startsWith('0x') ? (value as `0x${string}`) : `0x${value}`;
  }
  if (type === 'string') {
    return value;
  }
  // For arrays and tuples, return as-is (will need JSON parsing)
  return value;
}

/**
 * Parse function inputs from form values
 */
export function parseFunctionInputs(
  fn: AbiFunction,
  formValues: Record<string, string>,
  siweToken?: string
): any[] {
  const inputs: any[] = [];

  fn.inputs.forEach((input, index) => {
    const key = `param_${index}`;
    let value = formValues[key];

    // If this is the last parameter and it's a bytes token parameter, use SIWE token
    if (
      requiresSiweToken(fn) &&
      index === fn.inputs.length - 1 &&
      siweToken
    ) {
      value = siweToken;
    }

    if (value === undefined || value === '') {
      // For optional parameters, we might want to handle this differently
      // For now, throw an error
      throw new Error(`Missing value for parameter ${input.name || index}`);
    }

    inputs.push(formatParameterValue(value, input.type));
  });

  return inputs;
}

/**
 * Format output value for display
 */
export function formatOutputValue(value: any): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

/**
 * Get function signature for display
 */
export function getFunctionSignature(fn: AbiFunction): string {
  const params = fn.inputs
    .map((input) => `${input.type} ${input.name || ''}`.trim())
    .join(', ');
  return `${fn.name}(${params})`;
}

/**
 * Get gas configuration for Sapphire testnet
 * Sapphire testnet requires a minimum gas price, so we ensure it's set properly
 * We prioritize EIP-1559 fields (maxFeePerGas, maxPriorityFeePerGas) as viem defaults to Type 2 transactions
 */
export async function getGasConfig(publicClient: PublicClient) {
  // Sapphire testnet minimum: 100 nROSE (100 Gwei)
  const minGasPrice = BigInt(100_000_000_000); // 100 nROSE = 100 Gwei
  
  try {
    // Try to get EIP-1559 fees first
    const fees = await publicClient.estimateFeesPerGas();
    console.log('Estimated fees:', fees);
    
    let maxFeePerGas = fees.maxFeePerGas || BigInt(0);
    let maxPriorityFeePerGas = fees.maxPriorityFeePerGas || BigInt(0);
    
    // If fees are missing or too low, boost them
    if (maxFeePerGas < minGasPrice) maxFeePerGas = minGasPrice;
    if (maxPriorityFeePerGas < minGasPrice) maxPriorityFeePerGas = minGasPrice;
    
    // Ensure maxFee is at least maxPriorityFee
    if (maxFeePerGas < maxPriorityFeePerGas) maxFeePerGas = maxPriorityFeePerGas;
    
    console.log('Using EIP-1559 fees:', { maxFeePerGas, maxPriorityFeePerGas });
    return {
      maxFeePerGas,
      maxPriorityFeePerGas,
    };
  } catch (error) {
    console.warn('Failed to estimate EIP-1559 fees:', error);
    
    // Fallback to getGasPrice but return as EIP-1559 fields to ensure Type 2 compatibility
    try {
      let gasPrice = await publicClient.getGasPrice();
      console.log('Network gas price:', gasPrice);
      
      if (gasPrice < minGasPrice) gasPrice = minGasPrice;
      
      // Add 20% buffer
      const boostedPrice = (gasPrice * BigInt(120)) / BigInt(100);
      
      console.log('Using converted legacy gas price:', boostedPrice);
      return {
        maxFeePerGas: boostedPrice,
        maxPriorityFeePerGas: boostedPrice,
      };
    } catch (e) {
      console.warn('Failed to get gas price, using default minimum:', e);
      return {
        maxFeePerGas: minGasPrice,
        maxPriorityFeePerGas: minGasPrice,
      };
    }
  }
}

