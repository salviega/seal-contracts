import { Contract, ContractFactory } from 'ethers'
import { ethers, upgrades } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import {
	DeployFunction,
	Deployment,
	ExtendedArtifact
} from 'hardhat-deploy/dist/types'

import { developmentChains } from '../helper-hardhat-config.ts'
import { getImplementationAddress } from '../helpers/upgrades/get-implementation-address.ts'
import { verify } from '../helpers/verify.ts'

const upgradeSeal: DeployFunction = async function (
	hre: HardhatRuntimeEnvironment
) {
	const { getNamedAccounts, deployments, network } = hre
	const { log, get, save } = deployments
	const { deployer } = await getNamedAccounts()

	const sealDeployment: Deployment = await get('Seal')
	const proxyAddress: string = sealDeployment.address

	log('-----------------------------------')
	log('Upgrading Seal...')

	const Seal: ContractFactory = await ethers.getContractFactory('Seal')

	const upgradedProxy: Contract = await upgrades.upgradeProxy(
		proxyAddress,
		Seal
	)

	await upgradedProxy.getAddress()

	const implementationAddress: string =
		await getImplementationAddress(proxyAddress)
	log(`New Seal implementation deployed at: ${implementationAddress}`)

	if (developmentChains.includes(network.name)) {
		await verify(implementationAddress, [])
	}

	const artifact: ExtendedArtifact =
		await deployments.getExtendedArtifact('Seal')
	await save('Seal', { address: proxyAddress, ...artifact })
}

upgradeSeal.tags = ['upgradeSeal']

export default upgradeSeal
