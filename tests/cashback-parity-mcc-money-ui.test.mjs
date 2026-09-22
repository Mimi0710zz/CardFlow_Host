import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildCashbackProgramEditorModel,renderCashbackProgramPage} from '../services/cashback-program-config.js';

const model=buildCashbackProgramEditorModel({
  cards:[{id:'card',cardId:'CAKE-Signature'}],
  programs:[{
    id:'program',cardProductId:'card',name:'CAKE-Sig',conditionMode:'independent',totalSpendMinimum:20000000,
    conditions:[{id:'condition',name:'Du lịch',rate:20,max:2000000,maxCashbackUnlimited:false,mccCategoryIds:['travel'],channel:''}]
  }],
  selection:{cardId:'card',programId:'program'}
});

function render(){
  return renderCashbackProgramPage(model,{
    escape:String,
    // Simulates the Host formatter currently used by the runtime: it already contains the currency suffix.
    formatMoney:value=>value==null?'':`${Number(value).toLocaleString('vi-VN')} đ`,
    calculateSpendToMax:(rate,max)=>max/(rate/100),
    mccOptions:()=>'<label class="multi-option"><input type="checkbox" value="travel" checked><span>Du lịch</span></label>',
    mccSummary:()=> '1 nhóm MCC đã chọn',
    transactionMethodOptions:()=>'<option value="">Tất cả</option>'
  });
}

test('cashback money inputs keep currency suffix inside wrapper without duplicating đ in value',()=>{
  const html=render();
  assert.match(html,/class="money-input cashback-money-input"><input data-program-max[^>]*value="2\.000\.000"[^>]*><span>đ<\/span><\/div>/);
  assert.match(html,/class="money-input cashback-money-input"><input data-program-total-min[^>]*value="20\.000\.000"[^>]*><span>đ<\/span><\/div>/);
  assert.doesNotMatch(html,/value="[^"]* đ"/);
});

test('cashback workflow scopes MCC checkbox panel as a dropdown that is hidden until opened',()=>{
  const css=fs.readFileSync(new URL('../styles.css',import.meta.url),'utf8');
  assert.match(css,/\.cashback-program-workflow \.multi-select-panel\s*\{[^}]*display\s*:\s*none/s);
  assert.match(css,/\.cashback-program-workflow \.multi-select\.open \.multi-select-panel\s*\{[^}]*display\s*:\s*block/s);
});

test('cashback MCC control remains a multi-select toggle with checkbox options',()=>{
  const html=render();
  assert.match(html,/class="multi-select cashback-mcc-select"/);
  assert.match(html,/data-cashback-mcc-toggle/);
  assert.match(html,/class="multi-select-panel"/);
  assert.match(html,/type="checkbox" value="travel" checked/);
});
