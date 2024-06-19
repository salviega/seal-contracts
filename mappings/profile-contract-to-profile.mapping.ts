import { Profile } from '../models/profile.model'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function profileContractToProfile(profileContract: any): Profile {
	return {
		attestationId: profileContract[0],
		profileId: profileContract[1],
		nonce: profileContract[2],
		name: profileContract[3],
		owner: profileContract[4],
		anchor: profileContract[5]
	}
}
