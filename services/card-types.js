export const CARD_BRANDS=["American Express","JCB","MasterCard","NAPAS","Union Pay","Visa"];
export const CARD_RANKS=["Classic","Standard","Gold","Platinum","Infinite","Black Card"];
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
  const text=String(value??"").trim(),match=CARD_RANKS.find(item=>item.toLocaleLowerCase("vi")===text.toLocaleLowerCase("vi"));
  return match||"Standard";
}

export function normalizeOwnershipType(value){
  const text=String(value??"").trim().toLocaleLowerCase("vi");
  return text==="debit"||text.includes("ghi nợ")||text.includes("ghi no")?"debit":"credit";
}
