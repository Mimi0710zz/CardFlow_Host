import test from 'node:test';
import assert from 'node:assert/strict';
import {cacheCashbackProgramSnapshot,cashbackProgramSnapshotKey,restoreCashbackProgramSnapshot,resolveCashbackProgramSelection,cashbackStructureSelection,addCashbackCondition,removeCashbackCondition,moveCashbackCondition} from '../services/cashback-program-config.js';

test('no selected card keeps program and package empty',()=>{
  const s=resolveCashbackProgramSelection({cards:[{id:'card'}],programs:[{id:'p',cardProductId:'card'}]});
  assert.deepEqual(s,{cardId:'',programId:'',packageId:''});
});

test('cancel restores current program snapshot but not a deleted program',()=>{
  const cache=new Map(),p={id:'p',cardProductId:'card',name:'Original',conditions:[]};
  cacheCashbackProgramSnapshot(cache,p);
  const restored=restoreCashbackProgramSnapshot([{...p,name:'Edited'}],cache.get(cashbackProgramSnapshotKey(p)));
  assert.equal(restored.find(x=>x.id==='p').name,'Original');
  const afterDelete=restoreCashbackProgramSnapshot([],cache.get(cashbackProgramSnapshotKey(p)));
  assert.deepEqual(afterDelete,[]);
});

test('structure navigation changes only program/package within current card context',()=>{
  assert.deepEqual(cashbackStructureSelection({cardId:'card',programId:'old',packageId:''},{programId:'new',packageId:'pkg'}),{cardId:'card',programId:'new',packageId:'pkg'});
});

test('condition actions preserve package hierarchy',()=>{
  const p={id:'p',cardProductId:'card',packages:[{id:'pkg',groups:[{id:'g1',conditions:[{id:'c1',name:'One'}]}]}]};
  const added=addCashbackCondition(p,{packageId:'pkg'},{id:'c2',name:'Two'});
  assert.equal(added.packages[0].groups.length,2);
  const moved=moveCashbackCondition(added,{packageId:'pkg',groupId:added.packages[0].groups[1].id,conditionId:'c2'},-1);
  assert.equal(moved.packages[0].groups[0].conditions[0].id,'c2');
  const removed=removeCashbackCondition(moved,{packageId:'pkg',groupId:moved.packages[0].groups[0].id,conditionId:'c2'});
  assert.equal(removed.packages[0].groups.some(g=>g.conditions.some(c=>c.id==='c2')),false);
});
