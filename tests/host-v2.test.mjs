import assert from "node:assert/strict";
import {canonicalize} from "../services/local-repository.js";
import {formatVndInput, parseMoney} from "../services/money.js";
import {compareCards, compareCustomers, compareText} from "../services/sorting.js";
import {SyncService} from "../services/sync-service.js";

globalThis.CustomEvent ??= class CustomEvent extends Event { constructor(type, options={}){super(type);this.detail=options.detail;} };

const legacy=canonicalize({schemaVersion:1,banks:[{id:"b",code:"B",name:"Bank"}],customers:[{id:"c",customerCode:"KH-0001",fullName:"An"}],cardProducts:[{id:"p",cardId:"V1",bankId:"b",cardName:"Gold",network:"Visa"}],customerCards:[{id:"l",customerId:"c",cardProductId:"p",creditLimit:"1.000.000 đ",sharedLimitCardId:"p"}]});
assert.equal(legacy.schemaVersion,2);
assert.equal(legacy.cardProducts[0].cardBrand,"Visa");
assert.equal(legacy.cardProducts[0].cardForm,"Vật lý");
assert.deepEqual(legacy.customerCards[0].sharedLimitCardIds,[]);
assert.equal(legacy.customerCards[0].creditLimit,1_000_000);
const shared=canonicalize({banks:[{id:"b",code:"B",name:"Bank"}],customers:[{id:"c",customerCode:"KH-1",fullName:"An"}],cardProducts:[{id:"p1",cardId:"1",bankId:"b",cardName:"A"},{id:"p2",cardId:"2",bankId:"b",cardName:"B"},{id:"p3",cardId:"3",bankId:"b",cardName:"C"}],customerCards:[{id:"l1",customerId:"c",cardProductId:"p1",sharedLimitCardIds:["p2"]},{id:"l2",customerId:"c",cardProductId:"p2",sharedLimitCardIds:["p3"]},{id:"l3",customerId:"c",cardProductId:"p3"}]});
assert.deepEqual(shared.customerCards.map(x=>x.sharedLimitCardIds.sort()),[["p2","p3"],["p1","p3"],["p1","p2"]]);
assert.equal(formatVndInput("10000000"),"10.000.000 đ");
assert.equal(parseMoney("10.000.000 đ"),10_000_000);
assert.deepEqual(["Visa","JCB","American Express"].sort(compareText),["American Express","JCB","Visa"]);
assert.deepEqual([{fullName:"B",customerCode:"2"},{fullName:"A",customerCode:"3"},{fullName:"A",customerCode:"1"}].sort(compareCustomers).map(x=>x.customerCode),["1","3","2"]);
const bankNames={a:"Z Bank",b:"A Bank"};
assert.deepEqual([{bankId:"a",cardName:"A",cardId:"1"},{bankId:"b",cardName:"Z",cardId:"2"}].sort((a,b)=>compareCards(a,b,x=>bankNames[x.bankId])).map(x=>x.cardId),["2","1"]);

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
