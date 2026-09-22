import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {canonicalize} from '../services/local-repository.js';
import {runtimeCashbackPrograms} from '../services/cashback-runtime-adapter.js';
import {buildCoordinationRows} from '../services/order-coordination.js';

test('package cashback survives canonical persistence and produces runtime coordination rows',()=>{
  const state={
    banks:[{id:'b',code:'MB',name:'MB'}],customers:[{id:'cu',customerCode:'C',fullName:'A'}],
    cardProducts:[{id:'card',cardId:'CARD-A',bankId:'b',status:'active',cashbackCycleMode:'monthly'}],
    customerCards:[{id:'cc',customerId:'cu',cardProductId:'card',status:'active'}],
    mccCategories:[{id:'food',name:'Ăn uống',codes:['5812']}],transactions:[],
    cashbackPrograms:[{id:'p',cardProductId:'card',name:'P',conditionMode:'independent',packages:[{id:'pkg',name:'Daily',groups:[{id:'g',name:'Food',conditions:[{id:'c',name:'Food',rate:5,max:200000,mccCategoryIds:['food'],channel:'Offline'}]}]}]}]
  };
  const once=canonicalize(state),twice=canonicalize(once);
  assert.deepEqual(twice,once);
  assert.equal(once.cashbackPrograms[0].packages[0].id,'pkg');
  const runtime=runtimeCashbackPrograms(once.cashbackPrograms);
  assert.equal(runtime.length,1);
  assert.equal(runtime[0].runtimePackageId,'pkg');
  const rows=buildCoordinationRows(once,new Date('2026-09-15T00:00:00'));
  assert.equal(rows.length,1);
  assert.equal(rows[0].program.runtimeParentProgramId,'p');
});

test('generic production cashback services do not hard-code MB Pla',()=>{
  for(const file of ['cashback-canonical.js','cashback-runtime-adapter.js','cashback-program-config.js','order-coordination.js','matrix-engine.js']){
    const source=fs.readFileSync(new URL(`../services/${file}`,import.meta.url),'utf8');
    assert.doesNotMatch(source,/MB Pla/i,file);
  }
});
