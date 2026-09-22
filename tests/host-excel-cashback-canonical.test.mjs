import test from 'node:test';
import assert from 'node:assert/strict';
import {exportHostSheetRows,applyHostImportRows} from '../services/host-excel.js';
const state={customers:[{id:'customer-keep'}],cardProducts:[{id:'card',cardId:'MB-PLA'}],mccCategories:[{id:'food',name:'Ăn uống',codes:['5812']}],cashbackPrograms:[{id:'p',cardProductId:'card',bankCardProductId:'card',name:'Main',conditionMode:'supporting',totalSpendMinimum:5000000,status:'active',packages:[{id:'daily',name:'Hằng ngày',groups:[{id:'g1',name:'Ăn uống',conditions:[{id:'c1',name:'Ăn uống',rate:5,max:200000,maxCashbackUnlimited:false,mccCategoryIds:['food'],channel:'Offline',eligibleSpendMinimum:4000000,note:'n'}]}]}]}]};
test('cashback export/import reconstructs program package group and condition IDs',()=>{
  const rows=exportHostSheetRows(state,'cashbackPrograms');
  assert.equal(rows.length,1);
  assert.equal(rows[0].ProgramID,'p');
  assert.equal(rows[0].PackageID,'daily');
  assert.equal(rows[0].GroupID,'g1');
  assert.equal(rows[0].ConditionID,'c1');
  const next=applyHostImportRows({...state,cashbackPrograms:[]},{'Chương trình Cashback':rows},'upsert');
  assert.equal(next.cashbackPrograms[0].id,'p');
  assert.equal(next.cashbackPrograms[0].packages[0].id,'daily');
  assert.equal(next.cashbackPrograms[0].packages[0].groups[0].conditions[0].id,'c1');
  assert.equal(next.cashbackPrograms[0].conditionMode,'supporting');
  assert.equal(next.cashbackPrograms[0].totalSpendMinimum,5000000);
});
test('derived spend-to-max column never overrides rate/max on import',()=>{
  const rows=exportHostSheetRows(state,'cashbackPrograms').map(row=>({...row,SpendToMax:999}));
  const next=applyHostImportRows({...state,cashbackPrograms:[]},{'Chương trình Cashback':rows},'upsert');
  const c=next.cashbackPrograms[0].packages[0].groups[0].conditions[0];
  assert.equal(c.rate,5);assert.equal(c.max,200000);
});
test('Excel master on Cashback-only workbook preserves unrelated collections',()=>{
  const rows=exportHostSheetRows(state,'cashbackPrograms');
  const next=applyHostImportRows(state,{'Chương trình Cashback':rows},'master');
  assert.deepEqual(next.customers,state.customers);assert.deepEqual(next.cardProducts,state.cardProducts);assert.deepEqual(next.mccCategories,state.mccCategories);
});
