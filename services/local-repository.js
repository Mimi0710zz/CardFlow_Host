import {createEmptyData} from "./default-data.js?v=20260901-empty-state-v1";
import {parseMoney} from "./money.js";
import {toStorageDate} from "./date.js";
import {normalizeCardBrand,normalizeCardRank,normalizeOwnershipType} from "./card-types.js?v=20260831-cardranksv8";
import {getProgramPriority} from "./cashback-program.js?v=20260901-drive-connect-hotfix-v82";
import {normalizeExclusiveProgram} from "./cashback-exclusive.js";
const DATA_KEY="cardflow-host-data-v1", META_KEY="cardflow-host-sync-meta-v1";
export const uuid = () => crypto.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const text = value => String(value ?? "").trim();
const normalizeSpecial=value=>text(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").toLowerCase();
const day = value => { const n=Number(value); return Number.isInteger(n)&&n>=1&&n<=31?n:""; };
const uniqueTextArray=value=>[...new Set((Array.isArray(value)?value:value?[value]:[]).map(text).filter(Boolean))];
export function canonicalize(input={}){
  if(!input||typeof input!=="object"||Array.isArray(input))input={};
  const base=createEmptyData(input.deviceId||uuid()), now=new Date().toISOString();
  const customers=(Array.isArray(input.customers)?input.customers:[]).filter(x=>x&&typeof x==="object").map(x=>({id:x.id||uuid(),customerCode:text(x.customerCode),fullName:text(x.fullName),phone:text(x.phone),email:text(x.email),dateOfBirth:toStorageDate(x.dateOfBirth),address:text(x.address),personInCharge:text(x.personInCharge),notes:text(x.notes),createdAt:x.createdAt||now,updatedAt:x.updatedAt||now}));
  const cycleMode=value=>value==="statement"||normalizeSpecial(value).includes("sao ke")?"statement":"monthly";
  const cardProducts=(Array.isArray(input.cardProducts)?input.cardProducts:[]).filter(x=>x&&typeof x==="object").map(x=>{const ownershipType=normalizeOwnershipType(x.ownershipType||x.cardType);return {id:x.id||uuid(),cardId:text(x.cardId),bankId:text(x.bankId),cardName:text(x.cardName),network:text(x.network),cardType:ownershipType,ownershipType,cardRank:normalizeCardRank(x.cardRank),cardBrand:normalizeCardBrand(x.cardBrand||x.cardScheme||x.network),cardForm:text(x.cardForm||x.formFactor)||"Vật lý",cashbackCycleMode:cycleMode(x.cashbackCycleMode||x.cashbackMode),defaultStatementDay:day(x.defaultStatementDay),status:text(x.status)||"active",notes:text(x.notes),createdAt:x.createdAt||now,updatedAt:x.updatedAt||now};});
  const productsById=new Map(cardProducts.map(x=>[x.id,x]));
  const customerIds=new Set(customers.map(x=>x.id)), productIds=new Set(cardProducts.map(x=>x.id));
  const resolveProductId=value=>{const raw=text(value);if(!raw||normalizeSpecial(raw)==="khong")return "";return productIds.has(raw)?raw:cardProducts.find(card=>card.cardId.toLocaleLowerCase("vi")===raw.toLocaleLowerCase("vi"))?.id||"";};
  const customerCards=(Array.isArray(input.customerCards)?input.customerCards:[]).filter(x=>x&&typeof x==="object"&&customerIds.has(x.customerId)&&productIds.has(x.cardProductId)).map(x=>{const master=productsById.get(x.cardProductId),legacyShared=x.sharedLimitCardIds??x.sharedLimitCardId??x.sharedCardIds??x.sharedLimitCards;return {id:x.id||uuid(),customerId:x.customerId,cardProductId:x.cardProductId,bankCardProductId:x.cardProductId,cashbackCycleModeOverride:x.cashbackCycleModeOverride==="monthly"||x.cashbackCycleModeOverride==="statement"?x.cashbackCycleModeOverride:"",cardBrand:normalizeCardBrand(x.cardBrand||x.cardScheme||master?.cardBrand||master?.network),cardForm:text(x.cardForm||x.formFactor||master?.cardForm)||"Vật lý",creditLimit:parseMoney(x.creditLimit),statementDay:day(x.statementDay??x.billingDay),paymentDueDay:day(x.paymentDueDay??x.dueDay),sharedLimitCardIds:uniqueTextArray(legacyShared).map(resolveProductId).filter(id=>id&&id!==x.cardProductId),openingDate:toStorageDate(x.openingDate),expiryDate:toStorageDate(x.expiryDate),last4Digits:text(x.last4Digits).replace(/\D/g,"").slice(-4),status:text(x.status)||"active",notes:text(x.notes),createdAt:x.createdAt||now,updatedAt:x.updatedAt||now};});
  for(const customerId of customerIds){
    const links=customerCards.filter(x=>x.customerId===customerId),byProduct=new Map(links.map(x=>[x.cardProductId,x])),allIds=new Set(links.flatMap(link=>[link.cardProductId,...link.sharedLimitCardIds]).filter(id=>productIds.has(id))),parent=new Map([...allIds].map(id=>[id,id]));
    const find=id=>{if(!parent.has(id))return null;const value=parent.get(id);if(value!==id)parent.set(id,find(value));return parent.get(id);};
    const join=(a,b)=>{const left=find(a),right=find(b);if(left&&right&&left!==right)parent.set(right,left);};
    links.forEach(link=>link.sharedLimitCardIds.forEach(id=>join(link.cardProductId,id)));
    const groups=new Map();allIds.forEach(id=>{const root=find(id);if(!groups.has(root))groups.set(root,[]);groups.get(root).push(id);});
    groups.forEach(ids=>ids.forEach(id=>{if(byProduct.has(id))byProduct.get(id).sharedLimitCardIds=ids.filter(other=>other!==id);}));
  }
  const usedMccIds=new Set();
  const mccCategories=(Array.isArray(input.mccCategories)?input.mccCategories:[]).filter(x=>x&&typeof x==="object").map(x=>{let id=text(x.id);if(!id||usedMccIds.has(id)){do{id=uuid();}while(usedMccIds.has(id));}usedMccIds.add(id);return {id,name:text(x.name||x.categoryName),codes:uniqueTextArray(x.codes??x.mcc??x.mccCodes).map(String),description:text(x.description),notes:text(x.notes)};}).filter(x=>x.name);
  const mccIds=new Set(mccCategories.map(x=>x.id));
const cashbackPrograms=(Array.isArray(input.cashbackPrograms)?input.cashbackPrograms:[]).filter(x=>x&&typeof x==="object"&&productIds.has(x.bankCardProductId||x.cardProductId)).map(x=>{const unlimited=x.maxCashbackUnlimited===true||x.maxCashbackMode==="unlimited",rate=Number(x.rate??x.cashbackRate)||0,max=unlimited?null:parseMoney(x.maxCashback??x.max),selected=uniqueTextArray(x.mccCategoryIds??x.eligibleMccCategoryIds).filter(id=>mccIds.has(id)),mode=x.mccSelectionMode==="all"||x.allMcc===true?"all":x.mccSelectionMode==="selected"?"selected":selected.length?"selected":"all",excluded=uniqueTextArray(x.excludedMccCategoryIds).filter(id=>mccIds.has(id)),exclusive=normalizeExclusiveProgram(x),selectedIds=mode==="selected"?selected:[];return {id:x.id||uuid(),bankCardProductId:x.bankCardProductId||x.cardProductId,name:text(x.name),startDate:toStorageDate(x.startDate),endDate:toStorageDate(x.endDate),mccSelectionMode:mode,mccCategoryIds:selectedIds,eligibleMccCategoryIds:selectedIds,excludedMccCategoryIds:mode==="all"?excluded:[],allMcc:mode==="all",transactionMethod:text(x.transactionMethod||x.channel),rate,maxCashbackUnlimited:unlimited,maxCashback:max,eligibleTarget:unlimited?null:(parseMoney(x.eligibleTarget)||Math.round(max/(rate/100||1))),totalTarget:x.totalTarget==null||x.totalTarget===""?null:parseMoney(x.totalTarget),sharedCashbackGroup:text(x.sharedCashbackGroup||x.shared),...exclusive,priority:getProgramPriority(x),notes:text(x.notes),status:text(x.status)||"active",createdAt:x.createdAt||now,updatedAt:x.updatedAt||now};});
  const programIds=new Set(cashbackPrograms.map(x=>x.id));
  const linkIds=new Set(customerCards.map(x=>x.id));
  const transactions=(Array.isArray(input.transactions)?input.transactions:[]).filter(x=>x&&typeof x==="object"&&customerIds.has(x.customerId)&&linkIds.has(x.customerCardId||x.cardId)).map(x=>({id:x.id||uuid(),date:toStorageDate(x.date),timestamp:text(x.timestamp||x.dateTime||x.datetime),customerId:x.customerId,customerCardId:x.customerCardId||x.cardId,amount:parseMoney(x.amount),mccCategoryId:mccIds.has(x.mccCategoryId)?x.mccCategoryId:"",transactionMethod:text(x.transactionMethod||x.channel),cashbackProgramId:text(x.cashbackProgramId),status:["completed","pending","cancelled"].includes(x.status)?x.status:"completed",notes:text(x.notes||x.note),createdAt:x.createdAt||now,updatedAt:x.updatedAt||now}));
  return {...base,...input,schemaVersion:3,deviceId:input.deviceId||base.deviceId,banks:(Array.isArray(input.banks)?input.banks:base.banks).filter(x=>x&&typeof x==="object").map(x=>({id:x.id||uuid(),code:text(x.code).toUpperCase(),name:text(x.name)})),customers,cardProducts,customerCards,cashbackPrograms,mccCategories,transactions,settings:{...(input.settings&&typeof input.settings==="object"?input.settings:{})}};
}
export class LocalRepository extends EventTarget{
  constructor(){super();}
  load(){ try{return canonicalize(JSON.parse(localStorage.getItem(DATA_KEY)||"{}"));}catch{return canonicalize({});} }
  save(data,{dirty=true,notify=dirty}={}){ const saved=canonicalize({...data,updatedAt:new Date().toISOString()}); localStorage.setItem(DATA_KEY,JSON.stringify(saved)); this.saveMeta({...this.loadMeta(),dirty,deviceId:saved.deviceId,status:dirty?"dirty":this.loadMeta().status}); if(notify)this.dispatchEvent(new CustomEvent("mutation",{detail:{data:saved}})); return saved; }
  loadMeta(){ try{return {fileId:"",baseRevision:0,dirty:false,lastSyncAt:"",status:"disconnected",...JSON.parse(localStorage.getItem(META_KEY)||"{}")};}catch{return {fileId:"",baseRevision:0,dirty:false,lastSyncAt:"",status:"disconnected"};} }
  saveMeta(meta){localStorage.setItem(META_KEY,JSON.stringify(meta));}
  markClean(revision){this.saveMeta({...this.loadMeta(),baseRevision:revision,dirty:false,lastSyncAt:new Date().toISOString(),status:"synced"});}
  clearDriveLink(){this.saveMeta({...this.loadMeta(),fileId:"",baseRevision:0,dirty:true,status:"disconnected"});}
}
