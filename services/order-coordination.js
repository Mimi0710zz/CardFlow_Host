import {calculateProgress,isProgramEligible} from "./cashback-progress.js?v=20260901-cashback-mcc-selector-v5";
import {getProgramPriority} from "./cashback-program.js?v=20260901-cashback-mcc-selector-v5";
function coordinationRow(state,customerCard,product,program,referenceDate){
 const customer=state.customers.find(x=>x.id===customerCard.customerId);if(!customer)return null;
 return {customer,customerCard,product,program,progress:calculateProgress({customerCard,product,program,transactions:state.transactions,programs:state.cashbackPrograms,referenceDate})};
}
export function buildCoordinationRows(state,referenceDate=new Date()){
 const rows=[];for(const card of state.customerCards.filter(x=>x?.status==="active")){const product=state.cardProducts.find(x=>x?.id===card.cardProductId);if(!product)continue;for(const program of state.cashbackPrograms.filter(x=>x?.bankCardProductId===product.id&&x.status==="active")){const row=coordinationRow(state,card,product,program,referenceDate);if(row)rows.push(row);}}return rows.sort((a,b)=>(a.progress.status==="completed")-(b.progress.status==="completed")||String(a.progress.cycleEnd||"9999").localeCompare(String(b.progress.cycleEnd||"9999"))||getProgramPriority(b.program)-getProgramPriority(a.program));
}
export function buildCoordinationRowsForSelection(state,{cardProductId="",programId="",referenceDate=new Date()}={}){
 const product=state.cardProducts.find(x=>x.id===cardProductId);if(!product)return [];
 const program=state.cashbackPrograms.find(x=>x.id===programId&&x.bankCardProductId===product.id&&x.status==="active");if(!program)return [];
 return state.customerCards.filter(x=>x.status==="active"&&x.cardProductId===product.id).map(card=>coordinationRow(state,card,product,program,referenceDate)).filter(Boolean);
}
export function recommendOrders(state,{amount=0,mccCategoryId="",transactionMethod="",referenceDate=new Date()}={}){return buildCoordinationRows(state,referenceDate).filter(x=>x.progress.valid&&x.progress.status!=="completed"&&isProgramEligible(x.program,{date:new Date(referenceDate).toISOString().slice(0,10),mccCategoryId,transactionMethod})).map(x=>{const eligibleAmount=Number(amount)||0,incremental=Math.min(eligibleAmount*(Number(x.program.rate)||0)/100,x.program.maxCashbackUnlimited?Infinity:Math.max(0,(Number(x.program.maxCashback)||0)-x.progress.cashbackEarned));return {...x,eligibleAmount,incrementalCashback:incremental,remainingAfter:x.progress.remainingEligibleSpend==null?null:Math.max(0,x.progress.remainingEligibleSpend-eligibleAmount)};}).sort((a,b)=>b.incrementalCashback-a.incrementalCashback||a.progress.daysRemaining-b.progress.daysRemaining);}
