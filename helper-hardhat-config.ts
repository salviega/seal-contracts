export interface networkConfigItem {
	ethUsdPriceFeed?: string
	blockConfirmations?: number
}

export interface networkConfigInfo {
	[key: string]: networkConfigItem
}

export const networkConfig: networkConfigInfo = {
	hardhat: {},
	localhost: {},
	arbitrumOne: {
		blockConfirmations: 3
	},
	arbitrumSepolia: {
		blockConfirmations: 3
	}
}

export const developmentChains = ['hardhat', 'localhost']
