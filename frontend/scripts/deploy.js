const hre = require("hardhat");

async function main() {
  const [seller] = await ethers.getSigners();

  // Deploy AgriYield NFT contract (starts empty — crops minted by vendors)
  const AgriYield = await ethers.getContractFactory("AgriYield");
  const agriYield = await AgriYield.deploy();
  await agriYield.deployed();
  console.log(`Deployed AgriYield Contract at: ${agriYield.address}`);

  // Deploy Escrow contract
  const Escrow = await ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy(agriYield.address, seller.address);
  await escrow.deployed();
  console.log(`Deployed Escrow Contract at: ${escrow.address}`);

  console.log(`\n✅ Paste these into frontend/src/config.json:`);
  console.log(JSON.stringify({
    "31337": {
      "agriYield": { "address": agriYield.address },
      "escrow": { "address": escrow.address }
    }
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
