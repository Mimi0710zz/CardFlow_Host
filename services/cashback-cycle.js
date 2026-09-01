const dateOnly=value=>{const source=value instanceof Date?new Date(value):new Date(`${value}T00:00:00`);if(Number.isNaN(source.getTime()))return null;return new Date(source.getFullYear(),source.getMonth(),source.getDate());};
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const lastDay=(year,month)=>new Date(year,month+1,0).getDate();
export function statementDate(year,month,day){return new Date(year,month,Math.min(day,lastDay(year,month)));}
export function calculateCashbackCycle({mode="monthly",statementDay="",referenceDate=new Date()}={}){
  const ref=dateOnly(referenceDate);if(!ref)return {valid:false,warning:"Ngày tham chiếu không hợp lệ"};
  if(mode==="monthly"){const start=new Date(ref.getFullYear(),ref.getMonth(),1),end=new Date(ref.getFullYear(),ref.getMonth()+1,0);return {valid:true,mode,start:iso(start),end:iso(end)};}
  const day=Number(statementDay);if(!Number.isInteger(day)||day<1||day>31)return {valid:false,mode,warning:"Chưa cấu hình ngày sao kê cho thẻ của khách hàng này."};
  let end=statementDate(ref.getFullYear(),ref.getMonth(),day);if(ref>end)end=statementDate(ref.getFullYear(),ref.getMonth()+1,day);
  const previous=statementDate(end.getFullYear(),end.getMonth()-1,day),start=new Date(previous);start.setDate(start.getDate()+1);
  return {valid:true,mode,start:iso(start),end:iso(end)};
}
export function effectiveCashbackCycleMode(customerCard={},cardProduct={}){return customerCard.cashbackCycleModeOverride==="monthly"||customerCard.cashbackCycleModeOverride==="statement"?customerCard.cashbackCycleModeOverride:(cardProduct.cashbackCycleMode==="statement"?"statement":"monthly");}
export function customerCardCycleConfig(customerCard={},cardProduct={}){const mode=effectiveCashbackCycleMode(customerCard,cardProduct);return {mode,statementDay:mode==="statement"?customerCard.statementDay:"",statementDayRequired:mode==="statement"};}
export function daysRemaining(end,referenceDate=new Date()){const a=dateOnly(referenceDate),b=dateOnly(end);return a&&b?Math.max(0,Math.ceil((b-a)/86400000)):null;}
