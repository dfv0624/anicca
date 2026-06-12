export const celoContracts = {
  mainnet: {
    chainId: 42220,
    rpcUrl: "https://forno.celo.org",
    copmTokenAddress: "0x8A567e2aE79CA692Bd748aB832081C45de4041eA",
  },
  sepolia: {
    chainId: 11142220,
    rpcUrl: "https://forno.celo-sepolia.celo-testnet.org",
    copmTokenAddress: "0x5F8d55c3627d2dc0a2B4afa798f877242F382F67",
  },
} as const;

export const aniccaContributionsAbi = [
  {
    type: "function",
    name: "contributeCelo",
    stateMutability: "payable",
    inputs: [
      { name: "campaignId", type: "bytes32" },
      { name: "recipient", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "contributeCopm",
    stateMutability: "nonpayable",
    inputs: [
      { name: "campaignId", type: "bytes32" },
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "event",
    name: "CeloContribution",
    inputs: [
      { name: "campaignId", type: "bytes32", indexed: true },
      { name: "contributor", type: "address", indexed: true },
      { name: "recipient", type: "address", indexed: true },
      { name: "totalAmount", type: "uint256", indexed: false },
      { name: "creatorAmount", type: "uint256", indexed: false },
      { name: "platformFee", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "CopmContribution",
    inputs: [
      { name: "campaignId", type: "bytes32", indexed: true },
      { name: "contributor", type: "address", indexed: true },
      { name: "recipient", type: "address", indexed: true },
      { name: "totalAmount", type: "uint256", indexed: false },
      { name: "creatorAmount", type: "uint256", indexed: false },
      { name: "platformFee", type: "uint256", indexed: false },
    ],
  },
] as const;

export const erc20ApprovalAbi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;
