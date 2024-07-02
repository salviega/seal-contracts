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

describe.skip('Certify', function () {
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
					recipients: [ethKipu.address]
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

			it('Should attest a student', async function () {
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
					recipients: [
						ethKipu.address,
						'0x11c633F3875b63d371c1dfBB1555CCC5580244a6',
						'0x1Df6d190e4b1D2Bb9fDC7aBCd1B2Bb900b85031B',
						'0x395CF5CC9Eae9Ac0d51Dc527688fCab5d6f4c3EE',
						'0x5600719bfB0131220a15de44eC218bF754770b70',
						'0xa7905d790c42E401CECA5264034c70a0F37C33f5',
						'0xC17abc4bb41de0EbBCa0A28Cec96b7d375055815',
						'0xa2adc5389db14912873d312066543B3408C01bcf',
						'0x9877D8917AC9212452548239aC2ffD510eD3CfBF',
						'0xE13969da1BD8A47e44f3CFF8fE8f284909028e41',
						'0xe472402CCC81a849594B591A522A69AbfE5b0713',
						'0xD8C47c2F6CAE8944880B6186c4e3A35bF60F1749',
						'0x38A322dEE92C91ecf471BA5F7891609fa415593E',
						'0x5a1d89f0c177Fa9825E1fD700bB989E7BDeae404',
						'0x39cc2AE82E5cfc136865FAE4bbf8d010DF093dAc',
						'0x69e6dAe73970BAc81766D6013813FF4e535b1076',
						'0xdd7bA7c1E6a86c1312a261F6c3ffBE47237dcB7c',
						'0xA920c968e3580413939099B13eff82e7628E10Db',
						'0x4346fC2Dafe7B80193418A8ee15897C352a9EEde',
						'0x96ad9cdf1335B0d953f6bc5654E72a9809fB1705',
						'0x74f67D6d4f19865D93CD117907cB5A0af896E14F',
						'0xf3a443E02e43874A5eBdf252fda444F95091DF24',
						'0x3A3E5C62c269E5ac33f699cD1fDD4B348944401b',
						'0x6a33428565af2ffeed6f642cc4f5a0af5021293f',
						'0x8bC84cbeD95796c0e7d2304409Cc4aA87e76aA4a',
						'0x806284c368Cc1067018881d1D6321da3668A880C',
						'0x0EE62a79411E5c84087D6637B8b3b6390bdFCA10',
						'0x64F6a37bA229c46F583c69f4DA5cFD4FFF95c942',
						'0x341f4ab31e167A1D2e9DA53b4C454f1629B7503D',
						'0x6a49d656aDBA21bD273F8C5EC99bb24926f8E6F8',
						'0x33615D58d6C20d5e6414218Be166db3108d7e5b4',
						'0x2e0150B16ACD928eB5ddad19Eb33899887D6A932',
						'0x605b7A0437a6397676B33fD343A38979cD53b123',
						'0x73243166c10FBe5Bd8bD34d868aF8656C4Be3682',
						'0xC5703205573B110eEb8614FCA5Fb1770E1F44D97',
						'0xe2EEdce7D94C1eb78635573f35974Ce9d2aA99cD',
						'0xdC941AcFD48A9644B7D52E528589bA8169A0303E'
					]
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
			it('Should mint a certificate', async function () {
				const message: string =
					'you must sign this message in your wallet to verify that you are the owner of this account'
				const hash: string = ethers.hashMessage(message)
				const signature: string = await ethKipu.signMessage(message)
				const signer: string = ethers.verifyMessage(message, signature)

				const safeMintCertificateTx = await certify
					.connect(ethKipu)
					.safeMint(this.courseId, signer, hash, signature, '')

				await safeMintCertificateTx.wait()

				const { '2': tokenId } = await getEvetnArgs(
					safeMintCertificateTx.hash,
					course,
					'Transfer',
					[2]
				)

				expect(tokenId).to.equal(1)
			})
		})

		describe('Events', () => {})
	})
})
