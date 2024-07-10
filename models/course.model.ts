import { BytesLike } from 'ethers'

export interface Course {
	id?: number
	profileId: BytesLike
	attestationId?: number
	course: string
	credits?: number
	manager?: string
}
