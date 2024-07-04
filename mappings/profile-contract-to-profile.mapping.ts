import { Profile } from '../models/profile.model'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function profileContractToProfile(profileContract: any): Profile {
	return {
		attestationId: profileContract[0],
		nonce: profileContract[1],
		name: profileContract[2],
		credits: profileContract[3],
		owner: profileContract[4],
		anchor: profileContract[5]
	}
}
