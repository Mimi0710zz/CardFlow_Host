export const DEFAULT_PROGRAM_PRIORITY=0;
export const ALL_MCC_VALUE="__ALL_MCC__";
export const CASHBACK_COMBINE_OPERATORS=Object.freeze(["AND","OR"]);
export function normalizeCombineOperator(value){const normalized=String(value||"").trim().toUpperCase();return CASHBACK_COMBINE_OPERATORS.includes(normalized)?normalized:"OR";}
export function normalizeTransactionMethod(value){const normalized=String(value||"").trim().toLowerCase();if(normalized==="online")return "Online";if(normalized==="offline"||normalized==="pos"||normalized==="quẹt pos")return "Offline";return "";}
export function calculateConditionMinSpend(rate,maxCashback){const normalizedRate=Number(rate)||0,normalizedMax=Number(maxCashback)||0;return normalizedRate>0&&normalizedMax>0?Math.round(normalizedMax/(normalizedRate/100)):null;}
export function getProgramPriority(program){
  if(!program)return DEFAULT_PROGRAM_PRIORITY;
  const value=Number(program.priority);
  return Number.isFinite(value)?value:DEFAULT_PROGRAM_PRIORITY;
}

const ids=value=>Array.isArray(value)?value.filter(Boolean):[];
export function getMccSelectionMode(program){
  if(program?.mccSelectionMode==="all"||program?.allMcc===true)return "all";
  if(program?.mccSelectionMode==="selected")return "selected";
  return ids(program?.mccCategoryIds).length?"selected":"all";
}
export function getExcludedMccCategoryIds(program){return [...new Set(ids(program?.excludedMccCategoryIds))];}
export function getSelectedMccCategoryIds(program){return [...new Set(ids(program?.mccCategoryIds))];}
export function isMccCategoryEligible(program,mccCategoryId){
  const id=String(mccCategoryId||"");
  if(getMccSelectionMode(program)==="all")return !getExcludedMccCategoryIds(program).includes(id);
  return !!id&&getSelectedMccCategoryIds(program).includes(id);
}
export function programReferencesMcc(program,mccCategoryId){
  const id=String(mccCategoryId||"");
  if(!id)return false;
  if(getMccSelectionMode(program)==="all")return !getExcludedMccCategoryIds(program).includes(id);
  return getSelectedMccCategoryIds(program).includes(id);
}

export function normalizeCashbackCondition(condition={},mccCategories=[],fallback={}){
  const source={...fallback,...condition},rawRate=Number(source.cashbackRate??source.rate)||0,rate=rawRate>0&&rawRate<=1?rawRate*100:rawRate;
  const maxCashbackUnlimited=source.maxType==="UNLIMITED"||source.maxCashbackUnlimited===true||source.maxCashbackMode==="unlimited";
  const maxCashback=maxCashbackUnlimited?null:Math.max(0,Number(source.maxAmount??source.maxCashback??source.max)||0);
  const rawIds=ids(source.mccIds??source.mccCategoryIds??source.eligibleMccCategoryIds),validIds=mccCategories.length?rawIds.filter(id=>mccCategories.some(item=>item.id===id)):rawIds;
  const allMcc=source.allMcc===true||source.mccSelectionMode==="all"||(!rawIds.length&&source.mccSelectionMode!=="selected"),excludedMccCategoryIds=allMcc?ids(source.excludedMccCategoryIds).filter(id=>!mccCategories.length||mccCategories.some(item=>item.id===id)):[];
  return {id:String(source.id||""),allMcc,mccSelectionMode:allMcc?"all":"selected",mccIds:allMcc?[]:validIds,mccCategoryIds:allMcc?[]:validIds,eligibleMccCategoryIds:allMcc?[]:validIds,excludedMccCategoryIds,transactionMethod:normalizeTransactionMethod(source.transactionMethod??source.channel),rate,maxType:maxCashbackUnlimited?"UNLIMITED":"LIMITED",maxAmount:maxCashback,maxCashback,maxCashbackUnlimited,minSpend:maxCashbackUnlimited?null:calculateConditionMinSpend(rate,maxCashback),eligibleTarget:maxCashbackUnlimited?null:calculateConditionMinSpend(rate,maxCashback)};
}
export function normalizeCashbackConditions(program={},mccCategories=[]){const source=Array.isArray(program.conditions)&&program.conditions.length?program.conditions:[program];return source.map((condition,index)=>({...normalizeCashbackCondition(condition,mccCategories,index===0?program:{}),id:String(condition?.id||`${program.id||"PROGRAM"}-COND-${index+1}`)}));}
export function conditionMatchesTransaction(condition,transaction){return (!condition.transactionMethod||condition.transactionMethod===normalizeTransactionMethod(transaction?.transactionMethod))&&isMccCategoryEligible(condition,transaction?.mccCategoryId);}

// Backward-compatible aliases used by earlier HOST tests/integrations.
export function isProgramMccEligible(program,mccCategoryId){return isMccCategoryEligible(program,mccCategoryId);}
export function normalizeProgramMccSelection(program){
  const mode=getMccSelectionMode(program);
  return mode==="all"
    ? {mccSelectionMode:"all",eligibleMccCategoryIds:[],excludedMccCategoryIds:getExcludedMccCategoryIds(program)}
    : {mccSelectionMode:"selected",eligibleMccCategoryIds:getSelectedMccCategoryIds(program),excludedMccCategoryIds:[]};
}
