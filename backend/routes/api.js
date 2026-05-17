const express = require("express");
const router = express.Router();
const Listing = require("../models/listing.js");
const User = require("../models/user.js");
const passport = require("passport");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });

// ─── AUTH ────────────────────────────────────────────────────────────────────

// POST /api/signup
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const allowedRoles = ["vendor", "customer"];
    const userRole = allowedRoles.includes(role) ? role : "customer";
    const newUser = new User({ email, username, role: userRole });
    const registered = await User.register(newUser, password);
    req.login(registered, (err) => {
      if (err) return res.status(500).json({ error: err.message });
      return res.json({
        success: true,
        user: { id: registered._id, username: registered.username, email: registered.email, role: registered.role },
      });
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/login
router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: info?.message || "Invalid credentials" });
    req.login(user, (err) => {
      if (err) return res.status(500).json({ error: err.message });
      return res.json({
        success: true,
        user: { id: user._id, username: user.username, email: user.email, role: user.role },
      });
    });
  })(req, res, next);
});

// POST /api/logout
router.post("/logout", (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// GET /api/me
router.get("/me", (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Not logged in" });
  const { _id, username, email, role } = req.user;
  res.json({ id: _id, username, email, role });
});

// ─── LISTINGS ────────────────────────────────────────────────────────────────

// GET /api/listings — all listings (public)
router.get("/listings", async (req, res) => {
  try {
    const listings = await Listing.find({}).populate("owner", "username email role");
    res.json(listings);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/listings/:id — single listing
router.get("/listings/:id", async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate("owner", "username email role");
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    res.json(listing);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/listings — create (vendor only)
router.post("/listings", upload.single("image"), async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not logged in" });
    if (req.user.role !== "vendor") return res.status(403).json({ error: "Only vendors can create listings" });

    const { title, description, price, location, country, season, grade, quantity, unit } = req.body;
    const newListing = new Listing({
      title, description, price, location, country,
      season: season || "Rabi",
      grade: grade || "A",
      quantity: quantity || 0,
      unit: unit || "kg",
      owner: req.user._id,
    });

    if (req.file) {
      newListing.image = { url: req.file.path, filename: req.file.filename };
    }

    await newListing.save();
    res.json({ success: true, listing: newListing });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/listings/:id — update (owner vendor only)
router.put("/listings/:id", upload.single("image"), async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not logged in" });
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: "Not found" });
    if (!listing.owner.equals(req.user._id)) return res.status(403).json({ error: "Not your listing" });

    const { title, description, price, location, country, season, grade, quantity, unit, status, blockchainTokenId } = req.body;
    Object.assign(listing, { title, description, price, location, country, season, grade, quantity, unit });
    if (status) listing.status = status;
    if (blockchainTokenId) listing.blockchainTokenId = blockchainTokenId;
    if (req.file) listing.image = { url: req.file.path, filename: req.file.filename };

    await listing.save();
    res.json({ success: true, listing });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/listings/:id — delete (owner vendor only)
router.delete("/listings/:id", async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not logged in" });
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: "Not found" });
    if (!listing.owner.equals(req.user._id)) return res.status(403).json({ error: "Not your listing" });
    await Listing.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/listings/:id/status — update status (sold, in_escrow, etc.)
router.patch("/listings/:id/status", async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not logged in" });
    const { status, blockchainTokenId } = req.body;
    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      { status, ...(blockchainTokenId && { blockchainTokenId }) },
      { new: true }
    );
    res.json({ success: true, listing });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

// GET /api/listings/:id/metadata — returns NFT-compatible JSON metadata for a listing
// This is what the blockchain tokenURI points to
router.get("/listings/:id/metadata", async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate("owner", "username");
    if (!listing) return res.status(404).json({ error: "Listing not found" });

    // Return in the same format as the original metadata JSON files
    const metadata = {
      name: listing.title,
      description: listing.description,
      image: listing.image?.url || "",
      id: listing.blockchainTokenId || 0,
      attributes: [
        { trait_type: "Crop Price", value: `${listing.price} ETH` },
        { trait_type: "Season",     value: listing.season },
        { trait_type: "Quality Grade", value: listing.grade },
        { trait_type: "Quantity",   value: `${listing.quantity} ${listing.unit}` },
        { trait_type: "Location",   value: listing.location },
        { trait_type: "Vendor",     value: listing.owner?.username },
      ],
    };

    res.json(metadata);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/listings/:id/list-escrow
// Called after customer mints NFT — backend signs list() as the seller
router.post("/listings/:id/list-escrow", async (req, res) => {
  try {
    const { tokenId, buyerAddress, purchasePrice } = req.body;
    if (!tokenId || !buyerAddress || !purchasePrice) {
      return res.status(400).json({ error: "tokenId, buyerAddress and purchasePrice required" });
    }

    const { ethers } = require("ethers");
    const fs = require("fs");
    const path = require("path");

    // Load contract config and ABIs from frontend folder
    const configPath = path.join(__dirname, "../../frontend/src/config.json");
    const escrowAbiPath = path.join(__dirname, "../../frontend/src/abis/Escrow.json");
    const agriYieldAbiPath = path.join(__dirname, "../../frontend/src/abis/AgriYield.json");

    const config = JSON.parse(fs.readFileSync(configPath));
    const escrowAbi = JSON.parse(fs.readFileSync(escrowAbiPath));
    const agriYieldAbi = JSON.parse(fs.readFileSync(agriYieldAbiPath));

    // Connect using Hardhat's default seller private key
    const SELLER_PRIVATE_KEY = process.env.SELLER_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";

    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const sellerWallet = new ethers.Wallet(SELLER_PRIVATE_KEY, provider);

    const network = await provider.getNetwork();
    const chainConfig = config[network.chainId];
    if (!chainConfig) return res.status(400).json({ error: "Chain not configured" });

    const agriYield = new ethers.Contract(chainConfig.agriYield.address, agriYieldAbi, sellerWallet);
    const escrow = new ethers.Contract(chainConfig.escrow.address, escrowAbi, sellerWallet);

    const priceInWei = ethers.utils.parseEther(String(purchasePrice));
    const earnest = priceInWei.mul(10).div(100); // 10% earnest

    // Seller approves escrow to take the NFT from buyer
    // First transfer NFT from buyer to seller (buyer must have approved this)
    // Actually: buyer minted it → buyer approves escrow directly → seller calls list()
    // The NFT is held by buyer, seller calls list() which does transferFrom(seller, escrow)
    // So buyer must transfer to seller first, OR we update the contract
    // Simplest fix: buyer approves the SELLER to transfer their NFT, seller calls list()

    // Check NFT owner
    const owner = await agriYield.ownerOf(tokenId);
    if (owner.toLowerCase() !== sellerWallet.address.toLowerCase()) {
      // Transfer NFT from buyer to seller first (buyer must have approved seller)
      const tx = await agriYield.transferFrom(owner, sellerWallet.address, tokenId);
      await tx.wait();
    }

    // Now approve escrow to hold the NFT
    const approveTx = await agriYield.approve(chainConfig.escrow.address, tokenId);
    await approveTx.wait();

    // Call list() as seller
    const listTx = await escrow.list(tokenId, buyerAddress, priceInWei, earnest);
    await listTx.wait();

    res.json({ success: true, tokenId, earnest: ethers.utils.formatEther(earnest) });
  } catch (e) {
    console.error("list-escrow error:", e);
    res.status(500).json({ error: e.reason || e.message });
  }
});

// POST /api/listings/:id/finalize
// Vendor triggers this — backend calls approveSale + finalizeSale as the seller wallet
router.post("/listings/:id/finalize", async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not logged in" });
    if (req.user.role !== "vendor") return res.status(403).json({ error: "Vendors only" });

    const listing = await require("../models/listing.js").findById(req.params.id);
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    if (!listing.blockchainTokenId) return res.status(400).json({ error: "No blockchain token for this listing" });

    const { ethers } = require("ethers");
    const fs = require("fs");
    const path = require("path");

    const configPath = path.join(__dirname, "../../frontend/src/config.json");
    const escrowAbiPath = path.join(__dirname, "../../frontend/src/abis/Escrow.json");

    const config = JSON.parse(fs.readFileSync(configPath));
    const escrowAbi = JSON.parse(fs.readFileSync(escrowAbiPath));

    const SELLER_PRIVATE_KEY = process.env.SELLER_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";

    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const sellerWallet = new ethers.Wallet(SELLER_PRIVATE_KEY, provider);
    const network = await provider.getNetwork();
    const chainConfig = config[network.chainId];
    if (!chainConfig) return res.status(400).json({ error: "Chain not configured" });

    const escrow = new ethers.Contract(chainConfig.escrow.address, escrowAbi, sellerWallet);
    const tokenId = listing.blockchainTokenId;

    // Seller approves the sale
    const approveTx = await escrow.approveSale(tokenId);
    await approveTx.wait();

    // Finalize — sends ETH to seller, NFT to buyer
    const finalizeTx = await escrow.finalizeSale(tokenId);
    await finalizeTx.wait();

    // Update MongoDB
    listing.status = "sold";
    await listing.save();

    res.json({ success: true, message: "Sale finalized. ETH sent to seller wallet." });
  } catch (e) {
    console.error("finalize error:", e);
    res.status(500).json({ error: e.reason || e.message });
  }
});
