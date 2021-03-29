import { BigInt, Address, store, log } from "@graphprotocol/graph-ts";
import {
  Transfer as TransferEvent,
  ERC20,
} from "../generated/ViralataFinance/ERC20";
import {
  ViralataFinance,
  Approval,
  MinTokensBeforeSwapUpdated,
  OwnershipTransferred,
  SwapAndLiquify as SwapAndLiquifyEvent,
  SwapAndLiquifyEnabledUpdated,
  Transfer
} from "../generated/ViralataFinance/ViralataFinance"
import {
  ReauApproval,
  SwapAndLiquify,
  Token,
  Holder,
} from "../generated/schema";

export function handleApproval(event: Approval): void {
  // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type
  let Reau = ReauApproval.load(event.transaction.from.toHex());

  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  if (Reau == null) {
    Reau = new ReauApproval(event.transaction.from.toHex());

    // Entity fields can be set using simple assignments
    Reau.count = BigInt.fromI32(0);
  }

  // BigInt and BigDecimal math are supported
  Reau.count = Reau.count + BigInt.fromI32(1)

  // Reau fields can be set based on event parameters
  Reau.owner = event.params.owner
  Reau.spender = event.params.spender

  // Entities can be written to the store with `.save()`
  Reau.save()

  // Note: If a handler doesn't require existing field values, it is faster
  // _not_ to load the entity from the store. Instead, create it fresh with
  // `new Entity(...)`, set the fields that should be updated and save the
  // entity back to the store. Fields that were not set or unset remain
  // unchanged, allowing for partial updates to be applied.

  // It is also possible to access smart contracts from mappings. For
  // example, the contract that has emitted the event can be connected to
  // with:
  //
  // let contract = Contract.bind(event.address)
  //
  // The following functions can then be called on this contract to access
  // state variables and other data:
  //
  // - contract._liquidityFee(...)
  // - contract._maxTxAmount(...)
  // - contract._taxFee(...)
  // - contract.allowance(...)
  // - contract.approve(...)
  // - contract.balanceOf(...)
  // - contract.decimals(...)
  // - contract.decreaseAllowance(...)
  // - contract.geUnlockTime(...)
  // - contract.increaseAllowance(...)
  // - contract.isExcludedFromFee(...)
  // - contract.isExcludedFromReward(...)
  // - contract.name(...)
  // - contract.owner(...)
  // - contract.reflectionFromToken(...)
  // - contract.swapAndLiquifyEnabled(...)
  // - contract.symbol(...)
  // - contract.tokenFromReflection(...)
  // - contract.totalFees(...)
  // - contract.totalSupply(...)
  // - contract.transfer(...)
  // - contract.transferFrom(...)
  // - contract.uniswapV2Pair(...)
  // - contract.uniswapV2Router(...)
}

export function handleMinTokensBeforeSwapUpdated(
  event: MinTokensBeforeSwapUpdated
): void {}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {}

export function handleSwapAndLiquify(event: SwapAndLiquifyEvent): void {
  let reau = new SwapAndLiquify(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )

  reau.tokensIntoLiqudity = event.params.tokensIntoLiqudity;
  reau.ethReceived = event.params.ethReceived;
  reau.tokensSwapped = event.params.tokensSwapped;
  reau.save()

}

export function handleSwapAndLiquifyEnabledUpdated(
  event: SwapAndLiquifyEnabledUpdated
): void {}

function updateBalance(
  tokenAddress: Address,
  holderAddress: Address,
  value: BigInt,
  increase: boolean
): void {
  if (
    holderAddress.toHexString() == "0x0000000000000000000000000000000000000000"
  )
    return;
  let id = tokenAddress.toHex() + "-" + holderAddress.toHex();
  let holder = Holder.load(id);
  if (holder == null) {
    holder = new Holder(id);
    holder.address = holderAddress;
    holder.balance = BigInt.fromI32(0);
    holder.token = tokenAddress.toHex();
  }
  holder.balance = increase
    ? holder.balance.plus(value)
    : holder.balance.minus(value);
  if (holder.balance.isZero()) {
    store.remove("Holder", id);
  } else {
    holder.save();
  }
}

function updateTotalSupply(address: Address): void {
  let contract = ERC20.bind(address);
  let token = Token.load(address.toHex());
  if (token == null) {
    token = new Token(address.toHex());
    token.address = address;
    token.totalSupply = BigInt.fromI32(0);
  }
  token.totalSupply = contract.totalSupply();
  token.save();
}

export function handleTransfer(event: TransferEvent): void {
  updateTotalSupply(event.address);
  updateBalance(event.address, event.params.from, event.params.value, false);
  updateBalance(event.address, event.params.to, event.params.value, true);
}