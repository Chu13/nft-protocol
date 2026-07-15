import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
