import { Contract, TransactionReceipt } from 'ethers'
import { ethers } from 'hardhat'

export async function getEventArgs(
	hash: string,
	contract: Contract,
	eventName: string,
	argsToReturn: number[] | 'all'

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
	const transactionReceipt: TransactionReceipt | null =
		await ethers.provider.getTransactionReceipt(hash)
	if (transactionReceipt === null) {
		throw new Error('Transaction receipt is null.')
	}

	const transactionBlockNumber: number = transactionReceipt.blockNumber

	const events = await contract.queryFilter(eventName, transactionBlockNumber)

	if (events.length === 0) {
		throw new Error(`No events found for ${eventName}`)
	}

	const event = events[events.length - 1]

	if (argsToReturn === 'all') {
		return event.args
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const filteredArgs: any = {}

	argsToReturn.forEach((index: number) => {
		if (index < event.args.length) {
			filteredArgs[index] = event.args[index]
		}
	})

	return filteredArgs
}
