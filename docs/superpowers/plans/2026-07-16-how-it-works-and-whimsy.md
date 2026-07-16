# How It Works Page + Whimsy Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/how-it-works` page with real screenshots of the mint/marketplace/profile flows (captured via a new Playwright tool), and layer 14 whimsy features onto the existing OBRA app (motion, copy, gamification, sound, OG cards) — all filtered to fit BRAND.md's "quieter gallery voice."

**Architecture:** Four phases, each independently shippable and committed separately. Phase 1 builds a standalone screenshot-capture tool (`tools/screenshots/`) that drives the app against a local Hardhat chain with an injected EIP-1193 wallet shim, then a static `/how-it-works` page consuming the captured images. Phase 2 ports the deterministic trait generator to the client (`app/lib/art/`) as shared infrastructure, then layers 6 motion/copy features onto existing components. Phase 3 adds profile-side gamification (all derived from on-chain reads already in place) and a header easter egg. Phase 4 adds an optional sound toggle, ambient empty-state art, and a static per-token OG image pipeline extending the existing IPFS pinning script.

**Tech Stack:** Next.js 16 (App Router) + TypeScript + Tailwind v4 + wagmi/viem/RainbowKit (frontend, `app/`); Solidity/Hardhat + TypeScript scripts (`contracts/`); Playwright + viem (new `tools/screenshots/`, Node/tsx, no framework deps beyond that). No test framework exists in `app/` today (verification there is `npm run lint` + `npm run build` + manual browser check, matching the project's existing convention — see README's "Running the tests" section, which only documents `contracts`). Where a task's logic is a pure function (trait generation port, rarity/provenance derivation), verification is a standalone `tsx` assertion script, not a new test framework — do not add vitest/jest, it would be new project-wide tooling outside this plan's scope.

## Global Constraints

- **Two motion primitives only.** `app/app/globals.css` defines exactly `pulse-glow` (lines 28,32-40 — "pending" state, expanding box-shadow ring) and `scale-in` (lines 29,42-51 — "confirmed" state, scale 0.9→1 + fade). New keyframes must be short (<400ms), fire only on a real state change (never idle/ambient/looping), and live in the same `@theme`/keyframes block in `globals.css`.
- **Global reduced-motion kill-switch already covers new animations.** `globals.css:74-83` neutralizes all `animation`/`transition` under `@media (prefers-reduced-motion: reduce)` — do not add a second, per-component reduced-motion check; the global rule already applies to any new Tailwind `animate-*` utility or CSS transition.
- **No box-shadows except `pulse-glow`'s own.** No confetti, no fabricated "reveal" suspense, no rarity/power-level bars. BRAND.md §5/§7 (quieter gallery voice, curatorial not salesy).
- **No backend, no database.** Every new piece of "state" is derived from on-chain reads, IPFS-pinned metadata, `localStorage`, or is ephemeral component state. No new API routes except the OG image route in Task 17, which is a stateless server-render (no persistence).
- **Real rarity, sourced from `contracts/art/traits.json`.** Sello: Vermilion weight 90, Gold weight 9, Double weight 1 (`traits.json:38-45`). Paleta: Espectro weight 1, Dorada weight 4 (`traits.json:12-21`). Never fabricate a rarity number not derivable from this file.
- **Design tokens** (`app/app/globals.css:11-22`): `--color-bg #000d06`, `--color-surface #011c11`, `--color-surface-high #0a2b1e`, `--color-border #203c30`, `--color-ink #e9faf2`, `--color-muted #97b2a5`, `--color-primary #f5642b` (vermilion), `--color-secondary #57bc80` (jade). Fonts: `--font-display` (Fraunces), `--font-body` (Instrument Sans), `--font-mono` (Fragment Mono).
- **Trait vocabulary stays in Spanish, untranslated** (Composición, Paleta, Densidad, Acabado, Sello) — BRAND.md's "respect authorship, don't translate" rule. Only curator's-note *explanations* (Task 9) are in English, the term itself never is.
- **Every task is committed on the worktree branch `worktree-how-it-works-and-whimsy`** (already checked out at `/Users/jesuspicoro/Desktop/Chuzzo/Coding/nft-protocol/.claude/worktrees/how-it-works-and-whimsy`). Do not target `main`.
- **`app/exports/` is a synced copy of root `/exports/`** (`app/package.json`'s `sync-exports` script: `cp ../exports/*.json exports/`) — any task that adds a new root-level export file (Task 17) must also add it to that script and run it once.

---
### Task 1: `tools/screenshots/` wallet shim — EIP-1193 provider backed by a known Hardhat account

**Files:**
- Create: `tools/screenshots/package.json`
- Create: `tools/screenshots/tsconfig.json`
- Create: `tools/screenshots/wallet-server.ts`
- Create: `tools/screenshots/wallet-shim.ts`

**Interfaces:**
- Produces: `wallet-server.ts` exports `HARDHAT_ACCOUNTS: Record<0 | 1, { address: \`0x${string}\`; privateKey: Hex }>`, `WALLET_HELPER_PORT: number` (value `8555`), `interface WalletHelperServer { close: () => Promise<void> }`, and `async function startWalletHelperServer(accountIndex: 0 | 1, port: number): Promise<WalletHelperServer>`. `wallet-shim.ts` exports `function buildWalletShimScript(accountIndex: 0 | 1): string`.

A new standalone npm package at `tools/screenshots/`, kept separate from `app/` and `contracts/` so it doesn't pollute either's dependency tree. Design: the in-page init script never touches a private key — it's a thin `window.ethereum` shim that `fetch()`s a small Node-side "wallet helper" HTTP server for account identity and transaction signing, and forwards every other JSON-RPC method straight to the public Hardhat RPC. All viem/signing logic lives in Node (`wallet-server.ts`), where `import` works freely; the browser-side script (`wallet-shim.ts`) is plain, import-free JS text.

Two well-known, publicly documented default Hardhat node test accounts (safe to hardcode — a fresh local Hardhat node always seeds these, real funds never touch them): account #0 (`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`, key `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`) is the contract owner/deployer (holds tokens #2/#3, has listed #1, per `contracts/scripts/seed-local.ts`); account #1 (`0x70997970C51812dc3A010C7d01b50e0d17dc79C8`, key `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690`) is funded 50,000 mock CHU and holds token #4 — the "user" persona the screenshots are captured as.

- [ ] **Step 1: Create `tools/screenshots/package.json`**

```json
{
  "name": "obra-screenshots",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "playwright": "^1.48.0",
    "viem": "^2.55.1"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "@types/node": "^20.14.0"
  }
}
```

- [ ] **Step 2: Create `tools/screenshots/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["*.ts"]
}
```

- [ ] **Step 3: Create `tools/screenshots/wallet-server.ts`**

```typescript
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
```

- [ ] **Step 4: Create `tools/screenshots/wallet-shim.ts`**

```typescript
/**
 * Returns the init-script SOURCE STRING injected into the Playwright page
 * via `page.addInitScript({ content: buildWalletShimScript(accountIndex) })`.
 * Runs in the page's own JS context, before any page script — so it must be
 * self-contained plain JS with no imports. wagmi's injected connector
 * detects this as `window.ethereum` from first paint.
 *
 * Account identity + tx signing (methods in HELPER_METHODS below) are
 * delegated to the Node-side wallet-server.ts companion via same-origin
 * fetch; every other read-only JSON-RPC method is forwarded straight to the
 * public Hardhat node.
 */
export function buildWalletShimScript(accountIndex: 0 | 1): string {
  const helperUrl = `http://127.0.0.1:8555/rpc`;
  const rpcUrl = "http://127.0.0.1:8545";
  const helperMethods = ["eth_requestAccounts", "eth_accounts", "eth_chainId", "eth_sendTransaction"];

  // accountIndex is currently informational only (the helper server is
  // started for a fixed account by the caller in capture.ts) — kept as a
  // parameter so a future caller could run two helper servers on two ports
  // for a two-wallet scenario without changing this function's shape.
  void accountIndex;

  return `
    (function () {
      var HELPER_URL = ${JSON.stringify(helperUrl)};
      var RPC_URL = ${JSON.stringify(rpcUrl)};
      var HELPER_METHODS = ${JSON.stringify(helperMethods)};
      var listeners = {};

      async function request(args) {
        var method = args.method;
        var params = args.params || [];
        var isHelperMethod = HELPER_METHODS.indexOf(method) !== -1;
        var target = isHelperMethod ? HELPER_URL : RPC_URL;
        var body = isHelperMethod
          ? JSON.stringify({ method: method, params: params })
          : JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method: method, params: params });
        var res = await fetch(target, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body,
        });
        var json = await res.json();
        if (json.error) {
          throw new Error(typeof json.error === "string" ? json.error : json.error.message || "RPC error");
        }
        return json.result;
      }

      window.ethereum = {
        isMetaMask: true,
        request: request,
        on: function (event, listener) {
          listeners[event] = listeners[event] || [];
          listeners[event].push(listener);
        },
        removeListener: function (event, listener) {
          if (!listeners[event]) return;
          listeners[event] = listeners[event].filter(function (l) { return l !== listener; });
        },
      };
    })();
  `;
}
```

- [ ] **Step 5: Install dependencies**

Run: `cd tools/screenshots && npm install`
Expected: installs playwright, viem, tsx, typescript, @types/node with no errors. Then run `npx playwright install chromium` (downloads the Chromium binary Playwright needs — one-time, ~150MB) — expected: completes with "chromium ... downloaded" (or a message it's already installed).

- [ ] **Step 6: Typecheck**

Run: `cd tools/screenshots && npm run typecheck`
Expected: exits 0, no output (clean `tsc --noEmit`).

- [ ] **Step 7: Commit**

```bash
git add tools/screenshots/package.json tools/screenshots/tsconfig.json tools/screenshots/wallet-server.ts tools/screenshots/wallet-shim.ts tools/screenshots/package-lock.json
git commit -m "Add Playwright wallet-shim tooling for local screenshot capture"
```

---

### Task 2: `tools/screenshots/capture.ts` — drive the app locally and capture the 9 How It Works screenshots

**Files:**
- Create: `tools/screenshots/capture.ts`
- Modify: `tools/screenshots/package.json` (add a `capture` script)

**Interfaces:**
- Consumes (from Task 1): `wallet-server.ts` → `HARDHAT_ACCOUNTS`, `WALLET_HELPER_PORT`, `startWalletHelperServer(accountIndex, port)`. `wallet-shim.ts` → `buildWalletShimScript(accountIndex)`.
- Produces: 9 PNG files in `app/public/how-it-works/` — `get-chu.png`, `mint-approve.png`, `mint-sign.png`, `mint-confirmed.png`, `marketplace-grid.png`, `buy-flow.png`, `profile-collection.png`, `profile-list.png`, `piece-detail.png` — consumed by Task 3's page.

This script does NOT start a Hardhat node or the app dev server itself — it's a pure driver against services the operator already has running (documented loudly in the preflight checks below). It fixes the one gotcha that would otherwise blank every screenshot: `seed-local.ts` leaves the local Obra contract's `baseURI` at `ipfs://pending/`, so no art resolves locally. The 100 tokens' real metadata is already permanently pinned to IPFS (the same CID the live BNB Testnet deployment uses, documented in the root `README.md`'s "Deployed contracts" section) — pointing the local contract's `baseURI` at that CID is safe on any network and needs no re-pinning.

Screenshot strategy: every shot targets `page.locator("main")` (excludes `<Header>`, so the "Localhost (Hardhat)" network-selector badge never appears in a public-facing doc image) except the mint-confirmation toast, which renders outside `<main>` in a `ToastViewport` and is targeted via `page.getByRole("status")` (confirmed `TxStatusToast`s render `role="status"`).

- [ ] **Step 1: Add the `capture` script to `tools/screenshots/package.json`**

In the `"scripts"` block, add: `"capture": "tsx capture.ts"` (alongside the existing `"typecheck": "tsc --noEmit"`).

- [ ] **Step 2: Write `tools/screenshots/capture.ts`**

```typescript
import { chromium } from "playwright";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";
import * as fs from "node:fs";
import * as path from "node:path";
import { HARDHAT_ACCOUNTS, WALLET_HELPER_PORT, startWalletHelperServer } from "./wallet-server.ts";
import { buildWalletShimScript } from "./wallet-shim.ts";

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");
const RPC_URL = "http://127.0.0.1:8545";
const APP_URL = "http://localhost:3000";
const SCREENSHOT_DIR = path.join(REPO_ROOT, "app", "public", "how-it-works");
// The already-pinned metadata root the live BNB Testnet deployment uses too
// (see root README.md "Deployed contracts") — safe to point any network at,
// no re-pin needed. Fixes seed-local.ts's placeholder "ipfs://pending/".
const REAL_BASE_URI = "ipfs://bafybeihtbnfsy5vdonrtr4by6mrvvpcexi5ibnoopxogpqnzbs53vl4wju/";

function printPreflightHelp(): void {
  console.error("\nBefore running this script, in separate terminals:");
  console.error("  1. cd contracts && npx hardhat node");
  console.error("  2. cd contracts && npm run seed:local");
  console.error("  3. cd app && NEXT_PUBLIC_NETWORK_ENV=local npm run dev");
  console.error("  4. cd tools/screenshots && npm run capture\n");
}

async function checkReachable(url: string, label: string): Promise<void> {
  try {
    await fetch(url, { method: "GET" });
  } catch {
    console.error(`✗ ${label} is not reachable at ${url}.`);
    printPreflightHelp();
    process.exit(1);
  }
}

async function main(): Promise<void> {
  await checkReachable(RPC_URL, "Hardhat node");

  const deploymentPath = path.join(REPO_ROOT, "contracts", "deployments", "localhost.json");
  if (!fs.existsSync(deploymentPath)) {
    console.error(`✗ ${deploymentPath} not found.`);
    printPreflightHelp();
    process.exit(1);
  }
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8")) as { obra: { address: string } };
  const obraAddress = deployment.obra.address as `0x${string}`;

  await checkReachable(APP_URL, "The app dev server");

  const obraExportPath = path.join(REPO_ROOT, "app", "exports", "obra.json");
  const obraExport = JSON.parse(fs.readFileSync(obraExportPath, "utf-8")) as { abi: unknown[] };

  console.log("Setting local baseURI to the real pinned metadata root...");
  const ownerAccount = privateKeyToAccount(HARDHAT_ACCOUNTS[0].privateKey);
  const ownerClient = createWalletClient({ account: ownerAccount, chain: hardhat, transport: http(RPC_URL) });
  const setBaseUriHash = await ownerClient.writeContract({
    address: obraAddress,
    abi: obraExport.abi,
    functionName: "setBaseURI",
    args: [REAL_BASE_URI],
  });
  console.log(`  setBaseURI tx: ${setBaseUriHash}`);

  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const helper = await startWalletHelperServer(1, WALLET_HELPER_PORT);
  const browser = await chromium.launch();
  const written: string[] = [];

  async function shootMain(filename: string): Promise<void> {
    const outPath = path.join(SCREENSHOT_DIR, filename);
    await page.locator("main").first().screenshot({ path: outPath });
    written.push(filename);
    console.log(`  wrote ${filename}`);
  }

  let page: Awaited<ReturnType<typeof browser.newPage>>;
  try {
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.addInitScript({ content: buildWalletShimScript(1) });

    // --- Connect wallet (RainbowKit's injected connector shows up under
    // the "Browser Wallet" group name, per @rainbow-me/rainbowkit's own
    // injectedWallet() connector definition — confirmed by reading the
    // installed package, not guessed) ---
    await page.goto(`${APP_URL}/`);
    await page.getByRole("button", { name: "Connect Wallet" }).click();
    await page.getByRole("button", { name: "Browser Wallet" }).click();
    await page.getByText(HARDHAT_ACCOUNTS[1].address.slice(0, 6)).waitFor({ timeout: 15_000 });

    // --- 1. Get CHU ---
    await shootMain("get-chu.png");

    // --- 2/3. Mint — approve, then mint ---
    const approveButton = page.getByRole("button", { name: /Step 1 of 2 — Approve/ });
    if (await approveButton.isVisible().catch(() => false)) {
      await shootMain("mint-approve.png");
      await approveButton.click();
      await page.getByRole("button", { name: /Step 2 of 2 — Mint/ }).waitFor({ timeout: 15_000 });
      await shootMain("mint-sign.png");
      await page.getByRole("button", { name: /Step 2 of 2 — Mint/ }).click();
    } else {
      // Allowance already sufficient from a prior run — mint directly.
      await shootMain("mint-approve.png");
      await page.getByRole("button", { name: /Mint for/ }).click();
    }
    await page.getByRole("status").waitFor({ timeout: 15_000 });
    const outPath = path.join(SCREENSHOT_DIR, "mint-confirmed.png");
    await page.getByRole("status").first().screenshot({ path: outPath });
    written.push("mint-confirmed.png");
    console.log("  wrote mint-confirmed.png");

    // --- 4. Marketplace grid ---
    await page.goto(`${APP_URL}/marketplace`);
    await page.locator("main").first().waitFor();
    await shootMain("marketplace-grid.png");

    // --- 5. Buy flow (token #1, listed by account #0 in seed-local.ts) ---
    await page.goto(`${APP_URL}/marketplace/1`);
    await page.locator("main").first().waitFor();
    const buyApprove = page.getByRole("button", { name: /Approve/ });
    if (await buyApprove.isVisible().catch(() => false)) {
      await buyApprove.click();
      await page.getByRole("status").waitFor({ timeout: 15_000 });
    }
    await shootMain("buy-flow.png");

    // --- 6. Profile collection ---
    await page.goto(`${APP_URL}/profile/${HARDHAT_ACCOUNTS[1].address}`);
    await page.locator("main").first().waitFor();
    await shootMain("profile-collection.png");

    // --- 7. Profile — open List panel on an owned, unlisted token ---
    const listButton = page.getByRole("button", { name: "List for sale" }).first();
    if (await listButton.isVisible().catch(() => false)) {
      await listButton.click();
      await shootMain("profile-list.png");
    } else {
      console.warn("  ⚠ no unlisted owned token found for profile-list.png — wrote current profile state instead");
      await shootMain("profile-list.png");
    }

    // --- 8. Piece detail ---
    await page.goto(`${APP_URL}/marketplace/4`);
    await page.locator("main").first().waitFor();
    await shootMain("piece-detail.png");
  } finally {
    await browser.close();
    await helper.close();
  }

  console.log(`\nWrote ${written.length}/9 screenshots to ${SCREENSHOT_DIR}`);
  if (written.length < 9) {
    console.error("✗ Not all 9 screenshots were captured — see warnings above.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 3: Run the full capture against a live local stack**

Precondition (three other terminals, run in order, each left running):
```bash
# terminal 1
cd contracts && npx hardhat node

