import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs'
import {
	loadFixture,
	time
} from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expect } from 'chai'
import hre, { ethers, upgrades } from 'hardhat'

describe('Registry', function () {
	async function deployFixture() {
		const [certify, ethKipu] = await hre.ethers.getSigners()

		const SP = await hre.ethers.getContractFactory('SP')
		const sp = await upgrades.deployProxy(SP, [1, 1])

		const Registry = await hre.ethers.getContractFactory('Registry')
		const registry = await upgrades.deployProxy(Registry, [certify.address])

		return { sp, registry, certify, ethKipu }
	}

	// describe('Deployment', function () {
	// 	it('Should set the right unlockTime', async function () {
	// 		const { lock, unlockTime } = await loadFixture(deployFixture)

	// 		expect(await lock.unlockTime()).to.equal(unlockTime)
	// 	})

	// 	it('Should set the right owner', async function () {
	// 		const { lock, owner } = await loadFixture(deployOneYearLockFixture)

	// 		expect(await lock.owner()).to.equal(owner.address)
	// 	})

	// 	it('Should receive and store the funds to lock', async function () {
	// 		const { lock, lockedAmount } = await loadFixture(deployOneYearLockFixture)

	// 		expect(await hre.ethers.provider.getBalance(lock.target)).to.equal(
	// 			lockedAmount
	// 		)
	// 	})

	// 	it('Should fail if the unlockTime is not in the future', async function () {
	// 		// We don't use the fixture here because we want a different deployment
	// 		const latestTime = await time.latest()
	// 		const Lock = await hre.ethers.getContractFactory('Lock')
	// 		await expect(Lock.deploy(latestTime, { value: 1 })).to.be.revertedWith(
	// 			'Unlock time should be in the future'
	// 		)
	// 	})
	// })

	describe('Registrations', () => {
		describe('Validations', () => {
			it('Should revert if other account authorizes a new account to create a profile', async () => {
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
		})

		describe('Authorizations', () => {
			it('Should authorize a new account to create a profile', async () => {
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

		// TODO: testing
		describe('Profile Creation', () => {
			it('Should revert if an unauthorized account tries to create a profile', async () => {
				const { sp, registry, certify, ethKipu } =
					await loadFixture(deployFixture)
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

	// describe('Withdrawals', function () {
	// 	describe('Validations', function () {
	// 		it('Should revert with the right error if called too soon', async function () {
	// 			const { lock } = await loadFixture(deployOneYearLockFixture)

	// 			await expect(lock.withdraw()).to.be.revertedWith(
	// 				"You can't withdraw yet"
	// 			)
	// 		})

	// 		it('Should revert with the right error if called from another account', async function () {
	// 			const { lock, unlockTime, otherAccount } = await loadFixture(
	// 				deployOneYearLockFixture
	// 			)

	// 			// We can increase the time in Hardhat Network
	// 			await time.increaseTo(unlockTime)

	// 			// We use lock.connect() to send a transaction from another account
	// 			await expect(lock.connect(otherAccount).withdraw()).to.be.revertedWith(
	// 				"You aren't the owner"
	// 			)<<
	// 		})

	// 		it("Shouldn't fail if the unlockTime has arrived and the owner calls it", async function () {
	// 			const { lock, unlockTime } = await loadFixture(deployOneYearLockFixture)

	// 			// Transactions are sent using the first signer by default
	// 			await time.increaseTo(unlockTime)

	// 			await expect(lock.withdraw()).not.to.be.reverted
	// 		})
	// 	})

	// 	describe('Events', function () {
	// 		it('Should emit an event on withdrawals', async function () {
	// 			const { lock, unlockTime, lockedAmount } = await loadFixture(
	// 				deployOneYearLockFixture
	// 			)

	// 			await time.increaseTo(unlockTime)

	// 			await expect(lock.withdraw())
	// 				.to.emit(lock, 'Withdrawal')
	// 				.withArgs(lockedAmount, anyValue) // We accept any value as `when` arg
	// 		})
	// 	})

	// 	describe('Transfers', function () {
	// 		it('Should transfer the funds to the owner', async function () {
	// 			const { lock, unlockTime, lockedAmount, owner } = await loadFixture(
	// 				deployOneYearLockFixture
	// 			)

	// 			await time.increaseTo(unlockTime)

	// 			await expect(lock.withdraw()).to.changeEtherBalances(
	// 				[owner, lock],
	// 				[lockedAmount, -lockedAmount]
	// 			)
	// 		})
	// 	})
	// })
})
