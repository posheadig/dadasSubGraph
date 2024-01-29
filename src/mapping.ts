import { BigInt, Address, ethereum, log } from "@graphprotocol/graph-ts";
import {
  ovTokenBase as ovTokenBaseContract,
  TokenCreated as TokenCreatedEvent
} from "../generated/ovTokenBase/ovTokenBase";
import { PairCreated as PairCreatedEvent } from "../generated/ovPoolBase/ovPoolBase";
import { UniswapV2Pair as UniswapV2PairContract } from "../generated/UniswapV2Pair/UniswapV2Pair";
import { Factory as FactoryContract } from "../generated/Factory/Factory";
import { Token, Pair } from "../generated/schema";
import { SwapTransaction } from "../generated/schema";
import { PairTemplate } from "../generated/templates";
import { NameAsSymbolERC20 as NameAsSymbolERC20Contract } from "../generated/ovTokenBase/NameAsSymbolERC20";

export function handleTokenCreated(event: TokenCreatedEvent): void {
  let token = new Token(event.params.token.toHex());
  let contract = NameAsSymbolERC20Contract.bind(event.params.token);
  token.name = contract.name();
  token.address = event.params.token;
  token.save();

  let factoryAddress = "0x7E0987E5b3a30e3f2828572Bb659A548460a3003";
  let wethAddress = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";
  let factoryContract = FactoryContract.bind(Address.fromString(factoryAddress));

  let pairAddressResult = factoryContract.try_getPair(event.params.token, Address.fromString(wethAddress));
  if (pairAddressResult.reverted) {
    log.warning("getPair call reverted for tokens: {} and {}", [event.params.token.toHex(), wethAddress]);
    return;
  }

  let pairAddress = pairAddressResult.value;
  if (pairAddress.toHex() == "0x0000000000000000000000000000000000000000") {
    log.info("No pair exists for token: {}", [event.params.token.toHex()]);
    return;
  }
  PairTemplate.create(pairAddress);
  let pair = Pair.load(pairAddress.toHex());
  if (pair == null) {
    pair = new Pair(pairAddress.toHex());
    let pairData = UniswapV2PairContract.bind(pairAddress);
    let token0Address = pairData.token0();
    let token1Address = pairData.token1();
    let reserves = pairData.getReserves();

    // Assign token addresses
    pair.token0 = token0Address;
    pair.token1 = token1Address;
    pair.address = pairAddress;

    // Assign names
    let token0Contract = NameAsSymbolERC20Contract.bind(token0Address);
    let token1Contract = NameAsSymbolERC20Contract.bind(token1Address);
    pair.token0Name = token0Contract.name();
    pair.token1Name = token1Contract.name();

    // Assign reserves
    pair.reserve0 = reserves.value0;
    pair.reserve1 = reserves.value1;
    pair.save();
    log.info("Created new pair: {}", [pair.id]);
  }
}

export function handlePairCreated(event: PairCreatedEvent): void {
  PairTemplate.create(event.params.pair);
  let pair = new Pair(event.params.pair.toHex());
  let pairContract = UniswapV2PairContract.bind(event.params.pair);

  let token0Address = pairContract.token0();
  let token1Address = pairContract.token1();
  let reserves = pairContract.getReserves();

  pair.token0 = token0Address;
  pair.token1 = token1Address;
  pair.address = event.params.pair;

  // Assign names
  let token0Contract = NameAsSymbolERC20Contract.bind(token0Address);
  let token1Contract = NameAsSymbolERC20Contract.bind(token1Address);
  pair.token0Name = token0Contract.name();
  pair.token1Name = token1Contract.name();

  // Assign reserves directly
  pair.reserve0 = reserves.value0;
  pair.reserve1 = reserves.value1;

  pair.save();
}

export function dummyEventHandler(event: ethereum.Event): void {
  // This is a dummy handler and does nothing
}
