import { BytesLike } from 'ethers'

export interface Activity {
	id?: number
	profileId: BytesLike
	attestationId?: number
	activity: string
	credits?: number
	manager?: string
}
