import fs from "node:fs";
import { ContractFactory, Wallet, JsonRpcProvider, isAddress } from "ethers";
import { loadEnv, requireEnv } from "./env.mjs";

const env = loadEnv();
const rpcUrl = requireEnv(env, "CELO_RPC_URL");
const privateKey = requireEnv(env, "CELO_DEPLOYER_PRIVATE_KEY");
const copmAddress = requireEnv(env, "NEXT_PUBLIC_COPM_TOKEN_ADDRESS");
const usdtAddress = requireEnv(env, "NEXT_PUBLIC_USDT_TOKEN_ADDRESS");
const platformTreasuryAddress = requireEnv(env, "PLATFORM_TREASURY_ADDRESS");

if (!isAddress(copmAddress)) {
  throw new Error("NEXT_PUBLIC_COPM_TOKEN_ADDRESS is not a valid EVM address");
}

if (!isAddress(usdtAddress)) {
  throw new Error("NEXT_PUBLIC_USDT_TOKEN_ADDRESS is not a valid EVM address");
}

if (!isAddress(platformTreasuryAddress)) {
  throw new Error("PLATFORM_TREASURY_ADDRESS is not a valid EVM address");
}

if (!fs.existsSync("artifacts/contracts/AniccaContributions.json")) {
  throw new Error("Missing artifact. Run npm run contract:compile first.");
}

const artifact = JSON.parse(
  fs.readFileSync("artifacts/contracts/AniccaContributions.json", "utf8"),
);

const provider = new JsonRpcProvider(rpcUrl);
const wallet = new Wallet(privateKey, provider);
const factory = new ContractFactory(artifact.abi, artifact.bytecode, wallet);

console.log(`Deploying AniccaContributions from ${wallet.address}`);
console.log(`COPm token: ${copmAddress}`);
console.log(`USDT token: ${usdtAddress}`);
console.log(`Platform treasury: ${platformTreasuryAddress}`);

const contract = await factory.deploy(copmAddress, usdtAddress, platformTreasuryAddress);
await contract.waitForDeployment();

const address = await contract.getAddress();
console.log(`AniccaContributions deployed: ${address}`);
console.log("Add this to .env:");
console.log(`NEXT_PUBLIC_ANICCA_CONTRIBUTIONS_ADDRESS=${address}`);
