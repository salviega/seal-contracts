import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expect } from 'chai'
import { AbiCoder, BytesLike } from 'ethers'
import hre, { ethers, upgrades } from 'hardhat'

import {
	CREATE_COURSE_TYPES,
	CREATE_PROFILE_TYPES
} from '../constants/constants'
import { DataLocation } from '../constants/enums'
import { getEvetnArgs } from '../helpers/get-events-args'
import { attestationContractToAttestation } from '../mappings/attestation-contract-to-attestation.mapping'
import { profileContractToProfile } from '../mappings/profile-contract-to-profile.mapping'
import { Attestation } from '../models/attestation.model'
import { Course } from '../models/course.model'
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
			ethKipuAttestationId
		}
	}

	describe('Registrations', () => {
		describe('Validations', () => {})

		describe('Authorizations', () => {})

		describe('Course Creation', () => {
			it('Should create a course', async function () {
				const {
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
					ethKipuAttestationId
				} = await loadFixture(deployFixture)

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

				const ethKipuCourse: Course = {
					profileId: ethKipuProfileId,
					course: courseAddress,
					manangers: [tono.address, julio.address]
				}

				const ethKipuCourseArray: unknown[] = Object.values(ethKipuCourse)

				const extraData: BytesLike = abiCoder.encode(
					CREATE_COURSE_TYPES,
					ethKipuCourseArray
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

				// const createCourseTx = await certify
				// 	.connect(ethKipu)
				// 	.createCourse(ethKipuProfileId, courseAddres, [
				// 		tono.address,
				// 		julio.address
				// 	])

				// await createCourseTx.wait()
			})
		})

		describe('Events', () => {})
	})
})
