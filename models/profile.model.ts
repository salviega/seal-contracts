import { BytesLike } from 'ethers'

export interface Profile {
	attestationId?: number
	nonce: number
	name: string
	owner?: string
	anchor?: string
	members?: string[]
}
