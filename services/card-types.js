export const CARD_BRANDS=["American Express","JCB","MasterCard","NAPAS","Union Pay","Visa"];
export const CARD_RANKS=["Classic/Standard","Gold","Platinum","Signature","Infinite/Back Card"];
export const OWNERSHIP_TYPES=["credit","debit"];

const STANDARD_BRANDS=new Map([
  ["american express","American Express"],
  ["amex","American Express"],
  ["jcb","JCB"],
  ["mastercard","MasterCard"],
  ["master card","MasterCard"],
  ["napas","NAPAS"],
  ["union pay","Union Pay"],
  ["unionpay","Union Pay"],
  ["visa","Visa"]
]);

export function normalizeCardBrand(value){
  const text=String(value??"").trim(),key=text.replace(/\s+/g," ").toLocaleLowerCase("vi");
  return STANDARD_BRANDS.get(key)||text;
}

export function normalizeCardRank(value){
  const text=String(value??"").trim(),key=text.toLocaleLowerCase("vi");
  if(key==="classic"||key==="standard"||key==="classic/standard")return "Classic/Standard";
  if(key==="infinite"||key==="black card"||key==="blackcard"||key==="infinite/black card"||key==="infinite/back card")return "Infinite/Back Card";
  return CARD_RANKS.find(item=>item.toLocaleLowerCase("vi")===key)||"Classic/Standard";
}

export function normalizeOwnershipType(value){
  const text=String(value??"").trim().toLocaleLowerCase("vi");
  return text==="debit"||text.includes("ghi nợ")||text.includes("ghi no")?"debit":"credit";
}
