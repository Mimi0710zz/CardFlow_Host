import {calculateCashbackCycle,daysRemaining} from "./cashback-cycle.js";
import {isMccCategoryEligible} from "./cashback-program.js?v=20260901-drive-connect-hotfix-v82";

export const isProgramEligible=(program,tx)=>!!program&&program.status!=="inactive"&&(!program.startDate||tx.date>=program.startDate)&&(!program.endDate||tx.date<=program.endDate)&&(!program.transactionMethod||program.transactionMethod===tx.transactionMethod)&&isMccCategoryEligible(program,tx.mccCategoryId);

export function calculateProgress({customerCard,product,program,transactions=[],referenceDate=new Date(),programs=[]}){
 if(!customerCard||!product||!program)return {valid:false,status:"configuration-incomplete",warning:"Chưa có đủ cấu hình chương trình hoàn tiền."};
 const mode=customerCard.cashbackCycleModeOverride||product.cashbackCycleMode||"monthly",statementDay=customerCard.statementDay||product.defaultStatementDay;
 const cycle=calculateCashbackCycle({mode,statementDay,referenceDate});if(!cycle.valid)return {...cycle,status:"configuration-incomplete"};
 const cardTx=transactions.filter(t=>t.customerCardId===customerCard.id&&t.status!=="cancelled"&&t.date>=cycle.start&&t.date<=cycle.end),totalCardSpend=cardTx.reduce((s,t)=>s+Number(t.amount||0),0);
 const eligibleTx=cardTx.filter(t=>t.cashbackProgramId===program.id&&isProgramEligible(program,t)),eligibleSpend=eligibleTx.reduce((s,t)=>s+Number(t.amount||0),0),rate=Number(program.rate)||0;
 let cashbackEarned=eligibleSpend*rate/100;
 if(program.sharedCashbackGroup){const peers=programs.filter(p=>p?.sharedCashbackGroup===program.sharedCashbackGroup),cap=Math.max(...peers.filter(p=>!p.maxCashbackUnlimited).map(p=>Number(p.maxCashback)||0),0),shared=cardTx.filter(t=>peers.some(p=>p.id===t.cashbackProgramId)).reduce((s,t)=>{const p=peers.find(x=>x.id===t.cashbackProgramId);return s+Number(t.amount||0)*(Number(p?.rate)||0)/100;},0);if(cap)cashbackEarned=Math.min(cashbackEarned,Math.max(0,cap-(shared-cashbackEarned)));}
 if(!program.maxCashbackUnlimited)cashbackEarned=Math.min(cashbackEarned,Number(program.maxCashback)||0);
 const eligibleTarget=program.maxCashbackUnlimited?null:(Number(program.eligibleTarget)||((Number(program.maxCashback)||0)/(rate/100||1))),totalTarget=program.totalTarget==null?null:Number(program.totalTarget),remainingEligibleSpend=eligibleTarget==null?null:Math.max(0,eligibleTarget-eligibleSpend),remainingTotalSpend=totalTarget==null?null:Math.max(0,totalTarget-totalCardSpend),complete=!program.maxCashbackUnlimited&&remainingEligibleSpend===0&&(remainingTotalSpend==null||remainingTotalSpend===0);
 return {valid:true,cycleStart:cycle.start,cycleEnd:cycle.end,eligibleSpend,totalCardSpend,cashbackEarned,maxCashback:program.maxCashbackUnlimited?null:Number(program.maxCashback)||0,eligibleTarget,totalTarget,remainingEligibleSpend,remainingTotalSpend,progressPercent:eligibleTarget?Math.min(100,eligibleSpend/eligibleTarget*100):null,daysRemaining:daysRemaining(cycle.end,referenceDate),status:complete?"completed":"incomplete",mode};
}
