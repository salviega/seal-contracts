import dotenv from 'dotenv'
import { HardhatUserConfig } from 'hardhat/config'
import { SolcUserConfig } from 'hardhat/types'

import { ensureEnvVar } from './helpers/ensure-env-variables'

import '@nomicfoundation/hardhat-ethers'
import '@nomicfoundation/hardhat-toolbox'
import '@nomicfoundation/hardhat-verify'
import '@openzeppelin/hardhat-upgrades'
import '@typechain/hardhat'
import 'hardhat-deploy'
import 'hardhat-gas-reporter'
import 'solidity-coverage'

// Load environment variables

dotenv.config({ path: `.env.${process.env.NODE_ENV}` })

const {
	RPC_HTTPS,
	SCAN_API_KEY,
	COINMARKETCAP_API_KEY,
	REPORT_GAS,
	WALLET_PRIVATE_KEY
} = process.env

// Ensure environment variables

const url: string = ensureEnvVar(RPC_HTTPS, 'RPC_HTTPS')

const apiKey: string = ensureEnvVar(SCAN_API_KEY, 'SCAN_API_KEY')

const coinmarketcap: string = ensureEnvVar(
	COINMARKETCAP_API_KEY,
	'COINMARKETCAP_API_KEY'
)

const walletPrivateKey: string = ensureEnvVar(
	WALLET_PRIVATE_KEY,
	'WALLET_PRIVATE_KEY'
)

// Set up accounts

const accounts: string[] = [walletPrivateKey]

// Set up Solidity compiler

const solcUserConfig = (version: string): SolcUserConfig => {
	return {
		version,
		settings: {
			optimizer: {
				enabled: true,
				runs: 200
			}
		}
	}
}

// Set up Hardhat config

const defaultNetwork: string = 'hardhat'

const config: HardhatUserConfig = {
	defaultNetwork,
	networks: {
		hardhat: {
			allowUnlimitedContractSize: true,
			chainId: 1337
		},
		localhost: {
			allowUnlimitedContractSize: true,
			chainId: 1337,
			url: 'http://localhost:8545'
		},
		arbitrumOne: {
			chainId: 42161,
			accounts,
			url
		},
		arbitrumSepolia: {
			chainId: 421614,
			accounts,
			url
		},
		celoAlfajores: {
			chainId: 44787,
			accounts,
			url
		},
		celoMainnet: {
			chainId: 42220,
			accounts,
			url
		}
	},
	etherscan: {
		apiKey,
		customChains: [
			{
				network: 'celoAlfajores',
				chainId: 44787,
				urls: {
					apiURL: 'https://api-alfajores.celoscan.io/api',
					browserURL: 'https://alfajores.celoscan.io'
				}
			},
			{
				network: 'celoMainnet',
				chainId: 42220,
				urls: {
					apiURL: 'https://api.celoscan.io/api',
					browserURL: 'https://celoscan.io'
				}
			}
		]
	},
	sourcify: {
		enabled: true
	},
	namedAccounts: {
		deployer: {
			default: 0
		}
	},
	solidity: {
		compilers: [
			solcUserConfig('0.8.24'),
			solcUserConfig('0.8.23'),
			solcUserConfig('0.8.22'),
			solcUserConfig('0.8.21'),
			solcUserConfig('0.8.20'),
			solcUserConfig('0.8.19')
		]
	},
	typechain: {
		outDir: 'typechain-types',
		target: 'ethers-v6'
	},
	gasReporter: {
		enabled: Boolean(REPORT_GAS),
		coinmarketcap,
		currency: 'USD',
		L2: 'arbitrum'
		// outputFile: 'gas-report.txt'
	},
	mocha: {
		timeout: 200000
	}
}

export default config
