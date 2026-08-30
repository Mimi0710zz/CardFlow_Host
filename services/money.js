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

export function formatVndInput(value){
  const digits=String(value??"").replace(/\D/g,"");
  return digits ? `${formatter.format(Number(digits))} đ` : "";
}

export function bindVndInput(input){
  if(!input)return;
  const format=()=>{
    const digitsBeforeCaret=String(input.value).slice(0,input.selectionStart??input.value.length).replace(/\D/g,"").length;
    input.value=formatVndInput(input.value);
    if(!input.value)return;
    let seen=0,caret=0;
    while(caret<input.value.length&&seen<digitsBeforeCaret){if(/\d/.test(input.value[caret]))seen+=1;caret+=1;}
    input.setSelectionRange(caret,caret);
  };
  input.addEventListener("input",format);
  input.addEventListener("focus",()=>{if(input.value)input.value=formatVndInput(input.value);});
}
