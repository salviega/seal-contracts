import {
	HardhatEthersSigner,
	SignerWithAddress
} from '@nomicfoundation/hardhat-ethers/signers'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import assert from 'assert'
import { expect } from 'chai'
import { AbiCoder, BytesLike, Contract, ZeroAddress } from 'ethers'
import hre, { deployments, ethers, upgrades } from 'hardhat'

import {
	CREATE__TYPES,
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

		const course = await hre.ethers.deployContract('Course', [
			'',
			'',
			await seal.getAddress()
		])

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

		const registerTx = await sp
			.connect(deployer)
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
			course,
			deployer,
			educateth,
			julio,
			oscar,
			santiago,
			schemaId: schemaIdNumber
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
		schemaId: number

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

	describe('UpdateStrategy', async () => {
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
})
