import assert from "node:assert/strict";
import {canonicalize} from "../services/local-repository.js";
import {formatVndInput, parseMoney} from "../services/money.js";
import {compareCards,compareCardId,compareCustomerCardLinks,buildSortedCustomerCardRows,compareCustomers,compareText} from "../services/sorting.js";
import {SyncService} from "../services/sync-service.js";
import {CARD_BRANDS,normalizeCardBrand} from "../services/card-types.js";

globalThis.CustomEvent ??= class CustomEvent extends Event { constructor(type, options={}){super(type);this.detail=options.detail;} };

const legacy=canonicalize({schemaVersion:1,banks:[{id:"b",code:"B",name:"Bank"}],customers:[{id:"c",customerCode:"KH-0001",fullName:"An"}],cardProducts:[{id:"p",cardId:"V1",bankId:"b",cardName:"Gold",network:"Visa"}],customerCards:[{id:"l",customerId:"c",cardProductId:"p",creditLimit:"1.000.000 đ",sharedLimitCardId:"p"}]});
assert.equal(legacy.schemaVersion,2);
assert.equal(legacy.cardProducts[0].cardBrand,"Visa");
assert.deepEqual(CARD_BRANDS,["American Express","JCB","MasterCard","NAPAS","Union Pay","Visa"]);
assert.equal(normalizeCardBrand("Mastercard"),"MasterCard");
assert.equal(normalizeCardBrand("Napas"),"NAPAS");
const legacyBrands=canonicalize({cardProducts:[{id:"m",cardId:"M",cardBrand:"Mastercard"},{id:"n",cardId:"N",network:"Napas"}]});
assert.deepEqual(legacyBrands.cardProducts.map(x=>x.cardBrand),["MasterCard","NAPAS"]);
assert.equal(legacy.cardProducts[0].cardForm,"Vật lý");
assert.deepEqual(legacy.customerCards[0].sharedLimitCardIds,[]);
assert.equal(legacy.customerCards[0].creditLimit,1_000_000);
const shared=canonicalize({banks:[{id:"b",code:"B",name:"Bank"}],customers:[{id:"c",customerCode:"KH-1",fullName:"An"}],cardProducts:[{id:"p1",cardId:"1",bankId:"b",cardName:"A"},{id:"p2",cardId:"2",bankId:"b",cardName:"B"},{id:"p3",cardId:"3",bankId:"b",cardName:"C"}],customerCards:[{id:"l1",customerId:"c",cardProductId:"p1",sharedLimitCardIds:["p2"]},{id:"l2",customerId:"c",cardProductId:"p2",sharedLimitCardIds:["p3"]},{id:"l3",customerId:"c",cardProductId:"p3"}]});
assert.deepEqual(shared.customerCards.map(x=>x.sharedLimitCardIds.sort()),[["p2","p3"],["p1","p3"],["p1","p2"]]);
const legacySharedLabels=canonicalize({banks:[{id:"b",code:"B",name:"Bank"}],customers:[{id:"c",customerCode:"KH-1",fullName:"An"}],cardProducts:[{id:"p1",cardId:"TCB-EVERYDAY",bankId:"b",cardName:"A"},{id:"p2",cardId:"SACOM-AMEX",bankId:"b",cardName:"B"}],customerCards:[{id:"l1",customerId:"c",cardProductId:"p1",sharedLimitCardId:"SACOM-AMEX"},{id:"l2",customerId:"c",cardProductId:"p2",sharedLimitCardId:"Không"}]});
assert.deepEqual(legacySharedLabels.customerCards.map(x=>x.sharedLimitCardIds),[["p2"],["p1"]]);
assert.equal(formatVndInput("10000000"),"10.000.000 đ");
assert.equal(parseMoney("10.000.000 đ"),10_000_000);
assert.deepEqual(["Visa","JCB","American Express"].sort(compareText),["American Express","JCB","Visa"]);
assert.deepEqual([{fullName:"B",customerCode:"2"},{fullName:"A",customerCode:"3"},{fullName:"A",customerCode:"1"}].sort(compareCustomers).map(x=>x.customerCode),["1","3","2"]);
const bankNames={a:"Z Bank",b:"A Bank"};
assert.deepEqual([{bankId:"a",cardName:"A",cardId:"1"},{bankId:"b",cardName:"Z",cardId:"2"}].sort((a,b)=>compareCards(a,b,x=>bankNames[x.bankId])).map(x=>x.cardId),["2","1"]);
const randomCards=[{id:"6",cardId:"TCB-EVERYDAY"},{id:"2",cardId:"MB-SIGNATURE"},{id:"5",cardId:"SACOM-CASHBACK"},{id:"1",cardId:"MB-MASTER-PLATINUM"},{id:"4",cardId:"SACOM-AMEX"},{id:"3",cardId:"MB-ULTIMATE"}];
assert.deepEqual(randomCards.sort(compareCardId).map(x=>x.cardId),["MB-MASTER-PLATINUM","MB-SIGNATURE","MB-ULTIMATE","SACOM-AMEX","SACOM-CASHBACK","TCB-EVERYDAY"]);
const linkProducts=new Map([{id:"p2",cardId:"B",bankId:"b2",cardName:"Z"},{id:"p1",cardId:"A",bankId:"b1",cardName:"A"}].map(x=>[x.id,x]));
assert.deepEqual([{cardProductId:"p2"},{cardProductId:"p1"}].sort((a,b)=>compareCustomerCardLinks(a,b,id=>linkProducts.get(id),card=>card.bankId)).map(x=>x.cardProductId),["p1","p2"]);
const exactCardIds=["TCB-Everyday","MB - Ultimate","MB - Signature","MB - Master Platinum","SACOM Amex","SACOM Cashback"],exactProducts=exactCardIds.map((cardId,index)=>({id:`exact-${index}`,cardId,bankId:"bank",cardName:`Card ${index}`})),exactLinks=exactProducts.map((card,index)=>({id:`link-${index}`,customerId:"customer",cardProductId:card.id,creditLimit:1}));
const exactDisplayRows=buildSortedCustomerCardRows(exactLinks,exactProducts,[{id:"bank",name:"Bank"}]);
assert.deepEqual(exactDisplayRows.map(row=>row.cardId),["MB - Master Platinum","MB - Signature","MB - Ultimate","SACOM Amex","SACOM Cashback","TCB-Everyday"]);

