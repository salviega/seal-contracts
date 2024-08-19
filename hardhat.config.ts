import dotenv from 'dotenv'

import { ensureEnvVar } from './helpers/ensure-env-variables'

import '@nomicfoundation/hardhat-ethers'
import '@nomicfoundation/hardhat-toolbox'
import '@nomicfoundation/hardhat-verify'
import '@openzeppelin/hardhat-upgrades'
import 'hardhat-deploy'
import 'hardhat-gas-reporter'
import 'solidity-coverage'

dotenv.config({ path: `.env.${process.env.NODE_ENV}` })

const {
	RPC_HTTPS,
	SCAN_API_KEY,
	COINMARKETCAP_API_KEY,
	REPORT_GAS,
	WALLET_PRIVATE_KEY
} = process.env

const url = ensureEnvVar(RPC_HTTPS, 'RPC_HTTPS')

const apiKey = ensureEnvVar(SCAN_API_KEY, 'SCAN_API_KEY')

const coinmarketcap = ensureEnvVar(
	COINMARKETCAP_API_KEY,
	'COINMARKETCAP_API_KEY'
)

const walletPrivateKey = ensureEnvVar(WALLET_PRIVATE_KEY, 'WALLET_PRIVATE_KEY')

const accounts = [walletPrivateKey]

const SOLC_SETTING = {
	optimizer: {
		enabled: true,
		runs: 200
	}
}

const defaultNetwork = 'hardhat'
const config = {
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
			{
				version: '0.8.24',
				settings: SOLC_SETTING
			},
			{
				version: '0.8.23',
				settings: SOLC_SETTING
			},
			{
				version: '0.8.22',
				settings: SOLC_SETTING
			},
			{
				version: '0.8.21',
				settings: SOLC_SETTING
			},
			{
				version: '0.8.20',
				settings: SOLC_SETTING
			},
			{
				version: '0.8.19',
				settings: SOLC_SETTING
			}
		]
	},
	gasReporter: {
		enabled: !!REPORT_GAS,
		coinmarketcap,
		currency: 'USD',
		L1: 'celo'
		// outputFile: 'gas-report.txt'
	},

	mocha: {
		timeout: 200000
	}
}

export default config
