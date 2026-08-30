import assert from "node:assert/strict";
import {calculateEffectiveCreditLimit} from "../services/credit-limit.js";

const products=["A","B","C","D","E","F"].map(id=>({id,cardId:id}));
const link=(cardProductId,creditLimit,sharedLimitCardIds=[],customerId="customer")=>({id:`${customerId}-${cardProductId}`,customerId,cardProductId,creditLimit,sharedLimitCardIds});
const total=links=>calculateEffectiveCreditLimit(links,products).total;

assert.equal(total([link("A",30_000_000,["B"]),link("B",30_000_000)]),30_000_000,"Case 1");
assert.equal(total([link("A",30_000_000,["B"]),link("B",30_000_000,["C"]),link("C",30_000_000)]),30_000_000,"Case 2");
assert.equal(total([link("A",82_000_000),link("B",145_000_000,["C","D"]),link("C",145_000_000),link("D",145_000_000),link("E",30_000_000,["F"]),link("F",30_000_000)]),257_000_000,"Case 3");
assert.equal(total([link("A",50_000_000),link("B",30_000_000,["C"]),link("C",30_000_000,["B"]),link("D",20_000_000)]),100_000_000,"Case 4");
assert.equal(total([link("A",30_000_000,["B"]),link("B",30_000_000,["C"]),link("C",30_000_000,["A"])]),30_000_000,"Case 5");
assert.equal(total([link("A",30_000_000,["B","B","A","INVALID","Không",null]),link("B",30_000_000)]),30_000_000,"Case 6");

const inconsistent=calculateEffectiveCreditLimit([link("A",30_000_000,["B"]),link("B",40_000_000)],products);
assert.equal(inconsistent.total,0);
assert.equal(inconsistent.inconsistencies.length,1);
assert.deepEqual(inconsistent.inconsistencies[0].limits,[30_000_000,40_000_000]);

const ordered=[link("C",30_000_000,["B"]),link("A",20_000_000),link("B",30_000_000,["C"])];
assert.equal(total(ordered),50_000_000);
assert.equal(total([...ordered].reverse()),50_000_000,"Sorting/row order must not affect the result");

console.log("Effective credit-limit connected-component tests passed.");
