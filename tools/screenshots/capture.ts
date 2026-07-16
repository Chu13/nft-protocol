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

  const VIEWPORT_WIDTH = 1440;
  const VIEWPORT_HEIGHT = 900;

  async function shootMain(filename: string): Promise<void> {
    const outPath = path.join(SCREENSHOT_DIR, filename);
    const mainLocator = page.locator("main").first();
    // Belt-and-suspenders against the toast viewport (role="status"/"alert",
    // rendered by components/TxStatusToast.tsx's ToastProvider) leaking
    // into `main`-only shots:
    //  1. It's `position: fixed`, but in this app that ends up resolving
    //     against a transformed/contained ancestor rather than the true
    //     viewport (a known CSS gotcha), so it can render inside main's
    //     own bounding box instead of pinned to the visual viewport edge.
    //  2. Even without that, `main`'s content is routinely taller than the
    //     viewport, and Playwright captures an over-height element by
    //     scrolling + stitching — which would drag a genuinely
    //     viewport-fixed element along for the ride and bleed stray toast
    //     pixels into the composited image at the wrong offset.
    // Hiding the toast viewport (via the stable data-testid added for
    // exactly this) sidesteps cause #1 outright; resizing the viewport to
    // fit the whole element first makes every shot a single, unscrolled
    // capture, which sidesteps #2 too.
    const toastViewport = page.locator('[data-testid="toast-viewport"]');
    const hasToast = (await toastViewport.count()) > 0;
    if (hasToast) await toastViewport.evaluate((el) => (el.style.display = "none"));
    const contentHeight = await mainLocator.evaluate((el) => el.scrollHeight);
    await page.setViewportSize({ width: VIEWPORT_WIDTH, height: Math.max(VIEWPORT_HEIGHT, contentHeight + 40) });
    await mainLocator.screenshot({ path: outPath });
    await page.setViewportSize({ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT });
    if (hasToast) await toastViewport.evaluate((el) => (el.style.display = ""));
    written.push(filename);
    console.log(`  wrote ${filename}`);
  }

  // Piece art is fetched from a public IPFS gateway (see app/lib/ipfs.ts) —
  // itself two hops deep (on-chain tokenURI -> metadata JSON -> the image
  // URI inside it) — and in this environment that gateway took anywhere
  // from under a second to 3-6s per image. A fixed short wait after
  // navigation was observed to screenshot pages mid-load ("Loading…" /
  // blank tiles). Poll until every <img> under `main` exists AND has
  // finished (loaded or errored) instead of guessing a delay; this also
  // covers the metadata fetch itself, since the <img> tag for a card isn't
  // even mounted until `metadata.image` resolves. Caps out at `timeoutMs`
  // so one genuinely stuck request can't hang the whole run.
  async function waitForArtToLoad(timeoutMs = 20_000): Promise<void> {
    await page
      .waitForFunction(
        () => {
          const imgs = Array.from(document.querySelectorAll<HTMLImageElement>("main img"));
          return imgs.length > 0 && imgs.every((img) => img.complete);
        },
        { timeout: timeoutMs }
      )
      .catch(() => {});
  }

  let page: Awaited<ReturnType<typeof browser.newPage>>;
  try {
    page = await browser.newPage({ viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT } });
    await page.addInitScript({ content: buildWalletShimScript(1) });

    // --- Connect wallet ---
    // RainbowKit's injected connector shows up under the "Browser Wallet"
    // group name, per @rainbow-me/rainbowkit's own injectedWallet()
    // connector definition — confirmed both by reading the installed
    // package and by driving the real modal (its button's accessible name
    // is exactly "Browser Wallet"). Because the wallet shim's eth_accounts
    // unconditionally reports an authorized account (it doesn't model a
    // "not yet permitted" state), wagmi's reconnectOnMount usually
    // auto-connects before this script even looks for the button — so the
    // click is best-effort, not a hard requirement.
    await page.goto(`${APP_URL}/`);
    try {
      await page.getByRole("button", { name: "Connect Wallet" }).click({ timeout: 4_000 });
      await page.getByRole("button", { name: "Browser Wallet" }).click();
    } catch {
      // Already auto-connected via reconnectOnMount — nothing to click.
    }
    // Wait for the mint panel's live-data-dependent action button rather
    // than for connected-wallet text — RainbowKit truncates the address
    // to "0x70…79C8" (not a plain prefix match), and the action button is
    // what we need to interact with next anyway. This also gives the
    // manual-connect path above time to fully settle (RainbowKit
    // transitions its dialog from "Connecting…" to an "Account" view on
    // success — checking for that dialog before the connection has
    // actually finished is a race, so we wait for the real underlying
    // signal first and only THEN worry about dismissing any dialog).
    await page
      .locator("main")
      .getByRole("button", { name: /Step 1 of 2 — Approve|Mint for/ })
      .waitFor({ timeout: 15_000 });

    // On a successful manual connect, RainbowKit's dialog can be left open
    // in its "Account" view — it intercepts every subsequent click on the
    // page. Dismiss it unconditionally (Escape first, then its own Close
    // button as a fallback); a no-op when no dialog is present.
    const connectDialog = page.getByRole("dialog");
    if (await connectDialog.isVisible().catch(() => false)) {
      await page.keyboard.press("Escape").catch(() => {});
      if (await connectDialog.isVisible().catch(() => false)) {
        await connectDialog
          .getByRole("button", { name: "Close" })
          .click({ timeout: 2_000 })
          .catch(() => {});
      }
      await connectDialog.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => {});
    }

    // --- 1. Get CHU ---
    // Target the Level02Teaser component specifically (data-testid added in
    // app/components/ui/Card.tsx + components/Level02Teaser.tsx for exactly
    // this) rather than the whole `main` region — `main` on the mint page is
    // dominated visually by the mint panel, and at this point in the flow
    // (before any approve/mint interaction) a `main`-scoped shot is also
    // byte-for-byte identical to the very next shot, mint-approve.png.
    const level02TeaserOutPath = path.join(SCREENSHOT_DIR, "get-chu.png");
    await page.getByTestId("level02-teaser").screenshot({ path: level02TeaserOutPath });
    written.push("get-chu.png");
    console.log("  wrote get-chu.png");

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
    // TxStatusToast renders BOTH "pending" and "confirmed" phases with
    // role="status" (only "error" uses role="alert"), and pending toasts
    // are never auto-dismissed (see components/TxStatusToast.tsx) — so by
    // this point the toast viewport can contain several status elements,
    // including a stale "Confirm the approval…" one from the approve step.
    // Filter for the mint confirmation's own text (uniquely contains
    // "Confirmed", unlike any pending message) rather than blindly taking
    // the first status role element.
    const mintConfirmedToast = page.getByRole("status").filter({ hasText: "Confirmed" }).first();
    await mintConfirmedToast.waitFor({ timeout: 15_000 });
    const outPath = path.join(SCREENSHOT_DIR, "mint-confirmed.png");
    await mintConfirmedToast.screenshot({ path: outPath });
    written.push("mint-confirmed.png");
    console.log("  wrote mint-confirmed.png");

    // --- 4. Marketplace grid ---
    await page.goto(`${APP_URL}/marketplace`);
    await page.locator("main").first().waitFor();
    await waitForArtToLoad();
    await shootMain("marketplace-grid.png");

    // --- 5. Buy flow (token #1, listed by account #0 in seed-local.ts) ---
    await page.goto(`${APP_URL}/marketplace/1`);
    await page.locator("main").first().waitFor();
    await waitForArtToLoad();
    const buyApprove = page.getByRole("button", { name: /Step 1 of 2 — Approve/ });
    if (await buyApprove.isVisible().catch(() => false)) {
      await buyApprove.click();
      // Wait for the actual UI transition (approved -> ready to acquire)
      // rather than for any status role element to attach — a stray
      // status toast can already be attached at this point (see above),
      // which would make a bare `waitFor` resolve before the approval tx
      // has actually confirmed.
      await page.getByRole("button", { name: /Step 2 of 2 — Acquire/ }).waitFor({ timeout: 15_000 });
    }
    await shootMain("buy-flow.png");

    // --- 6. Profile collection ---
    await page.goto(`${APP_URL}/profile/${HARDHAT_ACCOUNTS[1].address}`);
    await page.locator("main").first().waitFor();
    await waitForArtToLoad();
    await shootMain("profile-collection.png");

    // --- 7. Profile — open List panel on an owned, unlisted token ---
    const listButton = page.getByRole("button", { name: "List for sale" }).first();
    if (await listButton.isVisible().catch(() => false)) {
      await listButton.click();
      // Fill a price so the panel shows its real step-1 state (approve
      // copy + button) instead of the bare "Enter a price to continue."
      // placeholder state.
      await page.getByPlaceholder("0.00").fill("120");
      await page
        .getByRole("button", { name: /Step 1 of 2 — Approve OBRA/ })
        .waitFor({ timeout: 5_000 })
        .catch(() => {});
      await shootMain("profile-list.png");
    } else {
      console.warn("  ⚠ no unlisted owned token found for profile-list.png — wrote current profile state instead");
      await shootMain("profile-list.png");
    }

    // --- 8. Piece detail ---
    await page.goto(`${APP_URL}/marketplace/4`);
    await page.locator("main").first().waitFor();
    await waitForArtToLoad();
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
