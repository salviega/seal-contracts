import { BytesLike } from 'ethers'

import { DataLocation } from '../constants/enums'

/**
 * `schemaId`: The `Schema` that this Attestation is based on. It must exist.
 * `linkedAttestationId`: Useful if the current Attestation references a previous Attestation. It can either be 0 or an
 * existing attestation ID.
 * `attestTimestamp`: When the attestation was made. This is automatically populated by `_attest(...)`.
 * `revokeTimestamp`: When the attestation was revoked. This is automatically populated by `_revoke(...)`.
 * `attester`: The attester. At this time, the attester must be the caller of `attest()`.
 * `validUntil`: The expiration timestamp of the Attestation. Must respect `Schema.maxValidFor`. 0 indicates no
 * expiration date.
 * `dataLocation`: Where `Attestation.data` is stored. See `DataLocation.DataLocation`.
 * `revoked`: If the Attestation has been revoked. It is possible to make a revoked Attestation.
 * `recipients`: The intended ABI-encoded recipients of this Attestation. This is of type `bytes` to support non-EVM
 * repicients.
 * `data`: The raw data of the Attestation based on `Schema.schema`. There is no enforcement here, however. Recommended
 * to use `abi.encode`.
 */

export interface Attestation {
	schemaId: number
	linkedAttestationId: number // 0
	attestTimestamp: number // 0
	revokeTimestamp: number // 0
	attester: string
	validUntil: number
	dataLocation: DataLocation
	revoked: boolean
	recipients: BytesLike[]
	data: BytesLike
}
