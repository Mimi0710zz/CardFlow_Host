import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalize} from '../services/local-repository.js';
import {buildMatrix,formatMatrixCustomerName,getMonthlyCycle,getStatementCycle,getCycleKey,matrixOrderPreset} from '../services/matrix-engine.js';

export const fixture=()=>canonicalize({banks:[{id:'b',name:'Ngân hàng'}],cardProducts:[{id:'p',bankId:'b',cardId:'CAKE-SIGNATURE',cardBrand:'Visa',cashbackCycleMode:'monthly'}],customers:[{id:'a',fullName:'Nguyễn Quang Minh'},{id:'b',fullName:'Nguyễn Văn Trí'},{id:'c',fullName:'Trần Hữu Phong'}],customerCards:[{id:'a-card',customerId:'a',cardProductId:'p',statementDay:20},{id:'b-card',customerId:'b',cardProductId:'p',statementDay:25}],cashbackPrograms:[{id:'pr',bankCardProductId:'p',name:'Online 10%',rate:10,maxCashback:400000,mccCategoryIds:['m'],transactionMethod:'Online'}],mccCategories:[{id:'m',name:'Online',codes:['5411']}],orderTypes:[{id:'o',code:'ONLINE'}],transactions:[]});
const transaction=(id,amount,date='2026-09-03',extra={})=>({id,amount,date,customerId:'a',customerCardId:'a-card',cashbackProgramId:'pr',mccCategoryId:'m',transactionMethod:'Online',status:'completed',...extra});
const cell=(state,id='a',date='2026-09-06')=>buildMatrix(state,date).rows[0].cells.find(cell=>cell.customer.id===id);

