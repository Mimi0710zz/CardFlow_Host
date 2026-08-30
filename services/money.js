const formatter = new Intl.NumberFormat("vi-VN", {maximumFractionDigits:0});
export function parseMoney(value, emptyValue=0){
  if(value == null || value === "") return emptyValue;
  const number = Number(String(value).replace(/[^\d-]/g, ""));
  return Number.isFinite(number) ? number : emptyValue;
}
export function formatMoney(value, currency=false){
  const text = formatter.format(Math.round(parseMoney(value)));
  return currency ? `${text} đ` : text;
}
