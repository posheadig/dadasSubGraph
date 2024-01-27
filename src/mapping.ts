import { BigInt, Address, ethereum, log } from "@graphprotocol/graph-ts";
import {
  ovTokenBase as ovTokenBaseContract,
  TokenCreated as TokenCreatedEvent
} from "../generated/ovTokenBase/ovTokenBase";
import { PairCreated as PairCreatedEvent } from "../generated/ovPoolBase/ovPoolBase";
import { UniswapV2Pair as UniswapV2PairContract } from "../generated/UniswapV2Pair/UniswapV2Pair";
import { Factory as FactoryContract } from "../generated/Factory/Factory";
import { Token, Pair } from "../generated/schema";
import { NameAsSymbolERC20 as NameAsSymbolERC20Contract } from "../generated/ovTokenBase/NameAsSymbolERC20";

const WEI_IN_ETHER = BigInt.fromI32(10).pow(18);

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

  let pair = Pair.load(pairAddress.toHex());
  if (pair == null) {
    pair = new Pair(pairAddress.toHex());
    let pairData = UniswapV2PairContract.bind(pairAddress);
    let token0Address = pairData.token0();
    let token1Address = pairData.token1();
    let reserves = pairData.getReserves();

    pair.tokenA = event.params.token;
    pair.tokenB = Address.fromString(wethAddress);
    pair.address = pairAddress;

    // Convert addresses to strings for comparison
    let tokenAStr = event.params.token.toHex();
    let token0Str = token0Address.toHex();
    let token1Str = token1Address.toHex();

    // Assign reserves and names based on the sorted order of token addresses
    pair.reserve0 = tokenAStr < token1Str ? reserves.value0.div(WEI_IN_ETHER) : reserves.value1.div(WEI_IN_ETHER);
    pair.reserve1 = tokenAStr < token1Str ? reserves.value1.div(WEI_IN_ETHER) : reserves.value0.div(WEI_IN_ETHER);

    let tokenAContract = NameAsSymbolERC20Contract.bind(token0Address);
    let tokenBContract = NameAsSymbolERC20Contract.bind(token1Address);
    pair.token0Name = tokenAContract.name();
    pair.token1Name = tokenBContract.name();

    pair.save();
    log.info("Created new pair: {}", [pair.id]);
  }
}


export function handlePairCreated(event: PairCreatedEvent): void {
  let pair = new Pair(event.params.pair.toHex());
  let pairContract = UniswapV2PairContract.bind(event.params.pair);

  let token0Address = pairContract.token0();
  let token1Address = pairContract.token1();
  let reserves = pairContract.getReserves();

  // Convert addresses to strings for comparison
  let tokenAStr = event.params.tokenA.toHex();
  let tokenBStr = event.params.tokenB.toHex();
  let token0Str = token0Address.toHex();
  let token1Str = token1Address.toHex();

  // Assign tokens A and B based on the event parameters
  pair.tokenA = event.params.tokenA;
  pair.tokenB = event.params.tokenB;
  pair.address = event.params.pair;

  // Assign token names and reserves based on the sorted order of token addresses
  let tokenAContract = NameAsSymbolERC20Contract.bind(token0Address);
  let tokenBContract = NameAsSymbolERC20Contract.bind(token1Address);
  pair.token0Name = tokenAContract.name();
  pair.token1Name = tokenBContract.name();

  pair.reserve0 = tokenAStr < token1Str ? reserves.value0.div(WEI_IN_ETHER) : reserves.value1.div(WEI_IN_ETHER);
  pair.reserve1 = tokenAStr < token1Str ? reserves.value1.div(WEI_IN_ETHER) : reserves.value0.div(WEI_IN_ETHER);

  pair.save();
}


export function dummyEventHandler(event: ethereum.Event): void {
  // This is a dummy handler and does nothing
}
