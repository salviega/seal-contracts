import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expect } from 'chai'
import { AbiCoder, BytesLike, Contract } from 'ethers'
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
		const [seal, educateth, julio, oscar, santiago] =
			await hre.ethers.getSigners()

		const SP = await hre.ethers.getContractFactory('SP')
		const sp = await upgrades.deployProxy(SP, [1, 1])

		const Registry = await hre.ethers.getContractFactory('Registry')
		const registry = await upgrades.deployProxy(Registry, [
			seal.address,
			await sp.getAddress()
		])

		const organizationSchema: Schema = {
			registrant: seal.address,
			revocale: false,
			dataLocation: DataLocation.ONCHAIN,
			maxValidFor: 0,
			hook: await registry.getAddress(),
			timestamp: 0,
			data: 'blah blah blah...'
		}

		const organizationSchemaArray: unknown[] = Object.values(organizationSchema)
		const delegateSignature: BytesLike = '0x'

		const registerTx = await sp
			.connect(seal)
			.register(organizationSchemaArray, delegateSignature)

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
			seal,
			educateth,
			julio,
			oscar,
			santiago,
			schemaId: schemaIdNumber
		}
	}

	describe('Registrations', () => {
		describe.skip('Validations', () => {
			it('Should be reverted if another account authorizes an account to create a profile.', async () => {
				const { registry, seal, educateth } = await loadFixture(deployFixture)

				const account: string = educateth.address
				const status: boolean = true

				await expect(
					registry.connect(educateth).authorizeProfileCreation(account, status)
				)
					.to.be.revertedWithCustomError(
						registry,
						'AccessControlUnauthorizedAccount'
					)
					.withArgs(educateth.address, ethers.id('seal_OWNER'))
			})
			it.skip('Should be reverted if an account creates a profile again without being authorized again.', async () => {
				const {
					sp,
					registry,
					seal,
					educateth,
					julio,
					oscar,
					santiago,
					schemaId
				} = await loadFixture(deployFixture)

				await registry
					.connect(seal)
					.authorizeProfileCreation(educateth.address, true)

				const educatethNonce: number =
					await ethers.provider.getTransactionCount(educateth.address)

				const educatethAddressBytes: BytesLike = ethers.zeroPadBytes(
					educateth.address,
					32
				)

				const recipients: BytesLike[] = [educatethAddressBytes]

				const attestation: Attestation = {
					schemaId,
					linkedAttestationId: 0,
					attestTimestamp: 0,
					revokeTimestamp: 0,
					attester: educateth.address,
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

				const educatethProfile: Profile = {
					nonce: educatethNonce,
					name: 'educateth',
					members: [santiago.address, oscar.address, julio.address]
				}

				const educatethProfileArray: unknown[] = Object.values(educatethProfile)

				const extraData: BytesLike = abiCoder.encode(
					CREATE_PROFILE_TYPES,
					educatethProfileArray
				)

				await sp
					.connect(educateth)
					[
						'attest((uint64,uint64,uint64,uint64,address,uint64,uint8,bool,bytes[],bytes),uint256,string,bytes,bytes)'
					](attestationArray, resolverFeesETH, indexingKey, delegateSignature, extraData, {
						value: resolverFeesETH
					})

				await expect(
					sp
						.connect(educateth)
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
			let sp: Contract,
				registry: Contract,
				seal: HardhatEthersSigner,
				educateth: HardhatEthersSigner,
				julio: HardhatEthersSigner,
				oscar: HardhatEthersSigner,
				santiago: HardhatEthersSigner,
				schemaId: number

			this.beforeAll(async () => {
				const fixture = await loadFixture(deployFixture)

				sp = fixture.sp
				registry = fixture.registry
				seal = fixture.seal
				educateth = fixture.educateth
				julio = fixture.julio
				oscar = fixture.oscar
				santiago = fixture.santiago
				schemaId = fixture.schemaId
			})

			it('Should authorize an account to create a profile', async () => {
				const { registry, educateth } = await loadFixture(deployFixture)

				const account: string = educateth.address
				const status: boolean = true

				await registry.connect(seal).authorizeProfileCreation(account, status)

				const newStatus: boolean =
					await registry.isAuthorizedToCreateProfile(account)

				expect(newStatus).to.equal(status)
			})

			it('Should deauthorize an account to create a profile', async () => {
				const account: string = educateth.address
				const status: boolean = false

				await registry.connect(seal).authorizeProfileCreation(account, status)

				const newStatus: boolean =
					await registry.isAuthorizedToCreateProfile(account)

				expect(newStatus).to.equal(status)
			})

			it('Should add credits to an account', async () => {
				const account: string = educateth.address
				const credits: number = 1000

				await registry.connect(seal).addCreditsToAccount(account, credits)

				const newCredits: bigint = await registry.getCreditsByAccount(account)

				expect(newCredits).to.equal(credits)
			})

			it('Should authorize and add credits to an account', async () => {
				const { registry, educateth } = await loadFixture(deployFixture)

				const account: string = educateth.address
				const status: boolean = true
				const credits: number = 1000

				const authorizeProfileCreationData =
					registry.interface.encodeFunctionData('authorizeProfileCreation', [
						account,
						status
					])

				const addCreditsToAccountData = registry.interface.encodeFunctionData(
					'addCreditsToAccount',
					[account, credits]
				)

				const multicallTx = await registry
					.connect(seal)
					.multicall([authorizeProfileCreationData, addCreditsToAccountData])

				await multicallTx.wait()

				const newStatus: boolean =
					await registry.isAuthorizedToCreateProfile(account)
				const newCredits: bigint = await registry.getCreditsByAccount(account)

				expect(newStatus).to.equal(status)
				expect(newCredits).to.equal(credits)
			})
		})

		describe.skip('Profile Creation', () => {
			it('Should receive the right amount of ether in Registry contract', async () => {
				const {
					sp,
					registry,
					seal,
					educateth,
					julio,
					oscar,
					santiago,
					schemaId
				} = await loadFixture(deployFixture)

				await registry
					.connect(seal)
					.authorizeProfileCreation(educateth.address, true)

				const educatethNonce: number =
					await ethers.provider.getTransactionCount(educateth.address)

				const educatethAddressBytes: BytesLike = ethers.zeroPadBytes(
					educateth.address,
					32
				)

				const recipients: BytesLike[] = [educatethAddressBytes]

				const attestation: Attestation = {
					schemaId,
					linkedAttestationId: 0,
					attestTimestamp: 0,
					revokeTimestamp: 0,
					attester: educateth.address,
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

				const educatethProfile: Profile = {
					nonce: educatethNonce,
					name: 'educateth',
					members: [ddres, oscar.asantiagos, julio.address]
				}

				const educatethProfileArray: unknown[] = Object.values(educatethProfile)

				const extraData: BytesLike = abiCoder.encode(
					CREATE_PROFILE_TYPES,
					educatethProfileArray
				)

				await expect(
					sp
						.connect(educateth)
						[
							'attest((uint64,uint64,uint64,uint64,address,uint64,uint8,bool,bytes[],bytes),uint256,string,bytes,bytes)'
						](attestationArray, resolverFeesETH, indexingKey, delegateSignature, extraData, {
							value: resolverFeesETH
						})
				).to.changeEtherBalances(
					[educateth, registry],
					[-resolverFeesETH, resolverFeesETH]
				)
			})
			// TODO: add test with gasless transaction
			it.skip('Should create a profile thoght gasless transaction', async () => {
				const {
					sp,
					registry,
					seal,
					educateth,
					julio,
					oscar,
					santiago,
					schemaId
				} = await loadFixture(deployFixture)

				await registry
					.connect(seal)
					.authorizeProfileCreation(seal.address, true)

				const educatethNonce: number =
					await ethers.provider.getTransactionCount(educateth.address)

				const educatethAddressBytes: BytesLike = ethers.zeroPadBytes(
					educateth.address,
					32
				)

				const recipients: BytesLike[] = [educatethAddressBytes]

				const attestation: Attestation = {
					schemaId,
					linkedAttestationId: 0,
					attestTimestamp: 0,
					revokeTimestamp: 0,
					attester: educateth.address,
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
					.connect(educateth)
					.getDelegatedAttestHash(attestationArray)

				const delegateSignature: string =
					await educateth.signMessage(delegatedAttestHash)

				const educatethProfile: Profile = {
					nonce: educatethNonce,
					name: 'educateth',
					owner: educateth.address,
					members: [ddres, oscar.asantiagos, julio.address]
				}

				const educatethProfileArray: unknown[] = Object.values(educatethProfile)

				const extraData: BytesLike = abiCoder.encode(
					CREATE_PROFILE_TYPES,
					educatethProfileArray
				)

				const attestTx = await sp
					.connect(seal)
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
					.to.equal(educateth.address)
			})
			it('Should profile owner be the same as the attester', async () => {
				const {
					sp,
					registry,
					seal,
					educateth,
					julio,
					oscar,
					santiago,
					schemaId
				} = await loadFixture(deployFixture)

				await registry
					.connect(seal)
					.authorizeProfileCreation(educateth.address, true)

				const educatethNonce: number =
					await ethers.provider.getTransactionCount(educateth.address)

				const educatethAddressBytes: BytesLike = ethers.zeroPadBytes(
					educateth.address,
					32
				)

				const recipients: BytesLike[] = [educatethAddressBytes]

				const attestation: Attestation = {
					schemaId,
					linkedAttestationId: 0,
					attestTimestamp: 0,
					revokeTimestamp: 0,
					attester: educateth.address,
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

				const educatethProfile: Profile = {
					nonce: educatethNonce,
					name: 'educateth',
					members: [ddres, oscar.asantiagos, julio.address]
				}

				const educatethProfileArray: unknown[] = Object.values(educatethProfile)

				const extraData: BytesLike = abiCoder.encode(
					CREATE_PROFILE_TYPES,
					educatethProfileArray
				)

				const attestTx = await sp
					.connect(educateth)
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

		describe.skip('Events', () => {
			it('Should emit an event when a new account is authorized to create a profile', async () => {
				const { registry, seal, educateth } = await loadFixture(deployFixture)

				const account: string = educateth.address
				const status: boolean = true

				await expect(
					registry.connect(seal).authorizeProfileCreation(account, status)
				)
					.to.emit(registry, 'AccountAuthorizedToCreateProfile')
					.withArgs(account, status)
			})
		})
	})
})
