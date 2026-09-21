import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');

test('sidebar exposes shared Import Excel and Export Excel buttons',()=>{
  assert.match(index,/id="importExcel"[^>]*>Import Excel</);
  assert.match(index,/id="exportExcel"[^>]*>Export Excel</);
  assert.match(index,/id="importExcelFile"/);
});

test('app contains selectable export modal and three import modes',()=>{
  assert.match(app,/Chọn các tab muốn xuất thành sheet Excel/);
  assert.match(app,/Cập nhật dòng cũ theo Excel/);
  assert.match(app,/Tự thêm mới/);
  assert.match(app,/Excel là master/);
});
