const pad = value => String(value).padStart(2, "0");
export function toStorageDate(value){
  if(!value) return "";
  if(value instanceof Date && !Number.isNaN(value.getTime())) return `${value.getFullYear()}-${pad(value.getMonth()+1)}-${pad(value.getDate())}`;
  const text = String(value).trim();
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if(!match) { const alt=text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/); if(alt) match=[alt[0],alt[3],alt[2],alt[1]]; }
  if(!match) return "";
  const y=+match[1], m=+match[2], d=+match[3], date=new Date(y,m-1,d);
  return date.getFullYear()===y && date.getMonth()===m-1 && date.getDate()===d ? `${y}-${pad(m)}-${pad(d)}` : "";
}
export function formatDate(value){ const date=toStorageDate(value); return date ? `${date.slice(8,10)}-${date.slice(5,7)}-${date.slice(0,4)}` : ""; }
export function formatDay(value){ return value ? `Ngày ${pad(value)}` : "—"; }
