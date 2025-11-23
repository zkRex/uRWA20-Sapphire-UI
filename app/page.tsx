import { WalletConnectButton } from '@/components/wallet-connect-button'
import { ContractInterface } from '@/components/contract-interface'

export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="border-b pb-4">
          <h1 className="text-4xl font-bold mb-4">zkRex</h1>
          <WalletConnectButton />
        </div>
        <ContractInterface />
      </div>
    </div>
  )
}
