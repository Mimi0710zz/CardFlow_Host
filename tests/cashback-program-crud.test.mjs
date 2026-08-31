import test from 'node:test';
import assert from 'node:assert/strict';
import {upsertCashbackProgram,buildNextProgramState} from '../services/cashback-feature-ui.js';

let seq=0;
const makeId=()=>`program-${++seq}`;
const baseProgram=(name,id='')=>({id,bankCardProductId:'cp-1',name,rate:5,maxCashbackUnlimited:false,maxCashback:500000,eligibleTarget:10000000,mccSelectionMode:'all',mccCategoryIds:[],excludedMccCategoryIds:[],priority:0,status:'active'});

test('cashback program add can append repeatedly',()=>{
  seq=0;
  let list=[];
  list=upsertCashbackProgram(list,baseProgram('P1'),makeId);
  list=upsertCashbackProgram(list,baseProgram('P2'),makeId);
  list=upsertCashbackProgram(list,baseProgram('P3'),makeId);
  assert.equal(list.length,3);
  assert.deepEqual(list.map(x=>x.name),['P1','P2','P3']);
  assert.equal(new Set(list.map(x=>x.id)).size,3);
});

test('cashback program repeated add uses latest state after state object replacement',()=>{
  seq=0;
  let state={cashbackPrograms:[baseProgram('Existing','existing')]};
  state=buildNextProgramState(state,baseProgram('Added 1'),makeId);
  assert.equal(state.cashbackPrograms.length,2);
  state={...state,revision:7,cashbackPrograms:state.cashbackPrograms.map(x=>({...x}))};
  state=buildNextProgramState(state,baseProgram('Added 2'),makeId);
  assert.equal(state.cashbackPrograms.length,3);
  assert.deepEqual(state.cashbackPrograms.map(x=>x.name),['Existing','Added 1','Added 2']);
  assert.equal(state.revision,7);
});

test('cashback program edit updates selected item without dropping siblings',()=>{
  seq=0;
  const p1=baseProgram('P1','p1'),p2=baseProgram('P2','p2'),p3=baseProgram('P3','p3');
  const next=upsertCashbackProgram([p1,p2,p3],{...p2,name:'P2 edited',rate:8},makeId);
  assert.equal(next.length,3);
  assert.equal(next.find(x=>x.id==='p2').name,'P2 edited');
  assert.equal(next.find(x=>x.id==='p2').rate,8);
  assert.equal(next.find(x=>x.id==='p1').name,'P1');
  assert.equal(next.find(x=>x.id==='p3').name,'P3');
});
