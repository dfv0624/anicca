# Smart Contract

`contracts/AniccaContributions.sol` receives ERC-20 contributions in USDT and COPm on Celo.

Each contribution is split by the contract:

- 97% goes to the creator wallet.
- 3% goes to the platform treasury.

## Supported assets

- COPm mainnet: `0x8A567e2aE79CA692Bd748aB832081C45de4041eA`.
- COPm Celo Sepolia: `0x5F8d55c3627d2dc0a2B4afa798f877242F382F67`.
- USDT: configure with `NEXT_PUBLIC_USDT_TOKEN_ADDRESS`.

## Flow

### COPm

1. User approves the contract to spend COPm.
2. Call `contributeCopm(bytes32 campaignId, address recipient, uint256 amount)`.
3. The contract transfers 97% of COPm to `recipient`, 3% to the platform treasury, and emits `CopmContribution`.

### USDT

1. User approves the contract to spend USDT.
2. Call `contributeUsdt(bytes32 campaignId, address recipient, uint256 amount)`.
3. The contract transfers 97% of USDT to `recipient`, 3% to the platform treasury, and emits `UsdtContribution`.

## Environment variables

Use Celo Sepolia for the first deployment:

```env
CELO_NETWORK=sepolia
CELO_CHAIN_ID=11142220
CELO_RPC_URL=https://forno.celo-sepolia.celo-testnet.org
CELO_DEPLOYER_PRIVATE_KEY=
PLATFORM_TREASURY_ADDRESS=
NEXT_PUBLIC_CELO_CHAIN_ID=11142220
NEXT_PUBLIC_COPM_TOKEN_ADDRESS=0x5F8d55c3627d2dc0a2B4afa798f877242F382F67
NEXT_PUBLIC_USDT_TOKEN_ADDRESS=
NEXT_PUBLIC_USDT_DECIMALS=6
NEXT_PUBLIC_ANICCA_CONTRIBUTIONS_ADDRESS=
```

For mainnet later:

```env
CELO_NETWORK=mainnet
CELO_CHAIN_ID=42220
CELO_RPC_URL=https://forno.celo.org
PLATFORM_TREASURY_ADDRESS=
NEXT_PUBLIC_CELO_CHAIN_ID=42220
NEXT_PUBLIC_COPM_TOKEN_ADDRESS=0x8A567e2aE79CA692Bd748aB832081C45de4041eA
NEXT_PUBLIC_USDT_TOKEN_ADDRESS=
NEXT_PUBLIC_USDT_DECIMALS=6
```

Never expose `CELO_DEPLOYER_PRIVATE_KEY` through `NEXT_PUBLIC_`.
`PLATFORM_TREASURY_ADDRESS` is public by nature, but it does not need the `NEXT_PUBLIC_` prefix unless the UI displays it.

## Commands

Compile:

```bash
npm run contract:compile
```

Deploy:

```bash
npm run contract:deploy
```

After deployment, copy the printed contract address into:

```env
NEXT_PUBLIC_ANICCA_CONTRIBUTIONS_ADDRESS=
```
