import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expect } from 'chai'
import { AbiCoder, BytesLike, Contract, ZeroAddress } from 'ethers'
import hre, { ethers, upgrades } from 'hardhat'
import { string } from 'hardhat/internal/core/params/argumentTypes'

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

	describe('Profile Creation', () => {
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
				.withArgs(educateth.address, ethers.id('CERTIFY_OWNER'))
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
		it('Should revert if an account tries to add credits to itself', async () => {
			await expect(
				registry.connect(educateth).addCreditsToAccount(educateth.address, 1000)
			)
				.to.be.revertedWithCustomError(
					registry,
					'AccessControlUnauthorizedAccount'
				)
				.withArgs(educateth.address, ethers.id('seal_OWNER'))
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
	})

	it.skip('Should authorize and add credits to an account', async () => {
		const { registry, educateth } = await loadFixture(deployFixture)

		const authorizeProfileCreationData = registry.interface.encodeFunctionData(
			'authorizeProfileCreation',
			[educateth.address, true]
		)

		const addCreditsToAccountData = registry.interface.encodeFunctionData(
			'addCreditsToAccount',
			[educateth.address, 1000]
		)

		const multicallTx = await registry
			.connect(seal)
			.multicall([authorizeProfileCreationData, addCreditsToAccountData])

		await multicallTx.wait()

		const updatedStatus: boolean = await registry.isAuthorizedToCreateProfile(
			educateth.address
		)

		const updatedCredits: bigint = await registry.getCreditsByAccount(
			educateth.address
		)

		expect(true).to.equal(updatedStatus)
		expect(1000).to.equal(updatedCredits)
	})

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

			const educatethNonce: number = await ethers.provider.getTransactionCount(
				educateth.address
			)

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
