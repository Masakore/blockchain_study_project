const { getNamedAccounts, ethers } = require("hardhat");
const { getWeth, AMOUNT } = require("../scripts/getWeth");

async function main() {
  await getWeth();
  const { deployer } = await getNamedAccounts();
  const lendingPool = await getLendingPool(deployer);
  console.log(`LendingPool address ${lendingPool.address}`);

  // Deposit WETH to AAVE V2
  const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  // approve
  await approveErc20(wethTokenAddress, lendingPool.address, AMOUNT, deployer);
  // Without approval, you would see Error: VM Exception while processing transaction: reverted with reason string 'SafeERC20: low-level call failed'
  console.log("Depositing...");
  await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0);
  console.log("Deposited!");
  let { availableBorrowsETH, totalDebtETH } = await getBorrowUserData(
    lendingPool,
    deployer
  );

  // Borrow DAI
  const daiPrice = await getDaiPrice();
  // TODO: check the formula
  const amountDaiToBorrow = availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber()); // borrow 95% for example: no of borrowable ETH * how much wanna borrow / dai price in ETH
  // const test = availableBorrowsETH.toString() * 0.95 / daiPrice.toNumber(); // The same result as above
  console.log(`You can borrow ${amountDaiToBorrow} DAI`);
  // console.log(`You can borrow in another form ${test} DAI`);
  const amountDaiToBorrowWei = ethers.utils.parseEther(
    amountDaiToBorrow.toString()
  );

  // https://etherscan.io/token/0x6b175474e89094c44da98b954eedeac495271d0f
  const daiTokenAddress = "0x6b175474e89094c44da98b954eedeac495271d0f";
  await borrowDai(daiTokenAddress, lendingPool, amountDaiToBorrowWei, deployer);
  await getBorrowUserData(lendingPool, deployer);
  await repay(
    amountDaiToBorrowWei,
    daiTokenAddress,
    lendingPool,
    deployer
  );
  await getBorrowUserData(lendingPool, deployer);

}

async function repay(amount, daiAddress, lendingPool, account) {
  //https://docs.aave.com/developers/v/2.0/the-core-protocol/lendingpool#repay
  await approveErc20(daiAddress, lendingPool.address, amount, account);
  const repayTx = await lendingPool.repay(daiAddress, amount, 1, account);
  await repayTx.wait(1);
  console.log("Repaid!");
}

async function borrowDai(
  daiAddress,
  lendingPool,
  amountDaiToBorrowWei,
  account
) {
  // https://docs.aave.com/developers/v/2.0/the-core-protocol/lendingpool#borrow
  const borrowTx = await lendingPool.borrow(
    daiAddress,
    amountDaiToBorrowWei,
    1,
    0,
    account
  );
  await borrowTx.wait(1);
  console.log("You've borrowed! ");
}

// chainlink price-feeds contract address: https://docs.chain.link/data-feeds/price-feeds/addresses/
async function getDaiPrice() {
  const daiEthPriceFeed = await ethers.getContractAt(
    "AggregatorV3Interface",
    "0x773616E4d11A78F511299002da57A0a94577F1f4");

  const price = (await daiEthPriceFeed.latestRoundData())[1];
  console.log(`The DAI/ETH price is ${price.toString()}`);
  return price;
}

async function getBorrowUserData(lendingPool, account) {
  //https://docs.aave.com/developers/v/2.0/the-core-protocol/lendingpool#getuseracountdata
  const { totalCollateralETH, totalDebtETH, availableBorrowsETH } = await lendingPool.getUserAccountData(account);
  console.log(`You have ${totalCollateralETH} worth of ETH deposited.`);
  console.log(`You have ${totalDebtETH} worth of ETH borrowed.`);
  console.log(`You can borrow ${availableBorrowsETH} worth of ETH.`);
  return { availableBorrowsETH, totalDebtETH };
}

async function approveErc20(
  erc20Address,
  spenderAddress,
  amountToSpend,
  account
) {
  const erc20Token = await ethers.getContractAt(
    "IERC20",
    erc20Address,
    account
  );
  const tx = await erc20Token.approve(spenderAddress, amountToSpend);
  await tx.wait(1);
  console.log("Approved!");
}

async function getLendingPool(account) {
  const lendingPoolAddressProvider = await ethers.getContractAt(
    "ILendingPoolAddressesProvider",
    "0xb53c1a33016b2dc2ff3653530bff1848a515c8c5",
    account
  );

  //https://docs.aave.com/developers/v/2.0/the-core-protocol/addresses-provider#getlendingpool
  const lendingPoolAddress = await lendingPoolAddressProvider.getLendingPool();
  const lendingPool = await ethers.getContractAt(
    "ILendingPool",
    lendingPoolAddress,
    account
  );
  return lendingPool;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });