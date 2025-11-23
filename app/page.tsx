import { WalletConnectButton } from '@/components/wallet-connect-button'
import { ContractInterface } from '@/components/contract-interface'
import { NetworkSwitch } from '@/components/network-switch'
import { DecryptionViewer } from '@/components/decryption-viewer'
import { EncryptedEvents } from '@/components/encrypted-events'
import { AuditorPermissions } from '@/components/auditor-permissions'
import { TransactionHistory } from '@/components/transaction-history'

export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="border-b pb-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold">zkRex</h1>
            <NetworkSwitch />
          </div>
          <WalletConnectButton />
        </div>
        <TransactionHistory />
        <EncryptedEvents />
        <DecryptionViewer />
        <AuditorPermissions />
        <ContractInterface />
      </div>
    </div>
  )
}
