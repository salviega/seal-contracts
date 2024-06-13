import { Attestation } from '../models/attestation.model'

export function attestationContractToAttestation(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	attestationContrct: any[]
): Attestation {
	return {
		schemaId: Number(attestationContrct[0]),
		linkedAttestationId: Number(attestationContrct[1]),
		attestTimestamp: Number(attestationContrct[2]),
		revokeTimestamp: Number(attestationContrct[3]),
		attester: attestationContrct[4],
		validUntil: Number(attestationContrct[5]),
		dataLocation: Number(attestationContrct[6]),
		revoked: attestationContrct[7],
		recipients: attestationContrct[8],
		data: attestationContrct[9]
	}
}
