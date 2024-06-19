import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expect } from 'chai'
import { AbiCoder, BytesLike } from 'ethers'
import hre, { ethers, upgrades } from 'hardhat'

import { CREATE_PROFILE_TYPES } from '../constants/constants'
import { DataLocation } from '../constants/enums'
import { getEvetnArgs } from '../helpers/get-events-args'
import { attestationContractToAttestation } from '../mappings/attestation-contract-to-attestation.mapping'
import { profileContractToProfile } from '../mappings/profile-contract-to-profile.mapping'
import { Attestation } from '../models/attestation.model'
import { Profile } from '../models/profile.model'
import { Schema } from '../models/schema.model'

describe('Registry', function () {
	const abiCoder: AbiCoder = new ethers.AbiCoder()

	async function deployFixture() {
		const [certify, ethKipu, tono, julio] = await hre.ethers.getSigners()

		const SP = await hre.ethers.getContractFactory('SP')
		const sp = await upgrades.deployProxy(SP, [1, 1])

		const Registry = await hre.ethers.getContractFactory('Registry')
		const registry = await upgrades.deployProxy(Registry, [
			certify.address,
			await sp.getAddress()
		])

		const clientSchema: Schema = {
			registrant: ethKipu.address,
			revocale: false,
			dataLocation: DataLocation.ONCHAIN,
			maxValidFor: 0,
			hook: await registry.getAddress(),
			timestamp: 0,
			data: 'blah blah blah...'
		}

		const clientSchemaArray: unknown[] = Object.values(clientSchema)
		const delegateSignature: BytesLike = '0x'

		const registerTx = await sp
			.connect(ethKipu)
			.register(clientSchemaArray, delegateSignature)

		await registerTx.wait()

		const { '0': schemaId } = await getEvetnArgs(
			registerTx.hash,
			sp,
			'SchemaRegistered',
			[0]
		)

		const schemaIdNumber: number = Number(schemaId)

		return {
			sp,
			registry,
			certify,
			ethKipu,
			tono,
			julio,
			schemaId: schemaIdNumber
		}
	}

	describe('Registrations', () => {
		describe('Validations', () => {
			it('Should be reverted if another account authorizes an account to create a profile.', async () => {
				const { registry, certify, ethKipu } = await loadFixture(deployFixture)

				const account: string = ethKipu.address
				const status: boolean = true

				await expect(
					registry.connect(ethKipu).authorizeProfileCreation(account, status)
				)
					.to.be.revertedWithCustomError(
						registry,
						'AccessControlUnauthorizedAccount'
					)
					.withArgs(ethKipu.address, ethers.id('CERTIFY_OWNER'))
			})
			it('Should be reverted if an account creates a profile again without being authorized again.', async () => {
				const { sp, registry, certify, ethKipu, tono, julio, schemaId } =
					await loadFixture(deployFixture)

				await registry
					.connect(certify)
					.authorizeProfileCreation(ethKipu.address, true)

				const ethKipuNonce: number = await ethers.provider.getTransactionCount(
					ethKipu.address
				)

				const ethKipuAddressBytes: BytesLike = ethers.zeroPadBytes(
					ethKipu.address,
					32
				)

				const recipients: BytesLike[] = [ethKipuAddressBytes]

				const attestation: Attestation = {
					schemaId,
					linkedAttestationId: 0,
					attestTimestamp: 0,
					revokeTimestamp: 0,
					attester: ethKipu.address,
					validUntil: 0,
					dataLocation: DataLocation.ONCHAIN,
					revoked: false,
					recipients,
					data: '0x'
				}

				const attestationArray: unknown[] = [
					attestation.schemaId,
					attestation.linkedAttestationId,
					attestation.attestTimestamp,
					attestation.revokeTimestamp,
					attestation.attester,
					attestation.validUntil,
					attestation.dataLocation,
					attestation.revoked,
					attestation.recipients,
					attestation.data
				]

				const resolverFeesETH: bigint = ethers.parseEther('1')
				const indexingKey: string = 'Nothing'
				const delegateSignature: BytesLike = '0x'

				const ethKipuProfile: Profile = {
					nonce: ethKipuNonce,
					name: 'ETHKipu',
					members: [tono.address, julio.address]
				}

				const ethKipuProfileArray: unknown[] = Object.values(ethKipuProfile)

				const extraData: BytesLike = abiCoder.encode(
					CREATE_PROFILE_TYPES,
					ethKipuProfileArray
				)

				await sp
					.connect(ethKipu)
					[
						'attest((uint64,uint64,uint64,uint64,address,uint64,uint8,bool,bytes[],bytes),uint256,string,bytes,bytes)'
					](attestationArray, resolverFeesETH, indexingKey, delegateSignature, extraData, {
						value: resolverFeesETH
					})

				await expect(
					sp
						.connect(ethKipu)
						[
							'attest((uint64,uint64,uint64,uint64,address,uint64,uint8,bool,bytes[],bytes),uint256,string,bytes,bytes)'
						](attestationArray, resolverFeesETH, indexingKey, delegateSignature, extraData, {
							value: resolverFeesETH
						})
				)
					.to.be.revertedWithCustomError(registry, 'UNAUTHORIZED')
					.withArgs()
			})
		})

		describe('Authorizations', () => {
			it('Should authorize an account to create a profile', async () => {
				const { registry, certify, ethKipu } = await loadFixture(deployFixture)

				const account: string = ethKipu.address
				const status: boolean = true

				await registry
					.connect(certify)
					.authorizeProfileCreation(account, status)

				const newStatus: boolean =
					await registry.isAuthorizedToCreateProfile(account)

				expect(newStatus).to.equal(status)
			})
		})

		describe('Profile Creation', () => {
			it('Should receive the right amount of ether in Registry contract', async () => {
				const { sp, registry, certify, ethKipu, tono, julio, schemaId } =
					await loadFixture(deployFixture)

				await registry
					.connect(certify)
					.authorizeProfileCreation(ethKipu.address, true)

				const ethKipuNonce: number = await ethers.provider.getTransactionCount(
					ethKipu.address
				)

				const ethKipuAddressBytes: BytesLike = ethers.zeroPadBytes(
					ethKipu.address,
					32
				)

				const recipients: BytesLike[] = [ethKipuAddressBytes]

				const attestation: Attestation = {
					schemaId,
					linkedAttestationId: 0,
					attestTimestamp: 0,
					revokeTimestamp: 0,
					attester: ethKipu.address,
					validUntil: 0,
					dataLocation: DataLocation.ONCHAIN,
					revoked: false,
					recipients,
					data: '0x'
				}

				const attestationArray: unknown[] = [
					attestation.schemaId,
					attestation.linkedAttestationId,
					attestation.attestTimestamp,
					attestation.revokeTimestamp,
					attestation.attester,
					attestation.validUntil,
					attestation.dataLocation,
					attestation.revoked,
					attestation.recipients,
					attestation.data
				]

				const resolverFeesETH: bigint = ethers.parseEther('1')
				const indexingKey: string = 'Nothing'
				const delegateSignature: BytesLike = '0x'

				const ethKipuProfile: Profile = {
					nonce: ethKipuNonce,
					name: 'ETHKipu',
					members: [tono.address, julio.address]
				}

				const ethKipuProfileArray: unknown[] = Object.values(ethKipuProfile)

				const extraData: BytesLike = abiCoder.encode(
					CREATE_PROFILE_TYPES,
					ethKipuProfileArray
				)

				await expect(
					sp
						.connect(ethKipu)
						[
							'attest((uint64,uint64,uint64,uint64,address,uint64,uint8,bool,bytes[],bytes),uint256,string,bytes,bytes)'
						](attestationArray, resolverFeesETH, indexingKey, delegateSignature, extraData, {
							value: resolverFeesETH
						})
				).to.changeEtherBalances(
					[ethKipu, registry],
					[-resolverFeesETH, resolverFeesETH]
				)
			})
			// TODO: add test with gasless transaction
			it.skip('Should create a profile thoght gasless transaction', async () => {
				const { sp, registry, certify, ethKipu, tono, julio, schemaId } =
					await loadFixture(deployFixture)

				await registry
					.connect(certify)
					.authorizeProfileCreation(certify.address, true)

				const ethKipuNonce: number = await ethers.provider.getTransactionCount(
					ethKipu.address
				)

				const ethKipuAddressBytes: BytesLike = ethers.zeroPadBytes(
					ethKipu.address,
					32
				)

				const recipients: BytesLike[] = [ethKipuAddressBytes]

				const attestation: Attestation = {
					schemaId,
					linkedAttestationId: 0,
					attestTimestamp: 0,
					revokeTimestamp: 0,
					attester: ethKipu.address,
					validUntil: 0,
					dataLocation: DataLocation.ONCHAIN,
					revoked: false,
					recipients,
					data: '0x'
				}

				const attestationArray: unknown[] = [
					attestation.schemaId,
					attestation.linkedAttestationId,
					attestation.attestTimestamp,
					attestation.revokeTimestamp,
					attestation.attester,
					attestation.validUntil,
					attestation.dataLocation,
					attestation.revoked,
					attestation.recipients,
					attestation.data
				]

				const resolverFeesETH: bigint = ethers.parseEther('1')
				const indexingKey: string = 'Nothing'

				const delegatedAttestHash: BytesLike = await sp
					.connect(ethKipu)
					.getDelegatedAttestHash(attestationArray)

				const delegateSignature: string =
					await ethKipu.signMessage(delegatedAttestHash)

				const ethKipuProfile: Profile = {
					nonce: ethKipuNonce,
					name: 'ETHKipu',
					owner: ethKipu.address,
					members: [tono.address, julio.address]
				}

				const ethKipuProfileArray: unknown[] = Object.values(ethKipuProfile)

				const extraData: BytesLike = abiCoder.encode(
					CREATE_PROFILE_TYPES,
					ethKipuProfileArray
				)

				const attestTx = await sp
					.connect(certify)
					[
						'attest((uint64,uint64,uint64,uint64,address,uint64,uint8,bool,bytes[],bytes),uint256,string,bytes,bytes)'
					](attestationArray, resolverFeesETH, indexingKey, delegateSignature, extraData, {
						value: resolverFeesETH
					})

				await attestTx.wait()

				const { '0': attestationId } = await getEvetnArgs(
					attestTx.hash,
					sp,
					'AttestationMade',
					[0]
				)

				const attestationArrayObtained: any[] =
					await sp.getAttestation(attestationId)

				const attestationObtained: Attestation =
					attestationContractToAttestation(attestationArrayObtained)

				const { '0': profileId } = await getEvetnArgs(
					attestTx.hash,
					registry,
					'ProfileCreated',
					[0]
				)

				const profileArrayObtained: any[] =
					await registry.getProfileById(profileId)

				const profileObtained: Profile =
					profileContractToProfile(profileArrayObtained)

				expect(profileObtained.owner)
					.to.equal(attestationObtained.attester)
					.to.equal(ethKipu.address)
			})
			it('Should profile owner be the same as the attester', async () => {
				const { sp, registry, certify, ethKipu, tono, julio, schemaId } =
					await loadFixture(deployFixture)

				await registry
					.connect(certify)
					.authorizeProfileCreation(ethKipu.address, true)

				const ethKipuNonce: number = await ethers.provider.getTransactionCount(
					ethKipu.address
				)

				const ethKipuAddressBytes: BytesLike = ethers.zeroPadBytes(
					ethKipu.address,
					32
				)

				const recipients: BytesLike[] = [ethKipuAddressBytes]

				const attestation: Attestation = {
					schemaId,
					linkedAttestationId: 0,
					attestTimestamp: 0,
					revokeTimestamp: 0,
					attester: ethKipu.address,
					validUntil: 0,
					dataLocation: DataLocation.ONCHAIN,
					revoked: false,
					recipients,
					data: '0x'
				}

				const attestationArray: unknown[] = [
					attestation.schemaId,
					attestation.linkedAttestationId,
					attestation.attestTimestamp,
					attestation.revokeTimestamp,
					attestation.attester,
					attestation.validUntil,
					attestation.dataLocation,
					attestation.revoked,
					attestation.recipients,
					attestation.data
				]

				const resolverFeesETH: bigint = ethers.parseEther('1')
				const indexingKey: string = 'Nothing'
				const delegateSignature: BytesLike = '0x'

				const ethKipuProfile: Profile = {
					nonce: ethKipuNonce,
					name: 'ETHKipu',
					members: [tono.address, julio.address]
				}

				const ethKipuProfileArray: unknown[] = Object.values(ethKipuProfile)

				const extraData: BytesLike = abiCoder.encode(
					CREATE_PROFILE_TYPES,
					ethKipuProfileArray
				)

				const attestTx = await sp
					.connect(ethKipu)
					[
						'attest((uint64,uint64,uint64,uint64,address,uint64,uint8,bool,bytes[],bytes),uint256,string,bytes,bytes)'
					](attestationArray, resolverFeesETH, indexingKey, delegateSignature, extraData, {
						value: resolverFeesETH
					})

				await attestTx.wait()

				const { '0': attestationId } = await getEvetnArgs(
					attestTx.hash,
					sp,
					'AttestationMade',
					[0]
				)

				const attestationArrayObtained: any[] =
					await sp.getAttestation(attestationId)

				const attestationObtained: Attestation =
					attestationContractToAttestation(attestationArrayObtained)

				const { '1': profileId } = await getEvetnArgs(
					attestTx.hash,
					registry,
					'ProfileCreated',
					[1]
				)

				const profileArrayObtained: any[] =
					await registry.getProfileById(profileId)

				const profileObtained: Profile =
					profileContractToProfile(profileArrayObtained)

				expect(profileObtained.owner).to.equal(attestationObtained.attester)
			})
		})

		describe('Events', () => {
			it('Should emit an event when a new account is authorized to create a profile', async () => {
				const { registry, certify, ethKipu } = await loadFixture(deployFixture)

				const account: string = ethKipu.address
				const status: boolean = true

				await expect(
					registry.connect(certify).authorizeProfileCreation(account, status)
				)
					.to.emit(registry, 'AccountAuthorizedToCreateProfile')
					.withArgs(certify.address, account, status)
			})
		})
	})
})
