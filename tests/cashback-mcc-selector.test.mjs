import test from "node:test";
import assert from "node:assert/strict";
import {canonicalize} from "../services/local-repository.js";
import {getMccSelectionMode,isMccCategoryEligible} from "../services/cashback-program.js";
import {isProgramEligible} from "../services/cashback-progress.js";

const base={banks:[{id:"b",code:"CAKE",name:"Cake"}],cardProducts:[{id:"p",cardId:"CAKE-SIGNATURE",bankId:"b",cardName:"Cake Premium Signature"}],mccCategories:[{id:"a",name:"Ăn uống",codes:["5814"]},{id:"b1",name:"Giáo dục",codes:["8211"]},{id:"c",name:"Siêu thị",codes:["5411"]}]};

test("legacy selected MCC program migrates to selected mode",()=>{
 const state=canonicalize({...base,cashbackPrograms:[{id:"pr",bankCardProductId:"p",name:"Selected",mccCategoryIds:["a","c"],rate:5,maxCashback:100000}]});
 const program=state.cashbackPrograms[0];
 assert.equal(getMccSelectionMode(program),"selected");
 assert.deepEqual(program.mccCategoryIds,["a","c"]);
 assert.deepEqual(program.excludedMccCategoryIds,[]);
 assert.equal(isMccCategoryEligible(program,"a"),true);
 assert.equal(isMccCategoryEligible(program,"b1"),false);
});

test("all mode with exclusion applies to all current and future MCC except excluded",()=>{
 const state=canonicalize({...base,cashbackPrograms:[{id:"pr",bankCardProductId:"p",name:"All except education",mccSelectionMode:"all",excludedMccCategoryIds:["b1"],rate:10,maxCashback:400000}]});
 const program=state.cashbackPrograms[0];
 assert.equal(program.allMcc,true);
 assert.equal(getMccSelectionMode(program),"all");
 assert.equal(isMccCategoryEligible(program,"a"),true);
 assert.equal(isMccCategoryEligible(program,"b1"),false);
 assert.equal(isMccCategoryEligible(program,"c"),true);
 assert.equal(isMccCategoryEligible(program,"future-mcc"),true);
});

test("legacy empty MCC list preserves previous apply-all behavior",()=>{
 const state=canonicalize({...base,cashbackPrograms:[{id:"pr",bankCardProductId:"p",name:"Legacy all",mccCategoryIds:[],allMcc:false,rate:5,maxCashback:100000}]});
 const program=state.cashbackPrograms[0];
 assert.equal(getMccSelectionMode(program),"all");
 assert.equal(isMccCategoryEligible(program,"a"),true);
});

test("transaction eligibility respects all-mode exclusions",()=>{
 const program={status:"active",mccSelectionMode:"all",excludedMccCategoryIds:["b1"],transactionMethod:"Online"};
 assert.equal(isProgramEligible(program,{date:"2026-09-01",mccCategoryId:"a",transactionMethod:"Online"}),true);
 assert.equal(isProgramEligible(program,{date:"2026-09-01",mccCategoryId:"b1",transactionMethod:"Online"}),false);
 assert.equal(isProgramEligible(program,{date:"2026-09-01",mccCategoryId:"a",transactionMethod:"Offline"}),false);
});

test("canonicalization roundtrip preserves all/exclusion fields",()=>{
 const first=canonicalize({...base,cashbackPrograms:[{id:"pr",bankCardProductId:"p",name:"All",mccSelectionMode:"all",excludedMccCategoryIds:["b1"],rate:10,maxCashback:400000}]});
 const second=canonicalize(JSON.parse(JSON.stringify(first)));
 const program=second.cashbackPrograms[0];
 assert.equal(program.mccSelectionMode,"all");
 assert.deepEqual(program.mccCategoryIds,[]);
 assert.deepEqual(program.excludedMccCategoryIds,["b1"]);
 assert.equal(program.allMcc,true);
});
