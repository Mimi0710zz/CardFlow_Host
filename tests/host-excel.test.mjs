import test from 'node:test';
import assert from 'node:assert/strict';
import {HOST_EXPORTABLE_SHEETS,exportHostSheetRows,applyHostImportRows,previewHostImport} from '../services/host-excel.js';

const fixture={
  banks:[{id:'b1',code:'MB',name:'MB Bank'}],
  customers:[{id:'c1',customerCode:'KH001',fullName:'Anh A',phone:'0901',email:'a@test.vn',dateOfBirth:'',address:'',personInCharge:'',notes:''}],
  cardProducts:[{id:'p1',cardId:'MB-PLA',bankId:'b1',cardName:'Platinum',cardRank:'Platinum',ownershipType:'credit',cardBrand:'MasterCard',cardForm:'Vật lý',cashbackCycleMode:'statement',defaultStatementDay:20,status:'active',notes:''}],
  customerCards:[{id:'cc1',customerId:'c1',cardProductId:'p1',creditLimit:100000000,statementDay:20,paymentDueDay:5,openingDate:'',expiryDate:'',last4Digits:'',status:'active',notes:''}],
  mccCategories:[{id:'m1',name:'Ăn uống',codes:['5812','5814'],description:'Nhà hàng',notes:''}],
  cashbackPrograms:[{id:'pr1',bankCardProductId:'p1',name:'Ăn uống',rate:5,maxCashback:200000,maxCashbackUnlimited:false,eligibleTarget:4000000,totalTarget:null,transactionMethod:'Offline',mccSelectionMode:'selected',mccCategoryIds:['m1'],excludedMccCategoryIds:[],status:'active',notes:''}],
  orderTypes:[{id:'o1',code:'POS',color:'#2563eb',description:'POS',note:''}],
  sourceNames:[{id:'s1',name:'Nguồn A',description:'',note:''}],
  transactions:[]
};

test('host exportable sheets include master data and cashback program tabs',()=>{
  const keys=HOST_EXPORTABLE_SHEETS.map(x=>x.key);
  for(const key of ['customers','cardProducts','customerCards','cashbackPrograms','mccCategories','orderTypes','sourceNames','banks']) assert.ok(keys.includes(key),key);
});

test('cashback export uses Card ID and readable MCC group data',()=>{
  const rows=exportHostSheetRows(fixture,'cashbackPrograms');
  assert.equal(rows.length,1);
  assert.equal(rows[0]['Card ID'],'MB-PLA');
  assert.equal(rows[0]['Tên chương trình'],'Ăn uống');
  assert.equal(rows[0]['Nhóm MCC'],'Ăn uống');
  assert.equal(rows[0]['Mã MCC'],'5812, 5814');
  assert.equal(rows[0]['% Cashback'],5);
  assert.equal(rows[0]['Max Cashback'],200000);
  assert.equal(rows[0]['Chi để Max'],4000000);
});

test('update mode updates existing rows but does not add new ones',()=>{
  const rows={'Mã ngân hàng':[
    {'Mã ngân hàng':'MB','Tên ngân hàng':'MB Updated'},
    {'Mã ngân hàng':'TCB','Tên ngân hàng':'Techcombank'}
  ]};
  const preview=previewHostImport(fixture,rows,'update');
  assert.equal(preview.updated,1); assert.equal(preview.added,0); assert.equal(preview.deleted,0);
  const next=applyHostImportRows(fixture,rows,'update');
  assert.equal(next.banks.length,1); assert.equal(next.banks[0].name,'MB Updated');
});

test('upsert mode updates existing rows and adds new rows',()=>{
  const rows={'Mã ngân hàng':[
    {'Mã ngân hàng':'MB','Tên ngân hàng':'MB Updated'},
    {'Mã ngân hàng':'TCB','Tên ngân hàng':'Techcombank'}
  ]};
  const preview=previewHostImport(fixture,rows,'upsert');
  assert.equal(preview.updated,1); assert.equal(preview.added,1); assert.equal(preview.deleted,0);
  const next=applyHostImportRows(fixture,rows,'upsert');
  assert.equal(next.banks.length,2);
  assert.ok(next.banks.some(x=>x.code==='TCB'));
});

test('master mode deletes only missing rows from sheets present in workbook',()=>{
  const state={...fixture,banks:[...fixture.banks,{id:'b2',code:'TCB',name:'Techcombank'}],sourceNames:[...fixture.sourceNames,{id:'s2',name:'Nguồn B',description:'',note:''}]};
  const rows={'Mã ngân hàng':[{'Mã ngân hàng':'MB','Tên ngân hàng':'MB Bank'}]};
  const preview=previewHostImport(state,rows,'master');
  assert.equal(preview.deleted,1);
  const next=applyHostImportRows(state,rows,'master');
  assert.deepEqual(next.banks.map(x=>x.code),['MB']);
  assert.equal(next.sourceNames.length,2,'sheet not present must remain untouched');
});

test('cashback Excel flattens multiple conditions and import reconstructs them',()=>{
  const state={...fixture,cashbackPrograms:[{...fixture.cashbackPrograms[0],id:'multi',combineOperator:'OR',conditions:[
    {id:'cond-1',allMcc:false,mccCategoryIds:['m1'],transactionMethod:'Online',rate:5,maxCashback:200000,maxCashbackUnlimited:false,eligibleTarget:4000000},
    {id:'cond-2',allMcc:true,mccCategoryIds:[],transactionMethod:'Offline',rate:3,maxCashback:100000,maxCashbackUnlimited:false,eligibleTarget:3333333}
  ]}]};
  const rows=exportHostSheetRows(state,'cashbackPrograms');
  assert.equal(rows.length,2);
  assert.equal(rows[0]['Condition ID'],'cond-1');
  assert.equal(rows[1]['Condition ID'],'cond-2');
  const imported=applyHostImportRows({...state,cashbackPrograms:[]},{'Chương trình Cashback':rows},'upsert');
  assert.equal(imported.cashbackPrograms.length,1);
  assert.equal(imported.cashbackPrograms[0].conditions.length,2);
  assert.equal(imported.cashbackPrograms[0].combineOperator,'OR');
});
