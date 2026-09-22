import {normalizeCanonicalCashbackProgram} from './cashback-canonical.js';
import {calculateConditionMinSpend,normalizeTransactionMethod} from './cashback-program.js';
const text=v=>String(v??'').trim();
function conditionRule(program,condition,{packageId='',groupId='',single=false}={}){
  const unlimited=condition.maxCashbackUnlimited===true||condition.maxType==='UNLIMITED';
  const max=unlimited?null:Number(condition.max??condition.maxCashback??condition.maxAmount)||0;
  const rate=Number(condition.rate)||0;
  const eligible=condition.eligibleSpendMinimum??condition.eligibleTarget??condition.minSpend??(unlimited?null:calculateConditionMinSpend(rate,max));
  const id=single?program.id:`${program.id}::${packageId||'base'}::${groupId||'group'}::${condition.id}`;
  const mccIds=[...(condition.mccCategoryIds||condition.mccIds||condition.eligibleMccCategoryIds||[])];
  const total=program.totalSpendMinimum??program.totalTarget??program.totalSpendCondition?.amount??null;
  return {
    ...program,
    ...condition,
    id,
    bankCardProductId:program.cardProductId||program.bankCardProductId,
    cardProductId:program.cardProductId||program.bankCardProductId,
    name:condition.name||program.name,
    rate,
    maxCashbackUnlimited:unlimited,
    maxCashback:max,
    maxAmount:max,
    eligibleTarget:eligible==null?null:Number(eligible)||0,
    minSpend:eligible==null?null:Number(eligible)||0,
    totalTarget:total==null?null:Number(total)||0,
    totalSpendCondition:{enabled:total!=null,amount:total==null?null:Number(total)||0},
    transactionMethod:normalizeTransactionMethod(condition.channel??condition.transactionMethod),
    channel:normalizeTransactionMethod(condition.channel??condition.transactionMethod),
    mccCategoryIds:mccIds,
    mccIds,
    eligibleMccCategoryIds:mccIds,
    conditionMode:program.conditionMode||'independent',
    runtimeParentProgramId:program.id,
    runtimePackageId:packageId,
    runtimeGroupId:groupId,
    runtimeConditionId:condition.id,
    conditions:[{
      ...condition,
      transactionMethod:normalizeTransactionMethod(condition.channel??condition.transactionMethod),
      mccCategoryIds:mccIds,
      maxCashback:max,
      eligibleTarget:eligible==null?null:Number(eligible)||0
    }]
  };
}
export function flattenCashbackProgram(input={}){
  const program=normalizeCanonicalCashbackProgram(input);
  if(Array.isArray(program.packages)&&program.packages.length){
    return program.packages.flatMap(pkg=>(pkg.groups||[]).flatMap(group=>(group.conditions||[]).map(condition=>conditionRule(program,condition,{packageId:pkg.id,groupId:group.id}))));
  }
  const conditions=program.conditions||[];
  if(!conditions.length)return [];
  const first=conditionRule(program,conditions[0],{single:true});
  const runtimeConditions=conditions.map(condition=>conditionRule(program,condition,{single:true}).conditions[0]);
  return [{...first,conditions:runtimeConditions,conditionMode:program.conditionMode||"independent",combineOperator:program.combineOperator||(conditions.length===1||program.conditionMode==="all_required"?"AND":"OR")}];
}
export function runtimeCashbackPrograms(programs=[]){return (Array.isArray(programs)?programs:[]).flatMap(flattenCashbackProgram);}
export function runtimeProgramById(programs=[],runtimeId=''){return runtimeCashbackPrograms(programs).find(program=>program.id===runtimeId)||null;}
export function runtimeProgramsForParent(programs=[],parentId=''){return runtimeCashbackPrograms(programs).filter(program=>program.runtimeParentProgramId===parentId||program.id===parentId);}
export function runtimeProgramsForCard(programs=[],cardProductId='',{activeOnly=false}={}){
  const cardId=text(cardProductId);
  return runtimeCashbackPrograms(programs).filter(program=>{
    const matchesCard=text(program.cardProductId||program.bankCardProductId)===cardId;
    return matchesCard&&(!activeOnly||program.status==='active');
  });
}
