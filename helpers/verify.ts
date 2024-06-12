/* eslint-disable @typescript-eslint/no-explicit-any */
import { run } from 'hardhat'

export async function verify(
	contractAddress: string,
	args: any[]
): Promise<void> {
	console.log('Verifying contract...')
	try {
		await run('verify:verify', {
			address: contractAddress,
			constructorArguments: args
		})
	} catch (error: any) {
		if (!error.message.toLowerCase().includes('already verified')) {
			console.error(error)
		}
	}
}
