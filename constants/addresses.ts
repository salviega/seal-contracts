export const setSignAddress = () => {
	if (process.env.NODE_ENV === 'testnet')
		return '0x4e4af2a21ebf62850fD99Eb6253E1eFBb56098cD' // Arbitrum Sepolia
	else return '0x2b3224D080452276a76690341e5Cfa81A945a985' // Base
}

export const SIGN_ADDRESS = setSignAddress()
