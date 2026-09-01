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

export function exclusiveProgramOptions(programs=[],bankCardProductId="",currentProgramId=""){
 return programs.filter(item=>item?.id!==currentProgramId&&item?.bankCardProductId===bankCardProductId).sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""),"vi",{sensitivity:"base"}));
}

export function selectedExclusiveProgramIds(program={},programs=[]){
 const normalized=normalizeExclusiveProgram(program);if(normalized.exclusiveMode!==EXCLUSIVE_FIRST_REACHED||!normalized.exclusiveGroupId)return [];
 return exclusiveProgramOptions(programs,program.bankCardProductId,program.id).filter(item=>normalizeExclusiveProgram(item).exclusiveGroupId===normalized.exclusiveGroupId).map(item=>item.id);
}

const normalizeSingleMemberGroups=programs=>{const counts=new Map();for(const item of programs){const normalized=normalizeExclusiveProgram(item);if(normalized.exclusiveMode===EXCLUSIVE_FIRST_REACHED&&normalized.exclusiveGroupId)counts.set(normalized.exclusiveGroupId,(counts.get(normalized.exclusiveGroupId)||0)+1);}return programs.map(item=>{const normalized=normalizeExclusiveProgram(item);return normalized.exclusiveMode===EXCLUSIVE_FIRST_REACHED&&counts.get(normalized.exclusiveGroupId)<2?{...item,exclusiveMode:EXCLUSIVE_NONE,exclusiveGroupId:null}:item;});};

export function applyExclusiveProgramSelection({programs=[],currentProgram,selectedProgramIds=[],makeId=()=>crypto.randomUUID()}={}){
 const source=(Array.isArray(programs)?programs:[]).map(item=>({...item})),selectedIds=[...new Set(selectedProgramIds)].filter(id=>id&&id!==currentProgram?.id),mode=currentProgram?.exclusiveMode===EXCLUSIVE_FIRST_REACHED?EXCLUSIVE_FIRST_REACHED:EXCLUSIVE_NONE,old=source.find(item=>item.id===currentProgram?.id),oldGroup=normalizeExclusiveProgram(old||{}).exclusiveGroupId;
 const candidateIds=new Set(exclusiveProgramOptions(source,currentProgram?.bankCardProductId,currentProgram?.id).map(item=>item.id));
 if(mode===EXCLUSIVE_FIRST_REACHED&&selectedIds.length===0)return {valid:false,error:"Vui lòng chọn ít nhất một chương trình loại trừ cùng nhóm.",programs:source};
 if(selectedIds.some(id=>!candidateIds.has(id)))return {valid:false,error:"Chương trình loại trừ phải thuộc cùng Card ID.",programs:source};
 let next=source.filter(item=>item.id!==currentProgram.id);next.push({...currentProgram,exclusiveMode:mode,exclusiveGroupId:null});
 if(mode===EXCLUSIVE_NONE){next=next.map(item=>item.id===currentProgram.id?{...item,exclusiveMode:EXCLUSIVE_NONE,exclusiveGroupId:null}:item);return {valid:true,groupId:null,programs:normalizeSingleMemberGroups(next)};}
 const selectedPrograms=next.filter(item=>selectedIds.includes(item.id)),externalGroupIds=[...new Set(selectedPrograms.map(item=>normalizeExclusiveProgram(item).exclusiveGroupId).filter(group=>group&&group!==oldGroup))].sort(),survivingGroupId=externalGroupIds[0]||oldGroup||`EXG_${makeId()}`;
 const joinedIds=new Set([currentProgram.id,...selectedIds]);for(const item of next)if(externalGroupIds.includes(normalizeExclusiveProgram(item).exclusiveGroupId))joinedIds.add(item.id);
 next=next.map(item=>{
  if(item.bankCardProductId!==currentProgram.bankCardProductId)return item;
  const group=normalizeExclusiveProgram(item).exclusiveGroupId;
  if(joinedIds.has(item.id))return {...item,exclusiveMode:EXCLUSIVE_FIRST_REACHED,exclusiveGroupId:survivingGroupId};
  if(group===oldGroup||externalGroupIds.includes(group))return {...item,exclusiveMode:EXCLUSIVE_NONE,exclusiveGroupId:null};
  return item;
 });
 return {valid:true,groupId:survivingGroupId,programs:normalizeSingleMemberGroups(next)};
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
  let spend=0,totalSpend=0,reached=null;const eligibleTarget=Number(program.eligibleTarget),totalTarget=program.totalTarget==null?null:Number(program.totalTarget);
  const txs=transactions.filter(tx=>tx?.customerCardId===customerCard?.id&&tx.status!=="cancelled"&&tx.date>=cycle?.start&&tx.date<=cycle?.end).map((tx,index)=>({tx,index,time:timeInfo(tx)})).sort((a,b)=>a.time.key-b.time.key||(a.time.precise&&b.time.precise?String(a.tx.id||"").localeCompare(String(b.tx.id||"")):a.index-b.index));
  for(const entry of txs){totalSpend+=Number(entry.tx.amount)||0;if(entry.tx.cashbackProgramId===program.id&&eligible(program,entry.tx))spend+=Number(entry.tx.amount)||0;const eligibleReached=spend>=eligibleTarget,totalReached=totalTarget==null||totalSpend>=totalTarget;if(!reached&&validation.valid&&eligibleReached&&totalReached)reached={reachedAt:entry.time.value,reachedKey:entry.time.key,reachedPrecise:entry.time.precise,reachedTransactionId:entry.tx.id||null};}
  results[program.id]={programId:program.id,eligibleSpend:spend,totalCardSpend:totalSpend,...(reached||{}),configurationValid:validation.valid,configurationError:validation.error||""};
 }
 const reached=members.map(program=>results[program.id]).filter(item=>item.reachedAt).sort((a,b)=>a.reachedKey-b.reachedKey);
 let winnerProgramId=null,tieProgramIds=[];
 if(reached.length){const first=reached[0],same=reached.filter(item=>item.reachedKey===first.reachedKey);if(same.length>1&&same.some(item=>!item.reachedPrecise)){tieProgramIds=same.map(item=>item.programId);}else winnerProgramId=first.programId;}
 for(const program of members){const item=results[program.id];if(!item.configurationValid)item.status="configuration-incomplete";else if(tieProgramIds.includes(program.id))item.status="needs-confirmation";else if(winnerProgramId===program.id){item.status="completed";item.isExclusiveWinner=true;}else if(winnerProgramId){item.status="locked";item.lockedByProgramId=winnerProgramId;}else item.status="incomplete";}
 return {winnerProgramId,tieProgramIds,status:tieProgramIds.length?"needs-confirmation":winnerProgramId?"completed":"incomplete",programs:results};
}
