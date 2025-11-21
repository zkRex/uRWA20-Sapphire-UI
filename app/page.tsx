import { WalletConnectButton } from '@/components/wallet-connect-button'

export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">zkRex</h1>
        <WalletConnectButton />
      </div>
    </div>
  )
}