# terminal 2 (after terminal 1 says "Started HTTP and WebSocket JSON-RPC server")
cd contracts && npm run seed:local

# terminal 3
cd app && NEXT_PUBLIC_NETWORK_ENV=local npm run dev
```

Then, in a fourth terminal:
Run: `cd tools/screenshots && npm run capture`
Expected: script prints `setBaseURI tx: 0x...`, then 9 lines of `wrote <filename>`, then `Wrote 9/9 screenshots to .../app/public/how-it-works`, exit code 0.

Verify: `ls -la app/public/how-it-works/*.png` — 9 files, each larger than 5KB (not a blank/error-page capture).

- [ ] **Step 4: Commit**

```bash
git add tools/screenshots/capture.ts tools/screenshots/package.json app/public/how-it-works/*.png
git commit -m "Add Playwright capture script and How It Works screenshots"
```

---

### Task 3: `/how-it-works` page + nav link

**Files:**
- Create: `app/app/how-it-works/page.tsx`
- Modify: `app/components/Header.tsx` (nav block)

**Interfaces:**
- Consumes (from Task 2): the 9 PNGs at `app/public/how-it-works/*.png`, referenced by the exact filenames listed in Task 2.

- [ ] **Step 1: Add the nav link in `app/components/Header.tsx`**

The `<nav>` block currently renders exactly these `NavLink`s: Mint (`/`), Marketplace (`/marketplace`), and (when connected) My Pieces (`${profileHref}`). Insert a "How it works" link between Marketplace and My Pieces:

```tsx
        <nav className="flex items-center gap-5">
          <NavLink href="/" active={pathname === "/"}>
            Mint
          </NavLink>
          <NavLink href="/marketplace" active={pathname?.startsWith("/marketplace") ?? false}>
            Marketplace
          </NavLink>
          <NavLink href="/how-it-works" active={pathname === "/how-it-works"}>
            How it works
          </NavLink>
          {profileHref && (
            <NavLink href={profileHref} active={pathname?.startsWith("/profile") ?? false}>
              My Pieces
            </NavLink>
          )}
        </nav>
```

(Only the `<nav>` block changes — everything else in `Header.tsx` stays as-is.)

- [ ] **Step 2: Write `app/app/how-it-works/page.tsx`**

```tsx
import Image from "next/image";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/Card";
import { KeyIcon, SealIcon, PriceTagIcon, FrameIcon } from "@/components/ui/icons";

interface Shot {
  src: string;
  caption: string;
}

function SectionHeading({ number, title, icon }: { number: string; title: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-xs uppercase tracking-[0.08em] text-primary">{number}</span>
      <span className="text-primary">{icon}</span>
      <h2 className="font-display text-2xl font-semibold text-ink">{title}</h2>
    </div>
  );
}

function ShotGrid({ shots, cols }: { shots: Shot[]; cols: 1 | 2 | 3 }) {
  const gridCols = cols === 3 ? "sm:grid-cols-3" : cols === 2 ? "sm:grid-cols-2" : "sm:grid-cols-1";
  return (
    <div className={`mt-4 grid grid-cols-1 gap-4 ${gridCols}`}>
      {shots.map((shot) => (
        <figure key={shot.src} className="flex flex-col gap-2">
          <div className="relative aspect-[3/2] overflow-hidden rounded-lg border border-border bg-surface-high">
            <Image
              src={shot.src}
              alt={shot.caption}
              fill
              className="object-contain"
              sizes={cols === 3 ? "(min-width: 640px) 33vw, 100vw" : cols === 2 ? "(min-width: 640px) 50vw, 100vw" : "100vw"}
            />
          </div>
          <figcaption className="font-mono text-xs text-muted">{shot.caption}</figcaption>
        </figure>
      ))}
    </div>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="flex min-h-full flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">How it works</h1>
          <p className="mt-2 max-w-xl font-body text-base text-muted">
            Four steps, all on-chain, all paid in CHU — captured from the live app.
          </p>
        </div>

        <Card>
          <SectionHeading number="01" title="Get CHU" icon={<KeyIcon className="h-5 w-5" />} />
          <p className="mt-3 font-body text-[1.0625rem] leading-relaxed text-ink">
            CHU is the ecosystem&apos;s ERC-20 token, deployed once in Level 02 (CHU Protocol) and imported here by
            address — OBRA never re-deploys it. Every payment in OBRA — minting, buying, listing — is denominated in
            CHU, never ETH or BNB. If a connected wallet holds none, both the mint page and the profile page link out
            to Level 02&apos;s staking dashboard to get some, no lockup required.
          </p>
          <ShotGrid shots={[{ src: "/how-it-works/get-chu.png", caption: "Get CHU by staking, from the mint page" }]} cols={1} />
        </Card>

        <Card>
          <SectionHeading number="02" title="Mint" icon={<SealIcon className="h-5 w-5" />} />
          <p className="mt-3 font-body text-[1.0625rem] leading-relaxed text-ink">
            Minting is two clearly-signposted steps. Step 1 grants the Obra contract an allowance to move up to the
            total CHU price out of your wallet — a one-time approval per amount. Step 2 executes the mint itself,
            stamping a new numbered piece straight to your wallet.
          </p>
          <ShotGrid
            cols={3}
            shots={[
              { src: "/how-it-works/mint-approve.png", caption: "Step 1 — approve" },
              { src: "/how-it-works/mint-sign.png", caption: "Step 2 — mint" },
              { src: "/how-it-works/mint-confirmed.png", caption: "Confirmed on-chain" },
            ]}
          />
        </Card>

        <Card>
          <SectionHeading number="03" title="Marketplace" icon={<PriceTagIcon className="h-5 w-5" />} />
          <p className="mt-3 font-body text-[1.0625rem] leading-relaxed text-ink">
            Every piece currently for sale is browsable and sortable by price. Buying follows the same
            approve-then-act pattern as minting. Listing a piece you own, or cancelling a listing, happens from your
            own profile page, not here.
          </p>
          <ShotGrid
            cols={2}
            shots={[
              { src: "/how-it-works/marketplace-grid.png", caption: "Every piece currently listed" },
              { src: "/how-it-works/buy-flow.png", caption: "Approve, then buy" },
            ]}
          />
        </Card>

        <Card>
          <SectionHeading number="04" title="Your collection" icon={<FrameIcon className="h-5 w-5" />} />
          <p className="mt-3 font-body text-[1.0625rem] leading-relaxed text-ink">
            Any wallet&apos;s profile is public and read-only — paste in any address to see what it holds. List and
            cancel actions only appear when you&apos;re viewing your own connected wallet.
          </p>
          <ShotGrid
            cols={3}
            shots={[
              { src: "/how-it-works/profile-collection.png", caption: "A collector's profile" },
              { src: "/how-it-works/profile-list.png", caption: "Listing a piece for sale" },
              { src: "/how-it-works/piece-detail.png", caption: "A single piece, in detail" },
            ]}
          />
        </Card>
      </main>

      <Footer />
    </div>
  );
}
```

- [ ] **Step 3: Build and lint**

Run: `cd app && npm run lint && npm run build`
Expected: both exit 0 with no errors.

- [ ] **Step 4: Manual check**

Run: `cd app && npm run dev`, open `http://localhost:3000/how-it-works`. Confirm: all 9 images render (not broken), the "How it works" nav link is active/highlighted on this page and present on every other page, and clicking it from `/`, `/marketplace`, and a profile page navigates correctly.

- [ ] **Step 5: Commit**

```bash
git add app/app/how-it-works/page.tsx app/components/Header.tsx
git commit -m "Add How It Works page with captured screenshots"
```

---

## Task 4: Client-side trait generator port — `app/lib/art/traits.ts` + `app/lib/art/traits.json`

Ports `generateTraits(tokenId)` from `contracts/art/generate.ts` (FNV-1a string hash → mulberry32 PRNG stream seeded `"obra-traits:${tokenId}"` → `weightedPick` cumulative-weight walk over `traits.json`'s per-dimension weighted value lists) so the frontend can derive a token's traits **without any network/IPFS fetch** — purely deterministic from `tokenId`. This underpins every later task in this phase and Phase 3's trait-range summary.

**Files:**
- Create `app/lib/art/traits.ts`
- Create `app/lib/art/traits.json` (verbatim copy of `contracts/art/traits.json`)
- Create `app/scripts/verify-traits.ts`
- Modify `app/package.json` (add `tsx` devDependency + a `verify-traits` script)

**Interfaces — Produces:**
```typescript
export interface ObraTraits {
  "Composición": string;
  "Paleta": string;
  "Densidad": string;
  "Acabado": string;
  "Sello": string;
}
export function generateTraits(tokenId: number): ObraTraits
export type SelloTier = "vermilion" | "gold" | "double";
export function selloTier(sello: string): SelloTier
```

- [ ] **Step 1: Copy the trait definitions**

Copy `contracts/art/traits.json` verbatim to `app/lib/art/traits.json`:

```json
[
  {
    "trait_type": "Composición",
    "values": [
      { "value": "Orbital", "weight": 30 },
      { "value": "Constructiva", "weight": 25 },
      { "value": "Retícula", "weight": 20 },
      { "value": "Trazo", "weight": 20 },
      { "value": "Guilloché", "weight": 5 }
    ]
  },
  {
    "trait_type": "Paleta",
    "values": [
      { "value": "Sala Verde", "weight": 45 },
      { "value": "Vermellón", "weight": 30 },
      { "value": "Hueso y Tinta", "weight": 20 },
      { "value": "Dorada", "weight": 4 },
      { "value": "Espectro", "weight": 1 }
    ]
  },
  {
    "trait_type": "Densidad",
    "values": [
      { "value": "Mínima", "weight": 20 },
      { "value": "Equilibrada", "weight": 50 },
      { "value": "Densa", "weight": 30 }
    ]
  },
  {
    "trait_type": "Acabado",
    "values": [
      { "value": "Plano", "weight": 45 },
      { "value": "Grabado", "weight": 30 },
      { "value": "Grano", "weight": 25 }
    ]
  },
  {
    "trait_type": "Sello",
    "values": [
      { "value": "Vermilion", "weight": 90 },
      { "value": "Gold", "weight": 9 },
      { "value": "Double", "weight": 1 }
    ]
  }
]
```

- [ ] **Step 2: Write the ported generator**

Create `app/lib/art/traits.ts`:

```typescript
/**
 * Client-side port of contracts/art/generate.ts's generateTraits() — same
 * FNV-1a hash + mulberry32 PRNG + weighted pick, so a token's traits can be
 * derived in the browser with zero network/IPFS calls, guaranteed to match
 * the canonical generator bit-for-bit (verified by scripts/verify-traits.ts).
 *
 * traits.json here is a manual copy of contracts/art/traits.json — re-copy
 * by hand if the collection's trait weights ever change (they won't; the
 * collection is minted and its metadata is already pinned to IPFS).
 */
import traitDefsJson from "./traits.json";

interface TraitValue {
  value: string;
  weight: number;
}

interface TraitDef {
  trait_type: string;
  values: TraitValue[];
}

const traitDefs = traitDefsJson as TraitDef[];

export interface ObraTraits {
  "Composición": string;
  "Paleta": string;
  "Densidad": string;
  "Acabado": string;
  "Sello": string;
}

function fnv1aHash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedPick(rng: () => number, values: TraitValue[]): string {
  const total = values.reduce((sum, v) => sum + v.weight, 0);
  let r = rng() * total;
  for (const v of values) {
    if (r < v.weight) return v.value;
    r -= v.weight;
  }
  return values[values.length - 1].value;
}

/**
 * Deterministically picks all 5 OBRA traits for a tokenId — pure function of
 * tokenId, identical to contracts/art/generate.ts's generateTraits().
 */
export function generateTraits(tokenId: number): ObraTraits {
  const rng = mulberry32(fnv1aHash(`obra-traits:${tokenId}`));
  const picked: Record<string, string> = {};
  for (const def of traitDefs) {
    picked[def.trait_type] = weightedPick(rng, def.values);
  }
  return picked as unknown as ObraTraits;
}

export type SelloTier = "vermilion" | "gold" | "double";

/** Maps a Sello trait value to its rarity tier. Throws on an unrecognized
 * value — should never happen since it's sourced from the same enum as
 * traits.json's Sello.values. */
export function selloTier(sello: string): SelloTier {
  switch (sello) {
    case "Vermilion":
      return "vermilion";
    case "Gold":
      return "gold";
    case "Double":
      return "double";
    default:
      throw new Error(`Unrecognized Sello value: "${sello}"`);
  }
}
```

`app/tsconfig.json` already has `"resolveJsonModule": true` and the `@/*` → `./*` path alias — no tsconfig change needed.

- [ ] **Step 3: Write the smoke test**

**Design note:** the obvious verification would be to diff against `contracts/art/output/pin/metadata/*` (the real pinned per-token metadata) — but that directory is git-ignored generated output (`contracts/.gitignore:20`) and does not exist in a fresh checkout, and `contracts/art/pin.ts` refuses to run at all without a `PINATA_JWT` secret (throws immediately, before writing anything locally) that is not available in this environment. Instead, verify directly against the canonical generator itself (`contracts/art/generate.ts`'s own `generateTraits`), run in its own project context via a child `ts-node` process (contracts' own devDependency, already used by its `generate-art`/`pin` scripts) — this is a strictly stronger check than comparing to a potentially-stale pinned copy, and needs no secrets.

Create `app/scripts/verify-traits.ts`:

```typescript
/**
 * Smoke test: confirms app/lib/art/traits.ts's generateTraits() produces
 * byte-identical output to the canonical generator in
 * contracts/art/generate.ts, for a sample of tokenIds. Run via:
 *   npm run verify-traits
 */
