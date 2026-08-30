export const compareText = (left, right) => String(left ?? "").localeCompare(String(right ?? ""), "vi", {sensitivity:"base", numeric:true});

export const sortByLabel = (items, label) => [...items].sort((a, b) => compareText(label(a), label(b)));

export const compareCards = (left, right, getBankName = () => "") =>
  compareText(getBankName(left), getBankName(right)) ||
  compareText(left?.cardName, right?.cardName) ||
  compareText(left?.cardId, right?.cardId);

export const compareCardId = (left, right) => compareText(left?.cardId, right?.cardId);

export const compareCustomerCardLinks = (left, right, getProduct, getBankName = () => "") => {
  const leftCard=getProduct(left?.cardProductId),rightCard=getProduct(right?.cardProductId);
  return compareCardId(leftCard,rightCard) ||
    compareText(getBankName(leftCard),getBankName(rightCard)) ||
    compareText(leftCard?.cardName,rightCard?.cardName);
};

export const compareCustomers = (left, right) =>
  compareText(left?.fullName, right?.fullName) || compareText(left?.customerCode, right?.customerCode);
