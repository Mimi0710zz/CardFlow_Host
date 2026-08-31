export const DEFAULT_PROGRAM_PRIORITY=0;
export function getProgramPriority(program){
  if(!program)return DEFAULT_PROGRAM_PRIORITY;
  const value=Number(program.priority);
  return Number.isFinite(value)?value:DEFAULT_PROGRAM_PRIORITY;
}
const ids=value=>[...new Set((Array.isArray(value)?value:[]).map(item=>String(item||"").trim()).filter(Boolean))];
export function normalizeProgramMccSelection(program={}){
  const mode=program?.mccSelectionMode==="all"||program?.allMcc===true?"all":"selected";
  return {mccSelectionMode:mode,eligibleMccCategoryIds:mode==="selected"?ids(program.eligibleMccCategoryIds??program.mccCategoryIds):[],excludedMccCategoryIds:mode==="all"?ids(program.excludedMccCategoryIds):[]};
}
export function isProgramMccEligible(program,mccCategoryId){
  const selection=normalizeProgramMccSelection(program);
  if(!mccCategoryId)return selection.mccSelectionMode==="all";
  return selection.mccSelectionMode==="all"?!selection.excludedMccCategoryIds.includes(mccCategoryId):selection.eligibleMccCategoryIds.includes(mccCategoryId);
}
