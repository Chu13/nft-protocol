import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // The app's own package-lock.json makes Next.js/Turbopack infer this
    // directory as the project root, but lib/config/contracts.ts imports
    // /exports/*.json from the repo root one level up (the single source
    // of truth for contract ABIs/addresses, shared with the contracts
    // package) — widen the root so Turbopack resolves those files instead
    // of rejecting them as "outside the project root."
    root: path.join(__dirname, ".."),
  },
  images: {
    // NFT art is pinned to IPFS (Pinata) and resolved through a public
    // gateway at render time — see lib/ipfs.ts. Allow any host under these
    // patterns rather than a single hardcoded gateway, since the resolver
    // can fall back to alternate public gateways if Pinata's is slow/down.
    remotePatterns: [
      { protocol: "https", hostname: "*.mypinata.cloud" },
      { protocol: "https", hostname: "ipfs.io" },
      { protocol: "https", hostname: "gateway.pinata.cloud" },
    ],
  },
};

export default nextConfig;
