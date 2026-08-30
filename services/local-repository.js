import {createEmptyData} from "./default-data.js?v=20260830-customer-tagsv5";
import {parseMoney} from "./money.js";
import {toStorageDate} from "./date.js";
import {normalizeCardBrand} from "./card-types.js?v=20260830-cardtypesv6";
const DATA_KEY="cardflow-host-data-v1", META_KEY="cardflow-host-sync-meta-v1";
export const uuid = () => crypto.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const text = value => String(value ?? "").trim();
const normalizeSpecial=value=>text(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").toLowerCase();
const day = value => { const n=Number(value); return Number.isInteger(n)&&n>=1&&n<=31?n:""; };
const uniqueTextArray=value=>[...new Set((Array.isArray(value)?value:value?[value]:[]).map(text).filter(Boolean))];
export function canonicalize(input={}){
  const base=createEmptyData(input.deviceId||uuid()), now=new Date().toISOString();
  const customers=(Array.isArray(input.customers)?input.customers:[]).map(x=>({id:x.id||uuid(),customerCode:text(x.customerCode),fullName:text(x.fullName),phone:text(x.phone),email:text(x.email),dateOfBirth:toStorageDate(x.dateOfBirth),address:text(x.address),personInCharge:text(x.personInCharge),notes:text(x.notes),createdAt:x.createdAt||now,updatedAt:x.updatedAt||now}));
  const cardProducts=(Array.isArray(input.cardProducts)?input.cardProducts:[]).map(x=>({id:x.id||uuid(),cardId:text(x.cardId),bankId:text(x.bankId),cardName:text(x.cardName),network:text(x.network),cardType:text(x.cardType)||"credit",cardBrand:normalizeCardBrand(x.cardBrand||x.cardScheme||x.network),cardForm:text(x.cardForm||x.formFactor)||"Vật lý",status:text(x.status)||"active",notes:text(x.notes),createdAt:x.createdAt||now,updatedAt:x.updatedAt||now}));
  const productsById=new Map(cardProducts.map(x=>[x.id,x]));
  const customerIds=new Set(customers.map(x=>x.id)), productIds=new Set(cardProducts.map(x=>x.id));
  const resolveProductId=value=>{const raw=text(value);if(!raw||normalizeSpecial(raw)==="khong")return "";return productIds.has(raw)?raw:cardProducts.find(card=>card.cardId.toLocaleLowerCase("vi")===raw.toLocaleLowerCase("vi"))?.id||"";};
  const customerCards=(Array.isArray(input.customerCards)?input.customerCards:[]).filter(x=>customerIds.has(x.customerId)&&productIds.has(x.cardProductId)).map(x=>{const master=productsById.get(x.cardProductId),legacyShared=x.sharedLimitCardIds??x.sharedLimitCardId??x.sharedCardIds??x.sharedLimitCards;return {id:x.id||uuid(),customerId:x.customerId,cardProductId:x.cardProductId,cardBrand:normalizeCardBrand(x.cardBrand||x.cardScheme||master?.cardBrand||master?.network),cardForm:text(x.cardForm||x.formFactor||master?.cardForm)||"Vật lý",creditLimit:parseMoney(x.creditLimit),statementDay:day(x.statementDay??x.billingDay),paymentDueDay:day(x.paymentDueDay??x.dueDay),sharedLimitCardIds:uniqueTextArray(legacyShared).map(resolveProductId).filter(id=>id&&id!==x.cardProductId),openingDate:toStorageDate(x.openingDate),expiryDate:toStorageDate(x.expiryDate),last4Digits:text(x.last4Digits).replace(/\D/g,"").slice(-4),status:text(x.status)||"active",notes:text(x.notes),createdAt:x.createdAt||now,updatedAt:x.updatedAt||now};});
  for(const customerId of customerIds){
    const links=customerCards.filter(x=>x.customerId===customerId),byProduct=new Map(links.map(x=>[x.cardProductId,x])),allIds=new Set(links.flatMap(link=>[link.cardProductId,...link.sharedLimitCardIds]).filter(id=>productIds.has(id))),parent=new Map([...allIds].map(id=>[id,id]));
    const find=id=>{if(!parent.has(id))return null;const value=parent.get(id);if(value!==id)parent.set(id,find(value));return parent.get(id);};
    const join=(a,b)=>{const left=find(a),right=find(b);if(left&&right&&left!==right)parent.set(right,left);};
    links.forEach(link=>link.sharedLimitCardIds.forEach(id=>join(link.cardProductId,id)));
    const groups=new Map();allIds.forEach(id=>{const root=find(id);if(!groups.has(root))groups.set(root,[]);groups.get(root).push(id);});
    groups.forEach(ids=>ids.forEach(id=>{if(byProduct.has(id))byProduct.get(id).sharedLimitCardIds=ids.filter(other=>other!==id);}));
  }
  return {...base,...input,schemaVersion:2,deviceId:input.deviceId||base.deviceId,banks:(Array.isArray(input.banks)?input.banks:base.banks).map(x=>({id:x.id||uuid(),code:text(x.code).toUpperCase(),name:text(x.name)})),customers,cardProducts,customerCards,settings:{...(input.settings||{})}};
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
