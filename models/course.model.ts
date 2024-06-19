import { BytesLike } from 'ethers'

export interface Course {
	profileId: BytesLike
	attestationId?: number
	courseId?: number
	course: string
	adminRole?: BytesLike
	managerRole?: BytesLike
	manangers?: string[]
}
