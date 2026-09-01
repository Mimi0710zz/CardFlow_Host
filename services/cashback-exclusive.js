import {isMccCategoryEligible} from "./cashback-program.js";

export const EXCLUSIVE_NONE="none";
export const EXCLUSIVE_FIRST_REACHED="first_reached";

export function normalizeExclusiveProgram(program={}){
 const exclusiveMode=program.exclusiveMode===EXCLUSIVE_FIRST_REACHED?EXCLUSIVE_FIRST_REACHED:EXCLUSIVE_NONE;
 return {exclusiveMode,exclusiveGroupId:exclusiveMode===EXCLUSIVE_FIRST_REACHED?String(program.exclusiveGroupId||"").trim():null};
}

export function validateExclusiveProgram(program,programs=[]){
 const {exclusiveMode,exclusiveGroupId}=normalizeExclusiveProgram(program);
 if(exclusiveMode===EXCLUSIVE_NONE)return {valid:true};
 if(!exclusiveGroupId)return {valid:false,error:"Nhóm loại trừ là bắt buộc."};
 if(program.maxCashbackUnlimited||!Number.isFinite(Number(program.eligibleTarget))||Number(program.eligibleTarget)<=0)return {valid:false,error:"Chương trình loại trừ cần chỉ tiêu hợp lệ lớn hơn 0."};
 const crossCard=programs.some(item=>item?.id!==program.id&&normalizeExclusiveProgram(item).exclusiveMode===EXCLUSIVE_FIRST_REACHED&&String(item.exclusiveGroupId||"").trim()===exclusiveGroupId&&item.bankCardProductId!==program.bankCardProductId);
 return crossCard?{valid:false,error:"Nhóm loại trừ không được dùng chung giữa các Card ID."}:{valid:true};
}

const eligible=(program,tx)=>program.status!=="inactive"&&(!program.startDate||tx.date>=program.startDate)&&(!program.endDate||tx.date<=program.endDate)&&(!program.transactionMethod||program.transactionMethod===tx.transactionMethod)&&isMccCategoryEligible(program,tx.mccCategoryId);
const timeInfo=tx=>{
 const candidates=[tx.timestamp,tx.dateTime,tx.datetime];
 for(const value of candidates){const ms=Date.parse(value);if(value&&Number.isFinite(ms))return {key:ms,precise:true,value:new Date(ms).toISOString()};}
 const date=String(tx.date||"").slice(0,10),ms=Date.parse(`${date}T00:00:00Z`);return {key:Number.isFinite(ms)?ms:Infinity,precise:false,value:date};
};

export function resolveExclusiveGroupProgress({programs=[],transactions=[],customerCard,cycle}={}){
 const members=programs.filter(program=>program?.bankCardProductId===customerCard?.cardProductId&&normalizeExclusiveProgram(program).exclusiveMode===EXCLUSIVE_FIRST_REACHED);
 const results={};
 for(const program of members){
  const validation=validateExclusiveProgram(program,programs);
  let spend=0,reached=null;
  const txs=transactions.filter(tx=>tx?.customerCardId===customerCard?.id&&tx.status!=="cancelled"&&tx.cashbackProgramId===program.id&&tx.date>=cycle?.start&&tx.date<=cycle?.end&&eligible(program,tx)).map((tx,index)=>({tx,index,time:timeInfo(tx)})).sort((a,b)=>a.time.key-b.time.key||(a.time.precise&&b.time.precise?String(a.tx.id||"").localeCompare(String(b.tx.id||"")):a.index-b.index));
  for(const entry of txs){spend+=Number(entry.tx.amount)||0;if(!reached&&validation.valid&&spend>=Number(program.eligibleTarget))reached={reachedAt:entry.time.value,reachedKey:entry.time.key,reachedPrecise:entry.time.precise,reachedTransactionId:entry.tx.id||null};}
  results[program.id]={programId:program.id,eligibleSpend:spend,...(reached||{}),configurationValid:validation.valid,configurationError:validation.error||""};
 }
 const reached=members.map(program=>results[program.id]).filter(item=>item.reachedAt).sort((a,b)=>a.reachedKey-b.reachedKey);
 let winnerProgramId=null,tieProgramIds=[];
 if(reached.length){const first=reached[0],same=reached.filter(item=>item.reachedKey===first.reachedKey);if(same.length>1&&same.some(item=>!item.reachedPrecise)){tieProgramIds=same.map(item=>item.programId);}else winnerProgramId=first.programId;}
 for(const program of members){const item=results[program.id];if(!item.configurationValid)item.status="configuration-incomplete";else if(tieProgramIds.includes(program.id))item.status="needs-confirmation";else if(winnerProgramId===program.id){item.status="completed";item.isExclusiveWinner=true;}else if(winnerProgramId){item.status="locked";item.lockedByProgramId=winnerProgramId;}else item.status="incomplete";}
 return {winnerProgramId,tieProgramIds,status:tieProgramIds.length?"needs-confirmation":winnerProgramId?"completed":"incomplete",programs:results};
}
