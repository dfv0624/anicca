import fs from "node:fs";
import path from "node:path";
import solc from "solc";

const contractPath = "contracts/AniccaContributions.sol";
const contractName = "AniccaContributions";
const source = fs.readFileSync(contractPath, "utf8");

const input = {
  language: "Solidity",
  sources: {
    [contractPath]: {
      content: source,
    },
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object"],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = output.errors ?? [];
const fatalErrors = errors.filter((error) => error.severity === "error");

for (const error of errors) {
  console.error(error.formattedMessage);
}

if (fatalErrors.length > 0) {
  process.exit(1);
}

const contract = output.contracts[contractPath][contractName];
const artifact = {
  contractName,
  abi: contract.abi,
  bytecode: `0x${contract.evm.bytecode.object}`,
};

const artifactsDir = path.join("artifacts", "contracts");
fs.mkdirSync(artifactsDir, { recursive: true });
fs.writeFileSync(
  path.join(artifactsDir, `${contractName}.json`),
  `${JSON.stringify(artifact, null, 2)}\n`,
);

console.log(`Compiled ${contractName}`);
