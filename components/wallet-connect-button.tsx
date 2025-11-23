"use client"

import { useEffect } from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useAccount, useBalance, useSwitchChain } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Wallet } from 'lucide-react'
import { formatAddress } from '@/lib/utils'
import { formatEther } from 'viem'
import { oasisSapphireLocalnet } from '@/app/wagmiConfig'

export function WalletConnectButton() {
  const { ready, authenticated, login, logout } = usePrivy()
  const { wallets } = useWallets()
  const { address, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const { data: balance } = useBalance({
    address: address,
  })

  const wallet = wallets[0]

  // Automatically switch to local chain when connected
  useEffect(() => {
    if (ready && authenticated && address && chainId && chainId !== oasisSapphireLocalnet.id) {
      const switchToLocalChain = async () => {
        try {
          // Use Privy's wallet chain switching if available, otherwise use wagmi
          if (wallet?.setChain) {
            const result = wallet.setChain(oasisSapphireLocalnet.id)
            if (result && typeof result.catch === 'function') {
              await result
            }
          } else if (switchChain) {
            const result = switchChain({ chainId: oasisSapphireLocalnet.id })
            if (result && typeof result.catch === 'function') {
              await result
            }
          }
        } catch (error) {
          console.error('Failed to switch chain:', error)
        }
      }
      switchToLocalChain()
    }
  }, [ready, authenticated, address, chainId, wallet, switchChain])

  if (!ready) {
    return (
      <Button variant="outline" disabled>
        <Wallet className="h-4 w-4 mr-2" />
        Loading...
      </Button>
    )
  }

  if (!authenticated) {
    return (
      <Button onClick={login}>
        <Wallet className="h-4 w-4 mr-2" />
        Connect Wallet
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-4 items-start">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={logout}>
          Disconnect
        </Button>
      </div>
      {address && (
        <div className="p-4 border rounded-lg bg-muted">
          <p className="text-sm font-medium mb-2">Wallet Address:</p>
          <p className="font-mono text-sm">{address}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Formatted: {formatAddress(address)}
          </p>
          {chainId && (
            <p className="text-xs text-muted-foreground mt-2">
              Chain ID: {chainId}
            </p>
          )}
          {balance && (
            <p className="text-xs text-muted-foreground mt-1">
              Balance: {parseFloat(formatEther(balance.value)).toFixed(4)} {balance.symbol}
            </p>
          )}
        </div>
      )}
    </div>
  )
}



