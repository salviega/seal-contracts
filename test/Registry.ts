import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expect } from 'chai'
import { AbiCoder, BytesLike, Contract, ZeroAddress } from 'ethers'
import hre, { ethers, upgrades } from 'hardhat'

import { CREATE_PROFILE_TYPES } from '../constants/constants'
import { DataLocation } from '../constants/enums'
import { executeMulticall } from '../helpers/execute-multicall'
import { getEvetnArgs } from '../helpers/get-events-args'
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

	describe('Deployment', async () => {
		before(async () => {
			const fixture = await loadFixture(deployFixture)
			sp = fixture.sp
			registry = fixture.registry
			seal = fixture.seal
			educateth = fixture.educateth
		})

		it('Should SP contract be attestation provider', async () => {
			const attestationProvider: string =
				await registry.getAttestationProvider()

			expect(await sp.getAddress()).to.equal(attestationProvider)
		})

		it('Should Seal be the owner of the Registry', async () => {
			const rol: string = await registry.SEAL_OWNER()
			const hasRol: boolean = await registry.hasRole(rol, seal.address)
			expect(true).to.equal(hasRol)
		})
	})

	describe('Update Attestation Provider', () => {
		before(async () => {
			const fixture = await loadFixture(deployFixture)
			registry = fixture.registry
			seal = fixture.seal
			educateth = fixture.educateth
		})

		it('Should revert if an account tries to update the attestation provider', async () => {
			await expect(
				registry.connect(educateth).updateAttestationProvider(educateth.address)
			)
				.to.be.revertedWithCustomError(
					registry,
					'AccessControlUnauthorizedAccount'
				)
				.withArgs(educateth.address, ethers.id('SEAL_OWNER'))
		})

		it('Should revert if try to update the attestation provider with a zero account', async () => {
			await expect(
				registry.connect(seal).updateAttestationProvider(ZeroAddress)
			)
				.to.be.revertedWithCustomError(registry, 'ZERO_ADDRESS')
				.withArgs()
		})

		it('Should revert if try to update the attestation provider with the Register contract', async () => {
			await expect(
				registry
					.connect(seal)
					.updateAttestationProvider(await registry.getAddress())
			)
				.to.be.revertedWithCustomError(registry, 'SAME_CONTRACT')
				.withArgs()
		})

		it('Should revert if try to update the same attestation provider', async () => {
			await expect(
				registry.connect(seal).updateAttestationProvider(await sp.getAddress())
			)
				.to.be.revertedWithCustomError(registry, 'SAME_PROVIDER')
				.withArgs()
		})

		it('Should update the attestation provider', async () => {
			const updateAttestationProviderTx = await registry
				.connect(seal)
				.updateAttestationProvider(educateth.address)

			await updateAttestationProviderTx.wait()

			const attestationProvider: string = await registry.attestationProvider()

			expect(educateth.address).to.equal(attestationProvider)
		})

		it('Should emit an event when the attestation provider is updated', async () => {
			const spAddress: string = await sp.getAddress()

			await expect(registry.connect(seal).updateAttestationProvider(spAddress))
				.to.emit(registry, 'AttestationProviderUpdated')
				.withArgs(spAddress)
		})
	})

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

		let profileId: BytesLike

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
			profileArray[2] = [julio.address, oscar.address]

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

			const [attestationId, id, nonce, name, credits, owner, anchor] =
				await getEvetnArgs(attestTx.hash, registry, 'ProfileCreated', 'all')

			const profile: Profile = {
				attestationId,
				nonce,
				name,
				credits,
				owner,
				anchor
			}

			const updatedProfile = await registry.getProfileById(id)
			const mappedProfile: Profile = profileContractToProfile(updatedProfile)

			profileId = id

			expect(profile).to.deep.equal(mappedProfile)
		})

		describe('Managers', async () => {
			describe('Is', async () => {
				it('Should return true if the account is the owner', async () => {
					const isOwner: boolean = await registry.isOwnerOfProfile(
						profileId,
						educateth.address
					)

					expect(true).to.equal(isOwner)
				})

				it('Should return false if the account is not the owner', async () => {
					const isOwner: boolean = await registry.isOwnerOfProfile(
						profileId,
						julio.address
					)

					expect(false).to.equal(isOwner)
				})

				it('Should return true if the account is a manager', async () => {
					const isManager: boolean = await registry.isMemberOfProfile(
						profileId,
						julio.address
					)

					expect(true).to.equal(isManager)
				})

				it('Should return false if the account is not a manager', async () => {
					const isManager: boolean = await registry.isMemberOfProfile(
						profileId,
						santiago.address
					)

					expect(false).to.equal(isManager)
				})

				it('Should return true if the account is a manager or the owner', async () => {
					const isEducatethManagerOrOwner: boolean =
						await registry.isOwnerOfProfile(profileId, educateth.address)

					const isJulioManagerOrOwner: boolean =
						await registry.isOwnerOrMemberOfProfile(profileId, julio.address)

					expect(true).to.equal(isJulioManagerOrOwner)
					expect(true).to.equal(isEducatethManagerOrOwner)
				})

				it('Should return false if the account is not a manager or the owner', async () => {
					const isSantiagoManagerOrOwner: boolean =
						await registry.isOwnerOrMemberOfProfile(profileId, santiago.address)

					expect(false).to.equal(isSantiagoManagerOrOwner)
				})
			})

			describe('Add', async () => {
				it('Should revert if an non-owner account tries to add a manager', async () => {
					await expect(
						registry
							.connect(julio)
							.addManagersToProfile(profileId, [santiago.address])
					)
						.to.be.revertedWithCustomError(registry, 'UNAUTHORIZED')
						.withArgs()
				})

				it('Should revert if try not to add a managers', async () => {
					await expect(
						registry.connect(educateth).addManagersToProfile(profileId, [])
					)
						.to.be.revertedWithCustomError(registry, 'EMPTY_ARRAY')
						.withArgs()
				})

				it('Should revert if try to add a zero manager', async () => {
					await expect(
						registry
							.connect(educateth)
							.addManagersToProfile(profileId, [ZeroAddress])
					)
						.to.be.revertedWithCustomError(registry, 'ZERO_ADDRESS')
						.withArgs()
				})

				it('Should add a manager', async () => {
					const addManagersToProfileTx = await registry
						.connect(educateth)
						.addManagersToProfile(profileId, [santiago.address])

					await addManagersToProfileTx.wait()

					const hasRol: boolean = await registry.hasRole(
						profileId,
						santiago.address
					)

					expect(true).to.equal(hasRol)
				})
			})

			describe('Remove', async () => {
				it('Should revert if an non-owner account tries to remove a manager', async () => {
					await expect(
						registry
							.connect(julio)
							.removeManagersFromProfile(profileId, [santiago.address])
					)
						.to.be.revertedWithCustomError(registry, 'UNAUTHORIZED')
						.withArgs()
				})

				it('Should revert if try not to remove a managers', async () => {
					await expect(
						registry.connect(educateth).removeManagersFromProfile(profileId, [])
					)
						.to.be.revertedWithCustomError(registry, 'EMPTY_ARRAY')
						.withArgs()
				})

				it('Should revert if try to remove a zero manager', async () => {
					await expect(
						registry
							.connect(educateth)
							.removeManagersFromProfile(profileId, [ZeroAddress])
					)
						.to.be.revertedWithCustomError(registry, 'ZERO_ADDRESS')
						.withArgs()
				})

				it('Should remove a manager', async () => {
					const removeManagersFromProfileTx = await registry
						.connect(educateth)
						.removeManagersFromProfile(profileId, [santiago.address])

					await removeManagersFromProfileTx.wait()

					const hasRol: boolean = await registry.hasRole(
						profileId,
						santiago.address
					)

					expect(false).to.equal(hasRol)
				})
			})
		})

		describe('Update', async () => {
			describe('Name', async () => {
				it('Should revert if an non-owner account tries to update the name', async () => {
					await expect(
						registry
							.connect(julio)
							.updateProfileName(profileId, 'EducatETH 2.0')
					)
						.to.be.revertedWithCustomError(registry, 'UNAUTHORIZED')
						.withArgs()
				})

				it('Should change the name', async () => {
					const updateProfileNameTx = await registry
						.connect(educateth)
						.updateProfileName(profileId, 'EducatETH 2.0')

					await updateProfileNameTx.wait()

					const updatedProfile = await registry.getProfileById(profileId)
					const mappedProfile: Profile =
						profileContractToProfile(updatedProfile)

					expect('EducatETH 2.0').to.equal(mappedProfile.name)
				})

				it('Should emit an event when the name is updated', async () => {
					const updateProfileNameTx = await registry
						.connect(educateth)
						.updateProfileName(profileId, 'EducatETH')

					await updateProfileNameTx.wait()

					const updatedProfile = await registry.getProfileById(profileId)
					const mappedProfile: Profile =
						profileContractToProfile(updatedProfile)

					await expect(updateProfileNameTx)
						.to.emit(registry, 'ProfileNameUpdated')
						.withArgs(profileId, 'EducatETH', mappedProfile.anchor)
				})
			})
			describe('Pending owner', async () => {
				it('Should revert if an non-owner account tries to update the pending owner', async () => {
					await expect(
						registry
							.connect(julio)
							.updateProfilePendingOwner(profileId, julio.address)
					)
						.to.be.revertedWithCustomError(registry, 'UNAUTHORIZED')
						.withArgs()
				})

				it('Should revert if try to update the pending owner with a zero account', async () => {
					await expect(
						registry
							.connect(educateth)
							.updateProfilePendingOwner(profileId, ZeroAddress)
					)
						.to.be.revertedWithCustomError(registry, 'ZERO_ADDRESS')
						.withArgs()
				})

				it('Should revert if try to update the pending owner with the same owner', async () => {
					await expect(
						registry
							.connect(educateth)
							.updateProfilePendingOwner(profileId, educateth.address)
					)
						.to.be.revertedWithCustomError(registry, 'SAME_PROVIDER')
						.withArgs()
				})

				it('Should update the pending owner', async () => {
					const updateProfilePendingOwnerTx = await registry
						.connect(educateth)
						.updateProfilePendingOwner(profileId, julio.address)

					await updateProfilePendingOwnerTx.wait()

					const pendingOwner: string =
						await registry.getPendingOwnerByProfileId(profileId)

					expect(julio.address).to.equal(pendingOwner)
				})

				it('Should emit an event when the pending owner is updated', async () => {
					await expect(
						registry
							.connect(educateth)
							.updateProfilePendingOwner(profileId, oscar.address)
					)
						.to.emit(registry, 'ProfilePendingOwnerUpdated')
						.withArgs(profileId, oscar.address)
				})
			})
		})

		describe('Ownership', async () => {
			it('Should revert if an non-pending owner account tries to accept the ownership', async () => {
				await expect(
					registry.connect(santiago).acceptProfileOwnership(profileId)
				)
					.to.be.revertedWithCustomError(registry, 'NOT_PENDING_OWNER')
					.withArgs()
			})

			it('Should emit an event when the ownership is accepted', async () => {
				await expect(registry.connect(oscar).acceptProfileOwnership(profileId))
					.to.emit(registry, 'ProfileOwnerUpdated')
					.withArgs(profileId, oscar.address)
			})
		})

		describe('Credits', async () => {
			const otherProfileId: BytesLike = ethers.id('EXAMPLE_ID')

			it('Should revert if an account tries to add credits', async () => {
				await expect(
					registry.connect(educateth).addCreditsToProfile(profileId, 1000)
				)
					.to.be.revertedWithCustomError(
						registry,
						'AccessControlUnauthorizedAccount'
					)
					.withArgs(educateth.address, ethers.id('SEAL_OWNER'))
			})

			it('Should revert if try to add credits a profile not found', async () => {
				await expect(
					registry.connect(seal).addCreditsToProfile(otherProfileId, 1000)
				).to.be.revertedWithCustomError(registry, 'PROFILE_NOT_FOUND')
			})

			it('Should revert if try to add zero credits', async () => {
				await expect(
					registry.connect(seal).addCreditsToProfile(profileId, 0)
				).to.be.revertedWithCustomError(registry, 'INVALID_AMOUNT')
			})

			it('Should add credits', async () => {
				const getCreditsByProfileIdTx = await registry
					.connect(seal)
					.addCreditsToProfile(profileId, 1000)

				await getCreditsByProfileIdTx.wait()

				const updatedCredits: number =
					await registry.getCreditsByProfileId(profileId)

				expect(2000).to.equal(updatedCredits)
			})

			it('Should emit an event when credits are added', async () => {
				await expect(
					registry.connect(seal).addCreditsToProfile(profileId, 1000)
				)
					.to.emit(registry, 'CreditsAddedToProfile')
					.withArgs(profileId, 1000)
			})
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
	})

	describe('Funds', async () => {
		let native: string

		before(async () => {
			const fixture = await loadFixture(deployFixture)
			registry = fixture.registry
			seal = fixture.seal
			santiago = fixture.santiago

			native = await registry.NATIVE()

			// await santiago.sendTransaction({
			// 	to: await registry.getAddress(),
			// 	value: ethers.parseEther('0.05')
			// })
		})

		it('Should revert if an account tries to withdraw funds', async () => {
			await expect(
				registry.connect(santiago).recoverFunds(native, santiago.address)
			)
				.to.be.revertedWithCustomError(
					registry,
					'AccessControlUnauthorizedAccount'
				)
				.withArgs(santiago.address, ethers.id('SEAL_OWNER'))
		})

		it('Should revert if try to withdraw funds with a zero account', async () => {
			await expect(registry.connect(seal).recoverFunds(native, ZeroAddress))
				.to.be.revertedWithCustomError(registry, 'ZERO_ADDRESS')
				.withArgs()
		})

		it('Should transfer funds', async () => {
			await expect(
				registry.connect(seal).recoverFunds(native, santiago.address)
			).to.changeEtherBalances(
				[santiago, registry],
				[ethers.parseUnits('0', 'ether'), ethers.parseUnits('0', 'ether')]
			)
		})
	})
})
