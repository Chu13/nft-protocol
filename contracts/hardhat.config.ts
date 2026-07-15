import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Normalizes a private key env var into the 0x-prefixed form hardhat expects,
 * and returns an empty accounts list when unset so `npx hardhat compile` /
 * `npx hardhat test` keep working with zero configuration (no .env required
 * for local-only work). Live networks will simply have no signer available
 * until DEPLOYER_PRIVATE_KEY is set — attempting to deploy without it fails
 * loudly rather than silently using a throwaway key.
 */
function deployerAccounts(): string[] {
  const key = process.env.DEPLOYER_PRIVATE_KEY;
  if (!key) return [];
  return [key.startsWith("0x") ? key : `0x${key}`];
}

const config: HardhatUserConfig = {
  solidity: {
    // 0.8.28 (not 0.8.24, unlike Level 02) — OpenZeppelin Contracts 5.6.x's
    // Bytes.sol uses the MCOPY opcode (EIP-5656, Cancun), which needs a
    // solc build with Cancun support baked in; 0.8.24 doesn't have it.
    // BNB Chain (mainnet + testnet) adopted the Cancun-equivalent opcodes
    // ahead of this project's deploy, so the default "cancun" evmVersion
    // that 0.8.28 selects is safe for the bnbTestnet target.
    version: "0.8.28",
    settings: {
      // Hardhat's toolbox defaults evmVersion to "paris" regardless of the
      // solc version selected above — must be set explicitly to unlock the
      // MCOPY opcode (EIP-5656) OpenZeppelin Contracts 5.6.x's Bytes.sol
      // relies on. See the version comment above.
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: false,
    },
  },

  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },

    // ---- Ethereum (structural — not deployed this iteration) ----
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      chainId: 11155111,
      accounts: deployerAccounts(),
    },
    mainnet: {
      url: process.env.MAINNET_RPC_URL || "",
      chainId: 1,
      accounts: deployerAccounts(),
    },

    // ---- BNB Chain — bnbTestnet is the only network this iteration deploys to ----
    bnbTestnet: {
      url: process.env.BNB_TESTNET_RPC_URL || "",
      chainId: 97,
      accounts: deployerAccounts(),
    },
    bnbMainnet: {
      url: process.env.BNB_MAINNET_RPC_URL || "",
      chainId: 56,
      accounts: deployerAccounts(),
    },
  },

  // Etherscan's unified V2 API accepts one key across every chain it indexes,
  // including BSC (BscScan was folded into the same multichain program) — see
  // Level 02's hardhat.config.ts for the full explanation and the
  // `customChains` fallback if BSC ever needs a distinct key.
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || process.env.BSCSCAN_API_KEY || "",
  },

  sourcify: {
    enabled: false,
  },

  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
  },

  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};

export default config;
