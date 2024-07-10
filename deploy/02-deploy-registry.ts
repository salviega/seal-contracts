import { Contract, ContractFactory, ContractTransactionResponse } from 'ethers'
import { ethers, upgrades } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction, ExtendedArtifact } from 'hardhat-deploy/dist/types'

import { SIGN_ADDRESS } from '../constants/addresses.ts'
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
	const { log, get, save } = deployments
	const { deployer } = await getNamedAccounts()

	// const sp: Deployment = await get('SP')

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const args: any[] = [deployer, SIGN_ADDRESS]

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

	log(`Regsitry transaction hash: ${proxyTransaction.hash}`)

	const proxyAddress: string = await proxy.getAddress()
	log(`Registry proxy deployed at: ${proxyAddress}`)

	const implementationAddress: string =
		await getImplementationAddress(proxyAddress)
	log(`Registry implementation deployed at: ${implementationAddress}`)

	const proxyAdmin: string = await getProxyAdmin(proxyAddress)
	log(`Registry proxy admin: ${proxyAdmin}`)

	if (!developmentChains.includes(network.name)) {
		await verify(proxyAddress, [])
	}

	const artifact: ExtendedArtifact =
		await deployments.getExtendedArtifact('Registry')
	await save('Registry', { address: proxyAddress, ...artifact })

	await saveUpgradeableContractDeploymentInfo('Registry', proxy)
}

deployRegistry.tags = ['all', 'Registry']
export default deployRegistry
