import { Contract, ContractFactory, ContractTransactionResponse } from 'ethers'
import { ethers, upgrades } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/dist/types'

import verify from '../helper-functions.ts'
import { getImplementationAddress, getProxyAdmin } from '../utils/upgrades/get-implementation-address.ts'

const deployRegistry: DeployFunction = async function (
	hre: HardhatRuntimeEnvironment
) {
	const { getNamedAccounts, deployments } = hre
	const { log } = deployments
	const { deployer } = await getNamedAccounts()

	const args: string[] = [deployer]

	log('-----------------------------------')
	log('Deploying Registry...')

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const Registry: ContractFactory<any[], Contract> =
		await ethers.getContractFactory('Registry')

	const proxy: Contract = await upgrades.deployProxy(Registry, args)
	await proxy.waitForDeployment()

	const proxyTransaction: ContractTransactionResponse | null =
	proxy.deploymentTransaction()

	const proxyAddress: string = await proxy.getAddress()
	const proxyAdmin: string = await getProxyAdmin(proxyAddress)
	
	const implementationAddress: string =
		await getImplementationAddress(proxyAddress)
		
	log(`Registry implementation deployed at: ${implementationAddress}`)
	log(`Registry proxy deployed at: ${proxyAddress}`)
	log(`Registry proxy admin: ${proxyAdmin}`)

	await verify(proxyAddress, args)
}

deployRegistry.tags = ['all', 'Registry']
export default deployRegistry
