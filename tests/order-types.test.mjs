import test from "node:test";
import assert from "node:assert/strict";
import {canonicalize} from "../services/local-repository.js";

const DEFAULT_CODES=[
  "ZING","TVLK","VNPAY","BH","ALEPAY","TGDD","VMB","POS","BHX","HPAY",
  "VOUCHER","UNICITY","QR","AMWAY","SUN.W","GO","MEGAPAY","LINK MPOS","TRIP"
];

test("order type migration seeds the 19 default codes exactly once",()=>{
  const state=canonicalize({schemaVersion:3,settings:{}});
  assert.deepEqual(state.orderTypes.map(item=>item.code),DEFAULT_CODES);
  assert.equal(new Set(state.orderTypes.map(item=>item.code)).size,DEFAULT_CODES.length);
  assert.equal(state.settings.orderTypesInitialized,true);
  const roundtrip=canonicalize(state);
  assert.deepEqual(roundtrip.orderTypes.map(item=>item.code),DEFAULT_CODES);
});

test("order type migration preserves user-managed deletion after initialization",()=>{
  const initialized=canonicalize({schemaVersion:3,settings:{}});
  const withoutZing={...initialized,orderTypes:initialized.orderTypes.filter(item=>item.code!=="ZING")};
  const roundtrip=canonicalize(withoutZing);
  assert.equal(roundtrip.orderTypes.some(item=>item.code==="ZING"),false);
  assert.equal(roundtrip.orderTypes.length,DEFAULT_CODES.length-1);
});

test("transactions preserve legacy order type values",()=>{
  const raw=canonicalize({
    schemaVersion:3,
    settings:{},
    banks:[{id:"b",code:"B",name:"Bank"}],
    customers:[{id:"c",customerCode:"KH",fullName:"Customer"}],
    cardProducts:[{id:"p",cardId:"CARD",bankId:"b",cardName:"Card"}],
    customerCards:[{id:"cc",customerId:"c",cardProductId:"p"}],
    transactions:[{id:"t",date:"2026-09-01",customerId:"c",customerCardId:"cc",amount:1000,mccCategoryId:"",orderTypeCode:"LEGACY",transactionMethod:"Online"}]
  });
  assert.equal(raw.transactions[0].orderTypeCode,"LEGACY");
});
