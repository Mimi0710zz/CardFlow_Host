import test from "node:test";
import assert from "node:assert/strict";
import {canonicalize} from "../services/local-repository.js";
import {applyHostBootstrapData} from "../services/host-bootstrap.js";
import {DEFAULT_PROGRAM_PRIORITY,getProgramPriority} from "../services/cashback-program.js";
import {buildCoordinationRows,recommendOrders} from "../services/order-coordination.js";
import {coordinationDisplayStatus,selectDefaultProgram,sortCoordinationRows} from "../services/coordination-ui.js";

const EMPTY={schemaVersion:3,revision:0,banks:[],customers:[],cardProducts:[],customerCards:[],mccCategories:[],cashbackPrograms:[],transactions:[],settings:{}};
const PARTIAL={...EMPTY,banks:[{id:"b",code:"B",name:"Bank"}],customers:[{id:"c1",customerCode:"1",fullName:"A"},{id:"c2",customerCode:"2",fullName:"B"}],cardProducts:[{id:"p",cardId:"CARD",bankId:"b",cardName:"Card",status:"active"}],customerCards:[{id:"cc1",customerId:"c1",cardProductId:"p",status:"active"},{id:"cc2",customerId:"c2",cardProductId:"p",status:"active"}]};

test("exact post-Drive bootstrap accepts completely empty canonical data",()=>{let applied,rendered;const result=applyHostBootstrapData(EMPTY,{applyState:value=>{applied=value;},renderApp:value=>{rendered=value;}});assert.deepEqual(result,applied);assert.deepEqual(result,rendered);for(const key of ["banks","customers","cardProducts","customerCards","mccCategories","cashbackPrograms","transactions"])assert.deepEqual(result[key],[]);});
test("priority helper handles null, missing and invalid values",()=>{for(const program of [null,{}, {priority:null},{priority:undefined},{priority:"invalid"}])assert.equal(getProgramPriority(program),DEFAULT_PROGRAM_PRIORITY);assert.equal(getProgramPriority({priority:"7"}),7);});
test("two customer cards without programs sort as configuration reminders without throwing",()=>{const state=canonicalize(PARTIAL),missing=state.customerCards.map((customerCard,index)=>({customer:{fullName:index?"B":"A"},customerCard,product:state.cardProducts[0],program:null,progress:{valid:false,status:"configuration-incomplete"}}));assert.doesNotThrow(()=>sortCoordinationRows(missing));assert.deepEqual(buildCoordinationRows(state),[]);assert.deepEqual(recommendOrders(state,{amount:1000}),[]);assert.equal(coordinationDisplayStatus(missing[0]),"configuration");});
test("stale selection and orphan transaction program IDs remain safe and explicit",()=>{const raw={...PARTIAL,transactions:[{id:"t",date:"2026-09-01",customerId:"c1",customerCardId:"cc1",amount:1000,cashbackProgramId:"orphan-program",status:"completed"}]},state=canonicalize(raw);assert.equal(selectDefaultProgram([],"stale-program"),"");assert.equal(state.transactions[0].cashbackProgramId,"orphan-program");});
test("null entries in business collections are ignored as malformed entries",()=>{const state=canonicalize({...EMPTY,banks:[null],customers:[null],cardProducts:[null],customerCards:[null],mccCategories:[null],cashbackPrograms:[null],transactions:[null]});for(const key of ["banks","customers","cardProducts","customerCards","mccCategories","cashbackPrograms","transactions"])assert.deepEqual(state[key],[]);});
