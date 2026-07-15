"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { WalletIcon } from "./ui/icons";

/**
 * Wallet connect via browser extension (MetaMask + any EIP-1193 wallet),
 * delegated to RainbowKit's connect modal — chain status is hidden here
 * since `NetworkSelector` owns the network-identity badge independently
 * (BRAND.md §6: the badge must stay neutral and separate from wallet UI).
 */
export function WalletConnectButton() {
  return (
    <ConnectButton.Custom>
      {({ account, mounted, openAccountModal, openConnectModal }) => {
        const ready = mounted;
        const connected = ready && account;

        return (
          <div aria-hidden={!ready} className={!ready ? "pointer-events-none opacity-0" : ""}>
            {!connected ? (
              <button
                type="button"
                onClick={openConnectModal}
                className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-primary px-4 py-2.5 font-body text-sm font-semibold text-bg transition-colors hover:bg-primary-deep sm:px-5 sm:py-3 sm:text-base"
              >
                <WalletIcon className="h-4 w-4" />
                Connect Wallet
              </button>
            ) : (
              <button
                type="button"
                onClick={openAccountModal}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-high px-4 py-2.5 font-mono text-sm text-ink transition-colors hover:border-primary"
              >
                <span className="h-2 w-2 rounded-full bg-secondary" aria-hidden />
                {account.displayName}
                {account.displayBalance ? (
                  <span className="hidden text-muted sm:inline">· {account.displayBalance}</span>
                ) : null}
              </button>
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
