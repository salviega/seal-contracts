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

const deployCourse: DeployFunction = async function (
	hre: HardhatRuntimeEnvironment
) {
	const { getNamedAccounts, deployments, network, ethers } = hre
	const { log, get, deploy } = deployments
	const { deployer } = await getNamedAccounts()

	const deployerSigner: HardhatEthersSigner = await ethers.getSigner(deployer)
	const certifyDeployment: Deployment = await get('Certify')

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const args: any[] = ['xxx', 'xxx', certifyDeployment.address]

	log('-----------------------------------')
	log('Deploying Course...')

	const courseDeployment: DeployResult = await deploy('Course', {
		from: deployer,
		args,
		log: true,
		waitConfirmations: networkConfig[network.name].blockConfirmations || 1
	})

	if (!developmentChains.includes(network.name)) {
		await verify(courseDeployment.address, args)
	}

	const certify: Contract = await ethers.getContractAt(
		'Certify',
		certifyDeployment.address,
		deployerSigner
	)

	log('Adding Course to Certify...')
	await certify.updateStrategy(courseDeployment.address)
}

deployCourse.tags = ['all', 'Course']
export default deployCourse
