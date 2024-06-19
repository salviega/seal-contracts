import { Contract, ContractFactory, ContractTransactionResponse } from 'ethers'
import { ethers, upgrades } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/dist/types'

import { developmentChains } from '../helper-hardhat-config.ts'
import {
	getImplementationAddress,
	getProxyAdmin
} from '../helpers/upgrades/get-implementation-address.ts'
import { saveUpgradeableContractDeploymentInfo } from '../helpers/upgrades/save-upgradeable-contract-deployment-info.ts'
import { verify } from '../helpers/verify.ts'

const deploySp: DeployFunction = async function (
	hre: HardhatRuntimeEnvironment
) {
	const { deployments, network } = hre
	const { log, save } = deployments

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const args: any[] = [1, 1]

	log('-----------------------------------')
	log('Deploying SP...')

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const SP: ContractFactory<any[], Contract> =
		await ethers.getContractFactory('SP')

	const proxy: Contract = await upgrades.deployProxy(SP, args)
	await proxy.waitForDeployment()

	const proxyTransaction: ContractTransactionResponse | null =
		proxy.deploymentTransaction()

	if (!proxyTransaction) {
		throw new Error('No deployment transaction found')
	}

	log(`SP transaction hash: ${proxyTransaction.hash}`)

	const proxyAddress: string = await proxy.getAddress()
	log(`SP proxy deployed at: ${proxyAddress}`)

	const implementationAddress: string =
		await getImplementationAddress(proxyAddress)
	log(`SP implementation deployed at: ${implementationAddress}`)

	const proxyAdmin: string = await getProxyAdmin(proxyAddress)
	log(`SP proxy admin: ${proxyAdmin}`)

	if (!developmentChains.includes(network.name)) {
		await verify(proxyAddress, [])
	}

	const artifact = await deployments.getExtendedArtifact('SP')
	await save('SP', { address: proxyAddress, ...artifact })

	await saveUpgradeableContractDeploymentInfo('SP', proxy)
}

deploySp.tags = ['all', 'Sp']
export default deploySp
