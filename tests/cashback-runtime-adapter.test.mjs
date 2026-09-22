import test from 'node:test';
import assert from 'node:assert/strict';
import {flattenCashbackProgram,runtimeCashbackPrograms} from '../services/cashback-runtime-adapter.js';

test('single canonical condition maps to legacy runtime fields',()=>{
  const [rule]=flattenCashbackProgram({id:'p1',cardProductId:'card-1',name:'Ăn uống',conditionMode:'independent',totalSpendMinimum:5000000,status:'active',conditions:[{id:'c1',name:'Ăn uống',rate:5,max:200000,maxCashbackUnlimited:false,eligibleSpendMinimum:4000000,mccCategoryIds:['food'],channel:'Online'}]});
  assert.equal(rule.id,'p1');
  assert.equal(rule.bankCardProductId,'card-1');
  assert.equal(rule.rate,5);
  assert.equal(rule.maxCashback,200000);
  assert.equal(rule.eligibleTarget,4000000);
  assert.equal(rule.totalTarget,5000000);
  assert.equal(rule.transactionMethod,'Online');
  assert.deepEqual(rule.mccCategoryIds,['food']);
});

test('package flattening is deterministic and emits every visible condition',()=>{
  const program={id:'p',cardProductId:'card',name:'P',packages:[{id:'a',name:'A',groups:[{id:'ga',conditions:[{id:'c1',name:'C1',rate:1,max:100}]}]},{id:'b',name:'B',groups:[{id:'gb',conditions:[{id:'c2',name:'C2',rate:2,max:200}]}]}]};
  const first=flattenCashbackProgram(program),second=flattenCashbackProgram(structuredClone(program));
  assert.deepEqual(second,first);
  assert.deepEqual(first.map(x=>x.id),['p::a::ga::c1','p::b::gb::c2']);
});

test('runtime list does not mutate canonical programs',()=>{
  const programs=[{id:'p',cardProductId:'card',conditions:[{id:'c',rate:5,max:100}]}],before=structuredClone(programs);
  runtimeCashbackPrograms(programs);
  assert.deepEqual(programs,before);
});

test('supporting mode and total-spend minimum survive without breaking parent transaction id',()=>{
  const rules=flattenCashbackProgram({id:'p',cardProductId:'card',conditionMode:'supporting',totalSpendMinimum:5000000,conditions:[{id:'a',rate:5,max:200000,eligibleSpendMinimum:1000000},{id:'b',rate:3,max:100000,eligibleSpendMinimum:2000000}]});
  assert.equal(rules.length,1);
  assert.equal(rules[0].id,'p');
  assert.equal(rules[0].conditionMode,'supporting');
  assert.equal(rules[0].totalTarget,5000000);
  assert.deepEqual(rules[0].conditions.map(x=>x.eligibleTarget),[1000000,2000000]);
});

test('runtimeProgramsForCard returns active runtime rules for canonical card aliases', async () => {
  const {runtimeProgramsForCard}=await import('../services/cashback-runtime-adapter.js');
  const programs=[
    {id:'p1',cardProductId:'card-a',name:'A',status:'active',conditions:[{id:'c1',name:'C1',rate:5,max:200000,mccCategoryIds:['food']}]},
    {id:'p2',bankCardProductId:'card-a',name:'Legacy',status:'inactive',conditions:[{id:'c2',name:'C2',rate:3,max:100000,mccCategoryIds:['shop']}]},
    {id:'p3',cardProductId:'card-b',name:'B',status:'active',conditions:[{id:'c3',name:'C3',rate:2,max:50000,mccCategoryIds:['fuel']}]},
  ];
  const rules=runtimeProgramsForCard(programs,'card-a',{activeOnly:true});
  assert.equal(rules.length,1);
  assert.equal(rules[0].runtimeParentProgramId,'p1');
  assert.equal(rules[0].cardProductId,'card-a');
});
