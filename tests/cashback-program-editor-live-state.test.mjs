import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCashbackProgramSaveState} from '../services/cashback-program-editor.js';

const program=(id,name)=>({id,bankCardProductId:'card-1',name,conditions:[{id:`${id}-c1`,rate:5,allMcc:true,maxCashbackUnlimited:false,maxCashback:100000,minSpend:2000000}]});

test('cashback editor appends repeatedly to the latest state',()=>{
  let state={revision:1,cashbackPrograms:[program('p1','P1')]};
  state=buildCashbackProgramSaveState(state,program('p2','P2'));
  assert.deepEqual(state.cashbackPrograms.map(x=>x.id),['p1','p2']);
  // Simulate state object replacement by render/sync between modal saves.
  state={...state,revision:2,cashbackPrograms:state.cashbackPrograms.map(x=>({...x}))};
  state=buildCashbackProgramSaveState(state,program('p3','P3'));
  state=buildCashbackProgramSaveState(state,program('p4','P4'));
  assert.equal(state.cashbackPrograms.length,4);
  assert.deepEqual(state.cashbackPrograms.map(x=>x.name),['P1','P2','P3','P4']);
});

test('cashback editor edits only the matching stable id',()=>{
  const base={cashbackPrograms:[program('p1','P1'),program('p2','P2'),program('p3','P3')]};
  const next=buildCashbackProgramSaveState(base,{...program('p2','P2 edited'),rate:9});
  assert.equal(next.cashbackPrograms.length,3);
  assert.equal(next.cashbackPrograms.find(x=>x.id==='p2').name,'P2 edited');
  assert.equal(next.cashbackPrograms.find(x=>x.id==='p1').name,'P1');
  assert.equal(next.cashbackPrograms.find(x=>x.id==='p3').name,'P3');
});
