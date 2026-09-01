export const DEFAULT_PROGRAM_PRIORITY=0;
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

// Backward-compatible aliases used by earlier HOST tests/integrations.
export function isProgramMccEligible(program,mccCategoryId){return isMccCategoryEligible(program,mccCategoryId);}
export function normalizeProgramMccSelection(program){
  const mode=getMccSelectionMode(program);
  return mode==="all"
    ? {mccSelectionMode:"all",eligibleMccCategoryIds:[],excludedMccCategoryIds:getExcludedMccCategoryIds(program)}
    : {mccSelectionMode:"selected",eligibleMccCategoryIds:getSelectedMccCategoryIds(program),excludedMccCategoryIds:[]};
}
