/**
 * Resolves `ipfs://<cid>/<path>` URIs (and bare CIDs) to an HTTP(S) gateway
 * URL for rendering in <img>/fetch. NFT art + metadata are pinned to IPFS
 * via Pinata (Phase 5); this is the one place that gateway choice lives, so
 * swapping gateways later is a one-line change.
 */

const DEFAULT_GATEWAY = "https://gateway.pinata.cloud/ipfs/";

function gatewayBase(): string {
  const custom = process.env.NEXT_PUBLIC_IPFS_GATEWAY?.trim();
  if (!custom) return DEFAULT_GATEWAY;
  return custom.endsWith("/") ? custom : `${custom}/`;
}

/** Convert an `ipfs://...` (or already-HTTP) URI into a fetchable/renderable HTTP(S) URL. */
export function resolveIpfsUri(uri: string | undefined): string | undefined {
  if (!uri) return undefined;
  if (uri.startsWith("ipfs://")) {
    return gatewayBase() + uri.slice("ipfs://".length);
  }
  return uri;
}
