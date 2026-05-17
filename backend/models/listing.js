const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review.js");

const listingSchema = new Schema({
  title: { type: String, required: true },
  description: String,
  image: { url: String, filename: String },
  price: Number,
  location: String,
  country: String,
  // Crop-specific fields
  season: { type: String, enum: ["Kharif", "Rabi", "Zaid"], default: "Rabi" },
  grade: { type: String, enum: ["A", "B", "C"], default: "A" },
  quantity: { type: Number, default: 0 },
  unit: { type: String, default: "kg" },
  blockchainTokenId: { type: Number, default: null }, // link to NFT token
  status: { type: String, enum: ["available", "in_escrow", "sold"], default: "available" },
  reviews: [{ type: Schema.Types.ObjectId, ref: "Review" }],
  owner: { type: Schema.Types.ObjectId, ref: "User" },
});

listingSchema.post("findOneAndDelete", async (listing) => {
  if (listing) {
    await Review.deleteMany({ _id: { $in: listing.reviews } });
  }
});

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;
