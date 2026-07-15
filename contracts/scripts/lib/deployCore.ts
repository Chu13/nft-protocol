import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/** contracts/deployments/ — one JSON file per network, keyed by hardhat network name. */
export const DEPLOYMENTS_DIR = path.join(__dirname, "..", "..", "deployments");

export interface DeployParams {
  collectionName: string;
  collectionSymbol: string;
  /** The CHU token address on the target network — from Level 02's exports/token.json. */
  paymentToken: string;
  maxSupply: bigint;
  /** Price per mint, in payment-token wei. */
  mintPrice: bigint;
  maxPerWallet: bigint;
  royaltyReceiver: string;
  /** ERC-2981 royalty, in basis points (e.g. 500 = 5%). */
  royaltyBps: bigint;
  baseURI: string;
  /** Marketplace fee, in basis points (e.g. 200 = 2%). */
  marketplaceFeeBps: bigint;
  marketplaceFeeRecipient: string;
}

export interface DeploymentRecord {
  network: string;
  chainId: number;
  deployer: string;
  deployedAt: string;
  paymentToken: string;
  obra: {
    address: string;
    txHash: string;
    blockNumber: number;
    name: string;
    symbol: string;
    maxSupply: string;
    mintPrice: string;
    maxPerWallet: string;
    royaltyReceiver: string;
    royaltyBps: string;
    baseURI: string;
  };
  market: {
    address: string;
    txHash: string;
    blockNumber: number;
    feeBps: string;
    feeRecipient: string;
  };
}

/**
 * Deploys Obra -> ObraMarket (in that order, since ObraMarket's constructor
 * needs the Obra address). Shared by scripts/deploy.ts (any configured
 * network, values sourced from env) and scripts/seed-local.ts (hardcoded
 * demo values for local dev) so the two never drift out of sync.
 */
export async function deployProtocol(params: DeployParams) {
  const [deployer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  console.log(`Deploying to network "${network.name}" (chainId ${chainId}) as ${deployer.address}`);

  const Obra = await ethers.getContractFactory("Obra", deployer);
  const obra = await Obra.deploy(
    params.collectionName,
    params.collectionSymbol,
    params.paymentToken,
    params.maxSupply,
    params.mintPrice,
    params.maxPerWallet,
    params.royaltyReceiver,
    params.royaltyBps,
    params.baseURI,
    deployer.address
  );
  await obra.waitForDeployment();
  const obraAddress = await obra.getAddress();
  const obraReceipt = await obra.deploymentTransaction()!.wait();
  console.log(`Obra deployed to ${obraAddress} (tx ${obraReceipt!.hash})`);

  const ObraMarket = await ethers.getContractFactory("ObraMarket", deployer);
  const market = await ObraMarket.deploy(
    obraAddress,
    params.paymentToken,
    params.marketplaceFeeBps,
    params.marketplaceFeeRecipient,
    deployer.address
  );
  await market.waitForDeployment();
  const marketAddress = await market.getAddress();
  const marketReceipt = await market.deploymentTransaction()!.wait();
  console.log(`ObraMarket deployed to ${marketAddress} (tx ${marketReceipt!.hash})`);

  const record: DeploymentRecord = {
    network: network.name,
    chainId,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    paymentToken: params.paymentToken,
    obra: {
      address: obraAddress,
      txHash: obraReceipt!.hash,
      blockNumber: obraReceipt!.blockNumber,
      name: params.collectionName,
      symbol: params.collectionSymbol,
      maxSupply: params.maxSupply.toString(),
      mintPrice: params.mintPrice.toString(),
      maxPerWallet: params.maxPerWallet.toString(),
      royaltyReceiver: params.royaltyReceiver,
      royaltyBps: params.royaltyBps.toString(),
      baseURI: params.baseURI,
    },
    market: {
      address: marketAddress,
      txHash: marketReceipt!.hash,
      blockNumber: marketReceipt!.blockNumber,
      feeBps: params.marketplaceFeeBps.toString(),
      feeRecipient: params.marketplaceFeeRecipient,
    },
  };

  return { obra, market, obraAddress, marketAddress, deployer, chainId, record };
}

/** Writes contracts/deployments/<network>.json, creating the directory if needed. */
export function writeDeploymentRecord(record: DeploymentRecord): string {
  fs.mkdirSync(DEPLOYMENTS_DIR, { recursive: true });
  const outPath = path.join(DEPLOYMENTS_DIR, `${record.network}.json`);
  fs.writeFileSync(outPath, JSON.stringify(record, null, 2) + "\n");
  return outPath;
}
