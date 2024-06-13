import { BytesLike } from 'ethers'

export interface Profile {
	profileId?: BytesLike
	nonce: number
	name: string
	owner: string
	anchor?: string
	members?: string[]
}
