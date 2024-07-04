import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expect } from 'chai'
import { AbiCoder, BytesLike, Contract, ZeroAddress } from 'ethers'
import hre, { ethers, upgrades } from 'hardhat'
import { string } from 'hardhat/internal/core/params/argumentTypes'

import { CREATE_PROFILE_TYPES } from '../constants/constants'
import { DataLocation } from '../constants/enums'
import { executeMulticall } from '../helpers/execute-multicall'
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

	let sp: Contract,
		registry: Contract,
		seal: HardhatEthersSigner,
		educateth: HardhatEthersSigner,
		julio: HardhatEthersSigner,
		oscar: HardhatEthersSigner,
		santiago: HardhatEthersSigner,
		schemaId: number

	describe('Authorization', () => {
		before(async () => {
			const fixture = await loadFixture(deployFixture)
			registry = fixture.registry
			seal = fixture.seal
			educateth = fixture.educateth
		})

		it('Should revert if an account tries to authorize itself', async () => {
			await expect(
				registry
					.connect(educateth)
					.authorizeProfileCreation(educateth.address, true)
			)
				.to.be.revertedWithCustomError(
					registry,
					'AccessControlUnauthorizedAccount'
				)
				.withArgs(educateth.address, ethers.id('SEAL_OWNER'))
		})

		it('Should revert if try to authorize a zero account', async () => {
			await expect(
				registry.connect(seal).authorizeProfileCreation(ZeroAddress, true)
			)
				.to.be.revertedWithCustomError(registry, 'ZERO_ADDRESS')
				.withArgs()
		})

		it('Should revert if try to deauthorize a deauthorized account', async () => {
			await expect(
				registry
					.connect(seal)
					.authorizeProfileCreation(educateth.address, false)
			)
				.to.be.revertedWithCustomError(registry, 'SAME_STATUS')
				.withArgs()
		})

		it('Should authorize an account', async () => {
			const authorizeProfileCreationTx = await registry
				.connect(seal)
				.authorizeProfileCreation(educateth.address, true)
			await authorizeProfileCreationTx.wait()

			const updatedStatus = await registry.isAuthorizedToCreateProfile(
				educateth.address
			)
			expect(true).to.equal(updatedStatus)
		})

		it('Should revert if try the authorize an already authorized account', async () => {
			await expect(
				registry.connect(seal).authorizeProfileCreation(educateth.address, true)
			)
				.to.be.revertedWithCustomError(registry, 'SAME_STATUS')
				.withArgs()
		})

		it('Should deauthorize an account', async () => {
			await registry
				.connect(seal)
				.authorizeProfileCreation(educateth.address, false)

			const updatedStatus = await registry.isAuthorizedToCreateProfile(
				educateth.address
			)
			expect(false).to.equal(updatedStatus)
		})

		it('Should emit an event when an account is authorized', async () => {
			await expect(
				registry.connect(seal).authorizeProfileCreation(educateth.address, true)
			)
				.to.emit(registry, 'AccountAuthorizedToCreateProfile')
				.withArgs(educateth.address, true)
		})
	})

	describe('Credits', () => {
		before(async () => {
			const fixture = await loadFixture(deployFixture)
			registry = fixture.registry
			seal = fixture.seal
			educateth = fixture.educateth
		})

		it('Should revert if an account tries to add credits to itself', async () => {
			await expect(
				registry.connect(educateth).addCreditsToAccount(educateth.address, 1000)
			)
				.to.be.revertedWithCustomError(
					registry,
					'AccessControlUnauthorizedAccount'
				)
				.withArgs(educateth.address, ethers.id('SEAL_OWNER'))
		})

		it('Should revert if an account tries to add credits to a zero account', async () => {
			await expect(
				registry.connect(seal).addCreditsToAccount(ZeroAddress, 1000)
			)
				.to.be.revertedWithCustomError(registry, 'ZERO_ADDRESS')
				.withArgs()
		})

		it('Should revert if the amount of credits to add is zero', async () => {
			await expect(
				registry.connect(seal).addCreditsToAccount(educateth.address, 0)
			)
				.to.be.revertedWithCustomError(registry, 'INVALID_AMOUNT')
				.withArgs()
		})

		it('Should add credits to an account', async () => {
			await registry.connect(seal).addCreditsToAccount(educateth.address, 1000)

			const updatedCredits: bigint = await registry.getCreditsByAccount(
				educateth.address
			)

			expect(1000).to.equal(updatedCredits)
		})

		it('Should emit an event when credits are added to an account', async () => {
			await expect(
				registry.connect(seal).addCreditsToAccount(educateth.address, 1000)
			)
				.to.emit(registry, 'CreditsAddedToAccount')
				.withArgs(educateth.address, 1000)
		})
	})

	describe('Multicall', () => {
		before(async () => {
			const fixture = await loadFixture(deployFixture)
			registry = fixture.registry
			seal = fixture.seal
			educateth = fixture.educateth
		})

		it('Should authorize and add credits to an account', async () => {
			await executeMulticall(registry, seal, [
				{ name: 'authorizeProfileCreation', params: [educateth.address, true] },
				{ name: 'addCreditsToAccount', params: [educateth.address, 1000] }
			])

			const updatedStatus: boolean = await registry.isAuthorizedToCreateProfile(
				educateth.address
			)

			const updatedCredits: bigint = await registry.getCreditsByAccount(
				educateth.address
			)

			expect(true).to.equal(updatedStatus)
			expect(1000).to.equal(updatedCredits)
		})
	})

	describe('Create Profile', () => {
		let attestationArray: any[], profileArray: unknown[]

		const resolverFeesETH: bigint = ethers.parseEther('0')
		const indexingKey: string = 'Nothing'
		const delegateSignature: BytesLike = '0x'

		before(async () => {
			const fixture = await loadFixture(deployFixture)
			sp = fixture.sp
			registry = fixture.registry
			seal = fixture.seal
			educateth = fixture.educateth
			julio = fixture.julio
			oscar = fixture.oscar
			santiago = fixture.santiago
			schemaId = fixture.schemaId

			await executeMulticall(registry, seal, [
				{ name: 'authorizeProfileCreation', params: [educateth.address, true] },
				{ name: 'addCreditsToAccount', params: [educateth.address, 1000] }
			])

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

			attestationArray = [
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

			const nonce: number = await ethers.provider.getTransactionCount(
				educateth.address
			)

			const educatethProfile: Profile = {
				nonce,
				name: 'EducatETH',
				managers: [julio.address, oscar.address, santiago.address]
			}

			profileArray = Object.values(educatethProfile)
		})

		describe('Authorization', async () => {
			beforeEach(async () => {
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

			it('Should revert if try to create a profile without authorization', async () => {
				const extraData: BytesLike = abiCoder.encode(
					CREATE_PROFILE_TYPES,
					profileArray
				)

				const addCreditsToAccountTx = await registry
					.connect(seal)
					.addCreditsToAccount(educateth.address, 1000)

				await addCreditsToAccountTx.wait()

				await expect(
					sp
						.connect(educateth)
						[
							'attest((uint64,uint64,uint64,uint64,address,uint64,uint8,bool,bytes[],bytes),uint256,string,bytes,bytes)'
						](attestationArray, resolverFeesETH, indexingKey, delegateSignature, extraData, {
							value: resolverFeesETH
						})
				).to.be.revertedWithCustomError(registry, 'UNAUTHORIZED')
			})

			it('Should revert if try to create a profile with zero credits', async () => {
				const extraData: BytesLike = abiCoder.encode(
					CREATE_PROFILE_TYPES,
					profileArray
				)

				const authorizeProfileCreationTx = await registry
					.connect(seal)
					.authorizeProfileCreation(educateth.address, true)

				await authorizeProfileCreationTx.wait()

				await expect(
					sp
						.connect(educateth)
						[
							'attest((uint64,uint64,uint64,uint64,address,uint64,uint8,bool,bytes[],bytes),uint256,string,bytes,bytes)'
						](attestationArray, resolverFeesETH, indexingKey, delegateSignature, extraData, {
							value: resolverFeesETH
						})
				).to.be.revertedWithCustomError(registry, 'NOT_HAVE_CEDRITS')
			})
		})

		it('Should revert if account tries to create a profile', async () => {
			await expect(
				registry.connect(seal).didReceiveAttestation(ZeroAddress, 0, 0, '0x')
			)
				.to.be.revertedWithCustomError(registry, 'NOT_ATTESTATION_PROVIDER')
				.withArgs()
		})

		it('Should revert if try to create a profile with zeros managers)', async () => {
			profileArray[2] = [ZeroAddress, ZeroAddress, ZeroAddress]

			const extraData: BytesLike = abiCoder.encode(
				CREATE_PROFILE_TYPES,
				profileArray
			)

			await expect(
				sp
					.connect(educateth)
					[
						'attest((uint64,uint64,uint64,uint64,address,uint64,uint8,bool,bytes[],bytes),uint256,string,bytes,bytes)'
					](attestationArray, resolverFeesETH, indexingKey, delegateSignature, extraData, {
						value: resolverFeesETH
					})
			).to.be.revertedWithCustomError(registry, 'ZERO_ADDRESS')
		})

		it('Should emit an event when a profile is created', async () => {
			profileArray[2] = [julio.address, oscar.address, santiago.address]

			const extraData: BytesLike = abiCoder.encode(
				CREATE_PROFILE_TYPES,
				profileArray
			)

			const attestTx = await sp
				.connect(educateth)
				[
					'attest((uint64,uint64,uint64,uint64,address,uint64,uint8,bool,bytes[],bytes),uint256,string,bytes,bytes)'
				](attestationArray, resolverFeesETH, indexingKey, delegateSignature, extraData, {
					value: resolverFeesETH
				})

			await attestTx.wait()

			expect(attestTx).emit(registry, 'ProfileCreated')

			const [attestationId, profileId, nonce, name, credits, owner, anchor] =
				await getEvetnArgs(attestTx.hash, registry, 'ProfileCreated', 'all')

			const profile: Profile = {
				attestationId,
				nonce,
				name,
				credits,
				owner,
				anchor
			}

			const updatedProfile = await registry.getProfileById(profileId)
			const mappedProfile: Profile = profileContractToProfile(updatedProfile)

			expect(profile).to.deep.equal(mappedProfile)
		})
	})
})
