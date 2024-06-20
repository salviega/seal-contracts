import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import assert from 'assert'
import { expect } from 'chai'
import { AbiCoder, BytesLike, Contract, ZeroAddress } from 'ethers'
import hre, { ethers, upgrades } from 'hardhat'

import {
	CREATE_COURSE_TYPES,
	CREATE_PROFILE_TYPES,
	EXTRA_DATA_TYPES
} from '../constants/constants'
import { DataLocation } from '../constants/enums'
import { getEvetnArgs } from '../helpers/get-events-args'
import { courseContractToCourse } from '../mappings/course-contract-to-contract.mapping'
import { Attestation } from '../models/attestation.model'
import { Course } from '../models/course.model'
import { ExtraData } from '../models/extradata.model'
import { Profile } from '../models/profile.model'
import { Schema } from '../models/schema.model'

describe('Certify', function () {
	const abiCoder: AbiCoder = new ethers.AbiCoder()

	async function deployFixture() {
		const [deployer, ethKipu, tono, julio] = await hre.ethers.getSigners()

		const SP = await hre.ethers.getContractFactory('SP')
		const sp = await upgrades.deployProxy(SP, [1, 1])

		const Registry = await hre.ethers.getContractFactory('Registry')
		const registry = await upgrades.deployProxy(Registry, [
			deployer.address,
			await sp.getAddress()
		])

		const organizationSchema: Schema = {
			registrant: ethKipu.address,
			revocale: false,
			dataLocation: DataLocation.ONCHAIN,
			maxValidFor: 0,
			hook: await registry.getAddress(),
			timestamp: 0,
			data: 'blah blah blah...'
		}

		const organizationSchemaArray: unknown[] = Object.values(organizationSchema)
		const delegateSignature: BytesLike = '0x'

		const registerOrganizationTx = await sp
			.connect(ethKipu)
			.register(organizationSchemaArray, delegateSignature)

		await registerOrganizationTx.wait()

		const { '0': organizationSchemaId } = await getEvetnArgs(
			registerOrganizationTx.hash,
			sp,
			'SchemaRegistered',
			[0]
		)

		const organizationSchemaIdNumber: number = Number(organizationSchemaId)

		await registry
			.connect(deployer)
			.authorizeProfileCreation(ethKipu.address, true)

		const ethKipuNonce: number = await ethers.provider.getTransactionCount(
			ethKipu.address
		)

		const ethKipuAddressBytes: BytesLike = ethers.zeroPadBytes(
			ethKipu.address,
			32
		)

		const recipients: BytesLike[] = [ethKipuAddressBytes]

		const ethKipuAttestation: Attestation = {
			schemaId: organizationSchemaIdNumber,
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

		const ethKipuAttestationArray: unknown[] = [
			ethKipuAttestation.schemaId,
			ethKipuAttestation.linkedAttestationId,
			ethKipuAttestation.attestTimestamp,
			ethKipuAttestation.revokeTimestamp,
			ethKipuAttestation.attester,
			ethKipuAttestation.validUntil,
			ethKipuAttestation.dataLocation,
			ethKipuAttestation.revoked,
			ethKipuAttestation.recipients,
			ethKipuAttestation.data
		]

		const resolverFeesETH: bigint = ethers.parseEther('0')
		const indexingKey: string = 'Nothing'

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

		const attestEthKipuTx = await sp
			.connect(ethKipu)
			[
				'attest((uint64,uint64,uint64,uint64,address,uint64,uint8,bool,bytes[],bytes),uint256,string,bytes,bytes)'
			](ethKipuAttestationArray, resolverFeesETH, indexingKey, delegateSignature, extraData, {
				value: resolverFeesETH
			})

		await attestEthKipuTx.wait()

		const { '0': ethKipuAttestationId } = await getEvetnArgs(
			attestEthKipuTx.hash,
			sp,
			'AttestationMade',
			[0]
		)

		const { '1': ethKipuProfileId } = await getEvetnArgs(
			attestEthKipuTx.hash,
			registry,
			'ProfileCreated',
			[1]
		)

		const Certify = await hre.ethers.getContractFactory('Certify')
		const certify = await upgrades.deployProxy(Certify, [
			deployer.address,
			await registry.getAddress(),
			deployer.address
		])

		const courseSchema: Schema = {
			registrant: ethKipu.address,
			revocale: false,
			dataLocation: DataLocation.ONCHAIN,
			maxValidFor: 0,
			hook: await certify.getAddress(),
			timestamp: 0,
			data: 'blah blah blah...'
		}

		const courseSchemaArray: unknown[] = Object.values(courseSchema)

		const registerCourseTx = await sp
			.connect(ethKipu)
			.register(courseSchemaArray, delegateSignature)

		await registerCourseTx.wait()

		const { '0': courseSchemaId } = await getEvetnArgs(
			registerCourseTx.hash,
			sp,
			'SchemaRegistered',
			[0]
		)

		const participantSchema: Schema = {
			registrant: ethKipu.address,
			revocale: false,
			dataLocation: DataLocation.ONCHAIN,
			maxValidFor: 0,
			hook: await certify.getAddress(),
			timestamp: 0,
			data: 'blah blah blah...'
		}

		const participantSchemaArray: unknown[] = Object.values(participantSchema)

		const registerParticipantCourseTx = await sp
			.connect(ethKipu)
			.register(participantSchemaArray, delegateSignature)

		await registerParticipantCourseTx.wait()

		const { '0': participantSchemaId } = await getEvetnArgs(
			registerCourseTx.hash,
			sp,
			'SchemaRegistered',
			[0]
		)

		const course = await hre.ethers.deployContract('Course', [
			'Genesis Course',
			'GC',
			await certify.getAddress()
		])

		const addToCloneableCourseTx = await certify
			.connect(deployer)
			.addToCloneableCourse(await course.getAddress())

		await addToCloneableCourseTx.wait()

		return {
			deployer,
			ethKipu,
			tono,
			julio,
			sp,
			registry,
			certify,
			course,
			ethKipuProfileId,
			courseSchemaId,
			participantSchemaId,
			ethKipuAttestationId
		}
	}

	describe('Registrations', () => {
		describe('Validations', () => {})

		describe('Authorizations', () => {})

		describe('Course Creation', () => {
			let deployer,
				ethKipu: SignerWithAddress,
				tono: SignerWithAddress,
				julio: SignerWithAddress,
				sp: Contract,
				registry: Contract,
				certify: Contract,
				course: Contract,
				ethKipuProfileId: BytesLike,
				courseSchemaId,
				participantSchemaId: number,
				ethKipuAttestationId: number

			this.beforeAll(async function () {
				;({
					deployer,
					ethKipu,
					tono,
					julio,
					sp,
					registry,
					certify,
					course,
					ethKipuProfileId,
					participantSchemaId,
					courseSchemaId,
					ethKipuAttestationId
				} = await loadFixture(deployFixture))

				const courseAddress: string = await course.getAddress()

				const ethKipuAddressBytes: BytesLike = ethers.zeroPadBytes(
					ethKipu.address,
					32
				)

				const recipients: BytesLike[] = [ethKipuAddressBytes]

				const courseAttestation: Attestation = {
					schemaId: courseSchemaId,
					linkedAttestationId: ethKipuAttestationId,
					attestTimestamp: 0,
					revokeTimestamp: 0,
					attester: ethKipu.address,
					validUntil: 0,
					dataLocation: DataLocation.ONCHAIN,
					revoked: false,
					recipients,
					data: '0x'
				}

				const courseAttestationArray: unknown[] = [
					courseAttestation.schemaId,
					courseAttestation.linkedAttestationId,
					courseAttestation.attestTimestamp,
					courseAttestation.revokeTimestamp,
					courseAttestation.attester,
					courseAttestation.validUntil,
					courseAttestation.dataLocation,
					courseAttestation.revoked,
					courseAttestation.recipients,
					courseAttestation.data
				]

				const resolverFeesETH: bigint = ethers.parseEther('1')
				const indexingKey: string = 'Nothing'
				const delegateSignature: BytesLike = '0x'

				const extraDataObject: ExtraData = {
					profileId: ethKipuProfileId,
					course: courseAddress,
					managers: [tono.address, julio.address],
					isMint: false,
					courseId: 0,
					account: ZeroAddress
				}

				const extraDataArray: unknown[] = Object.values(extraDataObject)

				const extraData: BytesLike = abiCoder.encode(
					EXTRA_DATA_TYPES,
					extraDataArray
				)

				const attestCourseTx = await sp
					.connect(ethKipu)
					[
						'attest((uint64,uint64,uint64,uint64,address,uint64,uint8,bool,bytes[],bytes),uint256,string,bytes,bytes)'
					](courseAttestationArray, resolverFeesETH, indexingKey, delegateSignature, extraData, {
						value: resolverFeesETH
					})

				await attestCourseTx.wait()

				const { '0': courseAttestationId } = await getEvetnArgs(
					attestCourseTx.hash,
					sp,
					'AttestationMade',
					[0]
				)

				const { '2': courseId } = await getEvetnArgs(
					attestCourseTx.hash,
					certify,
					'CourseCreated',
					[2]
				)

				this.courseId = courseId
				this.courseAttestationId = courseAttestationId
			})

			it('Should create a course', async function () {
				const courseArrayObtained: any[] = await certify.getCourse(
					this.courseId
				)

				const courseObtained: Course =
					courseContractToCourse(courseArrayObtained)

				expect(courseObtained.attestationId).to.equal(this.courseAttestationId)
			})

			it('Should attest students', async function () {
				const courseAddress: string = await course.getAddress()

				const ethKipuAddressBytes: BytesLike = ethers.zeroPadBytes(
					ethKipu.address,
					32
				)

				const recipients: BytesLike[] = [ethKipuAddressBytes]

				const participantAttestation: Attestation = {
					schemaId: participantSchemaId,
					linkedAttestationId: ethKipuAttestationId,
					attestTimestamp: 0,
					revokeTimestamp: 0,
					attester: ethKipu.address,
					validUntil: 0,
					dataLocation: DataLocation.ONCHAIN,
					revoked: false,
					recipients,
					data: '0x'
				}

				const participantAttestationArray: unknown[] = [
					participantAttestation.schemaId,
					participantAttestation.linkedAttestationId,
					participantAttestation.attestTimestamp,
					participantAttestation.revokeTimestamp,
					participantAttestation.attester,
					participantAttestation.validUntil,
					participantAttestation.dataLocation,
					participantAttestation.revoked,
					participantAttestation.recipients,
					participantAttestation.data
				]

				const resolverFeesETH: bigint = ethers.parseEther('1')
				const indexingKey: string = 'Nothing'
				const delegateSignature: BytesLike = '0x'

				const extraDataObject: ExtraData = {
					profileId: ethKipuProfileId,
					course: courseAddress,
					managers: [tono.address, julio.address],
					isMint: true,
					courseId: this.courseId,
					account: ZeroAddress
				}

				const extraDataArray: unknown[] = Object.values(extraDataObject)

				const extraData: BytesLike = abiCoder.encode(
					EXTRA_DATA_TYPES,
					extraDataArray
				)

				const attestCourseTx = await sp
					.connect(ethKipu)
					[
						'attest((uint64,uint64,uint64,uint64,address,uint64,uint8,bool,bytes[],bytes),uint256,string,bytes,bytes)'
					](participantAttestationArray, resolverFeesETH, indexingKey, delegateSignature, extraData, {
						value: resolverFeesETH
					})

				await attestCourseTx.wait()
			})
		})

		describe('Events', () => {})
	})
})
