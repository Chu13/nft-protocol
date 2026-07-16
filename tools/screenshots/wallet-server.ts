import { createServer, type Server } from "node:http";
import { createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";

/**
 * The two default Hardhat node test accounts (seeded on every fresh
 * `npx hardhat node`). Publicly documented, never used with real funds —
 * safe to hardcode. Account #0 is the contract owner (per
 * contracts/scripts/seed-local.ts); account #1 is the funded "user" persona
 * screenshots are captured as.
 */
export const HARDHAT_ACCOUNTS: Record<0 | 1, { address: `0x${string}`; privateKey: Hex }> = {
  0: {
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  },
  1: {
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690",
  },
};

export const WALLET_HELPER_PORT = 8555;
const HARDHAT_RPC_URL = "http://127.0.0.1:8545";

export interface WalletHelperServer {
  close: () => Promise<void>;
}

interface RpcRequestBody {
  method: string;
  params?: unknown[];
}

/**
 * A tiny localhost HTTP companion that owns transaction signing for the
 * Playwright wallet shim (wallet-shim.ts). All viem/signing logic stays in
 * Node — the in-page init script only ever `fetch()`s this server for
 * account identity and `eth_sendTransaction`, and talks to the public
 * Hardhat RPC directly (via its own fetch) for every read-only call.
 */
export async function startWalletHelperServer(accountIndex: 0 | 1, port: number): Promise<WalletHelperServer> {
  const account = privateKeyToAccount(HARDHAT_ACCOUNTS[accountIndex].privateKey);
  const walletClient = createWalletClient({
    account,
    chain: hardhat,
    transport: http(HARDHAT_RPC_URL),
  });

  async function handleRequest(method: string, params: unknown[]): Promise<unknown> {
    switch (method) {
      case "eth_requestAccounts":
      case "eth_accounts":
        return [account.address];
      case "eth_chainId":
        return "0x7a69"; // 31337
      case "eth_sendTransaction": {
        const tx = (params[0] ?? {}) as Record<string, unknown>;
        return walletClient.sendTransaction({
          account,
          chain: hardhat,
          to: tx.to as `0x${string}` | undefined,
          data: tx.data as `0x${string}` | undefined,
          value: tx.value ? BigInt(tx.value as string) : undefined,
        });
      }
      default:
        throw new Error(`wallet-server: unhandled method "${method}" — read calls must bypass this server`);
    }
  }

  const server: Server = createServer((req, res) => {
    if (req.method !== "POST" || req.url !== "/rpc") {
      res.writeHead(404).end();
      return;
    }
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      void (async () => {
        try {
          const { method, params } = JSON.parse(body) as RpcRequestBody;
          const result = await handleRequest(method, params ?? []);
          res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ result }));
        } catch (err) {
          res
            .writeHead(500, { "Content-Type": "application/json" })
            .end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        }
      })();
    });
  });

  await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));

  return {
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
