# uRWA20 Sapphire UI

A simple frontend to interact with the uRWA20 smart contract. This Next.js application provides a user-friendly interface for calling contract functions, viewing contract state, and executing transactions.

## Features

- **Wallet Connection**: Connect your wallet using Privy and Wagmi
- **Contract Interface**: Browse and interact with all uRWA20 contract functions
- **View Functions**: Read contract state with view/pure functions
- **Write Functions**: Execute transactions with write functions
- **SIWE Authentication**: Sign-In With Ethereum authentication for protected functions
- **Transaction Tracking**: Monitor transaction status and confirmations

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm/yarn

### Installation

1. Install dependencies:

```bash
pnpm install
```

2. Set up environment variables:

Create a `.env.local` file in the root directory:

```bash
NEXT_PUBLIC_URWA20_CONTRACT_ADDRESS=0x...
```

3. Run the development server:

```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Connect Wallet**: Click the wallet connect button to connect your Ethereum wallet
2. **Select Function**: Choose a view or write function from the contract interface
3. **Enter Parameters**: Fill in the required parameters for the selected function
4. **Authenticate** (if required): Some view functions require SIWE authentication
5. **Execute**: Click "Read" for view functions or "Write" for transactions

## Tech Stack

- **Next.js 16** - React framework
- **Wagmi** - Ethereum React hooks
- **Privy** - Wallet connection and authentication
- **Viem** - Ethereum library
- **Tailwind CSS** - Styling
- **Radix UI** - UI components
