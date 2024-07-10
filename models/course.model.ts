import { BytesLike } from 'ethers'

export interface Course {
	profileId: BytesLike
	attestationId?: number
	course: string
	credits?: number
	manager?: string
}
