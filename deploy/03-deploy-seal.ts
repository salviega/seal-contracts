import { Contract, ContractFactory, ContractTransactionResponse } from 'ethers'
import { ethers, upgrades } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import {
	DeployFunction,
	Deployment,
	ExtendedArtifact
} from 'hardhat-deploy/dist/types'

import { developmentChains } from '../helper-hardhat-config.ts'
import {
	getImplementationAddress,
	getProxyAdmin
} from '../helpers/upgrades/get-implementation-address.ts'
import { saveUpgradeableContractDeploymentInfo } from '../helpers/upgrades/save-upgradeable-contract-deployment-info.ts'
import { verify } from '../helpers/verify.ts'

const deploySeal: DeployFunction = async function (
	hre: HardhatRuntimeEnvironment
) {
	const { getNamedAccounts, deployments, network } = hre
	const { log, get, save } = deployments
	const { deployer } = await getNamedAccounts()

	const registry: Deployment = await get('Registry')

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const args: any[] = [deployer, registry.address]

	log('-----------------------------------')
	log('Deploying Seal...')

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const Registry: ContractFactory<any[], Contract> =
		await ethers.getContractFactory('Seal')

	const proxy: Contract = await upgrades.deployProxy(Registry, args)
	await proxy.waitForDeployment()

	const proxyTransaction: ContractTransactionResponse | null =
		proxy.deploymentTransaction()

	if (!proxyTransaction) {
		throw new Error('No deployment transaction found')
	}

	log(`Seal transaction hash: ${proxyTransaction.hash}`)

	const proxyAddress: string = await proxy.getAddress()
	log(`Seal proxy deployed at: ${proxyAddress}`)

	const implementationAddress: string =
		await getImplementationAddress(proxyAddress)
	log(`Seal implementation deployed at: ${implementationAddress}`)

	const proxyAdmin: string = await getProxyAdmin(proxyAddress)
	log(`Seal proxy admin: ${proxyAdmin}`)

	if (developmentChains.includes(network.name)) {
		await verify(proxyAddress, [])
	}

	const artifact: ExtendedArtifact =
		await deployments.getExtendedArtifact('Seal')
	await save('Seal', { address: proxyAddress, ...artifact })

	await saveUpgradeableContractDeploymentInfo('Seal', proxy)
}

deploySeal.tags = ['all', 'Seal']
export default deploySeal
