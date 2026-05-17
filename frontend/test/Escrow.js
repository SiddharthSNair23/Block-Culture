const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) => {
    return ethers.utils.parseUnits(n.toString(), 'ether')
}

describe('Escrow', () => {
    let buyer, seller
    let agriYield
    let escrow

    beforeEach(async() => {
        [buyer, seller] = await ethers.getSigners()

        const AgriYield = await ethers.getContractFactory('AgriYield')
        agriYield = await AgriYield.deploy()

        let transaction = await agriYield.connect(seller).mint("http://localhost:3000/metadata/1.json")
        await transaction.wait()

        const Escrow = await ethers.getContractFactory('Escrow')
        escrow = await Escrow.deploy(
            agriYield.address,
            seller.address
        )

        transaction = await agriYield.connect(seller).approve(escrow.address, 1)
        await transaction.wait()

        transaction = await escrow.connect(seller).list(1,
            buyer.address,
            tokens(10),
            tokens(5)
        )
        await transaction.wait()
    })

    describe('Deployment', () => {
    
        it('Returns NFT address', async() => {
            const result = await escrow.nftAddress()
            expect(result).to.be.equal(agriYield.address)
        })

        it('Returns seller address', async() => {
            const result = await escrow.seller()
            expect(result).to.be.equal(seller.address)
        })
    })

    describe('Listing', () => {
        it('Updates as listed', async() => {
            const result = await escrow.isListed(1)
            expect(result).to.be.equal(true)
        })

        it('Updates ownership', async() => {
            expect(await agriYield.ownerOf(1)).to.be.equal(escrow.address)
        })

        it('Returns buyer', async() => {
            const result = await escrow.buyer(1)
            expect(result).to.be.equal(buyer.address)
        })

        it('Returns purchase price', async() => {
            const result = await escrow.purchasePrice(1)
            expect(result).to.be.equal(tokens(10))
        })

        it('Returns escrow amount', async() => {
            const result = await escrow.escrowAmount(1)
            expect(result).to.be.equal(tokens(5))
        })

    })

    describe('Deposits', () => {
        it('Update contract balance', async () => {
            const transaction = await escrow.connect(buyer).depositEarnest(1, { value: tokens(5) })
            await transaction.wait()
            const result = await escrow.getBalance()
            expect(result).to.be.equal(tokens(5))
        })
    })

    describe('Approval', () => {
        it('Updates approval status', async () => {
            let transaction = await escrow.connect(buyer).approveSale(1)
            await transaction.wait()

            transaction = await escrow.connect(seller).approveSale(1)
            await transaction.wait()

            expect(await escrow.approval(1, buyer.address)).to.be.equal(true)
            expect(await escrow.approval(1, seller.address)).to.be.equal(true)
        })
    })

    describe('Sale', () => {
        beforeEach(async () => {
            let transaction = await escrow.connect(buyer).depositEarnest(1, {value: tokens(5)})
            await transaction.wait()

            transaction = await escrow.connect(buyer).approveSale(1)
            await transaction.wait()

            transaction = await escrow.connect(seller).approveSale(1)
            await transaction.wait()

            transaction = await escrow.connect(buyer).finalizeSale(1)
            await transaction.wait()
        })

        it('Updates ownership', async () => {
            except(await agriYield.ownerOf(1)).to.be.equal(buyer.address)
        })

        it('Updates balance', async () => {
            expect(await escrow.getBalance()).to.be.equal(0)
        })
    })
})