test('matrix customer names preserve final word and stored names',()=>{
 for(const [name,expected] of [['Nguyễn Quang Minh','N.Q.Minh'],['Nguyễn Văn Anh Tuấn','N.V.A.Tuấn'],['Trần Minh','T.Minh'],['Toàn','Toàn'],['  Nguyễn   Minh  ','N.Minh'],['','']])assert.equal(formatMatrixCustomerName(name),expected);
});
test('A-D / G-I: monthly colors derive from amounts, deletion and rollover',()=>{
 const state=fixture(),before=JSON.stringify(state);assert.equal(cell(state).status,'AVAILABLE');assert.equal(cell(state,'c').status,'NOT_APPLICABLE');assert.equal(JSON.stringify(state),before);
 state.transactions=[transaction('1',1500000)];assert.equal(cell(state).status,'IN_PROGRESS');assert.equal(cell(state).progress.remainingEligibleSpend,2500000);
 state.transactions.push(transaction('2',2500000));assert.equal(cell(state).status,'COMPLETED');assert.equal(cell(state).transactions.length,2);assert.equal(cell(state,'a','2026-10-01').status,'AVAILABLE');
 state.transactions.pop();assert.equal(cell(state).status,'IN_PROGRESS');state.transactions=[];assert.equal(cell(state).status,'AVAILABLE');
});
test('E/F/J: statement boundaries belong to each CustomerCard, clamp February and recompute edits',()=>{
 const state=fixture();state.cardProducts[0].cashbackCycleMode='statement';
 assert.equal(cell(state,'a','2026-09-22').cycle.start,'2026-09-21');assert.equal(cell(state,'b','2026-09-22').cycle.start,'2026-08-26');
 state.customerCards[0].statementDay=25;assert.equal(cell(state,'a','2026-09-22').cycle.start,'2026-08-26');
 assert.equal(getStatementCycle(31,'2026-02-28').end,'2026-02-28');assert.equal(getStatementCycle(31,'2026-03-01').start,'2026-03-01');assert.equal(getStatementCycle(31,'2024-02-10').end,'2024-02-29');
 assert.equal(getStatementCycle(20,'2026-09-20').end,'2026-09-20');assert.equal(getStatementCycle(20,'2026-09-21').end,'2026-10-20');
 assert.equal(getCycleKey(getMonthlyCycle('2026-09-06')),'2026-09');
 state.customerCards[0].statementDay='';assert.equal(cell(state).status,null);assert.match(cell(state).warning,/ngày sao kê/);
});
test('only matching customer, card, program, MCC, method, valid date and noncancelled orders count',()=>{
 const state=fixture();state.transactions=[transaction('ok',1500000),transaction('cancel',9000000,undefined,{status:'cancelled'}),transaction('customer',9000000,undefined,{customerId:'b'}),transaction('card',9000000,undefined,{customerCardId:'b-card'}),transaction('program',9000000,undefined,{cashbackProgramId:'other'}),transaction('mcc',9000000,undefined,{mccCategoryId:'other'}),transaction('method',9000000,undefined,{transactionMethod:'Offline'}),transaction('past',9000000,'2026-08-31')];
 assert.equal(cell(state).progress.eligibleSpend,1500000);assert.deepEqual(cell(state).transactions.map(tx=>tx.id),['ok']);
 state.cashbackPrograms[0].startDate='2026-09-04';assert.equal(cell(state).progress.eligibleSpend,0);
});
test('unlimited remains actionable, total-spend and AND conditions reuse existing rules',()=>{
 const state=fixture();state.transactions=[transaction('ok',4000000)];state.cashbackPrograms[0].totalTarget=6000000;state.cashbackPrograms[0].combineOperator='AND';assert.equal(cell(state).status,'IN_PROGRESS');
 state.transactions.push(transaction('total',2000000,undefined,{cashbackProgramId:''}));assert.equal(cell(state).status,'COMPLETED');
 Object.assign(state.cashbackPrograms[0],{conditions:[],maxCashbackUnlimited:true,maxCashback:null,eligibleTarget:null,totalTarget:null});assert.equal(cell(state).status,'IN_PROGRESS');assert.equal(cell(state).progress.eligibleTarget,null);
});
test('K/L: safe preset omits financial fields and ambiguous MCC',()=>{
 const state=fixture(),preset=matrixOrderPreset(cell(state),state);assert.deepEqual(preset,{customerId:'a',customerCardId:'a-card',cashbackProgramId:'pr',mccCategoryId:'m',transactionMethod:'Online'});assert.equal('amount' in preset,false);
 state.mccCategories.push({id:'m2',name:'Other'});Object.assign(state.cashbackPrograms[0],{conditions:[],allMcc:true,mccSelectionMode:'all'});assert.equal(matrixOrderPreset(cell(state),state).mccCategoryId,'');
});
test('duplicate ownership is explicit, replacement sync data and program edits recompute',()=>{
 const state=fixture();state.customerCards.push({...state.customerCards[0],id:'duplicate'});assert.equal(cell(state).status,null);
 state.customerCards.pop();state.transactions=[transaction('ok',4000000)];assert.equal(cell(state).status,'COMPLETED');
 const synced=canonicalize({...state,transactions:[]});assert.equal(cell(synced).status,'AVAILABLE');
 state.cashbackPrograms[0]={...state.cashbackPrograms[0],conditions:[],maxAmount:600000,maxCashback:600000,eligibleTarget:6000000};assert.equal(cell(state).status,'IN_PROGRESS');
 state.transactions[0].amount=6000000;assert.equal(cell(state).status,'COMPLETED');
});
test('matrix row order is stable by bank, Card ID, program and customer full name',()=>{
 const state=fixture();state.cashbackPrograms.push({...state.cashbackPrograms[0],id:'aa',name:'A program'});
 const first=buildMatrix(state,'2026-09-06'),second=buildMatrix({...state,customers:[...state.customers].reverse(),cashbackPrograms:[...state.cashbackPrograms].reverse()},'2026-09-06');
 assert.deepEqual(first.rows.map(row=>row.program.id),['aa','pr']);assert.deepEqual(first.rows.map(row=>row.program.id),second.rows.map(row=>row.program.id));assert.deepEqual(first.customers.map(customer=>customer.id),second.customers.map(customer=>customer.id));
});
