import test from "node:test";
import assert from "node:assert/strict";
import {canonicalize} from "../services/local-repository.js";
import {calculateTransactionAmounts,formatPercent,parsePercent} from "../services/transaction-calculations.js";
import {clampDay,daysInMonth} from "../services/cashback-feature-ui.js";

test("transaction fee calculation examples match expected net amounts and profit",()=>{
  assert.deepEqual(calculateTransactionAmounts({amount:4020000,orderFeePercent:4,orderFeeFixed:60000,sourceFeePercent:4,sourceFeeFixed:0}),{customerNetAmount:3799200,sourceNetAmount:3859200,profit:60000});
  assert.deepEqual(calculateTransactionAmounts({amount:1526000,orderFeePercent:4,orderFeeFixed:15000,sourceFeePercent:4,sourceFeeFixed:0}),{customerNetAmount:1449960,sourceNetAmount:1464960,profit:15000});
  assert.deepEqual(calculateTransactionAmounts({amount:2159000,orderFeePercent:2.5,orderFeeFixed:6600,sourceFeePercent:2.5,sourceFeeFixed:6600}),{customerNetAmount:2098425,sourceNetAmount:2098425,profit:0});
});

test("transaction percent parsing and display stay in one percent convention",()=>{
  assert.equal(parsePercent("4.0%"),4);
  assert.equal(parsePercent("2,5"),2.5);
  assert.equal(parsePercent(""),0);
  assert.equal(formatPercent(4),"4.0%");
  assert.equal(formatPercent(2.5),"2.5%");
});

test("transaction migration preserves records and derives calculated fields",()=>{
  const state=canonicalize({
    banks:[{id:"b",code:"B",name:"Bank"}],
    customers:[{id:"c",customerCode:"KH",fullName:"Customer"}],
    cardProducts:[{id:"p",cardId:"CARD",bankId:"b",cardName:"Card"}],
    customerCards:[{id:"cc",customerId:"c",cardProductId:"p"}],
    mccCategories:[{id:"m",name:"MCC",codes:["1234"]}],
    transactions:[{id:"t",date:"2026-09-02",customerId:"c",customerCardId:"cc",amount:"4.020.000 đ",mccCategoryId:"m",orderTypeCode:"ALEPAY",orderFeePercent:"4.0%",orderFeeFixed:"60.000 đ",sourceFeePercent:4,sourceFeeFixed:0,sourceName:"",transactionMethod:"Online"}]
  });
  assert.equal(state.transactions.length,1);
  assert.equal(state.transactions[0].customerNetAmount,3799200);
  assert.equal(state.transactions[0].sourceNetAmount,3859200);
  assert.equal(state.transactions[0].profit,60000);
  assert.equal(state.transactions[0].sourcePaymentStatus,"pending");
  assert.equal(state.transactions[0].customerPaymentStatus,"pending");
});

test("day selector calendar logic clamps invalid days",()=>{
  assert.equal(daysInMonth(2026,2),28);
  assert.equal(daysInMonth(2028,2),29);
  assert.equal(daysInMonth(2026,4),30);
  assert.equal(daysInMonth(2026,1),31);
  assert.equal(clampDay(2026,2,31),28);
});
