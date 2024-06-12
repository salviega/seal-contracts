import { Contract, ContractTransactionResponse, Network } from 'ethers'
import fs from 'fs'
import path from 'path'

export async function saveUpgradeableContractDeploymentInfo(
	proxyName: string,
	proxy: Contract
): Promise<void> {
	const address: string = await proxy.getAddress()

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const abi: any = JSON.parse(proxy.interface.formatJson())
	const bytecode: string | null = await proxy.getDeployedCode()

	const deploymentTransaction: ContractTransactionResponse | null =
		proxy.deploymentTransaction()

	if (!deploymentTransaction) {
		throw new Error('No deployment transaction found')
	}

	const blockNumber: number | null = deploymentTransaction.blockNumber

	if (!blockNumber) {
		throw new Error('No block number found')
	}

	const transactionHash: string = deploymentTransaction.hash
	const deployer: string = deploymentTransaction.from

	const network: Network = await deploymentTransaction.provider.getNetwork()
	const networkName: string = network.name

	const chainId: string = Number(deploymentTransaction.chainId).toString()

	const deploymentInfo: string = JSON.stringify(
		{
			address,
			abi,
			transactionHash,
			blockNumber,
			deployer,
			bytecode
		},
		null,
		2
	)

	const networkDirectory: string = path.join(
		'.',
		'deployments',
		networkName,
		proxyName
	)

	if (!fs.existsSync(networkDirectory)) {
		fs.mkdirSync(networkDirectory, { recursive: true })
	}

	fs.writeFileSync(
		path.join(networkDirectory, `${proxyName}.json`),
		deploymentInfo
	)

	const chainIdFile = path.join(networkDirectory, '..', '.chainId')
	if (!fs.existsSync(chainIdFile)) {
		fs.writeFileSync(chainIdFile, chainId)
	}
}