class FakeLocalRepository extends EventTarget{
  constructor(){super();this.meta={fileId:"f",baseRevision:1,dirty:true,status:"dirty"};}
  loadMeta(){return {...this.meta};}
  saveMeta(meta){this.meta={...meta};}
  save(data,{dirty=true,notify=dirty}={}){state=canonicalize(data);this.meta={...this.meta,dirty,status:dirty?"dirty":this.meta.status};if(notify)this.dispatchEvent(new CustomEvent("mutation"));return state;}
  markClean(revision){this.meta={...this.meta,baseRevision:revision,dirty:false,status:"synced"};}
  clearDriveLink(){}
}
let state=canonicalize({...legacy,revision:1,settings:{marker:"first"}}),remote=canonicalize({...state,revision:1}),active=0,maxActive=0,updates=0;
const localRepository=new FakeLocalRepository();
const driveRepository={
  async readFile(){return remote;},async findDataFiles(){return [{id:"f"}];},async createBackup(){},
  async updateFile(id,payload){active+=1;maxActive=Math.max(maxActive,active);updates+=1;if(updates===1){state=localRepository.save({...state,settings:{marker:"latest"}});}await new Promise(resolve=>setTimeout(resolve,10));remote=payload;active-=1;}
};
const auth={hasToken:()=>true};
const sync=new SyncService({localRepository,driveRepository,auth,getState:()=>state,setState:value=>{state=value;}});
await sync.syncNow();
assert.equal(maxActive,1);
assert.equal(updates,2);
assert.equal(state.settings.marker,"latest");
assert.equal(localRepository.loadMeta().dirty,false);

localRepository.meta={...localRepository.meta,dirty:true};
const safeState=state;
driveRepository.updateFile=async()=>{throw new Error("offline");};
await assert.rejects(sync.syncNow());
assert.equal(state.settings.marker,safeState.settings.marker);
assert.equal(localRepository.loadMeta().status,"error");

console.log("Host V2 migration, formatting, sorting and sync queue tests passed.");
