import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction /* DeployResult */ } from 'hardhat-deploy/dist/types'

import { developmentChains, networkConfig } from '../helper-hardhat-config.ts'
import { verify } from '../helpers/verify.ts'

const deployLock: DeployFunction = async function (
	hre: HardhatRuntimeEnvironment
) {
	const { getNamedAccounts, deployments, network } = hre
	const { deploy, log } = deployments
	const { deployer } = await getNamedAccounts()

	const currentTime: number = Math.floor(Date.now() / 1000)
	const unlockTime: number = currentTime + 60

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const args: any[] = [unlockTime]

	log('-----------------------------------')
	log('Deploying Lock...')

	/* const lock: DeployResult = */ await deploy('Lock', {
		from: deployer,
		args,
		log: true,
		waitConfirmations: networkConfig[network.name].blockConfirmations || 1
	})

	if (!developmentChains.includes(network.name)) {
		await verify('Lock', args)
	}
}

export default deployLock
