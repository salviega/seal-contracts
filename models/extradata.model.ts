import { BytesLike } from 'ethers'

export interface ExtraData {
	profileId: BytesLike
	course: string
	managers: string[]
	isMint: boolean
	courseId: number
	account: string
}
