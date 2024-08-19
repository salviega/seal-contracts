import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'
import { Contract } from 'ethers'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import {
	DeployFunction,
	Deployment,
	DeployResult
} from 'hardhat-deploy/dist/types'

import { developmentChains, networkConfig } from '../helper-hardhat-config'
import { verify } from '../helpers/verify'

const deployActivity: DeployFunction = async function (
	hre: HardhatRuntimeEnvironment
) {
	const { getNamedAccounts, deployments, network, ethers } = hre
	const { log, get, deploy } = deployments
	const { deployer } = await getNamedAccounts()

	const deployerSigner: HardhatEthersSigner = await ethers.getSigner(deployer)
	const sealDeployment: Deployment = await get('Seal')

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const args: any[] = ['xxx', 'xxx', sealDeployment.address]

	log('-----------------------------------')
	log('Deploying Activity...')

	const activityDeployment: DeployResult = await deploy('Activity', {
		from: deployer,
		args,
		log: true,
		waitConfirmations: networkConfig[network.name].blockConfirmations || 1
	})

	if (developmentChains.includes(network.name)) {
		await verify(activityDeployment.address, args)
	}

	const seal: Contract = await ethers.getContractAt(
		'Seal',
		sealDeployment.address,
		deployerSigner
	)

	log('Adding Activity to Seal...')
	await seal.updateStrategy(activityDeployment.address)
}

deployActivity.tags = ['all', 'Activity']
export default deployActivity
