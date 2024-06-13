import { Profile } from '../models/profile.model'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function profileContractToProfile(profileContract: any): Profile {
	return {
		profileId: profileContract[0],
		nonce: profileContract[1],
		name: profileContract[2],
		owner: profileContract[3],
		anchor: profileContract[4]
	}
}
