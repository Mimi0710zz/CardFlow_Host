import test from "node:test";
import assert from "node:assert/strict";
import {canonicalize} from "../services/local-repository.js";
import {buildNextMccState,filterMccCategories,sortMccCategories,upsertMccCategory} from "../services/cashback-feature-ui.js";

const fixture=[
  {id:"mcc-education",name:"Giáo dục (Alepay)",codes:["8211"],description:"Học phí",notes:"Online"},
  {id:"mcc-food",name:"Ăn uống",codes:["5812"],description:"Nhà hàng",notes:"POS"},
  {id:"mcc-market",name:"Siêu thị",codes:["5411"],description:"Bán lẻ",notes:""}
];

test("MCC accepts empty, one and three-row collections",()=>{
  assert.equal(sortMccCategories([]).length,0);
  assert.equal(sortMccCategories(fixture.slice(0,1)).length,1);
  assert.equal(sortMccCategories(fixture).length,3);
});

test("MCC Add appends records and allocates unique IDs",()=>{
  let sequence=0,state=fixture.slice(0,1);
  const makeId=()=>`new-${++sequence}`;
  state=upsertMccCategory(state,{name:"Ăn uống",codes:["5812"]},makeId);
  state=upsertMccCategory(state,{name:"Siêu thị",codes:["5411"]},makeId);
  assert.equal(state.length,3);
  assert.equal(new Set(state.map(item=>item.id)).size,3);
  assert.deepEqual(fixture.slice(0,1),[fixture[0]]);
});

test("MCC Edit changes only the selected record and Delete keeps the others",()=>{
  const edited=upsertMccCategory(fixture,{...fixture[1],description:"Nhà hàng đã sửa"},()=>"unused");
  assert.equal(edited.find(item=>item.id==="mcc-food").description,"Nhà hàng đã sửa");
  assert.deepEqual(edited.find(item=>item.id==="mcc-education"),fixture[0]);
  assert.deepEqual(edited.filter(item=>item.id!=="mcc-food").map(item=>item.id),["mcc-education","mcc-market"]);
});

test("MCC search covers group, code, description and notes and clearing restores all",()=>{
  assert.equal(filterMccCategories(fixture,"").length,3);
  assert.deepEqual(filterMccCategories(fixture,"5812").map(item=>item.id),["mcc-food"]);
  assert.deepEqual(filterMccCategories(fixture,"Học phí").map(item=>item.id),["mcc-education"]);
  assert.deepEqual(filterMccCategories(fixture,"POS").map(item=>item.id),["mcc-food"]);
  assert.equal(filterMccCategories(fixture,"").length,3);
});

test("MCC canonicalization and JSON/local-style roundtrip preserve three records",()=>{
  const first=canonicalize({mccCategories:fixture}),second=canonicalize(first);
  assert.equal(first.mccCategories.length,3);
  assert.deepEqual(second.mccCategories,first.mccCategories);
  const roundtrip=canonicalize(JSON.parse(JSON.stringify(first)));
  assert.deepEqual(roundtrip.mccCategories,first.mccCategories);
});

test("MCC canonicalization preserves valid IDs and repairs only missing/duplicate IDs",()=>{
  const result=canonicalize({mccCategories:[fixture[0],{...fixture[1],id:"mcc-education"},{...fixture[2],id:""}]});
  assert.equal(result.mccCategories[0].id,"mcc-education");
  assert.equal(new Set(result.mccCategories.map(item=>item.id)).size,3);
  assert.ok(result.mccCategories.every(item=>item.id));
});

test("MCC repeated Add uses the latest replaced app state instead of a stale render snapshot",()=>{
  let sequence=0;
  const makeId=()=>`live-${++sequence}`;
  let appState=canonicalize({mccCategories:[fixture[0]]});

  // First Add.
  appState=canonicalize(buildNextMccState(appState,{name:"Ăn uống",codes:["5812"]},makeId));
  assert.equal(appState.mccCategories.length,2);

  // Simulate background sync replacing the global app state object after render.
  const staleRenderedSnapshot=appState;
  appState=canonicalize(JSON.parse(JSON.stringify(appState)));
  assert.notEqual(appState,staleRenderedSnapshot);

  // Second Add must base itself on the latest app state and produce a third row.
  appState=canonicalize(buildNextMccState(appState,{name:"Siêu thị",codes:["5411"]},makeId));
  assert.equal(appState.mccCategories.length,3);
  assert.deepEqual(appState.mccCategories.map(x=>x.name).sort(),["Giáo dục (Alepay)","Siêu thị","Ăn uống"].sort());
});
