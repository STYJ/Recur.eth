/* global artifacts */
/* eslint-disable */
const BN = require('bn.js');
const fs = require('fs');

const Network = artifacts.require('./KyberNetwork.sol');
const NetworkProxy = artifacts.require('./KyberNetworkProxy.sol');
const ConversionRates = artifacts.require('./ConversionRates.sol');
const LiquidityConversionRates = artifacts.require('./LiquidityConversionRates.sol');
// const SanityRates = artifacts.require('./SanityRates.sol');
const Reserve = artifacts.require('./KyberReserve.sol');
const AutomatedReserve = artifacts.require('./KyberAutomatedReserve.sol');

const FeeBurner = artifacts.require('./FeeBurner.sol');
const WhiteList = artifacts.require('./WhiteList.sol');
const ExpectedRate = artifacts.require('./ExpectedRate.sol');
const KNC = artifacts.require('./mockTokens/KyberNetworkCrystal.sol');
const KNC = artifacts.require('./mockTokens/KyberNetworkCrystal.sol');
const MockMedianizer = artifacts.require('./mockContracts/MockMedianizer.sol');

const networkConfig = JSON.parse(fs.readFileSync('../config/network.json', 'utf8'));
const tokenConfig = JSON.parse(fs.readFileSync('../config/tokens.json', 'utf8'));

module.exports = async (deployer, network, accounts) => {
  const admin = accounts[0];
  const kncRate = new BN(networkConfig.FeeBurner.kncRate).mul(new BN(10).pow(new BN(18)));
  const dollarsPerETH = new BN(
    networkConfig.MockMedianizer.DollarPerETH,
  ).mul(new BN(10).pow(new BN(18)));

  // Deploy the mock contracts
  await deployer.deploy(MockMedianizer, dollarsPerETH);

  // Deploy the contracts
  await deployer.deploy(Network, admin);
  await deployer.deploy(NetworkProxy, admin);
  await deployer.deploy(ConversionRates, admin);
  await deployer.deploy(LiquidityConversionRates, admin, MANA.address);
  await deployer.deploy(FeeBurner, admin, KNC.address, Network.address, kncRate);
  await deployer.deploy(Reserve, Network.address, ConversionRates.address, admin);
  await deployer.deploy(AutomatedReserve, Network.address, LiquidityConversionRates.address, admin);
  await deployer.deploy(WhiteList, admin, KGT.address);
  await deployer.deploy(ExpectedRate, Network.address, KNC.address, admin);
};
