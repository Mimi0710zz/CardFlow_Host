import {normalizeCashbackCondition,normalizeCashbackConditions,normalizeCombineOperator,normalizeTransactionMethod} from './cashback-program.js';

const text=value=>String(value??'').trim();
const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
const finite=value=>{if(value==null||value==='')return null;const n=Number(value);return Number.isFinite(n)?n:null;};

export function isCanonicalCashbackProgram(program={}){
  return Boolean((program?.cardProductId||program?.bankCardProductId) && (Array.isArray(program?.conditions)||Array.isArray(program?.packages)));
}

function canonicalCondition(condition={},fallback={},mccCategories=[],index=0,programId='PROGRAM'){
  const merged={...fallback,...condition};
  const normalized=normalizeCashbackCondition(merged,mccCategories);
  const maxCashbackUnlimited=merged.maxCashbackUnlimited===true||merged.maxType==='UNLIMITED'||normalized.maxCashbackUnlimited;
  const explicitEligible=finite(merged.eligibleSpendMinimum??merged.eligibleTarget??merged.minSpend);
  return {
    ...clone(condition),
    id:text(condition.id)||`${programId}-COND-${index+1}`,
    name:text(condition.name)||text(fallback.name)||`Điều kiện ${index+1}`,
    allMcc:normalized.allMcc,
    mccSelectionMode:normalized.mccSelectionMode,
    mccIds:[...normalized.mccCategoryIds],
    mccCategoryIds:[...normalized.mccCategoryIds],
    eligibleMccCategoryIds:[...normalized.mccCategoryIds],
    excludedMccCategoryIds:[...normalized.excludedMccCategoryIds],
    channel:normalizeTransactionMethod(merged.channel??merged.transactionMethod),
    transactionMethod:normalizeTransactionMethod(merged.transactionMethod??merged.channel),
    rate:normalized.rate,
    maxType:maxCashbackUnlimited?'UNLIMITED':'LIMITED',
    max:maxCashbackUnlimited?null:normalized.maxCashback,
    maxAmount:maxCashbackUnlimited?null:normalized.maxCashback,
    maxCashback:maxCashbackUnlimited?null:normalized.maxCashback,
    maxCashbackUnlimited,
    eligibleSpendMinimum:maxCashbackUnlimited?null:(explicitEligible??normalized.eligibleTarget),
    eligibleTarget:maxCashbackUnlimited?null:(explicitEligible??normalized.eligibleTarget),
    note:text(condition.note??condition.notes??fallback.note??fallback.notes)
  };
}

function canonicalGroup(group={},program={},mccCategories=[],groupIndex=0){
  const rawConditions=Array.isArray(group.conditions)&&group.conditions.length?group.conditions:[group];
  const groupId=text(group.id)||`${program.id||'PROGRAM'}-GROUP-${groupIndex+1}`;
  return {
    ...clone(group),
    id:groupId,
    name:text(group.name)||`Nhóm ${groupIndex+1}`,
    conditionCombination:normalizeCombineOperator(group.conditionCombination||group.combineOperator||'OR'),
    totalSpendMinimum:finite(group.totalSpendMinimum),
    note:text(group.note??group.notes),
    conditions:rawConditions.map((condition,index)=>canonicalCondition(condition,{},mccCategories,index,program.id||'PROGRAM'))
  };
}

export function normalizeCanonicalCashbackProgram(program={}, {mccCategories=[]}={}){
  const source=clone(program)||{};
  const id=text(source.id)||'PROGRAM';
  const cardProductId=text(source.cardProductId||source.bankCardProductId);
  const totalSpendMinimum=finite(source.totalSpendMinimum??source.totalSpendCondition?.amount??source.totalTarget);
  const legacyMode=source.exclusiveMode==='first_reached'?'first_match':source.conditionMode;
  const conditionMode=['independent','first_match','supporting','all_required'].includes(legacyMode)?legacyMode:(normalizeCombineOperator(source.combineOperator)==='AND'&&Array.isArray(source.conditions)&&source.conditions.length>1?'all_required':'independent');
  const base={
    ...source,
    id,
    cardProductId,
    bankCardProductId:cardProductId,
    name:text(source.name),
    conditionMode,
    totalSpendMinimum,
    totalSpendCondition:{enabled:totalSpendMinimum!=null,amount:totalSpendMinimum},
    totalTarget:totalSpendMinimum,
    packageSwitchLimit:Math.max(0,Number(source.packageSwitchLimit)||0),
    exclusiveMode:source.exclusiveMode==='first_reached'?'first_reached':'none',
    exclusiveGroupId:source.exclusiveMode==='first_reached'?(text(source.exclusiveGroupId)||null):null,
    priority:Number.isFinite(Number(source.priority))?Number(source.priority):0,
    status:text(source.status)||'active',
    notes:text(source.notes),
  };
  if(Array.isArray(source.packages)&&source.packages.length){
    return {...base,conditions:[],packages:source.packages.map((pkg,pkgIndex)=>({
      ...clone(pkg),id:text(pkg.id)||`${id}-PACKAGE-${pkgIndex+1}`,name:text(pkg.name)||`Gói ${pkgIndex+1}`,
      groups:(Array.isArray(pkg.groups)?pkg.groups:[]).map((group,groupIndex)=>canonicalGroup(group,base,mccCategories,groupIndex))
    }))};
  }
  const rawConditions=Array.isArray(source.conditions)&&source.conditions.length?source.conditions:normalizeCashbackConditions(source,mccCategories);
  const conditions=rawConditions.map((condition,index)=>canonicalCondition(condition,source,mccCategories,index,id));
  const first=conditions[0]||{};
  return {...base,packages:[],conditions,allMcc:first.allMcc===true,mccSelectionMode:first.mccSelectionMode||"all",mccIds:[...(first.mccCategoryIds||[])],mccCategoryIds:[...(first.mccCategoryIds||[])],eligibleMccCategoryIds:[...(first.mccCategoryIds||[])],excludedMccCategoryIds:[...(first.excludedMccCategoryIds||[])],transactionMethod:first.transactionMethod||"",rate:Number(first.rate)||0,maxType:first.maxType||"LIMITED",maxAmount:first.maxAmount??null,maxCashback:first.maxCashback??null,maxCashbackUnlimited:first.maxCashbackUnlimited===true,eligibleTarget:first.eligibleTarget??null};
}

export function normalizeCanonicalCashbackPrograms(programs=[],options={}){
  return (Array.isArray(programs)?programs:[]).map(program=>normalizeCanonicalCashbackProgram(program,options));
}
