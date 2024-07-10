import { BytesLike } from 'ethers'

export interface Profile {
	id?: BytesLike
	attestationId?: number
	nonce: number
	name: string
	credits?: number
	owner?: string
	anchor?: string
	managers?: string[]
}
