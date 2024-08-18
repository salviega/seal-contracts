export const setSignAddress = () => {
	if (process.env.NODE_ENV === 'arbitrumOne')
		return '0x4e4af2a21ebf62850fD99Eb6253E1eFBb56098cD'
	else if (process.env.NODE_ENV === 'arbitrumSepolia')
		return '0x4e4af2a21ebf62850fD99Eb6253E1eFBb56098cD'
	else if (process.env.NODE_ENV === 'celoAlfajores')
		return '0x4e4af2a21ebf62850fD99Eb6253E1eFBb56098cD'
	else if (process.env.NODE_ENV === 'celoMainnet')
		return '0x4e4af2a21ebf62850fD99Eb6253E1eFBb56098cD'
}

export const SIGN_ADDRESS = setSignAddress()
