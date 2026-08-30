export const CARD_BRANDS=["American Express","JCB","MasterCard","NAPAS","Union Pay","Visa"];

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
