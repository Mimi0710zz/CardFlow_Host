import {parseMoney} from "./money.js";

export function parsePercent(value){
  if(value == null || value === "") return 0;
  const number=Number(String(value).replace("%","").replace(",",".").trim());
  return Number.isFinite(number) ? number : 0;
}

export function formatPercent(value){
  return `${parsePercent(value).toFixed(1)}%`;
}

export function calculateTransactionAmounts({amount=0,orderFeePercent=0,orderFeeFixed=0,sourceFeePercent=0,sourceFeeFixed=0}={}){
  const gross=parseMoney(amount);
  const customerNetAmount=Math.round(gross-(gross*parsePercent(orderFeePercent)/100)-parseMoney(orderFeeFixed));
  const sourceNetAmount=Math.round(gross-(gross*parsePercent(sourceFeePercent)/100)-parseMoney(sourceFeeFixed));
  return {customerNetAmount,sourceNetAmount,profit:sourceNetAmount-customerNetAmount};
}
