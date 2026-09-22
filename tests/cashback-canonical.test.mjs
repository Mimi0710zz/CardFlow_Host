import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCanonicalCashbackProgram,normalizeCanonicalCashbackPrograms} from '../services/cashback-canonical.js';

const mcc=[{id:'food',name:'Ăn uống',codes:['5812']}];

test('legacy single rule becomes canonical program with one condition',()=>{
  const p=normalizeCanonicalCashbackProgram({id:'p1',bankCardProductId:'card-1',name:'Ăn uống',rate:5,maxCashback:200000,eligibleTarget:4000000,mccCategoryIds:['food'],transactionMethod:'Online',totalTarget:5000000,status:'active',notes:'n'},{mccCategories:mcc});
  assert.equal(p.cardProductId,'card-1');
  assert.equal(p.conditionMode,'independent');
  assert.equal(p.totalSpendMinimum,5000000);
  assert.equal(p.conditions.length,1);
  assert.equal(p.conditions[0].rate,5);
  assert.equal(p.conditions[0].max,200000);
  assert.equal(p.conditions[0].eligibleSpendMinimum,4000000);
  assert.deepEqual(p.conditions[0].mccCategoryIds,['food']);
  assert.equal(p.conditions[0].channel,'Online');
});

test('canonical package hierarchy survives normalization and is idempotent',()=>{
  const input={id:'p',cardProductId:'card',name:'P',conditionMode:'supporting',totalSpendMinimum:5000000,packageSwitchLimit:1,packages:[{id:'daily',name:'Hằng ngày',groups:[{id:'g',name:'Ăn uống',conditions:[{id:'c',name:'Ăn uống',rate:5,max:200000,maxCashbackUnlimited:false,mccCategoryIds:['food'],channel:'Offline',note:'x'}]}]}]};
  const first=normalizeCanonicalCashbackProgram(input,{mccCategories:mcc});
  const second=normalizeCanonicalCashbackProgram(first,{mccCategories:mcc});
  assert.deepEqual(second,first);
  assert.equal(first.packages[0].groups[0].conditions[0].id,'c');
});

test('normalizing program arrays does not mutate input',()=>{
  const input=[{id:'p',bankCardProductId:'card',rate:3,maxCashback:100000}];
  const before=structuredClone(input);
  normalizeCanonicalCashbackPrograms(input,{mccCategories:mcc});
  assert.deepEqual(input,before);
});
