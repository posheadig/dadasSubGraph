// Import necessary classes from graph-ts
import { BigInt, ethereum, log } from "@graphprotocol/graph-ts";
import {
  Swap as SwapEvent,
  Sync as SyncEvent
} from "../../generated/UniswapV2Pair/UniswapV2Pair";
import { UniswapV2Pair as UniswapV2PairContract } from "../../generated/UniswapV2Pair/UniswapV2Pair";
import { Pair, SwapTransaction } from "../../generated/schema";

// Handler for Swap events
export function handleSwap(event: SwapEvent): void {
  let transaction = new SwapTransaction(event.transaction.hash.toHex() + "-" + event.logIndex.toString());
  transaction.sender = event.params.sender;
  transaction.amount0In = event.params.amount0In;
  transaction.amount1In = event.params.amount1In;
  transaction.amount0Out = event.params.amount0Out;
  transaction.amount1Out = event.params.amount1Out;
  transaction.to = event.params.to;
  transaction.save();

  let pairId = event.address.toHex();
  let pair = Pair.load(pairId);
  if (pair == null) {
    log.warning("Pair not found: {}", [pairId]);
    return;
  }

  let pairContract = UniswapV2PairContract.bind(event.address);
  let reserves = pairContract.getReserves();
  pair.reserve0 = reserves.value0;
  pair.reserve1 = reserves.value1;
  pair.save();
}

// Handler for Sync events
export function handleSync(event: SyncEvent): void {
  let pairId = event.address.toHex();
  let pair = Pair.load(pairId);
  if (pair == null) {
    log.warning("Pair not found: {}", [pairId]);
    return;
  }

  pair.reserve0 = event.params.reserve0;
  pair.reserve1 = event.params.reserve1;
  pair.save();
}

// Add any other event handlers as necessary
