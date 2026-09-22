import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCashbackProgramEditorModel,renderCashbackProgramPage} from '../services/cashback-program-config.js';
const cards=[{id:'card-b',cardId:'B'},{id:'card-a',cardId:'A'}];
const programs=[{id:'p1',cardProductId:'card-a',name:'Main',conditionMode:'supporting',totalSpendMinimum:5000000,conditions:[{id:'c1',name:'Ăn uống',rate:5,max:200000,maxCashbackUnlimited:false,mccCategoryIds:['food'],channel:'Online'}]}];
test('editor exposes same primary Client workflow controls',()=>{
  const model=buildCashbackProgramEditorModel({cards,programs,selection:{cardId:'card-a',programId:'p1'}});
  const html=renderCashbackProgramPage(model,{escape:String,formatMoney:String,calculateSpendToMax:(r,m)=>m/(r/100),mccOptions:()=>'<label>Ăn uống</label>',mccSummary:()=> 'Ăn uống',transactionMethodOptions:()=>'<option>Online</option>'});
  for(const marker of ['data-cashback-card-select','data-cashback-program-select','data-add-program','THÔNG TIN CHUNG','CÁCH TÍNH CASHBACK','YÊU CẦU DOANH SỐ','value="independent"','value="first_match"','value="supporting"','value="all_required"','ĐIỀU KIỆN CASHBACK','data-add-condition','data-cancel-program','data-save-program','CẤU TRÚC CHƯƠNG TRÌNH']) assert.match(html,new RegExp(marker));
});
test('card selector keeps empty default and sorts displayed Card IDs A-Z',()=>{
  const model=buildCashbackProgramEditorModel({cards,programs,selection:{}});
  assert.deepEqual(model.cardOptions.map(x=>x.label),['A','B']);
  assert.equal(model.selection.cardId,'');
});