import { execFileSync } from "node:child_process";
import * as path from "node:path";
import { generateTraits as portedGenerateTraits } from "../lib/art/traits";

const SAMPLE_TOKEN_IDS = [1, 50, 95];
const CONTRACTS_DIR = path.join(import.meta.dirname, "..", "..", "contracts");
const TRAIT_KEYS = ["Composición", "Paleta", "Densidad", "Acabado", "Sello"] as const;

function getCanonicalTraits(tokenIds: number[]): Record<number, Record<string, string>> {
  const script = [
    'const { generateTraits } = require("./art/generate.ts");',
    `const ids = ${JSON.stringify(tokenIds)};`,
    "const out = {};",
    "for (const id of ids) out[id] = generateTraits(id);",
    "console.log(JSON.stringify(out));",
  ].join("\n");

  const stdout = execFileSync("npx", ["ts-node", "-e", script], {
    cwd: CONTRACTS_DIR,
    encoding: "utf8",
  });
  // ts-node/npm may print warnings on earlier lines; the JSON payload is
  // always the last non-empty line this script prints.
  const lines = stdout.trim().split("\n").filter(Boolean);
  return JSON.parse(lines[lines.length - 1]);
}

function main() {
  const canonical = getCanonicalTraits(SAMPLE_TOKEN_IDS);
  let failures = 0;

  for (const id of SAMPLE_TOKEN_IDS) {
    const ported = portedGenerateTraits(id);
    const expected = canonical[id];
    for (const key of TRAIT_KEYS) {
      if (ported[key] !== expected[key]) {
        failures++;
        console.error(`MISMATCH tokenId=${id} trait="${key}": ported="${ported[key]}" canonical="${expected[key]}"`);
      }
    }
  }

  if (failures > 0) {
    console.error(`FAIL — ${failures} trait mismatch(es) across ${SAMPLE_TOKEN_IDS.length} tokenIds.`);
    process.exit(1);
  }

  console.log(`PASS — ported generateTraits() matches the canonical generator for tokenIds ${SAMPLE_TOKEN_IDS.join(", ")}.`);
}

main();
```

- [ ] **Step 4: Add the tsx devDependency and script**

Modify `app/package.json`: add `"verify-traits": "tsx scripts/verify-traits.ts"` to `"scripts"`, and add `"tsx": "^4.19.2"` to `"devDependencies"`.

- [ ] **Step 5: Run it**

```bash
cd app && npm install && npm run verify-traits
```

Expected output: `PASS — ported generateTraits() matches the canonical generator for tokenIds 1, 50, 95.`, exit code 0. If it fails, the mismatch lines pinpoint exactly which trait/tokenId diverged — do not proceed to Task 5 until this passes, since Tasks 5 and 13 both depend on the port being exact.

- [ ] **Step 6: Commit**

```bash
git add app/lib/art/traits.ts app/lib/art/traits.json app/scripts/verify-traits.ts app/package.json app/package-lock.json
git commit -m "feat: port deterministic trait generator to the client"
```

---

## Task 5: "The stamp lands" + honest rarity acknowledgment — mint-confirm toast treatment

**Depends on Task 4** — imports `generateTraits`, `selloTier` from `@/lib/art/traits`.

Combines two whimsy features into one change, since they land on the exact same toast: the mint-confirmation toast's icon plays a small "press" animation (the seal stamping down) instead of a generic checkmark, and — only when the data says so — renders in the real Gold/Double styling the collection's own rarity already defines. No new copy, no celebratory text.

**Files:**
- Modify `app/components/TxStatusToast.tsx` (add an optional per-toast icon override)
- Modify `app/components/mint/MintPanel.tsx` (`handleMint` — compute rarity, pass the icon)
- Modify `app/app/globals.css` (new `stamp` keyframe)

**Interfaces — Consumes:** `generateTraits(tokenId: number): ObraTraits`, `selloTier(sello: string): SelloTier` from `@/lib/art/traits` (Task 4).

- [ ] **Step 1: Add the `stamp` keyframe**

In `app/app/globals.css`, inside the existing `@theme` block, add a third `--animate-*` entry alongside the existing two:

```css
  --animate-pulse-glow: pulse-glow 1.6s ease-in-out infinite;
  --animate-scale-in: scale-in 0.28s ease-out;
  --animate-stamp: stamp 0.18s ease-out;
```

And after the existing `@keyframes scale-in { ... }` block, add:

```css
@keyframes stamp {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(0.92);
  }
  100% {
    transform: scale(1);
  }
}
```

(This plays once per mount, matching how `scale-in` is already applied — no `infinite`, no change needed to the reduced-motion block, which already neutralizes every `animation-duration` site-wide.)

- [ ] **Step 2: Let a toast override its icon**

Modify `app/components/TxStatusToast.tsx`. Full new content:

```tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangleIcon, CheckIcon, SpinnerIcon } from "./ui/icons";

export type TxToastPhase = "pending" | "confirmed" | "error";

interface NotifyOptions {
  /** Overrides the phase's default icon — used by the mint flow to render
   * the seal-stamp treatment (and its rarity styling) instead of the
   * generic confirmed checkmark. Omit for the default icon. */
  icon?: ReactNode;
}

interface ToastItem {
  id: number;
  phase: TxToastPhase;
  message: string;
  icon?: ReactNode;
}

