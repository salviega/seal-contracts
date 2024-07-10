import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expect } from 'chai'
import { AbiCoder, BytesLike, Contract, ZeroAddress } from 'ethers'
import hre, { ethers, upgrades } from 'hardhat'

import {
	CREATE_COURSE_TYPES,
	CREATE_PROFILE_TYPES
} from '../constants/constants'
import { DataLocation } from '../constants/enums'
import { executeMulticall } from '../helpers/execute-multicall'
import { getEvetnArgs } from '../helpers/get-events-args'
import { courseContractToCourse } from '../mappings/course-contract-to-contract.mapping'
import { Attestation } from '../models/attestation.model'
import { Course } from '../models/course.model'
import { Profile } from '../models/profile.model'
import { Schema } from '../models/schema.model'

describe('Seal', function () {
	const abiCoder: AbiCoder = new ethers.AbiCoder()

	async function deployFixture() {
		const [deployer, educateth, julio, oscar, santiago] =
			await hre.ethers.getSigners()

		const SP = await hre.ethers.getContractFactory('SP')
		const sp = await upgrades.deployProxy(SP, [1, 1])

		const Registry = await hre.ethers.getContractFactory('Registry')
		const registry = await upgrades.deployProxy(Registry, [
			deployer.address,
			await sp.getAddress()
		])

		const Seal = await hre.ethers.getContractFactory('Seal')
		const seal = await upgrades.deployProxy(Seal, [
			deployer.address,
			await registry.getAddress()
		])

		const Course = await ethers.getContractFactory('Course')
		const course = await Course.deploy('', '', await seal.getAddress())

		const updateStrategyTx = await seal
			.connect(deployer)
			.updateStrategy(await course.getAddress())

		await updateStrategyTx.wait()

		const organizationSchema: Schema = {
			registrant: deployer.address,
			revocale: false,
			dataLocation: DataLocation.ONCHAIN,
			maxValidFor: 0,
			hook: await registry.getAddress(),
			timestamp: 0,
			data: 'blah blah blah...'
		}

		const organizationSchemaArray: unknown[] = Object.values(organizationSchema)
		const delegateSignature: BytesLike = '0x'

		const registerSchemaorganizationTx = await sp
			.connect(deployer)
			.register(organizationSchemaArray, delegateSignature)

		await registerSchemaorganizationTx.wait()

		const { '0': schemaorganizationId } = await getEvetnArgs(
			registerSchemaorganizationTx.hash,
			sp,
			'SchemaRegistered',
			[0]
		)

		const schemaOrganizationIdNumber: number = Number(schemaorganizationId)

		const courseSchema: Schema = {
			registrant: deployer.address,
			revocale: false,
			dataLocation: DataLocation.ONCHAIN,
			maxValidFor: 0,
			hook: await seal.getAddress(),
			timestamp: 0,
			data: 'blah blah blah...'
		}

		const courseSchemaArray: unknown[] = Object.values(courseSchema)

		const registerTx = await sp
			.connect(deployer)
			.register(courseSchemaArray, delegateSignature)

		await registerTx.wait()

		const { '0': schemaCourseId } = await getEvetnArgs(
			registerTx.hash,
			sp,
			'SchemaRegistered',
			[0]
		)

		const schemaCourseIdNumber: number = Number(schemaCourseId)

		return {
			sp,
			registry,
			seal,
			course,
			deployer,
			educateth,
			julio,
			oscar,
			santiago,
			schemaOrganizationId: schemaOrganizationIdNumber,
			schemaCourseId: schemaCourseIdNumber
		}
	}

	let sp: Contract,
		registry: Contract,
		seal: Contract,
		course: Contract,
		deployer: HardhatEthersSigner,
		educateth: HardhatEthersSigner,
		julio: HardhatEthersSigner,
		oscar: HardhatEthersSigner,
		santiago: HardhatEthersSigner,
		schemaOrganizationId: number,
		schemaCourseId: number

	describe('Deployment', async () => {
		before(async () => {
			const fixture = await loadFixture(deployFixture)
			sp = fixture.sp
			registry = fixture.registry
			seal = fixture.seal
			deployer = fixture.deployer
			educateth = fixture.educateth
		})

		it('Should Deployer be the owner of the Seal Contract', async () => {
			expect(await seal.owner()).to.equal(deployer.address)
		})

		it('Should Registry be the register contract', async () => {
			const registryAddress: string = await seal.getRegistry()
			expect(await registry.getAddress()).to.equal(registryAddress)
		})
	})

	describe('Update registry', async () => {
		before(async () => {
			const fixture = await loadFixture(deployFixture)
			sp = fixture.sp
			registry = fixture.registry
			seal = fixture.seal
			deployer = fixture.deployer
			educateth = fixture.educateth
		})

		it('Should revert if the caller is not the owner', async () => {
			await expect(seal.connect(educateth).updateRegistry(ZeroAddress)).to.be
				.reverted
		})

		it('Should revert if the new registry is the zero address', async () => {
			await expect(
				seal.connect(deployer).updateRegistry(ZeroAddress)
			).to.be.revertedWithCustomError(seal, 'ZERO_ADDRESS')
		})

		it('Should update the registry', async () => {
			const newRegistry = await hre.ethers.getContractFactory('Registry')
			const newRegistryInstance = await upgrades.deployProxy(newRegistry, [
				deployer.address,
				await sp.getAddress()
			])

			const updateRegistryTx = await seal.updateRegistry(
				await newRegistryInstance.getAddress()
			)

			await updateRegistryTx.wait()

			const updatedRegistryAddress: string = await seal.getRegistry()

			expect(await newRegistryInstance.getAddress()).to.equal(
				updatedRegistryAddress
			)
		})

		it('Should emit an event', async () => {
			const updateRegistryTx = await seal.updateRegistry(
				await registry.getAddress()
			)

			await expect(updateRegistryTx)
				.to.emit(seal, 'RegistryUpdated')
				.withArgs(await registry.getAddress())
		})
	})

	describe('Update strategy', async () => {
		before(async () => {
			const fixture = await loadFixture(deployFixture)
			sp = fixture.sp
			registry = fixture.registry
			seal = fixture.seal
			course = fixture.course
			deployer = fixture.deployer
			educateth = fixture.educateth
		})

		it('Should revert if the caller is not the owner', async () => {
			await expect(seal.connect(educateth).updateStrategy(ZeroAddress)).to.be
				.reverted
		})

		it('Should revert if the new strategy is the zero address', async () => {
			await expect(
				seal.connect(deployer).updateStrategy(ZeroAddress)
			).to.be.revertedWithCustomError(seal, 'ZERO_ADDRESS')
		})

		it('Should update the strategy', async () => {
			const updateStrategyTx = await seal.updateStrategy(
				await course.getAddress()
			)

			await updateStrategyTx.wait()

			const updatedStrategyAddress: string = await seal.getStrategy()

			expect(await course.getAddress()).to.equal(updatedStrategyAddress)
		})

		it('Should emit an event', async () => {
			const updateStrategyTx = await seal.updateStrategy(
				await registry.getAddress()
			)

			await expect(updateStrategyTx)
				.to.emit(seal, 'CourseUpdated')
				.withArgs(await registry.getAddress())
		})
	})

	describe('Create Course', async () => {
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
			course = fixture.course
			deployer = fixture.deployer
			educateth = fixture.educateth
			julio = fixture.julio
			oscar = fixture.oscar
			santiago = fixture.santiago
			schemaOrganizationId = fixture.schemaOrganizationId
			schemaCourseId = fixture.schemaCourseId

			await executeMulticall(registry, deployer, [
				{ name: 'authorizeProfileCreation', params: [educateth.address, true] },
				{ name: 'addCreditsToAccount', params: [educateth.address, 1000] }
			])

			const educatethAddressBytes: BytesLike = ethers.zeroPadBytes(
				educateth.address,
				32
			)

			const recipients: BytesLike[] = [educatethAddressBytes]

			const attestation: Attestation = {
				schemaId: schemaOrganizationId,
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

			const [attestationId, id, newNonce, name, credits, owner, anchor] =
				await getEvetnArgs(attestTx.hash, registry, 'ProfileCreated', 'all')

			profileId = id
			attestationArray[0] = schemaCourseId
		})

		it('Should revert if account tries to create a course', async () => {
			await expect(
				registry
					.connect(santiago)
					.didReceiveAttestation(ZeroAddress, 0, 0, '0x')
			)
				.to.be.revertedWithCustomError(registry, 'NOT_ATTESTATION_PROVIDER')
				.withArgs()
		})

		it('Should revert if try to create a course with empty recipients', async () => {
			const extraData: BytesLike = abiCoder.encode(CREATE_COURSE_TYPES, [
				profileId,
				[],
				[]
			])

			await expect(
				sp
					.connect(educateth)
					[
						'attest((uint64,uint64,uint64,uint64,address,uint64,uint8,bool,bytes[],bytes),uint256,string,bytes,bytes)'
					](attestationArray, resolverFeesETH, indexingKey, delegateSignature, extraData, {
						value: resolverFeesETH
					})
			).to.be.revertedWithCustomError(seal, 'EMPTY_ARRAY')
		})

		it('Should revert if try to create a course uris and recipients mismatch', async () => {
			const extraData: BytesLike = abiCoder.encode(CREATE_COURSE_TYPES, [
				profileId,
				[julio.address, oscar.address],
				[]
			])

			await expect(
				sp
					.connect(educateth)
					[
						'attest((uint64,uint64,uint64,uint64,address,uint64,uint8,bool,bytes[],bytes),uint256,string,bytes,bytes)'
					](attestationArray, resolverFeesETH, indexingKey, delegateSignature, extraData, {
						value: resolverFeesETH
					})
			).to.be.revertedWithCustomError(seal, 'MISMATCH')
		})

		it('Should revert to create a course with course zero address', async () => {
			const extraData: BytesLike = abiCoder.encode(CREATE_COURSE_TYPES, [
				profileId,
				[ZeroAddress, ZeroAddress],
				['zero', 'zero']
			])

			await expect(
				sp
					.connect(educateth)
					[
						'attest((uint64,uint64,uint64,uint64,address,uint64,uint8,bool,bytes[],bytes),uint256,string,bytes,bytes)'
					](attestationArray, resolverFeesETH, indexingKey, delegateSignature, extraData, {
						value: resolverFeesETH
					})
			).to.be.revertedWithCustomError(seal, 'ZERO_ADDRESS')
		})

		it('Should create a course', async () => {
			const wallets = []
			for (let i = 0; i < 100; i++) {
				wallets.push(ethers.Wallet.createRandom().address)
			}

			const uris = []
			for (let i = 1; i <= 100; i++) {
				uris.push(i.toString())
			}

			const extraData: BytesLike = abiCoder.encode(CREATE_COURSE_TYPES, [
				profileId,
				wallets,
				uris
			])

			const attestTx = await sp
				.connect(educateth)
				[
					'attest((uint64,uint64,uint64,uint64,address,uint64,uint8,bool,bytes[],bytes),uint256,string,bytes,bytes)'
				](attestationArray, resolverFeesETH, indexingKey, delegateSignature, extraData, {
					value: resolverFeesETH
				})

			await attestTx.wait()

			const [courseId, oldProfileId, attestationId, address, credits] =
				await getEvetnArgs(attestTx.hash, seal, 'CourseCreated', 'all')

			const course: Course = {
				profileId: oldProfileId,
				attestationId,
				course: address,
				credits
			}

			const courseContract = await seal.connect(deployer).getCourse(courseId)
			const mappedCourse: Course = courseContractToCourse(courseContract)

			expect(course).to.deep.equal(mappedCourse)
		})

		it('Should emit an event', async () => {
			const extraData: BytesLike = abiCoder.encode(CREATE_COURSE_TYPES, [
				profileId,
				[julio.address, oscar.address],
				['zero', 'zero']
			])

			const attestTx = await sp
				.connect(educateth)
				[
					'attest((uint64,uint64,uint64,uint64,address,uint64,uint8,bool,bytes[],bytes),uint256,string,bytes,bytes)'
				](attestationArray, resolverFeesETH, indexingKey, delegateSignature, extraData, {
					value: resolverFeesETH
				})

			const [courseId, oldProfileId, attestationId, address, credits] =
				await getEvetnArgs(attestTx.hash, seal, 'CourseCreated', 'all')

			await expect(attestTx)
				.to.emit(seal, 'CourseCreated')
				.withArgs(courseId, oldProfileId, attestationId, address, credits)
		})
	})

	describe('Funds', async () => {
		let native: string

		before(async () => {
			const fixture = await loadFixture(deployFixture)
			seal = fixture.seal
			deployer = fixture.deployer
			santiago = fixture.santiago

			native = await seal.NATIVE()

			await santiago.sendTransaction({
				to: await seal.getAddress(),
				value: ethers.parseEther('0.05')
			})
		})

		it('Should revert if an account tries to withdraw funds', async () => {
			await expect(
				seal.connect(santiago).recoverFunds(native, santiago.address)
			).to.be.reverted
		})

		it('Should revert if try to withdraw funds with a zero account', async () => {
			await expect(seal.connect(deployer).recoverFunds(native, ZeroAddress))
				.to.be.revertedWithCustomError(seal, 'ZERO_ADDRESS')
				.withArgs()
		})

		it('Should transfer funds', async () => {
			await expect(
				seal.connect(deployer).recoverFunds(native, santiago.address)
			).to.changeEtherBalances(
				[santiago, seal],
				[
					ethers.parseUnits('0.05', 'ether'),
					ethers.parseUnits('-0.05', 'ether')
				]
			)
		})
	})
})
