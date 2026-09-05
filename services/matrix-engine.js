import {calculateCashbackCycle,customerCardCycleConfig} from './cashback-cycle.js?v=20260901-statement-day-owner-v1';
import {calculateProgress,isProgramEligible} from './cashback-progress.js?v=20260901-statement-day-owner-v1';
import {normalizeCashbackConditions,isMccCategoryEligible} from './cashback-program.js?v=20260905-cashback-conditions-v1';

export const formatMatrixCustomerName=fullName=>{const words=String(fullName||'').trim().split(/\s+/).filter(Boolean);return words.map((word,i)=>i===words.length-1?word:Array.from(word)[0].toLocaleUpperCase('vi')+'.').join('');};
export const getMonthlyCycle=(referenceDate=new Date())=>calculateCashbackCycle({mode:'monthly',referenceDate});
export const getStatementCycle=(statementDay,referenceDate=new Date())=>calculateCashbackCycle({mode:'statement',statementDay,referenceDate});
export const getCustomerCardCycle=(customerCard,product,referenceDate=new Date())=>calculateCashbackCycle({...customerCardCycleConfig(customerCard,product),referenceDate});
export const getCycleKey=cycle=>!cycle.valid?'':cycle.mode==='monthly'?cycle.start.slice(0,7):`${cycle.start}/${cycle.end}`;
export const getTransactionsInCycle=(transactions,cycle)=>cycle.valid?transactions.filter(tx=>tx.status!=='cancelled'&&tx.date>=cycle.start&&tx.date<=cycle.end):[];
const compare=(a,b)=>String(a||'').localeCompare(String(b||''),'vi',{sensitivity:'base',numeric:true});

export function getMatrixCellState({customer,customerCards=[],product,program,transactions=[],programs=[],referenceDate=new Date()}){
 const base={customer,product,program,transactions:[]};
 if(!customerCards.length)return {...base,status:'NOT_APPLICABLE'};
 // Multiple owned records must never be silently combined across different statement cycles.
 if(customerCards.length!==1)return {...base,status:null,warning:'Có nhiều thẻ cùng Card ID. Cần xác định thẻ khách hàng trước khi điều phối.'};
 const customerCard=customerCards[0],cycle=getCustomerCardCycle(customerCard,product,referenceDate);
 const cardTransactions=transactions.filter(tx=>tx.customerCardId===customerCard.id&&tx.customerId===customer.id);
 // Out-of-program dates still contribute to card total spend, but not cashback.
 const progressTransactions=cardTransactions.map(tx=>tx.cashbackProgramId===program.id&&!isProgramEligible(program,tx)?{...tx,cashbackProgramId:''}:tx);
 const progress=calculateProgress({customerCard,product,program,transactions:progressTransactions,programs,referenceDate});
 const matching=getTransactionsInCycle(cardTransactions,cycle).filter(tx=>tx.cashbackProgramId===program.id&&isProgramEligible(program,tx)).sort((a,b)=>compare(a.date,b.date)||compare(a.id,b.id));
 const result={...base,customerCard,cycle,progress,transactions:matching};
 const today=getMonthlyCycle(referenceDate);const date=referenceDate instanceof Date?`${referenceDate.getFullYear()}-${String(referenceDate.getMonth()+1).padStart(2,'0')}-${String(referenceDate.getDate()).padStart(2,'0')}`:String(referenceDate);
 if(!progress.valid||['locked','needs-confirmation'].includes(progress.status)||!today.valid||program.startDate&&date<program.startDate||program.endDate&&date>program.endDate)return {...result,status:null,warning:progress.warning||'Chương trình chưa khả dụng hoặc cần xác nhận điều kiện loại trừ.'};
 // Reuse condition/total-spend AND/OR rules. Unlimited programs without a total
 // target stay actionable: earning cashback is not exhaustion of an unlimited cap.
 const unlimited=progress.conditionProgress.every(condition=>condition.maxCashbackUnlimited);
 const completed=progress.programConditionReached&&(!unlimited||progress.totalTarget!=null);
 return {...result,status:progress.eligibleSpend===0?'AVAILABLE':completed?'COMPLETED':'IN_PROGRESS'};
}

export function buildMatrix(state,referenceDate=new Date()){
 const customers=[...state.customers].sort((a,b)=>compare(a.fullName,b.fullName)||compare(a.id,b.id)),banks=new Map(state.banks.map(bank=>[bank.id,bank])),owners=new Map(),transactions=new Map();
 for(const card of state.customerCards.filter(card=>card.status==='active')){const key=JSON.stringify([card.customerId,card.cardProductId]);if(!owners.has(key))owners.set(key,[]);owners.get(key).push(card);}
 for(const tx of state.transactions){if(!transactions.has(tx.customerCardId))transactions.set(tx.customerCardId,[]);transactions.get(tx.customerCardId).push(tx);}
 const products=new Map(state.cardProducts.filter(product=>product.status!=='inactive').map(product=>[product.id,product]));
 const rows=state.cashbackPrograms.filter(program=>program.status==='active'&&products.has(program.bankCardProductId)).map(program=>{const product=products.get(program.bankCardProductId),bank=banks.get(product.bankId),cells=customers.map(customer=>{const cards=owners.get(JSON.stringify([customer.id,product.id]))||[];return getMatrixCellState({customer,customerCards:cards,product,program,transactions:cards.flatMap(card=>transactions.get(card.id)||[]),programs:state.cashbackPrograms,referenceDate});});return {product,program,bank,cells};});
 rows.sort((a,b)=>compare(a.bank?.name,b.bank?.name)||compare(a.product.cardId,b.product.cardId)||compare(a.program.name,b.program.name)||compare(a.program.id,b.program.id));
 return {customers,rows};
}

export function matrixOrderPreset(cell,state){
 const conditions=normalizeCashbackConditions(cell.program,state.mccCategories),categories=state.mccCategories.filter(category=>conditions.some(condition=>isMccCategoryEligible(condition,category.id))),methods=[...new Set(conditions.map(condition=>condition.transactionMethod))];
 return {customerId:cell.customer.id,customerCardId:cell.customerCard.id,cashbackProgramId:cell.program.id,mccCategoryId:categories.length===1?categories[0].id:'',transactionMethod:methods.length===1?methods[0]:''};
}
