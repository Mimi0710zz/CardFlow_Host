export const compareText = (left, right) => String(left ?? "").localeCompare(String(right ?? ""), "vi", {sensitivity:"base", numeric:true});

export const sortByLabel = (items, label) => [...items].sort((a, b) => compareText(label(a), label(b)));

export const compareCards = (left, right, getBankName = () => "") =>
  compareText(getBankName(left), getBankName(right)) ||
  compareText(left?.cardName, right?.cardName) ||
  compareText(left?.cardId, right?.cardId);

const cardIdText=value=>String(value?.cardId??value?.cardID??"").trim();

export const compareCardId = (left, right) => compareText(cardIdText(left),cardIdText(right));

export const compareCustomerCardLinks = (left, right, getProduct, getBankName = () => "") => {
  const leftCard=getProduct(left?.cardProductId),rightCard=getProduct(right?.cardProductId);
  return compareCardId(leftCard,rightCard) ||
    compareText(getBankName(leftCard),getBankName(rightCard)) ||
    compareText(leftCard?.cardName,rightCard?.cardName);
};

export function buildSortedCustomerCardRows(links=[],cardProducts=[],banks=[]){
  const productsById=new Map(cardProducts.map(card=>[card?.id,card])),banksById=new Map(banks.map(bank=>[bank?.id,bank]));
  return links.map(link=>{const card=productsById.get(link?.cardProductId);if(!card)return null;return {link,card,cardId:cardIdText(card),bankName:String(banksById.get(card.bankId)?.name??"").trim(),cardName:String(card.cardName??"").trim()};}).filter(Boolean).sort((left,right)=>compareCardId(left,right)||compareText(left.bankName,right.bankName)||compareText(left.cardName,right.cardName));
}

export const compareCustomers = (left, right) =>
  compareText(left?.fullName, right?.fullName) || compareText(left?.customerCode, right?.customerCode);