interface ToastContextValue {
  /** Push a transaction status toast. Returns the toast id (for manual dismissal, e.g. pending -> confirmed replace). */
  notify: (phase: TxToastPhase, message: string, options?: NotifyOptions) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let idCounter = 0;

// Confirmed toasts clear themselves after a few seconds; pending toasts are
// dismissed explicitly by the caller once the tx resolves. Errors are never
// auto-dismissed — BRAND.md: "errors need to be read, not animated."
const AUTO_DISMISS_MS: Record<TxToastPhase, number | null> = {
  pending: null,
  confirmed: 5000,
  error: null,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const notify = useCallback(
    (phase: TxToastPhase, message: string, options?: NotifyOptions) => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, phase, message, icon: options?.icon }]);
      const duration = AUTO_DISMISS_MS[phase];
      if (duration) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }
      return id;
    },
    [dismiss]
  );

  useEffect(() => {
    const timersMap = timers.current;
    return () => {
      timersMap.forEach((t) => clearTimeout(t));
    };
  }, []);

  return (
    <ToastContext.Provider value={{ notify, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useTxToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useTxToast must be used within a ToastProvider");
  return ctx;
}

function ToastViewport({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end">
      {toasts.map((t) => (
        <TxStatusToast key={t.id} phase={t.phase} message={t.message} icon={t.icon} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

const PHASE_BORDER: Record<TxToastPhase, string> = {
  pending: "border-primary/50",
  confirmed: "border-secondary/50",
  error: "border-error/50",
};

interface TxStatusToastProps {
  phase: TxToastPhase;
  message: string;
  icon?: ReactNode;
  onDismiss?: () => void;
}

/**
 * Single transaction-status toast — pending / confirmed / error, per
 * BRAND.md §6. Color is never the only signal: every state pairs an icon
 * with a plain-language message. No box-shadow (flat-surface rule); the
 * confirmed state gets one quiet scale-in, never a celebratory motion.
 */
export function TxStatusToast({ phase, message, icon, onDismiss }: TxStatusToastProps) {
  return (
    <div
      role={phase === "error" ? "alert" : "status"}
      className={[
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-surface-high px-4 py-3",
        PHASE_BORDER[phase],
        phase === "confirmed" ? "animate-scale-in" : "",
      ].join(" ")}
    >
      <span className="mt-0.5 shrink-0">
        {icon
          ? icon
          : phase === "pending"
            ? <SpinnerIcon className="h-4 w-4 animate-spin text-primary" />
            : phase === "confirmed"
              ? <CheckIcon className="h-4 w-4 text-secondary" />
              : <AlertTriangleIcon className="h-4 w-4 text-error" />}
      </span>
      <p className="font-body text-sm leading-snug text-ink">{message}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="ml-auto shrink-0 font-mono text-xs text-muted transition-colors hover:text-ink"
        >
          ✕
        </button>
      )}
    </div>
  );
}
```

All 19 other `notify(...)` call sites in the codebase (`CancelListingButton.tsx`, `BuyPanel.tsx`, `ListPanel.tsx`, and `MintPanel.tsx`'s own `handleApprove`) pass exactly 2 args today and are unaffected — `options` is optional and defaults to no override.

- [ ] **Step 3: Compute rarity and pass the stamp icon in `handleMint`**

Modify `app/components/mint/MintPanel.tsx`. Add the import:

```typescript
import { generateTraits, selloTier, type SelloTier } from "@/lib/art/traits";
```

Add this helper above `MintPanel` (module scope):

```typescript
const GOLD_HEX = "#ddb049"; // contracts/art/generate.ts's COLOR.gold — the collection's own gold, not an unrelated hue.

/** Best tier across a batch of newly minted tokenIds — Double > Gold > vermilion. */
function bestSelloTier(mintedTokenIds: bigint[]): SelloTier {
  const tiers = mintedTokenIds.map((id) => selloTier(generateTraits(Number(id))["Sello"]));
  if (tiers.includes("double")) return "double";
  if (tiers.includes("gold")) return "gold";
  return "vermilion";
}

/** The mint-confirmed toast icon — a stamp-press animation, recolored (and
 * doubled) when the newly minted piece(s) include a rare Sello. No copy
 * change, no celebratory decoration — just the real trait rendered honestly. */
function mintConfirmIcon(tier: SelloTier) {
  if (tier === "double") {
    return (
      <span className="relative inline-block h-4 w-4">
        <SealIcon className="absolute inset-0 h-4 w-4 animate-stamp text-primary" />
        <SealIcon className="absolute inset-0 h-4 w-4 translate-x-1 translate-y-1 animate-stamp" style={{ color: GOLD_HEX }} />
      </span>
    );
  }
  if (tier === "gold") {
    return <SealIcon className="h-4 w-4 animate-stamp" style={{ color: GOLD_HEX }} />;
  }
  return <SealIcon className="h-4 w-4 animate-stamp text-secondary" />;
}
```

Replace `handleMint`'s body — current:

```typescript
  async function handleMint() {
    notify("pending", "Confirm the mint transaction in your wallet…");
    try {
      await mintTx.mint(BigInt(quantity), stats.phase === Phase.Allowlist ? proof : []);
      const updated = await stats.refetch();
      const newTotal = updated.data?.[1]?.result as bigint | undefined;
      const label =
        newTotal !== undefined
          ? quantity === 1
            ? `Obra #${newTotal.toString()}`
            : `Obra #${(newTotal - BigInt(quantity) + 1n).toString()}–${newTotal.toString()}`
          : `${quantity} piece${quantity > 1 ? "s" : ""}`;
      notify("confirmed", `Confirmed — ${label} minted.`);
      approveTx.reset();
      mintTx.reset();
      setQuantity(1);
      onSuccess();
    } catch (err) {
      notify("error", getTxErrorMessage(err));
    }
  }
```

New:

```typescript
  async function handleMint() {
    notify("pending", "Confirm the mint transaction in your wallet…");
    try {
      await mintTx.mint(BigInt(quantity), stats.phase === Phase.Allowlist ? proof : []);
      const updated = await stats.refetch();
      const newTotal = updated.data?.[1]?.result as bigint | undefined;
      const label =
        newTotal !== undefined
          ? quantity === 1
            ? `Obra #${newTotal.toString()}`
            : `Obra #${(newTotal - BigInt(quantity) + 1n).toString()}–${newTotal.toString()}`
          : `${quantity} piece${quantity > 1 ? "s" : ""}`;
      const mintedTokenIds =
        newTotal !== undefined
          ? Array.from({ length: quantity }, (_, i) => newTotal - BigInt(quantity) + 1n + BigInt(i))
          : [];
      const tier = mintedTokenIds.length > 0 ? bestSelloTier(mintedTokenIds) : "vermilion";
      notify("confirmed", `Confirmed — ${label} minted.`, { icon: mintConfirmIcon(tier) });
      approveTx.reset();
      mintTx.reset();
      setQuantity(1);
      onSuccess();
    } catch (err) {
      notify("error", getTxErrorMessage(err));
    }
  }
```

(`handleApprove`'s `notify` calls are untouched — this feature is mint-confirmation only.)

- [ ] **Step 4: Verify**

No test framework covers this repo's frontend — verification is `npm run lint && npm run build`, plus a manual local-chain walkthrough:

1. `npm run lint && npm run build` in `app/` — must pass clean.
2. Find a Gold or Double tokenId to mint next on a fresh local chain: temporarily add `console.log(generateTraits(N))` for a few candidate `N` in a scratch Node REPL or a throwaway line in `verify-traits.ts` (do not commit this), or reuse the `ts-node -e` one-liner pattern from Task 4 Step 3 against `contracts/art/generate.ts` to scan tokenIds 1-100 for `Sello !== "Vermilion"` and print the first few matches.
3. On a fresh local Hardhat chain (`npx hardhat node` + `npm run seed:local`), mint tokens up to and including one of the identified Gold/Double ids (the collection mints sequentially by `totalSupply`, so you may need to mint several in one call, or several times, to reach it).
4. Confirm the toast on that specific mint renders the gold-recolored (or doubled) seal with the press animation; confirm an ordinary Vermilion mint renders the plain jade seal with the press animation and no color change from today's baseline register.
5. Confirm with `prefers-reduced-motion` emulated that the stamp animation collapses to instant per the existing global kill-switch.

- [ ] **Step 5: Commit**

```bash
git add app/components/TxStatusToast.tsx app/components/mint/MintPanel.tsx app/app/globals.css
git commit -m "feat: stamp-press mint toast with honest Gold/Double rarity styling"
```

---

## Task 6: Stepper as ink-stroke — `app/components/StepIndicator.tsx`

Replaces the connector's instant `bg-border → bg-secondary` color swap with a fill that visibly draws left-to-right when step 1 completes.

**Files:** Modify `app/components/StepIndicator.tsx` only.

- [ ] **Step 1: Replace the connector**

Current full file:

```tsx
import { CheckIcon } from "./ui/icons";

export type StepState = "upcoming" | "active" | "complete";

interface StepIndicatorProps {
  step1State: StepState;
  step2State: StepState;
  step1Label: string;
  step2Label: string;
}

export function StepIndicator({ step1State, step2State, step1Label, step2Label }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.08em]" aria-hidden={false}>
      <StepNode state={step1State} label={step1Label} index={1} />
      <span
        className={[
          "h-px w-6 shrink-0 transition-colors duration-300",
          step1State === "complete" ? "bg-secondary" : "bg-border",
        ].join(" ")}
      />
      <StepNode state={step2State} label={step2Label} index={2} />
    </div>
  );
}

function StepNode({ state, label, index }: { state: StepState; label: string; index: number }) {
  const dotClasses =
    state === "complete"
      ? "border-secondary bg-secondary text-bg"
      : state === "active"
        ? "border-primary bg-primary text-bg"
        : "border-muted bg-transparent text-muted";

  return (
    <span className="flex items-center gap-2">
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold ${dotClasses}`}
      >
        {state === "complete" ? <CheckIcon className="h-3 w-3 animate-scale-in" /> : index}
      </span>
      <span className={state === "upcoming" ? "text-muted" : "text-ink"}>{label}</span>
    </span>
  );
}
```

Replace with:

```tsx
import { CheckIcon } from "./ui/icons";

export type StepState = "upcoming" | "active" | "complete";

interface StepIndicatorProps {
  step1State: StepState;
  step2State: StepState;
  step1Label: string;
  step2Label: string;
}

export function StepIndicator({ step1State, step2State, step1Label, step2Label }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.08em]" aria-hidden={false}>
      <StepNode state={step1State} label={step1Label} index={1} />
      <span className="relative h-px w-6 shrink-0 overflow-hidden bg-border">
        <span
          className={[
            "absolute inset-0 origin-left bg-secondary transition-transform duration-300 ease-out",
            step1State === "complete" ? "scale-x-100" : "scale-x-0",
          ].join(" ")}
        />
      </span>
      <StepNode state={step2State} label={step2Label} index={2} />
    </div>
  );
}

function StepNode({ state, label, index }: { state: StepState; label: string; index: number }) {
  const dotClasses =
    state === "complete"
      ? "border-secondary bg-secondary text-bg"
      : state === "active"
        ? "border-primary bg-primary text-bg"
        : "border-muted bg-transparent text-muted";

  return (
    <span className="flex items-center gap-2">
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold ${dotClasses}`}
      >
        {state === "complete" ? <CheckIcon className="h-3 w-3 animate-scale-in" /> : index}
      </span>
      <span className={state === "upcoming" ? "text-muted" : "text-ink"}>{label}</span>
    </span>
  );
}
```

This is a `transition-transform` (a CSS transition, not a `@keyframes` animation), so it is not subject to the "two motion primitives only" constraint on new keyframes — it's the same primitive category as the app's existing `hover:` color transitions. No new CSS file changes needed.

- [ ] **Step 2: Verify**

`npm run lint && npm run build`. Manual: in local dev, start an approve→mint flow, confirm the connector visibly fills left-to-right over ~300ms when the approve step completes, instead of snapping color instantly. With `prefers-reduced-motion` emulated in DevTools, confirm the fill still happens but the `transition-duration` collapses to near-instant (`globals.css`'s `*, *::before, *::after { transition-duration: 0.01ms !important; }` rule already covers this new inner `<span>` with no extra work).

- [ ] **Step 3: Commit**

```bash
git add app/components/StepIndicator.tsx
git commit -m "feat: draw the step connector as an ink-stroke fill instead of a color snap"
```

---

## Task 7: Hover sensible al acabado — `app/components/marketplace/NftCard.tsx` + `app/components/profile/ProfileNftCard.tsx`

Both cards already fetch `metadata.attributes` via `useTokenMetadata` — this uses that existing data (the real IPFS-sourced `Acabado` value), not the Task 4 port; no new fetch.

**Files:** Modify `app/components/marketplace/NftCard.tsx`, `app/components/profile/ProfileNftCard.tsx`.

- [ ] **Step 1: `NftCard.tsx`**

Current full file:

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { TOKEN_SYMBOL } from "@/lib/config/contracts";
import { useTokenMetadata } from "@/lib/hooks/useTokenMetadata";
import { formatTokenAmount, truncateAddress } from "@/lib/format";

interface NftCardProps {
  chainId: number | undefined;
  tokenId: bigint;
  /** Listed price in CHU wei, if this card is shown inside the marketplace grid. Omit for an unlisted profile card. */
  price?: bigint;
  seller?: string;
}

export function NftCard({ chainId, tokenId, price, seller }: NftCardProps) {
  const { metadata, isLoading } = useTokenMetadata(chainId, tokenId);

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-primary">
      <Link href={`/marketplace/${tokenId.toString()}`} className="flex flex-col">
        <div className="aspect-square w-full overflow-hidden bg-bg">
          {metadata?.image ? (
            <Image
              src={metadata.image}
              alt={metadata.name ?? `Obra #${tokenId.toString()}`}
              width={400}
              height={400}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-mono text-xs text-muted">
              {isLoading ? "Loading…" : "No image"}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5 p-3 pb-2">
          <span className="font-display text-base font-medium text-ink">
            {metadata?.name ?? `Obra #${tokenId.toString()}`}
          </span>
          {price !== undefined ? (
            <span className="font-mono text-xs uppercase tracking-[0.05em] text-primary">
              {formatTokenAmount(price)} {TOKEN_SYMBOL}
            </span>
          ) : (
            <span className="font-mono text-xs uppercase tracking-[0.05em] text-muted">Not listed</span>
          )}
        </div>
      </Link>
      {seller && (
        <Link
          href={`/profile/${seller}`}
          className="border-t border-border px-3 py-2 font-mono text-xs text-muted transition-colors hover:text-ink"
        >
          Seller: {truncateAddress(seller)}
        </Link>
      )}
    </div>
  );
}
```

Replace with (adds a `FinishOverlay` helper shared by both files — defined once here, imported by `ProfileNftCard.tsx` in Step 2):

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { TOKEN_SYMBOL } from "@/lib/config/contracts";
import { useTokenMetadata } from "@/lib/hooks/useTokenMetadata";
import { formatTokenAmount, truncateAddress } from "@/lib/format";
import { FinishOverlay } from "./FinishOverlay";

interface NftCardProps {
  chainId: number | undefined;
  tokenId: bigint;
  /** Listed price in CHU wei, if this card is shown inside the marketplace grid. Omit for an unlisted profile card. */
  price?: bigint;
  seller?: string;
}

export function NftCard({ chainId, tokenId, price, seller }: NftCardProps) {
  const { metadata, isLoading } = useTokenMetadata(chainId, tokenId);
  const acabado = metadata?.attributes?.find((a) => a.trait_type === "Acabado")?.value;

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-primary">
      <Link href={`/marketplace/${tokenId.toString()}`} className="flex flex-col">
        <div className="relative aspect-square w-full overflow-hidden bg-bg">
          {metadata?.image ? (
            <Image
              src={metadata.image}
              alt={metadata.name ?? `Obra #${tokenId.toString()}`}
              width={400}
              height={400}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-mono text-xs text-muted">
              {isLoading ? "Loading…" : "No image"}
            </div>
          )}
          <FinishOverlay acabado={acabado} tokenId={tokenId} />
        </div>
        <div className="flex flex-col gap-1.5 p-3 pb-2">
          <span className="font-display text-base font-medium text-ink">
            {metadata?.name ?? `Obra #${tokenId.toString()}`}
          </span>
          {price !== undefined ? (
            <span className="font-mono text-xs uppercase tracking-[0.05em] text-primary">
              {formatTokenAmount(price)} {TOKEN_SYMBOL}
            </span>
          ) : (
            <span className="font-mono text-xs uppercase tracking-[0.05em] text-muted">Not listed</span>
          )}
        </div>
      </Link>
      {seller && (
        <Link
          href={`/profile/${seller}`}
          className="border-t border-border px-3 py-2 font-mono text-xs text-muted transition-colors hover:text-ink"
        >
          Seller: {truncateAddress(seller)}
        </Link>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Shared `FinishOverlay` helper**

Create `app/components/marketplace/FinishOverlay.tsx`:

```tsx
/**
 * Hover-revealed treatment matching a piece's Acabado (finish) trait —
 * Grano gets a faint fractal-noise grain (mirroring the same SVG filter
 * primitives contracts/art/generate.ts's renderFinishOverlay() uses for
 * "Grano", so the hover state previews the piece's real surface texture),
 * Grabado gets a faint engraved inner border, Plano gets nothing extra
 * (the card's existing hover:border-primary is the only effect).
 * Shared by NftCard and ProfileNftCard — both already fetch metadata
 * client-side, so this adds zero new reads.
 */
export function FinishOverlay({ acabado, tokenId }: { acabado: string | undefined; tokenId: bigint }) {
  if (acabado === "Grano") {
    const filterId = `grain-${tokenId.toString()}`;
    return (
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      >
        <filter id={filterId}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.04 0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${filterId})`} />
      </svg>
    );
  }
  if (acabado === "Grabado") {
    return (
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-1 rounded-lg border border-ink/20 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      />
    );
  }
  return null;
}
```

- [ ] **Step 3: `ProfileNftCard.tsx`**

Current full file:

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { TOKEN_SYMBOL } from "@/lib/config/contracts";
import { useTokenMetadata } from "@/lib/hooks/useTokenMetadata";
import { useListing } from "@/lib/hooks/useListings";
import { formatTokenAmount } from "@/lib/format";
import { CancelListingButton } from "../marketplace/CancelListingButton";
import { ListPanel } from "./ListPanel";

interface ProfileNftCardProps {
  chainId: number | undefined;
  tokenId: bigint;
  isOwnerViewing: boolean;
  onChanged: () => void;
}

export function ProfileNftCard({ chainId, tokenId, isOwnerViewing, onChanged }: ProfileNftCardProps) {
  const { metadata } = useTokenMetadata(chainId, tokenId);
  const { listing, refetch: refetchListing } = useListing(chainId, tokenId);
  const [listing_, setListingOpen] = useState(false);

  const isListed = listing?.active === true;

  function handleChanged() {
    refetchListing();
    onChanged();
    setListingOpen(false);
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface">
      <Link href={`/marketplace/${tokenId.toString()}`} className="aspect-square w-full overflow-hidden bg-bg">
        {metadata?.image && (
          <Image
            src={metadata.image}
            alt={metadata.name ?? `Obra #${tokenId.toString()}`}
            width={400}
            height={400}
            className="h-full w-full object-cover"
            unoptimized
          />
        )}
      </Link>
      <div className="flex flex-col gap-2 p-3">
        <Link href={`/marketplace/${tokenId.toString()}`} className="font-display text-base font-medium text-ink hover:text-primary">
          {metadata?.name ?? `Obra #${tokenId.toString()}`}
        </Link>

        {isListed && listing ? (
          <>
            <span className="font-mono text-xs uppercase tracking-[0.05em] text-primary">
              Listed · {formatTokenAmount(listing.price)} {TOKEN_SYMBOL}
            </span>
            {isOwnerViewing && <CancelListingButton chainId={chainId} tokenId={tokenId} onSuccess={handleChanged} />}
          </>
        ) : (
          <>
            <span className="font-mono text-xs uppercase tracking-[0.05em] text-muted">Not listed</span>
            {isOwnerViewing &&
              (listing_ ? (
                <ListPanel chainId={chainId} tokenId={tokenId} onSuccess={handleChanged} onCancel={() => setListingOpen(false)} />
              ) : (
                <button
                  type="button"
                  onClick={() => setListingOpen(true)}
                  className="rounded-lg border border-border px-3 py-2 font-mono text-xs uppercase tracking-[0.06em] text-ink transition-colors hover:border-primary"
                >
                  List for sale
                </button>
              ))}
          </>
        )}
      </div>
    </div>
  );
}
```

Replace with (adds `group` to the outer card — this card had no hover treatment at all before; the new overlay is additive and does not change any existing behavior):

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { TOKEN_SYMBOL } from "@/lib/config/contracts";
import { useTokenMetadata } from "@/lib/hooks/useTokenMetadata";
import { useListing } from "@/lib/hooks/useListings";
import { formatTokenAmount } from "@/lib/format";
import { FinishOverlay } from "../marketplace/FinishOverlay";
import { CancelListingButton } from "../marketplace/CancelListingButton";
import { ListPanel } from "./ListPanel";

interface ProfileNftCardProps {
  chainId: number | undefined;
  tokenId: bigint;
  isOwnerViewing: boolean;
  onChanged: () => void;
}

export function ProfileNftCard({ chainId, tokenId, isOwnerViewing, onChanged }: ProfileNftCardProps) {
  const { metadata } = useTokenMetadata(chainId, tokenId);
  const { listing, refetch: refetchListing } = useListing(chainId, tokenId);
  const [listing_, setListingOpen] = useState(false);
  const acabado = metadata?.attributes?.find((a) => a.trait_type === "Acabado")?.value;

  const isListed = listing?.active === true;

  function handleChanged() {
    refetchListing();
    onChanged();
    setListingOpen(false);
  }

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface">
      <Link href={`/marketplace/${tokenId.toString()}`} className="relative aspect-square w-full overflow-hidden bg-bg">
        {metadata?.image && (
          <Image
            src={metadata.image}
            alt={metadata.name ?? `Obra #${tokenId.toString()}`}
            width={400}
            height={400}
            className="h-full w-full object-cover"
            unoptimized
          />
        )}
        <FinishOverlay acabado={acabado} tokenId={tokenId} />
      </Link>
      <div className="flex flex-col gap-2 p-3">
        <Link href={`/marketplace/${tokenId.toString()}`} className="font-display text-base font-medium text-ink hover:text-primary">
          {metadata?.name ?? `Obra #${tokenId.toString()}`}
        </Link>

        {isListed && listing ? (
          <>
            <span className="font-mono text-xs uppercase tracking-[0.05em] text-primary">
              Listed · {formatTokenAmount(listing.price)} {TOKEN_SYMBOL}
            </span>
            {isOwnerViewing && <CancelListingButton chainId={chainId} tokenId={tokenId} onSuccess={handleChanged} />}
          </>
        ) : (
          <>
            <span className="font-mono text-xs uppercase tracking-[0.05em] text-muted">Not listed</span>
            {isOwnerViewing &&
              (listing_ ? (
                <ListPanel chainId={chainId} tokenId={tokenId} onSuccess={handleChanged} onCancel={() => setListingOpen(false)} />
              ) : (
                <button
                  type="button"
                  onClick={() => setListingOpen(true)}
                  className="rounded-lg border border-border px-3 py-2 font-mono text-xs uppercase tracking-[0.06em] text-ink transition-colors hover:border-primary"
                >
                  List for sale
                </button>
              ))}
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify**

`npm run lint && npm run build`. Manual: in the local seeded marketplace grid, use the `ts-node -e` scan pattern from Task 4 Step 3 (or Task 5 Step 4) against `contracts/art/generate.ts` to find one Grano tokenId and one Grabado tokenId among the seeded/minted ids, hover each card and confirm the two distinct treatments render, and confirm a Plano-finish card shows only the existing border-color hover with no extra overlay. Repeat on a profile grid (`ProfileNftCard`).

- [ ] **Step 5: Commit**

```bash
git add app/components/marketplace/NftCard.tsx app/components/marketplace/FinishOverlay.tsx app/components/profile/ProfileNftCard.tsx
git commit -m "feat: reveal a piece's Acabado finish on card hover"
```

---

## Task 8: Odometer quantity stepper — `app/components/mint/MintPanel.tsx`

**Files:** Modify `app/components/mint/MintPanel.tsx`'s `QuantityStepper` subcomponent only. Modify `app/app/globals.css` (new `digit-roll` keyframe).

- [ ] **Step 1: Add the `digit-roll` keyframe**

In `app/app/globals.css`'s `@theme` block, add a 4th `--animate-*` entry (alongside `pulse-glow`, `scale-in`, and Task 5's `stamp` — insertion order among these doesn't matter, each is an independent named block):

```css
  --animate-digit-roll: digit-roll 0.12s ease-out;
```

And add the keyframes block:

```css
@keyframes digit-roll {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
```

- [ ] **Step 2: Replace the static digit with a rolling one**

Current `QuantityStepper` in `app/components/mint/MintPanel.tsx`:

```tsx
function QuantityStepper({
  quantity,
  onChange,
  max,
  disabled,
}: {
  quantity: number;
  onChange: (next: number) => void;
  max: bigint | undefined;
  disabled: boolean;
}) {
  const maxNum = max !== undefined ? Number(max) : undefined;
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-xs uppercase tracking-[0.08em] text-muted">Quantity</span>
      <div className="flex items-center rounded-lg border border-border">
        <button
          type="button"
          disabled={disabled || quantity <= 1}
          onClick={() => onChange(quantity - 1)}
          className="px-3 py-1.5 font-mono text-ink transition-colors hover:bg-surface-high disabled:opacity-40"
          aria-label="Decrease quantity"
        >
          −
        </button>
        <span className="min-w-8 text-center font-mono text-sm text-ink">{quantity}</span>
        <button
          type="button"
          disabled={disabled || (maxNum !== undefined && quantity >= maxNum)}
          onClick={() => onChange(quantity + 1)}
          className="px-3 py-1.5 font-mono text-ink transition-colors hover:bg-surface-high disabled:opacity-40"
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>
      {maxNum !== undefined && <span className="font-mono text-xs text-muted">max {maxNum}</span>}
    </div>
  );
}
```

Replace the middle `<span className="min-w-8 ...">{quantity}</span>` line with a remounting, animated version — full replacement function:

```tsx
function QuantityStepper({
  quantity,
  onChange,
  max,
  disabled,
}: {
  quantity: number;
  onChange: (next: number) => void;
  max: bigint | undefined;
  disabled: boolean;
}) {
  const maxNum = max !== undefined ? Number(max) : undefined;
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-xs uppercase tracking-[0.08em] text-muted">Quantity</span>
      <div className="flex items-center rounded-lg border border-border">
        <button
          type="button"
          disabled={disabled || quantity <= 1}
          onClick={() => onChange(quantity - 1)}
          className="px-3 py-1.5 font-mono text-ink transition-colors hover:bg-surface-high disabled:opacity-40"
          aria-label="Decrease quantity"
        >
          −
        </button>
        <span className="h-5 min-w-8 overflow-hidden text-center">
          <span key={quantity} className="block animate-digit-roll font-mono text-sm text-ink">
            {quantity}
          </span>
        </span>
        <button
          type="button"
          disabled={disabled || (maxNum !== undefined && quantity >= maxNum)}
          onClick={() => onChange(quantity + 1)}
          className="px-3 py-1.5 font-mono text-ink transition-colors hover:bg-surface-high disabled:opacity-40"
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>
      {maxNum !== undefined && <span className="font-mono text-xs text-muted">max {maxNum}</span>}
    </div>
  );
}
```

(`key={quantity}` forces React to remount the inner `<span>` on every quantity change, which restarts the CSS animation each time — the standard React pattern for replaying a CSS keyframe on a value change.)

- [ ] **Step 3: Verify**

`npm run lint && npm run build`. Manual: on `/` with a connected wallet, click the `+`/`−` buttons and confirm each click plays a brief upward roll instead of an instant digit swap; confirm reduced-motion collapses it via the existing global kill-switch.

- [ ] **Step 4: Commit**

```bash
git add app/components/mint/MintPanel.tsx app/app/globals.css
git commit -m "feat: roll the mint quantity digit instead of swapping it instantly"
```

---

## Task 9: Trait tooltips as curator's notes — `app/lib/art/traitNotes.ts` + `app/app/marketplace/[tokenId]/page.tsx`

**Files:** Create `app/lib/art/traitNotes.ts`. Modify `app/app/marketplace/[tokenId]/page.tsx`'s attribute-chip block.

- [ ] **Step 1: Write the curator's notes**

Create `app/lib/art/traitNotes.ts`:

```typescript
/**
 * One-line curator's notes explaining each trait DIMENSION (not a specific
 * value) — shown on hover/focus of an attribute chip on the token detail
 * page. Written in the same dry, precise "curatorial, not salesy" register
 * as the rest of the app's copy; the trait vocabulary itself stays in
 * Spanish (BRAND.md's "respect authorship, don't translate" rule), only
 * these explanatory notes are in English.
 */
export const TRAIT_NOTES: Record<string, string> = {
  "Composición": "The underlying geometric structure the piece is built from — orbital, constructive, grid, gestural, or guilloché.",
  "Paleta": "The piece's color family, drawn from the collection's five palettes.",
  "Densidad": "How much of the plate's surface the composition occupies.",
  "Acabado": "The surface treatment applied over the composition — flat, engraved, or grained.",
  "Sello": "The seal stamped on the piece — vermilion is the standard mark; gold and double seals are rarer variants.",
};
```

- [ ] **Step 2: Make each attribute chip focusable and add its note**

In `app/app/marketplace/[tokenId]/page.tsx`, add the import:

```typescript
import { TRAIT_NOTES } from "@/lib/art/traitNotes";
```

Current attributes block:

```tsx
          {metadata?.attributes && metadata.attributes.length > 0 && (
            <Card>
              <h2 className="font-mono text-xs uppercase tracking-[0.08em] text-muted">Attributes</h2>
              <dl className="mt-3 grid grid-cols-2 gap-3">
                {metadata.attributes.map((attr) => (
                  <div key={attr.trait_type} className="rounded-lg border border-border bg-bg px-3 py-2">
                    <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.05em] text-muted">{attr.trait_type}</dt>
                    <dd className="font-body text-sm text-ink">{attr.value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}
```

Replace with:

```tsx
          {metadata?.attributes && metadata.attributes.length > 0 && (
            <Card>
              <h2 className="font-mono text-xs uppercase tracking-[0.08em] text-muted">Attributes</h2>
              <dl className="mt-3 grid grid-cols-2 gap-3">
                {metadata.attributes.map((attr) => {
                  const note = TRAIT_NOTES[attr.trait_type];
                  const noteId = `traitnote-${attr.trait_type}`;
                  return (
                    <div
                      key={attr.trait_type}
                      tabIndex={0}
                      className="group rounded-lg border border-border bg-bg px-3 py-2 focus:outline-none"
                    >
                      <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.05em] text-muted">{attr.trait_type}</dt>
                      <dd className="font-body text-sm text-ink" aria-describedby={note ? noteId : undefined}>
                        {attr.value}
                      </dd>
                      {note && (
                        <p
                          id={noteId}
                          className="mt-1 hidden font-body text-xs text-muted group-hover:block group-focus-visible:block"
                        >
                          {note}
                        </p>
                      )}
                    </div>
                  );
                })}
              </dl>
            </Card>
          )}
```

The note is always present in the DOM (linked via `aria-describedby`, so screen readers announce it regardless of hover/focus state) — only its visibility is hover/focus-gated via Tailwind's `group-hover`/`group-focus-visible`, matching this codebase's existing preference for CSS-only interaction states over a JS tooltip library.

- [ ] **Step 3: Verify**

`npm run lint && npm run build`. Manual: on any token detail page, hover and then Tab-focus each of the 5 attribute chips and confirm the corresponding curator's note appears, with distinct correct text for all 5.

- [ ] **Step 4: Commit**

```bash
git add app/lib/art/traitNotes.ts app/app/marketplace/\[tokenId\]/page.tsx
git commit -m "feat: add curator's-note tooltips to trait attribute chips"
```

---

## Task 10: Remaining empty-state copy — 3 spots

**Files:** Modify `app/components/mint/MintPanel.tsx` (sold-out message). Modify `app/app/marketplace/[tokenId]/page.tsx` (empty price history, detail-page loading string).

- [ ] **Step 1: Sold-out mint copy**

In `app/components/mint/MintPanel.tsx`, current:

```tsx
        {flowMode === "sold-out" && <p className="font-body text-sm text-muted">The collection is fully minted.</p>}
```

Replace with:

```tsx
        {flowMode === "sold-out" && (
          <p className="font-body text-sm text-muted">The collection is complete. All 100 pieces are signed.</p>
        )}
```

- [ ] **Step 2: Detail-page loading copy**

In `app/app/marketplace/[tokenId]/page.tsx`, current:

```tsx
            ) : (
              <div className="flex h-full w-full items-center justify-center font-mono text-xs text-muted">
                {metadataLoading ? "Loading…" : "No image"}
              </div>
            )}
```

Replace with:

```tsx
            ) : (
              <div className="flex h-full w-full items-center justify-center font-mono text-xs text-muted">
                {metadataLoading ? "Reading provenance…" : "No image"}
              </div>
            )}
```

(This is the ONLY loading-string change in this task — `NftCard.tsx`, `ProfileNftCard.tsx`, and every other grid/card keep the generic `"Loading…"` unchanged.)

- [ ] **Step 3: Empty price-history copy**

Current:

```tsx
          {history && history.length > 0 && (
            <Card>
              <h2 className="font-mono text-xs uppercase tracking-[0.08em] text-muted">Price History</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {history.map((sale) => (
                  <li key={sale.txHash} className="flex items-center justify-between font-mono text-xs text-muted">
                    <span>
                      {truncateAddress(sale.seller)} → {truncateAddress(sale.buyer)}
                    </span>
                    <span className="text-ink">
                      {formatTokenAmount(sale.price)} {TOKEN_SYMBOL}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
```

Replace with (the section now renders as soon as `history` has resolved at all, whether empty or populated — it only stays hidden while the query is still loading, i.e. `history === undefined`):

```tsx
          {history && (
            <Card>
              <h2 className="font-mono text-xs uppercase tracking-[0.08em] text-muted">Price History</h2>
              {history.length > 0 ? (
                <ul className="mt-3 flex flex-col gap-2">
                  {history.map((sale) => (
                    <li key={sale.txHash} className="flex items-center justify-between font-mono text-xs text-muted">
                      <span>
                        {truncateAddress(sale.seller)} → {truncateAddress(sale.buyer)}
                      </span>
                      <span className="text-ink">
                        {formatTokenAmount(sale.price)} {TOKEN_SYMBOL}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 font-body text-sm text-muted">
                  No transactions recorded for this piece yet — it has only ever been minted.
                </p>
              )}
            </Card>
          )}
```

- [ ] **Step 4: Verify**

`npm run lint && npm run build`. Manual: view a sold-out mint page (or temporarily mock `remainingSupply <= 0n` in dev — revert before commit), a token detail page for a token with no sale history (any token that's only ever been minted, never bought), and confirm all three new strings render exactly as specified above.

- [ ] **Step 5: Commit**

```bash
git add app/components/mint/MintPanel.tsx app/app/marketplace/\[tokenId\]/page.tsx
git commit -m "feat: fill in remaining empty-state and loading copy"
```

---

## Task 11: Mint milestone note — `app/components/mint/MintPanel.tsx`

**Files:**
- Modify: `app/components/mint/MintPanel.tsx:141-156` (insert after the closing `</dl>`, before the `<div className="mt-6 flex flex-col gap-4 border-t border-border pt-5">` block that follows)

**Interfaces:**
- Consumes: `stats.totalSupply` (`bigint | undefined`), already returned by `useCollectionStats` (existing on-chain multicall — no new read).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add the milestone line**

Insert immediately after the existing stats `<dl>` block (currently ends at line 156 with `</dl>`) and before the following `<div className="mt-6 ...">`:

```tsx
      </dl>

      {stats.totalSupply !== undefined && MILESTONE_NOTE[stats.totalSupply.toString()] && (
        <p className="mt-3 font-mono text-xs text-muted">{MILESTONE_NOTE[stats.totalSupply.toString()]}</p>
      )}

      <div className="mt-6 flex flex-col gap-4 border-t border-border pt-5">
```

Add this constant near the top of the file, alongside the other module-level declarations (after the imports, before the `MintPanel` function):

```tsx
const MILESTONE_NOTE: Record<string, string> = {
  "1": "The first piece is signed.",
  "50": "Obra #50 — halfway signed.",
  "100": "The collection is complete.",
};
```

Keying by `.toString()` sidesteps `bigint` object-identity/map-key issues (bigints can't be object-literal keys directly, and `1n === 1n` is true but using them as `Record` keys requires the string form) — this is a bounded 3-entry lookup, not a scalability concern. The line disappears automatically the moment `stats.totalSupply` moves off `1n`/`50n`/`100n` (e.g., the very next mint) since it's a pure derived render with no stored state — no dismiss button, no animation, matching the plan's "no storage" requirement.

- [ ] **Step 2: Run lint and build**

Run: `cd app && npm run lint && npm run build`
Expected: both pass with no errors.

- [ ] **Step 3: Manual verification**

No test framework exists in `app/` (confirmed: only `dev/build/start/lint/sync-exports` scripts) — this feature is only observable at the exact moment `totalSupply` crosses 1, 50, or 100, which is impractical to hit on the live BNB testnet deployment (already near/at whatever supply it's at, and public testnet CHU is scarce). Verify locally instead:

1. Start a **fresh** local Hardhat node: `cd contracts && npx hardhat node` (do NOT run `npm run seed:local` — it pre-mints tokens #1-#4, which skips past the `1n` threshold before you ever observe it).
2. In a second terminal, deploy fresh: `cd contracts && npx hardhat run scripts/deploy.ts --network localhost`. If this script turns out to require BNB-testnet-only env vars that block a localhost deploy, fall back to a one-off local deploy script that calls `deployProtocol()` from `contracts/scripts/lib/deployCore.ts` the same way `seed-local.ts` does, minus the pre-minting steps — note in the commit message which path was used.
3. `cd app && NEXT_PUBLIC_NETWORK_ENV=local npm run dev`, connect a funded account (see Task 1/2's Hardhat-mnemonic account derivation if you need a quick funded wallet), mint 1 token, confirm `"The first piece is signed."` renders under the stats row.
4. Spot-check the `50`/`100` cases without minting 100 real tokens: temporarily hardcode `stats.totalSupply` to `50n` (then `100n`) in a local, uncommitted debug edit, confirm the correct string renders for each, then revert the debug edit before committing — the `1n`/`50n`/`100n` branches are the same code path, so a live end-to-end check of `1n` plus a hardcoded-value check of the other two is a reasonable, honest verification bar for a threshold effect this expensive to reach for real.

- [ ] **Step 4: Commit**

```bash
git add app/components/mint/MintPanel.tsx
git commit -m "feat: show a milestone note at mint #1, #50, and #100"
```

---

## Task 12: Provenance ledger — `app/lib/hooks/useProvenance.ts` + `app/components/profile/ProvenanceLedger.tsx`

**Files:**
- Create: `app/lib/hooks/useProvenance.ts`
- Create: `app/components/profile/ProvenanceLedger.tsx`
- Modify: `app/app/profile/[address]/page.tsx`

**Interfaces:**
- Consumes: `MARKET_ABI`, `OBRA_ABI`, `getContractAddress` from `app/lib/config/contracts` (same imports `useSaleHistory.ts`/`useMintSpend.ts` already use). Contract event shapes, confirmed by reading the Solidity source directly (`contracts/contracts/Obra.sol:79`, `contracts/contracts/ObraMarket.sol:64-71`):
  - `event Minted(address indexed minter, uint256 startTokenId, uint256 quantity, uint256 totalPaid)` — one event per mint transaction, covering a *range* of `quantity` consecutive tokenIds starting at `startTokenId`, not one event per token.
  - `event Bought(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 price, uint256 royaltyAmount, uint256 feeAmount)`.
- Produces: `export interface ProvenanceEvent { type: "minted" | "bought" | "sold"; tokenId: bigint; counterparty?: `0x${string}`; price?: bigint; blockNumber: bigint; txHash: `0x${string}`; timestamp?: number }` and `export function useProvenance(chainId: number | undefined, address: string | undefined): { events: ProvenanceEvent[]; isLoading: boolean }`. Task 13 does NOT depend on this hook (it uses `useOwnedTokenIds` directly) — no other task in this plan imports from this file.

- [ ] **Step 1: Write `useProvenance.ts`**

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { MARKET_ABI, OBRA_ABI, getContractAddress } from "../config/contracts";

export interface ProvenanceEvent {
  type: "minted" | "bought" | "sold";
  tokenId: bigint;
  counterparty?: `0x${string}`;
  price?: bigint;
  blockNumber: bigint;
  txHash: `0x${string}`;
  timestamp?: number;
}

interface RawMintedLog {
  args: { minter?: string; startTokenId?: bigint; quantity?: bigint };
  blockNumber?: bigint;
  transactionHash?: string;
}

interface RawBoughtLog {
  args: { tokenId?: bigint; buyer?: string; seller?: string; price?: bigint };
  blockNumber?: bigint;
  transactionHash?: string;
}

/**
 * Public on-chain provenance for a wallet — every piece it has minted,
 * bought, or sold — reformatted from events this app already reads
 * elsewhere (see useSaleHistory.ts, useMintSpend.ts) into a per-wallet
 * timeline. No new indexer, no storage: same "best-effort getContractEvents,
 * fromBlock earliest" approach as the rest of this codebase. Visible on ANY
 * profile (this is public on-chain history, not owner-only data).
 */
export function useProvenance(chainId: number | undefined, address: string | undefined) {
  const obraAddress = getContractAddress(chainId, "obra");
  const marketAddress = getContractAddress(chainId, "market");
  const client = usePublicClient({ chainId });

  const query = useQuery({
    queryKey: ["obra-provenance", chainId, obraAddress, marketAddress, address],
    queryFn: async (): Promise<ProvenanceEvent[]> => {
      if (!client || !obraAddress || !marketAddress || !address) return [];

      const [mintedLogs, boughtAsBuyerLogs, boughtAsSellerLogs] = await Promise.all([
        client.getContractEvents({
          address: obraAddress,
          abi: OBRA_ABI,
          eventName: "Minted",
          args: { minter: address as `0x${string}` },
          fromBlock: "earliest",
          toBlock: "latest",
        }) as Promise<RawMintedLog[]>,
        client.getContractEvents({
          address: marketAddress,
          abi: MARKET_ABI,
          eventName: "Bought",
          args: { buyer: address as `0x${string}` },
          fromBlock: "earliest",
          toBlock: "latest",
        }) as Promise<RawBoughtLog[]>,
        client.getContractEvents({
          address: marketAddress,
          abi: MARKET_ABI,
          eventName: "Bought",
          args: { seller: address as `0x${string}` },
          fromBlock: "earliest",
          toBlock: "latest",
        }) as Promise<RawBoughtLog[]>,
      ]);

      const events: ProvenanceEvent[] = [];

      for (const log of mintedLogs) {
        const { startTokenId, quantity } = log.args;
        if (startTokenId === undefined || quantity === undefined) continue;
        for (let i = 0n; i < quantity; i++) {
          events.push({
            type: "minted",
            tokenId: startTokenId + i,
            blockNumber: log.blockNumber ?? 0n,
            txHash: (log.transactionHash ?? "0x") as `0x${string}`,
          });
        }
      }

      for (const log of boughtAsBuyerLogs) {
        const { tokenId, seller, price } = log.args;
        if (tokenId === undefined) continue;
        events.push({
          type: "bought",
          tokenId,
          counterparty: seller as `0x${string}` | undefined,
          price,
          blockNumber: log.blockNumber ?? 0n,
          txHash: (log.transactionHash ?? "0x") as `0x${string}`,
        });
      }

      for (const log of boughtAsSellerLogs) {
        const { tokenId, buyer, price } = log.args;
        if (tokenId === undefined) continue;
        events.push({
          type: "sold",
          tokenId,
          counterparty: buyer as `0x${string}` | undefined,
          price,
          blockNumber: log.blockNumber ?? 0n,
          txHash: (log.transactionHash ?? "0x") as `0x${string}`,
        });
      }

      // Best-effort timestamp enrichment: one getBlock per DISTINCT block
      // number across this wallet's history (not per event), run in
      // parallel. A bounded N+1 — N is small for any single wallet in a
      // 100-piece collection — acceptable under this codebase's existing
      // "no indexer, best-effort" convention (see useSaleHistory.ts).
      const distinctBlocks = Array.from(new Set(events.map((e) => e.blockNumber)));
      const blocks = await Promise.all(
        distinctBlocks.map((blockNumber) =>
          client.getBlock({ blockNumber }).catch(() => undefined)
        )
      );
      const timestampByBlock = new Map<bigint, number>();
      distinctBlocks.forEach((blockNumber, i) => {
        const ts = blocks[i]?.timestamp;
        if (ts !== undefined) timestampByBlock.set(blockNumber, Number(ts));
      });
      for (const event of events) {
        event.timestamp = timestampByBlock.get(event.blockNumber);
      }

      return events.sort((a, b) => (b.blockNumber > a.blockNumber ? 1 : b.blockNumber < a.blockNumber ? -1 : 0));
    },
    enabled: Boolean(client && obraAddress && marketAddress && address),
    staleTime: 30_000,
    retry: false,
  });

  return { events: query.data ?? [], isLoading: query.isLoading };
}
```

- [ ] **Step 2: Write `ProvenanceLedger.tsx`**

```tsx
"use client";

import { useProvenance } from "@/lib/hooks/useProvenance";
import { Card } from "../ui/Card";

function formatDate(timestamp: number | undefined): string {
  if (timestamp === undefined) return "";
  return new Date(timestamp * 1000).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

export function ProvenanceLedger({ chainId, address }: { chainId: number | undefined; address: string }) {
  const { events, isLoading } = useProvenance(chainId, address);

  return (
    <Card>
      <h2 className="font-mono text-[0.75rem] uppercase tracking-[0.08em] text-muted">Provenance</h2>

      {isLoading ? (
        <p className="mt-3 font-body text-sm text-muted">Loading…</p>
      ) : events.length === 0 ? (
        <p className="mt-3 font-body text-sm text-muted">No transactions recorded for this wallet yet.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {events.map((event) => {
            const date = formatDate(event.timestamp);
            const label =
              event.type === "sold" ? `Sold Obra #${event.tokenId.toString()}` : `Acquired Obra #${event.tokenId.toString()}`;
            return (
              <li key={`${event.txHash}-${event.tokenId.toString()}-${event.type}`} className="font-mono text-xs text-ink">
                {label}
                {date && <span className="text-muted"> — {date}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
```

- [ ] **Step 3: Wire into the profile page**

Modify `app/app/profile/[address]/page.tsx`: add the import and render `<ProvenanceLedger>` right after `<ProfileStats .../>` (line 90) and before the `{allTokenIds.length === 0 ? ... }` inventory block — provenance is a wallet's full history independent of what it currently owns, so it reads naturally as a second summary panel immediately following the stats card, before the piece-by-piece grid:

```tsx
import { ProvenanceLedger } from "@/components/profile/ProvenanceLedger";
```

```tsx
            <ProfileStats totalOwned={allTokenIds.length} totalSpentOnMints={mintSpend} totalListedValue={totalListedValue} />

            <ProvenanceLedger chainId={chainId} address={profileAddress} />

            {allTokenIds.length === 0 ? (
```

This renders for any profile address, matching how `ProfileStats` and the inventory grid already behave for any address (not owner-gated) — it's public on-chain history.

- [ ] **Step 4: Run lint and build**

Run: `cd app && npm run lint && npm run build`
Expected: both pass.

- [ ] **Step 5: Manual verification**

In local dev with the standard `npm run seed:local` backdrop (account #0 `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` minted #1-#3 and listed #1 at 75 CHU; account #1 `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` minted #4):
1. Visit `/profile/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` and confirm 3 "Acquired Obra #1/#2/#3" rows render.
2. Connect as account #1, buy token #1 from the marketplace.
3. Revisit account #0's profile and confirm it now also shows "Sold Obra #1".
4. Visit account #1's profile and confirm it shows "Acquired Obra #4" (from its mint) and "Acquired Obra #1" (from the buy).

- [ ] **Step 6: Commit**

```bash
git add app/lib/hooks/useProvenance.ts app/components/profile/ProvenanceLedger.tsx app/app/profile/\[address\]/page.tsx
git commit -m "feat: add a public provenance ledger to the profile page"
```

---

## Task 13: Trait-range summary — `app/components/profile/ProfileStats.tsx`

**Files:**
- Modify: `app/components/profile/ProfileStats.tsx` (full current source below — currently takes only aggregate-number props, no tokenId list)
- Modify: `app/app/profile/[address]/page.tsx:90` (thread `allTokenIds` through)

**Interfaces:**
- Consumes: `app/lib/art/traits.ts`'s `generateTraits(tokenId: number): ObraTraits` and `selloTier(sello: string): SelloTier` (Task 4, a different phase — do not redefine these, import from `@/lib/art/traits`). `useOwnedTokenIds` is NOT used directly by this task — the profile page already computes `allTokenIds: bigint[]` (the union of directly-owned and listed-by-this-address tokens, per `app/app/profile/[address]/page.tsx:50-55`) and this task reuses that same list, for consistency with the "Pieces owned" stat which already counts `allTokenIds.length`, not raw `ownedTokenIds.length`.
- Confirmed from `contracts/art/traits.json`: exactly 5 possible `Composición` values (Orbital, Constructiva, Retícula, Trazo, Guilloché).
- Produces: nothing consumed by later tasks.

Current file, in full, as the editing target:

```tsx
import { TOKEN_SYMBOL } from "@/lib/config/contracts";
import { formatTokenAmount } from "@/lib/format";
import { Card } from "../ui/Card";

interface ProfileStatsProps {
  totalOwned: number;
  totalSpentOnMints: bigint | undefined;
  totalListedValue: bigint;
}

export function ProfileStats({ totalOwned, totalSpentOnMints, totalListedValue }: ProfileStatsProps) {
  return (
    <Card>
      <dl className="grid grid-cols-3 gap-4">
        <Stat label="Pieces owned">{totalOwned}</Stat>
        <Stat label="Spent on mints">
          {totalSpentOnMints !== undefined ? `${formatTokenAmount(totalSpentOnMints)} ${TOKEN_SYMBOL}` : "—"}
        </Stat>
        <Stat label="Listed value">
          {totalListedValue > 0n ? `${formatTokenAmount(totalListedValue)} ${TOKEN_SYMBOL}` : "—"}
        </Stat>
      </dl>
    </Card>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-mono text-[0.75rem] uppercase tracking-[0.08em] text-muted">{label}</dt>
      <dd className="font-display text-lg font-medium tabular-nums text-ink">{children}</dd>
    </div>
  );
}
```

- [ ] **Step 1: Add a `tokenIds` prop and the trait-range summary line**

Replace the full file with:

```tsx
import { TOKEN_SYMBOL } from "@/lib/config/contracts";
import { formatTokenAmount } from "@/lib/format";
import { generateTraits, selloTier } from "@/lib/art/traits";
import { Card } from "../ui/Card";

const TOTAL_COMPOSICION_VALUES = 5;

interface ProfileStatsProps {
  totalOwned: number;
  totalSpentOnMints: bigint | undefined;
  totalListedValue: bigint;
  tokenIds: bigint[];
}

export function ProfileStats({ totalOwned, totalSpentOnMints, totalListedValue, tokenIds }: ProfileStatsProps) {
  const traitSummary = tokenIds.length > 0 ? buildTraitSummary(tokenIds) : undefined;

  return (
    <Card>
      <dl className="grid grid-cols-3 gap-4">
        <Stat label="Pieces owned">{totalOwned}</Stat>
        <Stat label="Spent on mints">
          {totalSpentOnMints !== undefined ? `${formatTokenAmount(totalSpentOnMints)} ${TOKEN_SYMBOL}` : "—"}
        </Stat>
        <Stat label="Listed value">
          {totalListedValue > 0n ? `${formatTokenAmount(totalListedValue)} ${TOKEN_SYMBOL}` : "—"}
        </Stat>
      </dl>

      {traitSummary && <p className="mt-4 border-t border-border pt-4 font-mono text-xs text-muted">{traitSummary}</p>}
    </Card>
  );
}

function buildTraitSummary(tokenIds: bigint[]): string {
  const traitsByToken = tokenIds.map((id) => generateTraits(Number(id)));

  const distinctComposiciones = new Set(traitsByToken.map((t) => t["Composición"]));
  const clauses = [`${distinctComposiciones.size} of ${TOTAL_COMPOSICION_VALUES} Composición values`];

  const hasGold = traitsByToken.some((t) => selloTier(t.Sello) === "gold");
  const hasDouble = traitsByToken.some((t) => selloTier(t.Sello) === "double");
  if (hasGold) clauses.push("includes 1 Gold Sello");
  if (hasDouble) clauses.push("includes 1 Double Sello");

  return clauses.join(" · ");
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-mono text-[0.75rem] uppercase tracking-[0.08em] text-muted">{label}</dt>
      <dd className="font-display text-lg font-medium tabular-nums text-ink">{children}</dd>
    </div>
  );
}
```

`hasGold`/`hasDouble` are boolean presence checks, not counts (matches the plan's "includes 1 Gold Sello" phrasing literally — it marks presence, not "how many" — if a wallet held two Gold pieces the clause still reads "includes 1 Gold Sello", which is the spec's exact wording; do not silently change this to a count without flagging it as a deviation). If `tokenIds` is empty, `traitSummary` is `undefined` and the line renders nothing — the existing "Pieces owned: 0" stat already communicates an empty wallet.

- [ ] **Step 2: Thread `allTokenIds` from the profile page**

Modify `app/app/profile/[address]/page.tsx:90`:

```tsx
            <ProfileStats
              totalOwned={allTokenIds.length}
              totalSpentOnMints={mintSpend}
              totalListedValue={totalListedValue}
              tokenIds={allTokenIds}
            />
```

- [ ] **Step 3: Run lint and build**

Run: `cd app && npm run lint && npm run build`
Expected: both pass. (This task depends on `app/lib/art/traits.ts` existing — Task 4, a different phase. If it hasn't been merged yet when this task runs, `npm run build` fails on the missing import; do not stub it out — this is a real dependency, wait for Task 4 or implement it first.)

- [ ] **Step 4: Manual verification**

In local dev with `seed:local`'s backdrop, visit account #0's profile (`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`, holds `allTokenIds = [1, 2, 3]` — token #1 counts because it's listed by this address even though it's in escrow, per the page's existing `allTokenIds` union logic) and confirm the trait-range line renders with a plausible count (something like "2 of 5 Composición values"). Given the 90% Vermilion base rate, tokens #1-#4 are unlikely to include a Gold/Double Sello — confirm the Gold/Double clauses correctly do NOT appear in that likely case. Separately, run `npx tsx` (or Task 4's verify script pattern) to scan `generateTraits(1..100)` for a tokenId whose `Sello` is `Gold` or `Double`, mint that specific tokenId to a test wallet on a fresh local deploy, and confirm its profile page's trait-range line does show the corresponding clause.

- [ ] **Step 5: Commit**

```bash
git add app/components/profile/ProfileStats.tsx app/app/profile/\[address\]/page.tsx
git commit -m "feat: show a trait-range summary on the profile stats card"
```

---

## Task 14: Signature easter egg — `app/components/Header.tsx`

**Files:**
- Modify: `app/components/Header.tsx` (full current source below)
- Modify: `app/app/globals.css` (add a `sign` keyframe, same block/pattern as the existing `pulse-glow`/`scale-in`)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing consumed by later tasks. Reuses the exact `SealIcon` path `d` string as a local literal (confirmed verbatim from `app/components/ui/icons.tsx:58`) — no import from `contracts/`.

Current `app/components/Header.tsx`, in full:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { SealIcon } from "./ui/icons";
import { NetworkSelector } from "./NetworkSelector";
import { WalletConnectButton } from "./WalletConnectButton";

const NAV_LINK_CLASSES = "font-mono text-xs uppercase tracking-[0.08em] transition-colors duration-150";

export function Header() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();

  const profileHref = isConnected && address ? `/profile/${address}` : undefined;

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="flex items-center justify-between gap-4 lg:justify-start">
          <Link href="/" className="flex items-center gap-3">
            <SealIcon className="h-7 w-7 text-primary" />
            <div className="flex flex-col">
              <span className="font-display text-2xl font-semibold leading-none text-ink">OBRA</span>
              <span className="font-body text-xs text-muted">Mint, list, collect — all in CHU.</span>
            </div>
          </Link>
          <div className="lg:hidden">
            <WalletConnectButton />
          </div>
        </div>

        <nav className="flex items-center gap-5">
          <NavLink href="/" active={pathname === "/"}>
            Mint
          </NavLink>
          <NavLink href="/marketplace" active={pathname?.startsWith("/marketplace") ?? false}>
            Marketplace
          </NavLink>
          {profileHref && (
            <NavLink href={profileHref} active={pathname?.startsWith("/profile") ?? false}>
              My Pieces
            </NavLink>
          )}
        </nav>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:justify-end lg:gap-4">
          <NetworkSelector />
          <div className="hidden lg:block">
            <WalletConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={[NAV_LINK_CLASSES, active ? "text-primary" : "text-muted hover:text-ink"].join(" ")}>
      {children}
    </Link>
  );
}
```

Note: this plan's Phase 1 (Task 3, a different task) also modifies this file's `<nav>` block to add a "How it works" link. That edit and this task's edit touch disjoint regions (the `<Link href="/">` block vs. the `<nav>` block) — implement against whatever the file's current state actually is when this task runs, the two changes do not conflict structurally.

- [ ] **Step 1: Add the `sign` keyframe to `globals.css`**

Insert into the existing `@theme` block, immediately after `--animate-scale-in: scale-in 0.28s ease-out;` (`app/app/globals.css:29`):

```css
  --animate-sign: sign 0.7s ease-out forwards;
```

Insert a new keyframes block immediately after the existing `@keyframes scale-in { ... }` block (`app/app/globals.css:42-51`), before the `html { color-scheme: dark; }` rule:

```css
@keyframes sign {
  0% {
    stroke-dashoffset: 1;
  }
  100% {
    stroke-dashoffset: 0;
  }
}
```

This is a one-shot (`forwards`, no `infinite`), short (<1s) animation triggered only by a real user gesture (5 clicks), so it fits the "motion = something happening" convention and is already covered by the existing global `prefers-reduced-motion` neutralization (`globals.css:74-83`) — no extra reduced-motion check needed.

- [ ] **Step 2: Restructure the seal into an interactive click-counter + overlay**

Replace the full file with:

```tsx
"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { SealIcon } from "./ui/icons";
import { NetworkSelector } from "./NetworkSelector";
import { WalletConnectButton } from "./WalletConnectButton";

const NAV_LINK_CLASSES = "font-mono text-xs uppercase tracking-[0.08em] transition-colors duration-150";

// Same path data as SealIcon's ring+tail stroke (app/components/ui/icons.tsx)
// — reused here as a standalone stroke-dasharray animation target, not
// imported, since SealIcon renders it as a filled/stroked icon, not a
// pathLength-based stroke-draw animation.
const SEAL_STROKE_D = "M 62.55 57.22 A 19 19 0 1 1 66.93 46.66 C 76 52 82 62 78 72 C 75.5 78 68 80 62 76";
const SIGNATURE_CLICK_THRESHOLD = 5;
const SIGNATURE_WINDOW_MS = 2000;

export function Header() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();

  const profileHref = isConnected && address ? `/profile/${address}` : undefined;

  const clickCountRef = useRef(0);
  const windowStartRef = useRef(0);
  const [signing, setSigning] = useState(false);

  function handleSealClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (signing) return;

    const now = Date.now();
    if (now - windowStartRef.current > SIGNATURE_WINDOW_MS) {
      windowStartRef.current = now;
      clickCountRef.current = 0;
    }
    clickCountRef.current += 1;

    if (clickCountRef.current >= SIGNATURE_CLICK_THRESHOLD) {
      clickCountRef.current = 0;
      setSigning(true);
    }
  }

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="flex items-center justify-between gap-4 lg:justify-start">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSealClick}
              className="relative flex h-7 w-7 items-center justify-center"
              aria-label="OBRA seal"
            >
              <SealIcon className="h-7 w-7 text-primary" />
              {signing && (
                <svg
                  viewBox="0 0 100 100"
                  className="pointer-events-none absolute inset-0 h-7 w-7"
                  aria-hidden="true"
                >
                  <path
                    d={SEAL_STROKE_D}
                    fill="none"
                    stroke="var(--color-ink)"
                    strokeWidth={4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    pathLength={1}
                    strokeDasharray={1}
                    className="animate-sign"
                    onAnimationEnd={() => setSigning(false)}
                  />
                </svg>
              )}
            </button>
            <Link href="/" className="flex flex-col">
              <span className="font-display text-2xl font-semibold leading-none text-ink">OBRA</span>
              <span className="font-body text-xs text-muted">Mint, list, collect — all in CHU.</span>
            </Link>
          </div>
          <div className="lg:hidden">
            <WalletConnectButton />
          </div>
        </div>

        <nav className="flex items-center gap-5">
          <NavLink href="/" active={pathname === "/"}>
            Mint
          </NavLink>
          <NavLink href="/marketplace" active={pathname?.startsWith("/marketplace") ?? false}>
            Marketplace
          </NavLink>
          {profileHref && (
            <NavLink href={profileHref} active={pathname?.startsWith("/profile") ?? false}>
              My Pieces
            </NavLink>
          )}
        </nav>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:justify-end lg:gap-4">
          <NetworkSelector />
          <div className="hidden lg:block">
            <WalletConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={[NAV_LINK_CLASSES, active ? "text-primary" : "text-muted hover:text-ink"].join(" ")}>
      {children}
    </Link>
  );
}
```

The single `<Link href="/">` that used to wrap both the icon and the wordmark is split: the `SealIcon` now sits in a sibling `<button type="button">` (visually identical — no visible affordance change, same size/position) that owns the click-counting handler and calls `preventDefault`/`stopPropagation` so it never navigates, while `Link` now wraps only the "OBRA" + tagline text column and keeps navigating to `/` exactly as before. Both live inside the same outer flex container so the layout is pixel-identical to today. Nothing else happens on the 5th click — no modal, no toast, no route change — the overlay unmounts itself via `onAnimationEnd` and the click counter silently resets on its own via the 2-second rolling window.

- [ ] **Step 3: Run lint and build**

Run: `cd app && npm run lint && npm run build`
Expected: both pass.

- [ ] **Step 4: Manual verification**

In the browser: click the header seal icon 5 times within 2 seconds and confirm a signature stroke draws once over the icon, then disappears. Confirm clicking the "OBRA" wordmark text still navigates to `/` normally. Confirm clicking the seal only 1-4 times, then waiting past 2 seconds, does nothing and silently resets (a 6th click after the pause starts a fresh count of 1, not 6).

- [ ] **Step 5: Commit**

```bash
git add app/components/Header.tsx app/app/globals.css
git commit -m "feat: add a signature-stroke easter egg to the header seal"
```

---

## Task 15: Sound toggle — synthesized "stamp" sound on mint confirm

**Files:**
- Create: `app/lib/sound.ts`
- Create: `app/components/SoundToggle.tsx`
- Modify: `app/components/ui/icons.tsx` (append `SpeakerIcon`/`SpeakerMuteIcon`)
- Modify: `app/components/Footer.tsx`
- Modify: `app/components/mint/MintPanel.tsx` (`handleMint`)

**Interfaces:**
- Produces: `playStampSound(): void`, `isSoundEnabled(): boolean`, `setSoundEnabled(enabled: boolean): void` from `app/lib/sound.ts` — consumed by `SoundToggle.tsx` and `MintPanel.tsx`.
- Consumes: nothing from earlier tasks. Note for the implementer: by the time this task runs, Task 5 (Phase 2) has already changed `MintPanel.tsx`'s `handleMint` to pass a third `options` argument to `notify("confirmed", ...)` for the rarity-acknowledgment toast — read the actual current file before editing; the exact call shape may no longer match what's shown below verbatim, only the fact that it's a `notify("confirmed", …)` call inside `handleMint`, right after which this task's line is added, is guaranteed.

- [ ] **Step 1: Write `app/lib/sound.ts`**

No audio file asset is added (none exist in this repo; a binary asset for one ~150ms cue is unjustified when it can be synthesized). Uses the Web Audio API directly, lazily creating one module-level `AudioContext` (browser autoplay policy requires this happen inside a user-gesture call chain — mint confirmation's click handler satisfies this).

```ts
/**
 * Synthesized UI sound — no audio asset shipped. The one confirmation sound
 * this app plays ("the chop lands") is generated at runtime via the Web
 * Audio API, matching the seal/chop-stamp brand metaphor with a real short
 * thud instead of a bundled binary asset for a single ~150ms cue.
 */

const STORAGE_KEY = "obra:sound";

let audioContext: AudioContext | undefined;

function getAudioContext(): AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  if (!audioContext) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return undefined;
    audioContext = new Ctor();
  }
  return audioContext;
}

/**
 * Plays a short (~150ms) synthesized "stamp" thud: a low sine burst (pitch
 * dropping fast, like a chop striking paper) layered with a brief filtered
 * noise burst (the paper/ink texture). Call only from a user-gesture event
 * handler — browser autoplay policy requires it.
 */
export function playStampSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();

  const now = ctx.currentTime;
  const duration = 0.15;

  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(90, now + 0.1);

  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(0.0001, now);
  oscGain.gain.exponentialRampToValueAtTime(0.35, now + 0.008);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(oscGain);
  oscGain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);

  const noiseBufferSize = Math.ceil(ctx.sampleRate * duration);
  const noiseBuffer = ctx.createBuffer(1, noiseBufferSize, ctx.sampleRate);
  const channel = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseBufferSize; i++) {
    channel[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "lowpass";
  noiseFilter.frequency.setValueAtTime(800, now);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.18, now + 0.005);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(now);
  noise.stop(now + duration);
}

/** Reads the persisted sound preference. Defaults to OFF when unset or during SSR. */
export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

/** Persists the sound preference (`"1"` on, `"0"` off). */
export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
}
```

- [ ] **Step 2: Add the speaker icon pair to `app/components/ui/icons.tsx`**

Append (matching the file's existing `base` config — `viewBox 0 0 24 24`, stroke-based, `strokeWidth 1.75`):

```tsx
/** Speaker with sound waves — the footer sound toggle's "on" state. */
export function SpeakerIcon(props: IconProps) {
  return (
    <svg {...base} width={16} height={16} {...props}>
      <path d="M4 9v6h4l5 4V5L8 9H4Z" />
      <path d="M17 8.5a5 5 0 0 1 0 7" />
      <path d="M19.5 6a8.5 8.5 0 0 1 0 12" />
    </svg>
  );
}

/** Speaker with an X — the footer sound toggle's "off" (default) state. */
export function SpeakerMuteIcon(props: IconProps) {
  return (
    <svg {...base} width={16} height={16} {...props}>
      <path d="M4 9v6h4l5 4V5L8 9H4Z" />
      <path d="M17 9.5 21.5 14" />
      <path d="M21.5 9.5 17 14" />
    </svg>
  );
}
```

- [ ] **Step 3: Create `app/components/SoundToggle.tsx`**

A small client component so `Footer` itself can stay a server component (it has no `"use client"` directive today, and carries no other interactivity) — this is the only interactive piece the footer needs.

```tsx
"use client";

import { useEffect, useState } from "react";
import { SpeakerIcon, SpeakerMuteIcon } from "./ui/icons";
import { isSoundEnabled, setSoundEnabled } from "@/lib/sound";

/**
 * Discrete footer toggle for the mint-confirmation "stamp" sound — default
 * OFF, persisted to localStorage.
 */
export function SoundToggle() {
  const [enabled, setEnabled] = useState(false);

  // localStorage isn't available during SSR/first render — read it in an
  // effect (not useState's initializer) to avoid a hydration mismatch.
  useEffect(() => {
    setEnabled(isSoundEnabled());
  }, []);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    setSoundEnabled(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      title={enabled ? "Sound on — mute confirmation sound" : "Sound off — enable confirmation sound"}
      className="inline-flex items-center gap-1.5 text-muted transition-colors hover:text-ink"
    >
      {enabled ? <SpeakerIcon className="h-3.5 w-3.5" /> : <SpeakerMuteIcon className="h-3.5 w-3.5" />}
      <span className="font-mono text-xs">Sound</span>
    </button>
  );
}
```

- [ ] **Step 4: Wire the toggle into `Footer.tsx`**

Current file (full source, no `"use client"`):

```tsx
export function Footer() {
  return (
    <footer className="border-t border-border px-4 py-6 text-center font-mono text-xs text-muted sm:px-6">
      Signed by Chu. Paid in CHU. — OBRA ·{" "}
      <a
        href="https://jabordones.com"
        target="_blank"
        rel="noopener noreferrer"
        title="jabordones.com — Jesus Bordones' portfolio"
        className="text-muted underline decoration-border underline-offset-2 transition-colors hover:text-ink hover:decoration-muted"
      >
        Built by Chu
      </a>
    </footer>
  );
}
```

Replace with (adds the `SoundToggle` import and lays the brand line + toggle out with `justify-between` on `sm:` and up, stacked on mobile — `Footer` itself stays a server component, `SoundToggle` is the only client boundary):

```tsx
import { SoundToggle } from "./SoundToggle";

export function Footer() {
  return (
    <footer className="flex flex-col items-center gap-3 border-t border-border px-4 py-6 text-center font-mono text-xs text-muted sm:flex-row sm:justify-between sm:px-6">
      <span>
        Signed by Chu. Paid in CHU. — OBRA ·{" "}
        <a
          href="https://jabordones.com"
          target="_blank"
          rel="noopener noreferrer"
          title="jabordones.com — Jesus Bordones' portfolio"
          className="text-muted underline decoration-border underline-offset-2 transition-colors hover:text-ink hover:decoration-muted"
        >
          Built by Chu
        </a>
      </span>
      <SoundToggle />
    </footer>
  );
}
```

- [ ] **Step 5: Wire the sound call into `MintPanel.tsx`'s `handleMint`**

Add the import:

```ts
import { isSoundEnabled, playStampSound } from "@/lib/sound";
```

Inside `handleMint`, immediately after the existing `notify("confirmed", …)` call (read the file first — by this point in the plan Task 5 has already changed this call's exact arguments to include a rarity-aware `options` object; only the two-line addition below is this task's concern):

```ts
      if (isSoundEnabled()) playStampSound();
```

- [ ] **Step 6: Verify**

No test framework exists in `app/` (matches this repo's existing convention — only `contracts` has automated tests). Run:

```bash
cd app && npm run lint && npm run build
```

Manual, in local dev (`npm run dev` against `NEXT_PUBLIC_NETWORK_ENV=local`): toggle sound on in the footer, reload the page, confirm the toggle stays on (localStorage persistence — inspect `localStorage.getItem("obra:sound")` in devtools, expect `"1"`); with sound on, complete a mint and confirm the stamp sound plays exactly once, only on mint confirmation (not on the approve step, page load, or hover); with sound off (the default), confirm no sound plays on mint confirm.

- [ ] **Step 7: Commit**

```bash
git add app/lib/sound.ts app/components/SoundToggle.tsx app/components/ui/icons.tsx app/components/Footer.tsx app/components/mint/MintPanel.tsx
git commit -m "feat: add optional synthesized sound on mint confirmation"
```

---

## Task 16: Ambient art in empty states — marketplace + profile

**Files:**
- Modify: `app/app/marketplace/page.tsx` (the `sorted.length === 0` branch)
- Modify: `app/app/profile/[address]/page.tsx` (the `allTokenIds.length === 0` branch)

**Interfaces:** consumes nothing from earlier tasks; reuses the 9 existing static preview SVGs under `app/public/preview/` (`1.svg, 2.svg, 6.svg, 9.svg, 12.svg, 35.svg, 47.svg, 77.svg, 93.svg`) that `PreviewGrid.tsx` already renders — no new assets.

Both empty states get one of the existing preview SVGs rendered as a faint, desaturated background layer behind the existing copy — absolutely positioned (`fill`), `aria-hidden="true"`, `pointer-events-none`, `grayscale opacity-[0.06]` (low enough to read as texture, not compete with the muted text sitting on top). Marketplace uses `47.svg`; profile uses `12.svg` (arbitrary, deterministic, distinct from each other). The empty-state wrapper `div` needs `relative overflow-hidden` added, and the text content needs its own `relative` wrapper — with `fill`, `next/image` renders `position: absolute; inset: 0`, which is a positioned element; per CSS stacking order, in-flow non-positioned text would actually paint *underneath* a z-index:auto positioned sibling that comes later in paint order, so the text must also be a positioned element (`position: relative`, `z-index: auto`) placed *after* the image in the DOM so it paints on top (same z-index, later tree order wins).

- [ ] **Step 1: Marketplace empty state**

Current (`app/app/marketplace/page.tsx`, inside the ternary chain after the loading check):

```tsx
        ) : sorted.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-6 text-center font-body text-sm text-muted">
            Nothing listed yet — be the first to list a piece from your profile.
          </div>
        ) : (
```

Replace with (also add `import Image from "next/image";` to this file's imports, alongside the existing `next/link`/component imports):

```tsx
        ) : sorted.length === 0 ? (
          <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 text-center font-body text-sm text-muted">
            <Image
              src="/preview/47.svg"
              alt=""
              fill
              aria-hidden="true"
              className="pointer-events-none object-contain opacity-[0.06] grayscale"
            />
            <p className="relative">Nothing listed yet — be the first to list a piece from your profile.</p>
          </div>
        ) : (
```

- [ ] **Step 2: Profile empty state**

Current (`app/app/profile/[address]/page.tsx`, inside the `allTokenIds.length === 0` branch):

```tsx
            {allTokenIds.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface p-6 text-center font-body text-sm text-muted">
                No pieces yet.{" "}
                {isOwnerViewing && (
                  <Link href="/" className="text-primary hover:underline">
                    Mint your first Obra
                  </Link>
                )}
              </div>
            ) : (
```

Replace with (also add `import Image from "next/image";` to this file's imports):

```tsx
            {allTokenIds.length === 0 ? (
              <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 text-center font-body text-sm text-muted">
                <Image
                  src="/preview/12.svg"
                  alt=""
                  fill
                  aria-hidden="true"
                  className="pointer-events-none object-contain opacity-[0.06] grayscale"
                />
                <p className="relative">
                  No pieces yet.{" "}
                  {isOwnerViewing && (
                    <Link href="/" className="text-primary hover:underline">
                      Mint your first Obra
                    </Link>
                  )}
                </p>
              </div>
            ) : (
```

- [ ] **Step 3: Verify**

```bash
cd app && npm run lint && npm run build
```

Manual: view the marketplace page with zero active listings and a profile page with zero owned/listed tokens (a fresh local Hardhat deploy with no seed, or any never-minted-to address on testnet) — confirm the faint background art renders in both and does not reduce the legibility of the copy sitting on top of it.

- [ ] **Step 4: Commit**

```bash
git add app/app/marketplace/page.tsx app/app/profile/\[address\]/page.tsx
git commit -m "feat: add faint gallery-preview art behind empty states"
```

---

## Task 17: Per-token OG card generator (local generation only, no IPFS pin)

Split from the pinning/frontend-wiring work (Task 18) because this half is fully testable without external credentials, while Task 18 requires a real `PINATA_JWT` and is not — per this plan's task-sizing rule ("split only where a reviewer could meaningfully reject one task while approving its neighbor"), these are exactly such a pair.

**Files:**
- Create: `contracts/art/og.ts`
- Modify: `contracts/art/pin.ts` (export `pinDirectoryToPinata`, needed by Task 18 — a one-word, additive, non-breaking change made here since this task already touches the art pipeline)
- Modify: `contracts/package.json` (add `@resvg/resvg-js` devDependency and an `og` script)

**Interfaces:**
- Consumes `generateTraits(tokenId: number): ObraTraits` and `renderSvg(tokenId: number, traits: ObraTraits): string` from `contracts/art/generate.ts` (both already exported; `renderSvg`'s return value is a complete `<svg xmlns=… viewBox="0 0 500 500" width="500" height="500" …>…</svg>` string, background `#000d06`).
- Produces: PNG files at `contracts/art/output/pin/og/{tokenId}.png`, 1200×630. Produces `export async function pinDirectoryToPinata` from `pin.ts` (currently private) — consumed by Task 18.

- [ ] **Step 1: Export `pinDirectoryToPinata` from `contracts/art/pin.ts`**

Change the declaration (currently `async function pinDirectoryToPinata(dirPath: string, folderName: string): Promise<string> {`) to:

```ts
export async function pinDirectoryToPinata(dirPath: string, folderName: string): Promise<string> {
```

No other change to `pin.ts` — its own `main()` and behavior are unaffected.

- [ ] **Step 2: Add the `@resvg/resvg-js` dependency and the `og` script**

In `contracts/package.json`, add to `"devDependencies"` (alongside the existing `ts-node`/`typescript` entries): `"@resvg/resvg-js": "^2.6.2"`. Add to `"scripts"` (alongside the existing `"pin": "ts-node art/pin.ts"` line, same convention — this repo's art scripts run via `ts-node`, not `tsx`; do not introduce a second TS runner): `"og": "ts-node art/og.ts"`.

```bash
cd contracts && npm install
```

- [ ] **Step 3: Write `contracts/art/og.ts`**

Composes the piece's own full `<svg>` (from `renderSvg`) as a child of the OG card's outer `<svg>`, wrapped in a `<g transform="translate(x,y) scale(s)">` — nested `<svg>` establishes its own viewport, so no string surgery (stripping/rewriting the piece SVG's outer tag) is needed. `pinDirectoryToPinata` is imported *dynamically inside `main()`*, not at module top level: `pin.ts` throws at module-load time if `PINATA_JWT` is unset (see its top-level `if (!JWT) throw …`), and this script must support a local-only, no-pin, no-credentials run for spot-checking output (the ranged-args mode below) — a top-level `import { pinDirectoryToPinata } from "./pin"` would defeat that by throwing before `main()` even runs.

```ts
/**
 * OBRA — generates a 1200x630 Open Graph share card per token (the piece's
 * own art + name + trait list, catalog-register) and rasterizes it to PNG
 * via @resvg/resvg-js (social crawlers don't render SVG og:image tags).
 * Reuses generateTraits/renderSvg from ./generate.ts — no second source of
 * truth for trait selection or piece rendering.
 *
 * Usage:
 *   `npm run og -- 1 3`  — generates OG cards for tokenId 1-3 only, writes
 *                           local PNGs, does NOT pin (no PINATA_JWT needed).
 *                           Use this to spot-check output before spending a
 *                           real Pinata pin on the full run.
 *   `npm run og`         — generates all 100 cards AND pins them to IPFS
 *                           (requires PINATA_JWT in contracts/.env, same as
 *                           `npm run pin`), then writes ../../exports/og.json.
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { Resvg } from "@resvg/resvg-js";
import { generateTraits, renderSvg, type ObraTraits } from "./generate";

dotenv.config();

const OUT_DIR = path.join(__dirname, "output", "pin", "og");
const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;
const ART_SIZE = 570;
const ART_MARGIN = 30;
const BG = "#000d06";
const INK = "#e9faf2";
const MUTED = "#97b2a5";
const PRIMARY = "#f5642b";

function composeOgSvg(tokenId: number, pieceSvg: string, traits: ObraTraits): string {
  const scale = ART_SIZE / 500; // renderSvg's own canvas is 500x500
  const textX = ART_SIZE + ART_MARGIN * 2;
  const traitLines = Object.entries(traits)
    .map(([trait, value], i) => {
      const y = 260 + i * 34;
      return `<text x="${textX}" y="${y}" font-family="monospace" font-size="18" fill="${MUTED}">${trait} · <tspan fill="${INK}">${value}</tspan></text>`;
    })
    .join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
  <rect x="0" y="0" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${BG}"/>
  <g transform="translate(${ART_MARGIN},${ART_MARGIN}) scale(${scale.toFixed(4)})">
    ${pieceSvg}
  </g>
  <text x="${textX}" y="180" font-family="serif" font-size="52" font-weight="600" fill="${INK}">Obra #${tokenId}</text>
  <text x="${textX}" y="220" font-family="monospace" font-size="16" letter-spacing="2" fill="${PRIMARY}">SIGNED BY CHU · PAID IN CHU</text>
  ${traitLines}
</svg>
`;
}

function generateOgPng(tokenId: number): Buffer {
  const traits = generateTraits(tokenId);
  const pieceSvg = renderSvg(tokenId, traits);
  const cardSvg = composeOgSvg(tokenId, pieceSvg, traits);
  const resvg = new Resvg(cardSvg, { fitTo: { mode: "width", value: CARD_WIDTH } });
  return resvg.render().asPng();
}

async function main() {
  const rangeArgs = process.argv.slice(2).map(Number).filter((n) => !Number.isNaN(n));
  const [start, end] = rangeArgs.length === 2 ? rangeArgs : [1, 100];
  const shouldPin = rangeArgs.length === 0; // only pin on a full, argument-less run

  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`Generating OG cards ${start}-${end}...`);
  for (let tokenId = start; tokenId <= end; tokenId++) {
    const png = generateOgPng(tokenId);
    fs.writeFileSync(path.join(OUT_DIR, `${tokenId}.png`), png);
  }
  console.log(`Wrote ${end - start + 1} OG card(s) to ${path.relative(process.cwd(), OUT_DIR)}`);

  if (!shouldPin) {
    console.log("Ranged run — skipped pinning. Run `npm run og` with no arguments to pin the full set.");
    return;
  }

  const { pinDirectoryToPinata } = await import("./pin");
  const ogCid = await pinDirectoryToPinata(OUT_DIR, "obra-og");
  const baseURI = `ipfs://${ogCid}/`;
  const result = { ogCid, baseURI, pinnedAt: new Date().toISOString() };

  const exportsPath = path.join(__dirname, "..", "..", "exports", "og.json");
  fs.writeFileSync(exportsPath, JSON.stringify(result, null, 2) + "\n");

  console.log(`OG cards pinned: ${baseURI}`);
  console.log(`Wrote ${path.relative(process.cwd(), exportsPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
```

Note: `pin.ts`'s own top-level `if (!JWT) throw new Error(...)` still applies once `import("./pin")` actually executes inside the `shouldPin` branch — so the full (unranged) run still requires `PINATA_JWT` to be set, exactly as intended; only the ranged/local-only run is exempt, because it never reaches that dynamic import.

- [ ] **Step 4: Verify (local generation only — no credentials needed for this step)**

```bash
cd contracts && npx ts-node art/og.ts 1 3
file art/output/pin/og/1.png art/output/pin/og/2.png art/output/pin/og/3.png
```

Expected: three PNG files, each reporting `1200 x 630` in `file`'s output. Open at least one in an image viewer and confirm it shows the correct piece's art on the left and "Obra #1" / trait lines on the right, not a blank or malformed image.

- [ ] **Step 5: Commit**

```bash
git add contracts/art/og.ts contracts/art/pin.ts contracts/package.json contracts/package-lock.json
git commit -m "feat: add local OG card generator (og.ts), export pinDirectoryToPinata"
```

(`art/output/pin/og/*.png` are generated artifacts — check `contracts/.gitignore` for whether `art/output/` is already ignored, matching how the existing `art/output/pin/{images,metadata}` are handled, before deciding whether to `git add` the sample PNGs from Step 4; do not commit generated output if the existing convention ignores it.)

---

## Task 18: Pin OG cards to IPFS + wire per-token Open Graph metadata

**Files:**
- Create: root `exports/og.json` (written by running Task 17's script with no arguments — this task's Step 1)
- Create: `app/components/marketplace/TokenDetailClient.tsx`
- Modify: `app/app/marketplace/[tokenId]/page.tsx` (becomes a server component)

**Interfaces:** consumes `og.ts`'s full (unranged) run from Task 17. Consumes `resolveIpfsUri` from `app/lib/ipfs.ts` (existing, unchanged: `resolveIpfsUri(uri: string | undefined): string | undefined`, converts `ipfs://<cid>/<path>` to the configured gateway URL).

**This task has a hard external dependency: a real `PINATA_JWT` in `contracts/.env`.** If one is not available in the environment this task runs in, stop after confirming that and report BLOCKED — do not fabricate a placeholder CID or skip the pin; a fake `ogCid` would silently ship broken `og:image` URLs.

- [ ] **Step 1: Generate and pin all 100 OG cards**

```bash
cd contracts && npm run og
```

Expected: console output ending with `OG cards pinned: ipfs://<cid>/` and `Wrote ../../exports/og.json`. Confirm the file exists and has the expected shape:

```bash
cat ../exports/og.json
```

Expected shape: `{"ogCid": "<a real CID string>", "baseURI": "ipfs://<same cid>/", "pinnedAt": "<ISO timestamp>"}`.

- [ ] **Step 2: Sync the new export into `app/`**

`app/package.json`'s `sync-exports` script is already `"cp ../exports/*.json exports/"` — a glob, so `og.json` is picked up with no script change needed. Run it:

```bash
cd app && npm run sync-exports
cat exports/og.json
```

Confirm `app/exports/og.json` now exists with the same content as the root copy.

- [ ] **Step 3: Move the client content into `TokenDetailClient.tsx`**

Read the CURRENT content of `app/app/marketplace/[tokenId]/page.tsx` now — by this point in the plan, earlier Phase 2 tasks (Task 9's trait tooltips, Task 10's empty-state copy) have already modified this file. Move its entire body verbatim into a new file `app/components/marketplace/TokenDetailClient.tsx`, exporting a named `TokenDetailClient` component instead of a default-exported page, with exactly one change: replace the route-param handling. The file currently reads `tokenId` via `use(params)` from a `PageProps { params: Promise<{tokenId: string}> }` prop (App Router's Server/Client Component convention for passing route params down); since this component will no longer receive `params` as a prop once `page.tsx` becomes a thin wrapper, switch it to read the param directly via the `useParams` hook:

Remove:
```ts
import { use } from "react";
...
interface PageProps {
  params: Promise<{ tokenId: string }>;
}

export default function NftDetailPage({ params }: PageProps) {
  const { tokenId: tokenIdParam } = use(params);
```

Replace with:
```ts
import { useParams } from "next/navigation";
...
export function TokenDetailClient() {
  const params = useParams<{ tokenId: string }>();
  const tokenIdParam = params.tokenId;
```

Keep `"use client"` at the top of the file and every other line (all hooks, JSX, imports besides the two shown above) exactly as they currently stand at the time this task runs — this is a mechanical move, not a rewrite; do not reintroduce an earlier version of any section already changed by Tasks 9/10.

- [ ] **Step 4: Rewrite `app/app/marketplace/[tokenId]/page.tsx` as a server component**

```tsx
import type { Metadata } from "next";
import { TokenDetailClient } from "@/components/marketplace/TokenDetailClient";
import { resolveIpfsUri } from "@/lib/ipfs";
import ogExport from "../../../exports/og.json";

interface PageProps {
  params: Promise<{ tokenId: string }>;
}

// Next.js merges metadata per top-level key across the segment tree — a
// child route's `openGraph` object REPLACES the parent layout's `openGraph`
// entirely rather than deep-merging individual fields, so title/description
// are restated here (not omitted) to avoid silently blanking them for every
// token detail page. Keep this description in sync with the one in
// app/app/layout.tsx's root `metadata.openGraph.description` if that ever
// changes.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tokenId } = await params;
  const imageUrl = resolveIpfsUri(`ipfs://${ogExport.ogCid}/${tokenId}.png`);
  return {
    openGraph: {
      title: `Obra #${tokenId} — Signed by Chu. Paid in CHU.`,
      description: "A 100-piece generative NFT gallery. Mint, list, and collect — all in CHU.",
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default function NftDetailPage() {
  return <TokenDetailClient />;
}
```

(`../../../exports/og.json` from `app/app/marketplace/[tokenId]/page.tsx`: up three levels — `[tokenId]` → `marketplace` → `app` — lands at `app/exports/`, matching the relative-import convention `app/lib/config/contracts.ts` already uses for `../../exports/*.json` at its own, shallower, depth.)

- [ ] **Step 5: Verify**

```bash
cd app && npm run lint && npm run build
```

Then, with a production build running (`npm run build && npm run start`, or `npm run dev` is sufficient for a rough check since `generateMetadata` runs on every request in dev too):

```bash
curl -s http://localhost:3000/marketplace/1 | grep -o '<meta property="og:image"[^>]*>'
```

Expected: a `<meta property="og:image" content="https://gateway.pinata.cloud/ipfs/<ogCid>/1.png">` (or your configured `NEXT_PUBLIC_IPFS_GATEWAY`) tag in the response. Also grep for `og:title` and confirm it reads `Obra #1 — Signed by Chu. Paid in CHU.` rather than the generic root title, confirming the per-token override took effect. Manually load `/marketplace/1` in a browser and confirm the page renders identically to before this task (the moved client component's behavior is unchanged).

- [ ] **Step 6: Commit**

```bash
git add exports/og.json app/exports/og.json app/components/marketplace/TokenDetailClient.tsx app/app/marketplace/\[tokenId\]/page.tsx
git commit -m "feat: pin per-token OG cards, serve them via generateMetadata"
```
