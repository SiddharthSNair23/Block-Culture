import { ethers } from 'ethers'
import { useEffect, useState } from 'react'

import close from '../assets/close.svg'

const Home = ({ crop, provider, account, escrow, togglePop }) => {

    const [seller, setSeller] = useState(null)
    const [buyer, setBuyer] = useState(null)
    const [owner, setOwner] = useState(null)

    const [hasDeposited, setHasDeposited] = useState(false)
    const [hasSold, setHasSold] = useState(false)

    // -----------------------------
    // FETCH CONTRACT STATE
    // -----------------------------
    const fetchDetails = async () => {
        if (!escrow) return

        const buyerAddress = await escrow.buyer(crop.id)
        setBuyer(buyerAddress)

        const sellerAddress = await escrow.seller()
        setSeller(sellerAddress)

        const buyerApproved = await escrow.approval(crop.id, buyerAddress)
        setHasDeposited(buyerApproved)

        const sellerApproved = await escrow.approval(crop.id, sellerAddress)
        setHasSold(sellerApproved)
    }

    const fetchOwner = async () => {
        if (!escrow) return

        const listed = await escrow.isListed(crop.id)
        if (listed) return

        const ownerAddress = await escrow.buyer(crop.id)
        setOwner(ownerAddress)
    }

    // -----------------------------
    // BUY (BUYER)
    // -----------------------------
    const buyHandler = async () => {
        const signer = await provider.getSigner()
        const escrowAmount = await escrow.escrowAmount(crop.id)

        const tx = await escrow
            .connect(signer)
            .depositEarnest(crop.id, { value: escrowAmount })
        await tx.wait()

        setHasDeposited(true)
    }

    // -----------------------------
    // APPROVE & SELL (SELLER)
    // -----------------------------
    const sellHandler = async () => {
        const signer = await provider.getSigner()

        let tx = await escrow.connect(signer).approveSale(crop.id)
        await tx.wait()

        tx = await escrow.connect(signer).finalizeSale(crop.id)
        await tx.wait()

        setHasSold(true)
        fetchOwner()
    }

    // -----------------------------
    // EFFECTS
    // -----------------------------
    useEffect(() => {
        fetchDetails()
        fetchOwner()
    }, [account, hasSold, hasDeposited])

    // -----------------------------
    // RENDER
    // -----------------------------
    return (
        <div className="home">
            <div className="home__details">

                <div className="home__image">
                    <img src={crop.image} alt={crop.name} />
                </div>

                <div className="home__overview">
                    <h1>{crop.name}</h1>

                    <p>
                        <strong>{crop.attributes[1].value}</strong> Season |
                        <strong>{crop.attributes[2].value}</strong> Grade
                    </p>

                    <p>{crop.description}</p>

                    <h2>{crop.attributes[0].value}</h2>

                    {owner ? (
                        <div className="home__owned">
                            Owned by {owner.slice(0, 6)}...{owner.slice(38, 42)}
                        </div>
                    ) : (
                        <div>
                            {account?.toLowerCase() === seller?.toLowerCase() ? (
                                <button
                                    className="home__buy"
                                    onClick={sellHandler}
                                    disabled={hasSold}
                                >
                                    Approve & Buy
                                </button>
                            ) : (
                                <button
                                    className="home__buy"
                                    onClick={buyHandler}
                                    disabled={hasDeposited}
                                >
                                    Buy
                                </button>
                            )}

                            <button className="home__contact">
                                Contact Farmer
                            </button>
                        </div>
                    )}

                    <hr />
                </div>

                <button onClick={togglePop} className="home__close">
                    <img src={close} alt="Close" />
                </button>

            </div>
        </div>
    )
}

export default Home