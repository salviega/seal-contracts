import { BytesLike } from 'ethers'

export interface Profile {
	attestationId?: number
	nonce: number
	name: string
	credits?: number
	owner?: string
	anchor?: string
	managers?: string[]
}
