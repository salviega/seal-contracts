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

const deployRegistry: DeployFunction = async function (
	hre: HardhatRuntimeEnvironment
) {
	const { getNamedAccounts, deployments, network } = hre
	const { log } = deployments
	const { deployer } = await getNamedAccounts()

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const args: any[] = [deployer]

	log('-----------------------------------')
	log('Deploying Registry...')

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const Registry: ContractFactory<any[], Contract> =
		await ethers.getContractFactory('Registry')

	const proxy: Contract = await upgrades.deployProxy(Registry, args)
	await proxy.waitForDeployment()

	const proxyTransaction: ContractTransactionResponse | null =
		proxy.deploymentTransaction()

	if (!proxyTransaction) {
		throw new Error('No deployment transaction found')
	}

	const proxyAddress: string = await proxy.getAddress()
	const proxyAdmin: string = await getProxyAdmin(proxyAddress)

	const implementationAddress: string =
		await getImplementationAddress(proxyAddress)

	log(`Regsitry transaction hash: ${proxyTransaction.hash}`)
	log(`Registry implementation deployed at: ${implementationAddress}`)
	log(`Registry proxy deployed at: ${proxyAddress}`)
	log(`Registry proxy admin: ${proxyAdmin}`)

	if (!developmentChains.includes(network.name)) {
		await verify(proxyAddress, [])
	}

	await saveUpgradeableContractDeploymentInfo('Registry', proxy)
}

deployRegistry.tags = ['all', 'Registry']
export default deployRegistry
