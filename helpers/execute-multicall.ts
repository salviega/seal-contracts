import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'
import { Contract } from 'ethers'

export async function executeMulticall(
	contract: Contract,
	signer: HardhatEthersSigner,
	methods: { name: string; params: any[] }[]
): Promise<void> {
	const calls = methods.map(method =>
		contract.interface.encodeFunctionData(method.name, method.params)
	)

	const multicallTx = await contract.connect(signer).multicall(calls)
	await multicallTx.wait()
}
