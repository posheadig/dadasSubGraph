import { BigInt } from "@graphprotocol/graph-ts"
import {
  ovTokenBase as ovTokenBaseContract,
  TokenCreated as TokenCreatedEvent,
} from "../generated/ovTokenBase/ovTokenBase"
import { PairCreated as PairCreatedEvent } from "../generated/ovPoolBase/ovPoolBase"
import { UniswapV2Pair as UniswapV2PairContract } from "../generated/UniswapV2Pair/UniswapV2Pair"
import { Factory as FactoryContract } from "../generated/Factory/Factory"
import { Token, Pair } from "../generated/schema"
import { NameAsSymbolERC20 as NameAsSymbolERC20Contract } from "../generated/ovTokenBase/NameAsSymbolERC20"

export function handleTokenCreated(event: TokenCreatedEvent): void {
  let token = new Token(event.params.token.toHex())
  let contract = NameAsSymbolERC20Contract.bind(event.params.token)
  
  // Call the 'name' function on your ERC20 contract
  token.name = contract.name()

  token.address = event.params.token
  // Remove the line with 'owner' if it's not in your schema
  // token.owner = event.params.owner
  token.save()

  let factoryAddress = "0x7E0987E5b3a30e3f2828572Bb659A548460a3003"; 
let wethAddress = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9"; 
let factoryContract = FactoryContract.bind(Address.fromString(factoryAddress));
let pairAddress = factoryContract.getPair(event.params.token, Address.fromString(wethAddress));

if (pairAddress != null) {
  // Now you can create or update the Pair entity with this pair address
  let pair = Pair.load(pairAddress.toHex());
  if (pair == null) {
    pair = new Pair(pairAddress.toHex());
    pair.tokenA = event.params.token;
    pair.tokenB = Address.fromString(wethAddress);
    // Other pair initializations
  }
  // Update other pair details if necessary
  pair.save();
}
}


export function handlePairCreated(event: PairCreatedEvent): void {
  let pair = new Pair(event.params.pair.toHex())

  pair.tokenA = event.params.tokenA
  pair.tokenB = event.params.tokenB
  let tokenAContract = NameAsSymbolERC20Contract.bind(event.params.tokenA)
  let tokenBContract = NameAsSymbolERC20Contract.bind(event.params.tokenB)
  pair.token0Name = tokenAContract.name()
  pair.token1Name = tokenBContract.name()
  pair.address = event.params.pair
  
  updatePairReserves(event.params.pair);
  pair.save()
}

export function updatePairReserves(pairAddress: Bytes): void {
  let pair = UniswapV2PairContract.bind(pairAddress);
  let reserves = pair.getReserves();
  let pairEntity = Pair.load(pairAddress.toHex());
  
  if (pairEntity == null) {
    pairEntity = new Pair(pairAddress.toHex());
    // other initializations
  }
  
  pairEntity.reserve0 = reserves.value0;
  pairEntity.reserve1 = reserves.value1;
  pairEntity.lastUpdated = pairEntity.block.number;
  
  pairEntity.save();
}

export function dummyEventHandler(event: EthereumEvent): void {
  // This is a dummy handler and does nothing
}
