import {createEmptyData} from "./default-data.js";
import {parseMoney} from "./money.js";
import {toStorageDate} from "./date.js";
const DATA_KEY="cardflow-host-data-v1", META_KEY="cardflow-host-sync-meta-v1";
export const uuid = () => crypto.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const text = value => String(value ?? "").trim();
const day = value => { const n=Number(value); return Number.isInteger(n)&&n>=1&&n<=31?n:""; };
export function canonicalize(input={}){
  const base=createEmptyData(input.deviceId||uuid()), now=new Date().toISOString();
  const customers=(Array.isArray(input.customers)?input.customers:[]).map(x=>({id:x.id||uuid(),customerCode:text(x.customerCode),fullName:text(x.fullName),phone:text(x.phone),email:text(x.email),dateOfBirth:toStorageDate(x.dateOfBirth),address:text(x.address),personInCharge:text(x.personInCharge),notes:text(x.notes),createdAt:x.createdAt||now,updatedAt:x.updatedAt||now}));
  const cardProducts=(Array.isArray(input.cardProducts)?input.cardProducts:[]).map(x=>({id:x.id||uuid(),cardId:text(x.cardId),bankId:text(x.bankId),cardName:text(x.cardName),network:text(x.network),cardType:text(x.cardType)||"credit",status:text(x.status)||"active",notes:text(x.notes),createdAt:x.createdAt||now,updatedAt:x.updatedAt||now}));
  const customerIds=new Set(customers.map(x=>x.id)), productIds=new Set(cardProducts.map(x=>x.id));
  const customerCards=(Array.isArray(input.customerCards)?input.customerCards:[]).filter(x=>customerIds.has(x.customerId)&&productIds.has(x.cardProductId)).map(x=>({id:x.id||uuid(),customerId:x.customerId,cardProductId:x.cardProductId,creditLimit:parseMoney(x.creditLimit),statementDay:day(x.statementDay),paymentDueDay:day(x.paymentDueDay),openingDate:toStorageDate(x.openingDate),expiryDate:toStorageDate(x.expiryDate),last4Digits:text(x.last4Digits).replace(/\D/g,"").slice(-4),status:text(x.status)||"active",notes:text(x.notes),createdAt:x.createdAt||now,updatedAt:x.updatedAt||now}));
  return {...base,...input,schemaVersion:1,deviceId:input.deviceId||base.deviceId,banks:(Array.isArray(input.banks)?input.banks:base.banks).map(x=>({id:x.id||uuid(),code:text(x.code).toUpperCase(),name:text(x.name)})),customers,cardProducts,customerCards,settings:{...(input.settings||{})}};
}
export class LocalRepository{
  load(){ try{return canonicalize(JSON.parse(localStorage.getItem(DATA_KEY)||"{}"));}catch{return canonicalize({});} }
  save(data,{dirty=true}={}){ const saved=canonicalize({...data,updatedAt:new Date().toISOString()}); localStorage.setItem(DATA_KEY,JSON.stringify(saved)); this.saveMeta({...this.loadMeta(),dirty,deviceId:saved.deviceId,status:dirty?"dirty":this.loadMeta().status}); return saved; }
  loadMeta(){ try{return {fileId:"",baseRevision:0,dirty:false,lastSyncAt:"",status:"disconnected",...JSON.parse(localStorage.getItem(META_KEY)||"{}")};}catch{return {fileId:"",baseRevision:0,dirty:false,lastSyncAt:"",status:"disconnected"};} }
  saveMeta(meta){localStorage.setItem(META_KEY,JSON.stringify(meta));}
  markClean(revision){this.saveMeta({...this.loadMeta(),baseRevision:revision,dirty:false,lastSyncAt:new Date().toISOString(),status:"synced"});}
  clearDriveLink(){this.saveMeta({...this.loadMeta(),fileId:"",baseRevision:0,dirty:true,status:"disconnected"});}
}
