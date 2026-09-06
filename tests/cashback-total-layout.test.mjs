import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
const editor=readFileSync(new URL('../services/cashback-program-editor.js',import.meta.url),'utf8');

test('Chi tổng keeps its existing controls in one compact inline group',()=>{
 assert.match(editor,/class="cashback-total-row"[\s\S]*class="check-field"[\s\S]*data-total-enabled[\s\S]*class="money-input"[\s\S]*data-total-amount[\s\S]*<span>đ<\/span>/);
 assert.match(css,/\.cashback-total-row\{display:flex;align-items:center;justify-content:flex-start;gap:14px\}/);
 assert.match(css,/\.cashback-total-row \.money-input\{flex:0 0 250px;width:250px;max-width:100%\}/);
 assert.match(css,/@media\(max-width:767px\)\{\.cashback-total-row\{flex-wrap:wrap;gap:8px 12px\}/);
});

test('Chi tổng enable, validation and VND input binding remain unchanged',()=>{
 assert.match(editor,/totalEnabled\.onchange=.*totalAmount\.disabled=!totalEnabled\.checked/);
 assert.match(editor,/totalAmount\.oninput=.*moneyText\(totalAmount\.value\)/);
 assert.match(editor,/totalSpendCondition\.enabled&&!totalSpendCondition\.amount/);
});
