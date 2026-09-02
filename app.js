import {LocalRepository,uuid} from "./services/local-repository.js?v=20260902-transaction-fees-v1";
import {DriveAuth} from "./services/drive-auth.js?v=20260901-gis-auth-fix";
import {DriveRepository} from "./services/drive-repository.js?v=20260830-customercardsv3";
import {SyncService} from "./services/sync-service.js?v=20260902-transaction-fees-v1";
import {formatMoney,parseMoney,formatVndInput,bindVndInput} from "./services/money.js?v=20260830-customer-tagsv5";
import {formatDate,formatDay,toStorageDate} from "./services/date.js?v=20260830-customercardsv3";
import {compareText,sortByLabel,compareCards,compareCardId,compareCustomerCardLinks,buildSortedCustomerCardRows,compareCustomers} from "./services/sorting.js?v=20260830-customer-detail-sortv9";
import {CARD_BRANDS,CARD_RANKS,OWNERSHIP_TYPES,normalizeCardBrand,normalizeCardRank,normalizeOwnershipType} from "./services/card-types.js?v=20260831-cardranksv8";
import {calculateEffectiveCreditLimit} from "./services/credit-limit.js?v=20260830-effective-limitv7";
import {renderCashbackFeatures,renderCashbackDashboard} from "./services/cashback-feature-ui.js?v=20260902-transaction-fees-v1";
import {applyHostBootstrapData} from "./services/host-bootstrap.js?v=20260902-transaction-fees-v1";
import {customerCardCycleConfig} from "./services/cashback-cycle.js?v=20260901-statement-day-owner-v1";
import {currentHostGuideItems,currentAboutIntroduction} from "./services/about-guide-content.js?v=20260901-about-guide-latest-v1";

const $=(selector,root=document)=>root.querySelector(selector), $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
const repo=new LocalRepository(); let state=repo.load(), currentView="dashboard", filters={}, sorts={}, pendingRemote=null;
let compactFilterOutsideHandler=null;
const auth=new DriveAuth(window.HostFlowConfig), drive=new DriveRepository(auth);
const sync=new SyncService({localRepository:repo,driveRepository:drive,auth,getState:()=>state,setState:value=>{state=value;}});
const SIDEBAR_STORAGE_KEY="cardflow-host-sidebar-expanded";
const expandedResponsiveRows=new Set();
const VIEW_META={
  dashboard:{title:"Tổng hợp",description:"Tổng quan danh mục khách hàng và thẻ"},
  customers:{title:"Khách hàng",description:"Quản lý khách hàng và thẻ đang sở hữu"},
  cards:{title:"Thẻ ngân hàng",description:"Quản lý sản phẩm thẻ ngân hàng dùng chung"},
  transactions:{title:"Giao Dịch",description:"Ghi nhận và tra cứu giao dịch theo ngày"},
  coordination:{title:"Điều phối đơn",description:"Theo dõi tiến độ và điều phối giao dịch theo chương trình hoàn tiền"},
  programs:{title:"Chương trình hoàn tiền",description:"Cấu hình rule một lần cho từng Thẻ ngân hàng"},
  mcc:{title:"Mã MCC",description:"Danh mục nhóm ngành và mã MCC"},
  "order-types":{title:"Loại đơn",description:"Quản lý danh mục loại đơn dùng khi đánh đơn"},
  catalog:{title:"Danh mục",description:"Quản lý dữ liệu danh mục"},
  system:{title:"Hệ thống",description:"Nhập liệu, đồng bộ và sao lưu"},
  about:{title:"Giới thiệu & Hướng dẫn",description:"Thông tin ứng dụng và hướng dẫn sử dụng CardFlow Host"}
};
const ICON_PATHS={
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  x:'<path d="m18 6-12 12M6 6l12 12"/>',
  "layout-dashboard":'<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
  "credit-card":'<rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  "table-properties":'<path d="M15 3v18M3 9h18M3 15h18"/><rect width="18" height="18" x="3" y="3" rx="2"/>',
  settings:'<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"/><circle cx="12" cy="12" r="3"/>',
  "circle-help":'<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 1 1 5.83 1c0 2-3 2-3 4M12 18h.01"/>',
  play:'<circle cx="12" cy="12" r="10"/><path d="m10 8 6 4-6 4Z"/>',
  cloud:'<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  link:'<path d="M10 13a5 5 0 0 0 7.07.07l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.15M14 11a5 5 0 0 0-7.07-.07l-2 2A5 5 0 0 0 12 20l1.15-1.15"/>',
  search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  refresh:'<path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 4v5h5M4 13a8.1 8.1 0 0 0 15.5 2M20 20v-5h-5"/>',
  devices:'<rect width="14" height="10" x="2" y="3" rx="2"/><path d="M8 21h8M12 17v4"/><rect width="6" height="12" x="16" y="8" rx="2"/>',
  database:'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v6c0 1.66 4 3 9 3s9-1.34 9-3V5M3 11v6c0 1.66 4 3 9 3s9-1.34 9-3v-6"/>',
  filter:'<path d="M4 5h16M7 12h10M10 19h4"/>',
  info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  chevron:'<path d="m6 9 6 6 6-6"/>'
};
function icon(name){return `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name]||ICON_PATHS["circle-help"]}</svg>`;}
let connectingDrive=false, authMessage="";
const normalize=value=>String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").toLowerCase();
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const bank=id=>state.banks.find(x=>x.id===id); const customer=id=>state.customers.find(x=>x.id===id); const product=id=>state.cardProducts.find(x=>x.id===id);
const linksForCustomer=id=>state.customerCards.filter(x=>x.customerId===id); const linksForProduct=id=>state.customerCards.filter(x=>x.cardProductId===id);
const effectiveLimit=links=>calculateEffectiveCreditLimit(links,state.cardProducts);
function effectiveLimitDisplay(analysis){return analysis.inconsistencies.length?`<span class="limit-warning" title="Nhóm hạn mức chung có giá trị không đồng nhất">⚠ Cần kiểm tra</span>`:formatMoney(analysis.total,true);}
function limitInconsistencyWarning(analysis){
  if(!analysis.inconsistencies.length)return "";
  const rows=analysis.inconsistencies.map(group=>{const names=group.members.map(link=>product(link.cardProductId)?.cardId||link.cardProductId).join(", "),limits=group.limits.map(formatMoney).join(" / ");return `<li><strong>${esc(names)}</strong>: ${esc(limits)}</li>`;}).join("");
  return `<div class="credit-limit-alert"><strong>⚠ Hạn mức chung không nhất quán</strong><span>Nhóm dưới đây không được cộng vào tổng cho đến khi các thẻ có cùng hạn mức.</span><ul>${rows}</ul></div>`;
}
function attributedEffectiveLimits(analysis){
  const result=new Map();
  analysis.groups.forEach(group=>{const owner=group.members[0]?.cardProductId;if(!owner)return;const current=result.get(owner)||{total:0,inconsistencies:[]};current.total+=group.contribution;if(!group.consistent)current.inconsistencies.push(group);result.set(owner,current);});
  return result;
}
function save(message="Đã lưu thay đổi",nextState=state){state=repo.save(nextState);repo.saveMeta({...repo.loadMeta(),status:auth.hasToken()?"dirty":"disconnected"});render();renderSyncStatus();toast(message);return state;}
function toast(message){const el=$("#toast");el.textContent=message;el.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove("show"),2400);}
function statusLabel(value){return value==="active"?"Đang hoạt động":value==="inactive"?"Ngừng hoạt động":value==="closed"?"Đã đóng":value==="expiring"?"Sắp hết hạn":value||"—";}
function badge(value){return `<span class="badge ${value==="active"?"":"off"}">${esc(statusLabel(value))}</span>`;}
function options(items,value,label,key="id"){return `<option value="">-- Chọn --</option>`+sortByLabel(items,label).map(x=>`<option value="${esc(x[key])}" ${x[key]===value?"selected":""}>${esc(label(x))}</option>`).join("");}
function field(name,label,value="",type="text",required=false,extra=""){return `<div class="field"><label>${label}${required?" *":""}</label><input name="${name}" type="${type}" value="${esc(value)}" ${required?"required":""} ${extra}></div>`;}
function selectField(name,label,html,required=false){return `<div class="field"><label>${label}${required?" *":""}</label><select name="${name}" ${required?"required":""}>${html}</select></div>`;}
function noteField(value=""){return `<div class="field full"><label>Ghi chú</label><textarea name="notes">${esc(value)}</textarea></div>`;}
function generateCustomerCode(){
  const used=new Set(state.customers.map(x=>String(x.customerCode||"").trim().toUpperCase()).filter(Boolean));
  let index=1,code="";
  do{code=`KH-${String(index).padStart(4,"0")}`;index+=1;}while(used.has(code));
  return code;
}
function dayOptions(value=""){return `<option value="">-- Chọn --</option>`+Array.from({length:31},(_,i)=>i+1).map(day=>`<option value="${day}" ${Number(value)===day?"selected":""}>Ngày ${day}</option>`).join("");}
const CARD_FORMS=["Phi vật lý","Vật lý"];
const ownershipTypeLabel=value=>value==="debit"?"Ghi nợ":"Tín dụng";
const cardBrandValues=()=>[...new Set([...CARD_BRANDS,...state.cardProducts.flatMap(x=>[x.cardBrand,x.network]).map(normalizeCardBrand).filter(Boolean)])].sort(compareText);
const cashbackCycleModeLabel=value=>value==="statement"?"Hoàn theo sao kê":"Hoàn theo tháng";
const textValueOptions=(values,value,placeholder="-- Chọn --")=>`<option value="">${placeholder}</option>`+values.slice().sort(compareText).map(item=>`<option value="${esc(item)}" ${item===value?"selected":""}>${esc(item)}</option>`).join("");
const rankOptions=value=>CARD_RANKS.map(item=>`<option value="${esc(item)}" ${item===value?"selected":""}>${esc(item)}</option>`).join("");
const sortedCardProducts=()=>[...state.cardProducts].sort((a,b)=>compareCards(a,b,x=>bank(x.bankId)?.name||""));
const sortedCardProductsById=()=>state.cardProducts.filter(card=>card?.id).sort(compareCardId);
const bankOptions=value=>`<option value="">-- Chọn --</option>`+sortByLabel(state.banks,x=>x.name).map(x=>`<option value="${esc(x.id)}" ${x.id===value?"selected":""}>${esc(`${x.code} — ${x.name}`)}</option>`).join("");
const customerOptions=value=>`<option value="">-- Chọn --</option>`+[...state.customers].sort(compareCustomers).map(x=>`<option value="${esc(x.id)}" ${x.id===value?"selected":""}>${esc(`${x.customerCode} — ${x.fullName}`)}</option>`).join("");
function customerCardProductOptions(value=""){
  return `<option value="">${state.cardProducts.length?"-- Chọn thẻ --":"Chưa có thẻ ngân hàng"}</option>`+sortedCardProductsById().map(p=>`<option value="${esc(p.id)}" ${p.id===value?"selected":""}>${esc(p.cardId||"")}</option>`).join("");
}
function customerCreditLimitOptions(){
  const values=[...new Set(state.customerCards.map(x=>Number(x.creditLimit)||0).filter(x=>x>0))].sort((a,b)=>a-b);
  return values.map(value=>`<option value="${esc(formatMoney(value))}"></option>`).join("");
}
function sharedLimitChip(productId){
  const card=product(productId);return card?`<span class="shared-limit-chip" data-shared-chip="${esc(card.id)}"><span>${esc(card.cardId)}</span><button type="button" data-remove-shared-chip aria-label="Bỏ ${esc(card.cardId)}">×</button></span>`:"";
}
function sharedLimitControl(link={}){
  const selected=[...new Set(link.sharedLimitCardIds||[])].filter(id=>product(id)&&id!==link.cardProductId).sort((a,b)=>compareCardId(product(a),product(b)));
  return `<div class="shared-limit-shell"><div class="shared-limit-tags" data-shared-limit>${selected.map(sharedLimitChip).join("")}<input type="text" data-shared-search autocomplete="off" placeholder="Không / Tìm CardID..." aria-label="Tìm CardID chung hạn mức"></div><div class="shared-limit-suggestions" data-shared-suggestions hidden></div></div>`;
}
function customerCardRow(link={}){
  return `<div class="customer-card-row" data-link-id="${esc(link.id||"")}">
    <div class="customer-card-cell card-choice"><label>Thẻ</label><select data-card-product ${state.cardProducts.length?"":"disabled"}>${customerCardProductOptions(link.cardProductId||"")}</select></div>
    <div class="customer-card-cell money-cell"><label>Hạn mức</label><input data-credit-limit type="text" inputmode="numeric" list="customerCreditLimitOptions" value="${esc(link.creditLimit!==undefined&&link.creditLimit!==""?formatVndInput(link.creditLimit):"")}" placeholder="0 đ"></div>
    <div class="customer-card-cell statement-cell"><label>Ngày sao kê</label><select data-statement-day>${dayOptions(link.statementDay)}</select></div>
    <div class="customer-card-cell payment-cell"><label>Hạn thanh toán</label><select data-payment-due-day>${dayOptions(link.paymentDueDay)}</select></div>
    <div class="customer-card-cell shared-cell"><label>Chung hạn mức</label>${sharedLimitControl(link)}</div>
    <button type="button" class="customer-card-remove" data-remove-customer-card aria-label="Xóa dòng thẻ" title="Xóa dòng thẻ">×</button>
  </div>`;
}
function customerCardsEditor(links=[]){
  const sortedLinks=[...links].filter(link=>product(link.cardProductId)).sort((a,b)=>compareCustomerCardLinks(a,b,product,card=>bank(card?.bankId)?.name||"")),rows=sortedLinks.length?sortedLinks:[{}];
  return `<div class="customer-card-editor full">
    <div class="customer-card-title"><div><h3>Thẻ của khách hàng</h3><p>${state.cardProducts.length?"Gán nhiều thẻ và thiết lập hạn mức dùng chung.":"Chưa có thẻ ngân hàng. Có thể lưu khách hàng trước và tạo thẻ tại tab Thẻ ngân hàng."}</p></div></div>
    <datalist id="customerCreditLimitOptions">${customerCreditLimitOptions()}</datalist>
    <div class="customer-card-rows">${rows.map(customerCardRow).join("")}</div>
    <div class="customer-card-add-line"><button type="button" class="customer-card-add" data-add-customer-card aria-label="Thêm một thẻ" title="Thêm một thẻ" ${state.cardProducts.length?"":"disabled"}>+</button></div>
  </div>`;
}
function bindCustomerCardEditor(root){
  const rows=$(".customer-card-rows",root);
  if(!rows)return;
  const refreshChoices=()=>{
    const selected=new Set($$("[data-card-product]",rows).map(x=>x.value).filter(Boolean));
    $$(".customer-card-row",rows).forEach(row=>{
      const current=$("[data-card-product]",row)?.value;
      $$('[data-card-product] option',row).forEach(option=>{option.disabled=Boolean(option.value&&option.value!==current&&selected.has(option.value));});
      $("[data-shared-limit]",row)?._refresh?.();
    });
  };
  const bindSharedTagInput=row=>{
    const control=$("[data-shared-limit]",row),input=$("[data-shared-search]",row),suggestions=$("[data-shared-suggestions]",row);if(!control||!input||!suggestions)return;
    let activeIndex=-1;
    const selectedIds=()=>new Set($$("[data-shared-chip]",control).map(chip=>chip.dataset.sharedChip));
    const sortChips=()=>{$$("[data-shared-chip]",control).sort((a,b)=>compareCardId(product(a.dataset.sharedChip),product(b.dataset.sharedChip))).forEach(chip=>control.insertBefore(chip,input));};
    const updatePlaceholder=()=>{input.placeholder=selectedIds().size?"Tìm thêm CardID...":"Không / Tìm CardID...";};
    const bindChip=chip=>{$("[data-remove-shared-chip]",chip).onclick=()=>{chip.remove();updatePlaceholder();renderSuggestions();input.focus();};};
    const addChip=id=>{if(!id||selectedIds().has(id)||id===$("[data-card-product]",row)?.value)return;const html=sharedLimitChip(id);if(!html)return;input.insertAdjacentHTML("beforebegin",html);bindChip(input.previousElementSibling);sortChips();input.value="";updatePlaceholder();renderSuggestions();input.focus();};
    const removeChip=id=>{const chip=$$("[data-shared-chip]",control).find(item=>item.dataset.sharedChip===id);if(chip)chip.remove();updatePlaceholder();};
    const renderSuggestions=()=>{
      const query=normalize(input.value),current=$("[data-card-product]",row)?.value,selected=selectedIds();
      const matches=state.cardProducts.filter(card=>card?.id&&card.id!==current&&!selected.has(card.id)&&(!query||normalize(card.cardId).includes(query))).sort(compareCardId);
      activeIndex=-1;suggestions.innerHTML=matches.map(card=>`<button type="button" data-shared-suggestion="${esc(card.id)}">${esc(card.cardId)}</button>`).join("");
      suggestions.hidden=!matches.length||document.activeElement!==input;
      $$('[data-shared-suggestion]',suggestions).forEach(button=>button.onclick=()=>addChip(button.dataset.sharedSuggestion));
    };
    $$("[data-shared-chip]",control).forEach(bindChip);sortChips();
    input.onfocus=renderSuggestions;input.oninput=renderSuggestions;input.onblur=()=>setTimeout(()=>{suggestions.hidden=true;},120);
    input.onkeydown=event=>{
      const choices=$$('[data-shared-suggestion]',suggestions);
      if((event.key==="ArrowDown"||event.key==="ArrowUp")&&choices.length){event.preventDefault();activeIndex=(activeIndex+(event.key==="ArrowDown"?1:-1)+choices.length)%choices.length;choices.forEach((choice,index)=>choice.classList.toggle("active",index===activeIndex));}
      else if(event.key==="Enter"&&activeIndex>=0){event.preventDefault();addChip(choices[activeIndex]?.dataset.sharedSuggestion);}
      else if(event.key==="Escape")suggestions.hidden=true;
      else if(event.key==="Backspace"&&!input.value){const chips=$$("[data-shared-chip]",control);if(chips.length){chips.at(-1).remove();updatePlaceholder();renderSuggestions();}}
    };
    control.onclick=event=>{if(event.target===control)input.focus();};control._refresh=renderSuggestions;control._remove=removeChip;updatePlaceholder();
  };
  const bindRow=row=>{
    const money=$("[data-credit-limit]",row);
    bindVndInput(money);
    const cardSelect=$("[data-card-product]",row),statementSelect=$("[data-statement-day]",row),statementLabel=statementSelect?.closest(".statement-cell")?.querySelector("label"),refreshStatementRequirement=()=>{const config=customerCardCycleConfig({statementDay:statementSelect?.value},product(cardSelect?.value)||{});if(statementSelect)statementSelect.required=config.statementDayRequired;if(statementLabel)statementLabel.textContent=`Ngày sao kê${config.statementDayRequired?" *":""}`;};
    if(cardSelect)cardSelect.onchange=()=>{
      $("[data-shared-limit]",row)?._remove?.(cardSelect.value);
      refreshChoices();refreshStatementRequirement();
    };
    statementSelect?.addEventListener("change",refreshStatementRequirement);refreshStatementRequirement();
    bindSharedTagInput(row);
    const remove=$("[data-remove-customer-card]",row);
    if(remove)remove.onclick=()=>{
      const all=$$(".customer-card-row",rows);
      if(all.length===1){
        $("[data-card-product]",row).value="";
        $("[data-credit-limit]",row).value="";
        $("[data-statement-day]",row).value="";
        $("[data-payment-due-day]",row).value="";
        $$("[data-shared-chip]",row).forEach(chip=>chip.remove());
        $("[data-shared-search]",row).placeholder="Không / Tìm CardID...";
        row.dataset.linkId="";
      }else row.remove();
      refreshChoices();
    };
  };
  $$(".customer-card-row",rows).forEach(bindRow);
  refreshChoices();
  const addCardButton=$("[data-add-customer-card]",root);if(!addCardButton||addCardButton.disabled)return;addCardButton.onclick=()=>{
    rows.insertAdjacentHTML("beforeend",customerCardRow());
    const row=rows.lastElementChild;bindRow(row);
    $("[data-card-product]",row)?.focus();
    row.scrollIntoView({block:"nearest",behavior:"smooth"});
    refreshChoices();
  };
}
function entityTable(headers,rows,entity,emptyMessage="Không có dữ liệu phù hợp.",hasFilters=false){return rows.length?`<div class="table-wrap"><table class="mobile" data-entity="${entity}"><thead><tr>${headers.map((h,i)=>`<th data-sort="${i}">${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`:`<div class="empty">${esc(emptyMessage)}${hasFilters?'<br><button data-clear-filter>Xóa tìm kiếm và bộ lọc</button>':""}</div>`;}
function cell(label,value){return `<td data-label="${label}">${value}</td>`;}

function render(){removeCompactFilterOutsideListener();renderDashboard();renderCustomers();renderCards();renderOrderTypes();renderCatalog();renderSystem();renderAbout();renderCashbackFeatures({state,getState:()=>state,save,uuid,toast});bindTables();bindHelpTabs();}
function applyLoadedState(data){return applyHostBootstrapData(data,{applyState:value=>{state=value;},renderApp:()=>{render();renderSyncStatus();}});}
function renderDashboard(){
  const active=state.customerCards.filter(x=>x.status==="active"),limitAnalysis=effectiveLimit(active),validCustomerIds=new Set(state.customers.map(item=>item.id));
  const topProducts=state.cardProducts.map(card=>{const ownerIds=new Set(state.customerCards.filter(link=>link.cardProductId===card.id&&validCustomerIds.has(link.customerId)).map(link=>link.customerId));return {cardId:card.cardId,bankName:bank(card.bankId)?.name||"",count:ownerIds.size};}).filter(item=>item.count>0).sort((left,right)=>right.count-left.count||compareText(left.cardId,right.cardId)||compareText(left.bankName,right.bankName)).slice(0,10);
  const topCustomers=state.customers.map(item=>{const distinctLinks=[...new Map(linksForCustomer(item.id).filter(link=>product(link.cardProductId)).map(link=>[link.cardProductId,link])).values()],analysis=effectiveLimit(distinctLinks);return {id:item.id,name:item.fullName,count:distinctLinks.length,analysis};}).filter(item=>item.count>0).sort((left,right)=>right.count-left.count||right.analysis.total-left.analysis.total||compareText(left.name,right.name)).slice(0,10);
  const primaryKpiCards=`<div class="kpi blue"><small>Tổng khách hàng</small><strong>${state.customers.length}</strong></div><div class="kpi teal"><small>Tổng thẻ đang quản lý</small><strong>${active.length}</strong></div><div class="kpi amber"><small>Tổng hạn mức</small><strong>${effectiveLimitDisplay(limitAnalysis)}</strong></div><div class="kpi indigo"><small>Số dòng thẻ</small><strong>${state.cardProducts.length}</strong></div>`;
  $("#view-dashboard").innerHTML=`${limitInconsistencyWarning(limitAnalysis)}${renderCashbackDashboard(state,{leadingKpiCards:primaryKpiCards})}<div class="grid-2 dashboard-rankings"><div class="panel"><h2>Top 10 thẻ có nhiều khách hàng nhất</h2>${simpleTable(["Card ID","Ngân hàng","Số khách sở hữu"],topProducts.map(item=>[`<strong>${esc(item.cardId)}</strong>`,esc(item.bankName||"—"),item.count]),"dashboard-ranking-table","Chưa có thẻ ngân hàng.")}</div><div class="panel"><h2>Top 10 khách hàng nhiều thẻ nhất</h2>${simpleTable(["Khách hàng","Số thẻ","Tổng hạn mức"],topCustomers.map(item=>[`<a href="#" data-open-customer="${item.id}">${esc(item.name)}</a>`,item.count,effectiveLimitDisplay(item.analysis)]),"dashboard-ranking-table","Chưa có khách hàng sở hữu thẻ.")}</div></div>`;
  $$('[data-open-customer]').forEach(x=>x.onclick=e=>{e.preventDefault();openCustomerDetail(x.dataset.openCustomer);});
}
function simpleTable(headers,rows,className="",emptyMessage="Chưa có dữ liệu."){return rows.length?`<div class="table-wrap"><table class="${className}"><thead><tr>${headers.map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(x=>`<td>${x}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`:`<div class="empty">${esc(emptyMessage)}</div>`;}

function renderCustomers(){
  const f=filters.customers||{}, q=normalize(f.q),bankFilter=f.bank||"",cardIdFilter=f.cardId||"",formFilter=f.form||"",ownershipFilter=f.ownership||"",brand=f.brand||"";
  let items=state.customers.filter(c=>{const links=linksForCustomer(c.id),products=links.map(x=>product(x.cardProductId)).filter(Boolean),hay=[c.customerCode,c.fullName,c.phone,c.email,...products.flatMap(p=>[p.cardId,p.cardName,p.cardRank,p.ownershipType,p.cardBrand,p.network,p.cardForm,bank(p.bankId)?.name])].map(normalize).join(" "),hasCardFilters=Boolean(cardIdFilter||bankFilter||formFilter||ownershipFilter||brand),matchesCardFilters=!hasCardFilters||products.some(p=>(!cardIdFilter||p.id===cardIdFilter)&&(!bankFilter||p.bankId===bankFilter)&&(!formFilter||p.cardForm===formFilter)&&(!ownershipFilter||p.ownershipType===ownershipFilter)&&(!brand||(p.cardBrand||p.network)===brand));return (!q||hay.includes(q))&&matchesCardFilters;});
  items.sort(compareCustomers);
  const rows=items.map(c=>{const links=linksForCustomer(c.id),analysis=effectiveLimit(links),products=links.map(x=>product(x.cardProductId)).filter(Boolean),banks=[...new Set(products.map(p=>bank(p.bankId)?.name).filter(Boolean))];return `<tr data-id="${c.id}">${cell("Mã KH",esc(c.customerCode))}${cell("Họ tên",`<strong>${esc(c.fullName)}</strong>`)}${cell("Số điện thoại",esc(c.phone||"—"))}${cell("Email",esc(c.email||"—"))}${cell("Số thẻ",links.length)}${cell("Tổng hạn mức",effectiveLimitDisplay(analysis))}${cell("Ngân hàng",esc(banks.join(", ")||"—"))}${cell("Ghi chú",esc(c.notes||"—"))}<td class="responsive-owned-cards" data-label="Thẻ đang sở hữu">${responsiveOwnedCards(c,links)}</td></tr>`;});
  const filterFields=assignedProductFilterSelect("customers.cardId","CardID",f.cardId)+filterSelect("customers.bank","Ngân hàng",state.banks,f.bank,x=>x.name)+plainFilter("customers.form","Hình thức",CARD_FORMS.map(x=>`${x}|${x}`),f.form)+plainFilter("customers.ownership","Loại thẻ",OWNERSHIP_TYPES.map(x=>`${x}|${ownershipTypeLabel(x)}`),f.ownership,true)+plainFilter("customers.brand","Tổ chức thẻ Quốc tế",cardBrandValues().map(x=>`${x}|${x}`),f.brand);
  $("#view-customers").innerHTML=`<div class="panel"><div class="section-title"><h2>Khách hàng</h2></div>${compactEntityToolbar("customers","customer","Tìm Mã KH, tên, điện thoại, email, CardID, ngân hàng, tên thẻ...",f,filterFields)}${entityTable(["Mã KH","Họ tên","Số điện thoại","Email","Số thẻ","Tổng hạn mức","Ngân hàng","Ghi chú"],rows,"customer",state.customers.length?"Không có khách hàng phù hợp.":"Chưa có khách hàng.",Boolean(Object.values(f).some(Boolean)))}</div>`;
}
function productFilterSelect(path,label,value){return `<select data-filter="${path}"><option value="">${label}: Tất cả</option>${sortedCardProductsById().map(card=>`<option value="${esc(card.id)}" ${card.id===value?"selected":""}>${esc(card.cardId)}</option>`).join("")}</select>`;}
function assignedProductFilterSelect(path,label,value){const assignedIds=new Set(state.customerCards.map(link=>link.cardProductId));return `<select data-filter="${path}"><option value="">${label}: Tất cả</option>${sortedCardProductsById().filter(card=>assignedIds.has(card.id)).map(card=>`<option value="${esc(card.id)}" ${card.id===value?"selected":""}>${esc(card.cardId)}</option>`).join("")}</select>`;}
function responsiveOwnedCards(customerItem,links){
  const cards=links.map(link=>({link,card:product(link.cardProductId)})).filter(item=>item.card).sort((left,right)=>compareText(left.card.cardId,right.card.cardId));
  const cardItems=cards.map(({link,card})=>`<details class="owned-card-item"><summary><span><strong>${esc(card.cardId||"—")}</strong><small>${esc(card.cardRank)} · ${formatMoney(link.creditLimit)}</small></span>${badge(link.status)}<span class="owned-card-chevron">${icon("chevron")}</span></summary><div class="owned-card-detail">${info("Card ID",card.cardId)}${info("Ngân hàng",bank(card.bankId)?.name)}${info("Hạng thẻ",card.cardRank)}${info("Phôi",card.cardBrand||card.network)}${info("Hình thức hoàn",cashbackCycleModeLabel(link.cashbackCycleModeOverride||card.cashbackCycleMode))}${info("Loại thẻ",ownershipTypeLabel(card.ownershipType))}${info("Hình thức",card.cardForm||link.cardForm)}${info("Hạn mức",formatMoney(link.creditLimit))}${info("Sao kê",formatDay(link.statementDay))}${info("Hạn thanh toán",formatDay(link.paymentDueDay))}${info("Chung hạn mức",link.sharedLimitCardIds?.length?`${link.sharedLimitCardIds.length+1} thẻ cùng nhóm`:"Không")}${info("Trạng thái",responsiveStatusLabel(link.status))}</div></details>`).join("");
  return `<div class="owned-card-section"><div class="owned-card-section-head"><strong>Thẻ đang sở hữu</strong><small>${cards.length} thẻ · Card ID A → Z</small></div><div class="owned-card-list">${cardItems||'<div class="owned-card-empty">Chưa gán thẻ.</div>'}</div><div class="responsive-customer-actions"><button type="button" data-responsive-customer-detail="${customerItem.id}">Chi tiết</button><button type="button" data-responsive-customer-edit="${customerItem.id}">Tùy chỉnh</button><button type="button" class="danger" data-responsive-customer-delete="${customerItem.id}">Xóa</button></div></div>`;
}
function responsiveStatusLabel(status){return status==="active"?"Đang hoạt động":status==="closed"?"Đã đóng":"Ngừng hoạt động";}
function renderCards(){
  const f=filters.cards||{}, q=normalize(f.q);let items=state.cardProducts.filter(p=>{const links=linksForProduct(p.id),owners=links.map(x=>customer(x.customerId)).filter(Boolean);const hay=[p.cardId,bank(p.bankId)?.name,p.cardName,p.cardRank,p.ownershipType,p.cardBrand,p.network,p.cardForm,...owners.map(x=>x.fullName)].map(normalize).join(" ");return (!q||hay.includes(q))&&(!f.bank||p.bankId===f.bank)&&(!f.rank||p.cardRank===f.rank)&&(!f.ownership||p.ownershipType===f.ownership)&&(!f.brand||(p.cardBrand||p.network)===f.brand)&&(!f.form||p.cardForm===f.form);});
  items.sort((a,b)=>compareCards(a,b,x=>bank(x.bankId)?.name||""));
  const rows=items.map(p=>{const links=linksForProduct(p.id);return `<tr data-id="${p.id}">${cell("Card ID",`<strong>${esc(p.cardId)}</strong>`)}${cell("Loại thẻ",ownershipTypeLabel(p.ownershipType))}${cell("Ngân hàng",esc(bank(p.bankId)?.name||"—"))}${cell("Tên thẻ",esc(p.cardName))}${cell("Hạng thẻ",esc(p.cardRank))}${cell("Phôi",esc(p.cardBrand||p.network||"—"))}${cell("Hình thức thẻ",esc(p.cardForm||"—"))}${cell("Hình thức hoàn",esc(cashbackCycleModeLabel(p.cashbackCycleMode)))}${cell("Số khách sở hữu",links.length)}${cell("Ghi chú",esc(p.notes||"—"))}</tr>`;});
  const filterFields=filterSelect("cards.bank","Ngân hàng",state.banks,f.bank,x=>x.name)+plainFilter("cards.rank","Hạng thẻ",CARD_RANKS.map(x=>`${x}|${x}`),f.rank,true)+plainFilter("cards.ownership","Loại thẻ",OWNERSHIP_TYPES.map(x=>`${x}|${ownershipTypeLabel(x)}`),f.ownership)+plainFilter("cards.brand","Phôi",cardBrandValues().map(x=>`${x}|${x}`),f.brand)+plainFilter("cards.form","Hình thức thẻ",CARD_FORMS.map(x=>`${x}|${x}`),f.form);
  $("#view-cards").innerHTML=`<div class="panel"><div class="section-title"><h2>Thẻ ngân hàng</h2></div>${compactEntityToolbar("cards","product","Tìm Card ID, ngân hàng, hạng thẻ...",f,filterFields)}${entityTable(["Card ID","Loại thẻ","Ngân hàng","Tên thẻ","Hạng thẻ","Phôi","Hình thức thẻ","Hình thức hoàn","Số khách sở hữu","Ghi chú"],rows,"product",state.cardProducts.length?"Không có thẻ ngân hàng phù hợp.":"Chưa có thẻ ngân hàng.",Boolean(Object.values(f).some(Boolean)))}</div>`;
}
function compactEntityToolbar(group,entity,placeholder,current,fields){
  const count=Object.entries(current).filter(([key,value])=>key!=="q"&&value).length;
  const prepared=fields.replace(/<select data-filter="([^"]+)">([\s\S]*?)<\/select>/g,(match,path,options)=>{const key=path.split(".")[1],active=Boolean(current[key]),label=options.match(/^<option value="">(.*?): Tất cả<\/option>/)?.[1]||key;return `<label class="filter-option"><span><input type="checkbox" data-compact-enable="${key}" ${active?"checked":""}>${esc(label)}</span><select data-compact-filter="${path}" ${active?"":"disabled"}>${options}</select></label>`;});
  const referenceButton=group==="cards"?`<button type="button" class="secondary-btn card-cycle-guide-button" data-card-cycle-guide>${icon("info")}<span>Hướng dẫn hình thức hoàn</span></button>`:"";
  return `<div class="toolbar feature-main-toolbar entity-main-toolbar"><input class="search" data-filter="${group}.q" placeholder="${esc(placeholder)}" value="${esc(current.q||"")}"><div class="toolbar-spacer"></div><button type="button" class="filter-trigger ${count?"active":""}" data-compact-trigger="${group}">${icon("filter")}<span>Bộ lọc</span><b data-filter-count ${count?"":"hidden"}>${count||""}</b></button>${referenceButton}<button class="primary" data-add="${entity}">Thêm</button><button data-edit-selected="${entity}">Tùy chỉnh</button><button class="danger" data-delete-selected="${entity}">Xóa</button></div><div class="filter-panel compact-filter-panel" data-compact-panel="${group}" hidden>${prepared}<button type="button" class="secondary-btn" data-compact-cancel="${group}">Huỷ</button><button type="button" class="secondary-btn" data-compact-clear="${group}">Xóa lọc</button><button type="button" class="primary" data-compact-apply="${group}">Áp dụng</button></div>`;
}
function compactFilterCount(group){return Object.entries(filters[group]||{}).filter(([key,value])=>key!=="q"&&value).length;}
function removeCompactFilterOutsideListener(){if(compactFilterOutsideHandler){document.removeEventListener("pointerdown",compactFilterOutsideHandler,true);compactFilterOutsideHandler=null;}}
function syncCompactPanelFromApplied(panel){const group=panel?.dataset.compactPanel;if(!group)return;filters[group]||={};$$("[data-compact-filter]",panel).forEach(select=>{const key=select.dataset.compactFilter.split(".")[1],active=Boolean(filters[group][key]),checkbox=select.closest("label")?.querySelector("[data-compact-enable]");select.value=filters[group][key]||"";select.disabled=!active;if(checkbox)checkbox.checked=active;});}
function closeCompactFilterPanelWithoutApply(panel,trigger){if(!panel)return;const group=panel.dataset.compactPanel;syncCompactPanelFromApplied(panel);panel.hidden=true;(trigger||$(`[data-compact-trigger="${group}"]`))?.classList.toggle("active",compactFilterCount(group)>0);removeCompactFilterOutsideListener();}
function closeAllCompactFilterPanels(){$$("[data-compact-panel]").forEach(panel=>closeCompactFilterPanelWithoutApply(panel));}
function registerCompactFilterOutsideClose(panel,trigger){removeCompactFilterOutsideListener();compactFilterOutsideHandler=event=>{const path=event.composedPath?.()||[];if(path.includes(panel)||path.includes(trigger)||panel.contains(event.target)||trigger.contains(event.target))return;closeCompactFilterPanelWithoutApply(panel,trigger);};setTimeout(()=>document.addEventListener("pointerdown",compactFilterOutsideHandler,true),0);}
function filterSelect(path,label,items,value,toLabel){return `<select data-filter="${path}"><option value="">${label}: Tất cả</option>${sortByLabel(items,toLabel).map(x=>`<option value="${x.id}" ${x.id===value?"selected":""}>${esc(toLabel(x))}</option>`).join("")}</select>`;}
function plainFilter(path,label,items,value,preserveOrder=false){const options=items.map(raw=>{const [v,l]=String(raw).split("|");return {v,l};});if(!preserveOrder)options.sort((a,b)=>compareText(a.l,b.l));return `<select data-filter="${path}"><option value="">${label}: Tất cả</option>${options.map(({v,l})=>`<option value="${esc(v)}" ${v===value?"selected":""}>${esc(l)}</option>`).join("")}</select>`;}

function renderCatalog(){const rows=state.banks.slice().sort((a,b)=>a.name.localeCompare(b.name,"vi")).map(b=>`<tr data-id="${b.id}">${cell("Mã ngân hàng",esc(b.code))}${cell("Tên ngân hàng",esc(b.name))}</tr>`);$("#view-catalog").innerHTML=`<div class="panel"><h2>Mã ngân hàng</h2><div class="toolbar"><button class="primary" data-add="bank">Thêm</button><button data-edit-selected="bank">Tùy chỉnh</button><button class="danger" data-delete-selected="bank">Xóa</button></div>${entityTable(["Mã ngân hàng","Tên ngân hàng"],rows,"bank","Chưa có mã ngân hàng.")}</div>`;}
function renderOrderTypes(){const rows=[...(state.orderTypes||[])].sort((a,b)=>String(a.code||"").localeCompare(String(b.code||""),"vi",{numeric:true,sensitivity:"base"})).map(item=>`<tr data-id="${esc(item.id)}">${cell("Mã loại đơn",`<strong>${esc(item.code)}</strong>`)}${cell("Mô tả",esc(item.description||"—"))}${cell("Ghi chú",esc(item.note||"—"))}</tr>`);$("#view-order-types").innerHTML=`<div class="panel"><h2>Loại đơn</h2><div class="toolbar"><button class="primary" data-add="orderType">Thêm</button><button data-edit-selected="orderType">Tùy chỉnh</button><button class="danger" data-delete-selected="orderType">Xóa</button></div>${entityTable(["Mã loại đơn","Mô tả","Ghi chú"],rows,"orderType","Chưa có loại đơn.")}</div>`;}
function renderSystem(){$("#view-system").innerHTML=`<div class="grid-2"><div class="panel"><h2>Nhập dữ liệu Excel</h2><p>Dùng template 4 sheet để nhập Customer, Card Product và quan hệ sở hữu. Dòng lỗi không bị bỏ qua im lặng.</p><div class="actions"><button data-download-template>Tải template Excel</button><button class="primary" data-import-excel>Nhập Excel</button></div><div id="importResult"></div></div><div class="panel"><h2>Dữ liệu & sao lưu</h2><p>Namespace local: <code>cardflow-host-data-v1</code></p><p>File Drive: <code>cardflow-host-data.json</code></p><button data-export-json>Xuất bản sao JSON</button></div></div>`;}
function hostGuideItems(){return [
  {icon:"play",title:"Bắt đầu sử dụng",summary:"Quy trình thiết lập Host theo đúng thứ tự.",html:`<ol class="guide-steps"><li>Kết nối Google Drive khi ứng dụng yêu cầu.</li><li>Vào tab <strong>Thẻ</strong> để cấu hình danh sách CardID trước.</li><li>Vào tab <strong>Khách hàng</strong> để tạo khách hàng.</li><li>Gán các CardID cho khách hàng.</li><li>Khai báo Hạn mức, Ngày sao kê, Hạn thanh toán và Chung hạn mức nếu có.</li><li>Kiểm tra kết quả tại tab <strong>Tổng hợp</strong>.</li></ol>`},
  {icon:"layout-dashboard",title:"Tổng hợp",summary:"Theo dõi KPI và hai bảng xếp hạng Top 10.",html:`<p>Hàng đầu hiển thị <strong>Tổng khách hàng</strong>, <strong>Tổng thẻ đang quản lý</strong>, <strong>Tổng hạn mức</strong> và <strong>Số dòng thẻ</strong>.</p><p>Hàng tiếp theo gồm <strong>Top 10 thẻ có nhiều khách hàng nhất</strong> và <strong>Top 10 khách hàng nhiều thẻ nhất</strong>.</p><div class="help-callout"><strong>Cách tính hạn mức</strong><p>Tổng hạn mức áp dụng quy tắc chung hạn mức: mỗi nhóm dùng chung chỉ đóng góp hạn mức một lần.</p></div>`},
  {icon:"credit-card",title:"Quản lý Dòng thẻ",summary:"Cấu hình Card master trước khi gán cho khách hàng.",html:`<p>Bảng Dòng thẻ gồm: <strong>Card ID</strong>, Loại thẻ, Ngân hàng, Tên thẻ, Hạng thẻ, Tổ chức thẻ Quốc tế, Hình thức thẻ, Số khách sở hữu và Ghi chú. CardID là mã nhận diện chính của một dòng thẻ.</p><p><strong>Loại thẻ:</strong> Credit/Tín dụng hoặc Debit/Ghi nợ. <strong>Tổ chức thẻ Quốc tế:</strong> American Express, JCB, MasterCard, NAPAS, Union Pay và Visa.</p><p><strong>Hạng thẻ:</strong> Classic/Standard, Gold, Platinum, Signature và Infinite/Back Card.</p>`},
  {icon:"edit",title:"Thêm / Tùy chỉnh thẻ",summary:"Tạo hoặc cập nhật thông tin một dòng thẻ.",html:`<p>Dùng <strong>Thêm</strong> để tạo CardID mới. Chọn một dòng rồi dùng <strong>Tùy chỉnh</strong> để cập nhật. CardID không được trùng và dữ liệu ngân hàng lấy từ Danh mục.</p>`},
  {icon:"users",title:"Quản lý Khách hàng",summary:"Theo dõi hồ sơ và các thẻ đang sở hữu.",html:`<p>Thông tin gồm <strong>Mã KH</strong>, Họ tên, Số điện thoại, Email, Ngày sinh, Ghi chú và Thẻ đang sở hữu. Mã KH được tạo tự động; một khách hàng có thể sở hữu nhiều thẻ.</p><p>Mở chi tiết khách hàng để xem các CardID đã gán.</p>`},
  {icon:"edit",title:"Thêm / Tùy chỉnh khách hàng",summary:"Tạo hoặc cập nhật hồ sơ khách hàng.",html:`<p>Dùng <strong>Thêm</strong> để tạo hồ sơ. Chọn khách hàng rồi dùng <strong>Tùy chỉnh</strong> để cập nhật thông tin và danh sách thẻ; Mã KH tự sinh được giữ nguyên.</p>`},
  {icon:"link",title:"Gán thẻ cho khách hàng",summary:"Quản lý nhiều CardID trong form Khách hàng.",html:`<p>Mỗi dòng gán gồm <strong>Thẻ / CardID</strong>, Hạn mức, Ngày sao kê, Hạn thanh toán và Chung hạn mức. Danh sách CardID lấy từ Card master.</p><p>Bấm <strong>+</strong> để thêm dòng và <strong>×</strong> để bỏ dòng trước khi lưu.</p>`},
  {icon:"link",title:"Chung hạn mức",summary:"Liên kết nhiều CardID vào cùng một hạn mức thực tế.",html:`<p>Nhấp vào trường, nhập ký tự CardID và chọn kết quả phù hợp. Có thể chọn một hoặc nhiều CardID; mục đã chọn hiển thị thành chip màu và không còn trong gợi ý. Bấm <strong>×</strong> trên chip để bỏ. Thẻ hiện tại không thể tham chiếu chính nó.</p><div class="help-callout example"><strong>Quy tắc tính</strong><p>Một nhóm chung hạn mức chỉ đóng góp hạn mức một lần. Ví dụ 3 thẻ MB cùng hạn mức 145.000.000 đ thì tổng hạn mức hiệu dụng của nhóm là <strong>145.000.000 đ</strong>, không phải 435.000.000 đ.</p></div>`},
  {icon:"search",title:"Tìm kiếm & bộ lọc",summary:"Kết hợp nhiều điều kiện để thu hẹp danh sách.",html:`<p><strong>Khách hàng:</strong> Search → CardID → Ngân hàng → Hình thức → Loại thẻ → Tổ chức thẻ Quốc tế. CardID là trường tra cứu/lọc chính; nhiều bộ lọc được kết hợp đồng thời.</p><p><strong>Dòng thẻ:</strong> Search, Ngân hàng, Hạng thẻ, Loại thẻ, Tổ chức thẻ Quốc tế và Hình thức thẻ.</p>`},
  {icon:"refresh",title:"Tự động đồng bộ Google Drive",summary:"Local-first và tự đồng bộ sau thay đổi dữ liệu.",html:`<div class="sync-flow"><span>Lưu / Sửa / Xóa</span><b>→</b><span>Lưu local</span><b>→</b><span>Tự đồng bộ Drive</span><b>→</b><span>Cập nhật trạng thái</span></div><p>Sau thao tác dữ liệu bền vững, ứng dụng lưu local rồi tự động đồng bộ Google Drive. Người dùng thường không cần bấm <strong>Đồng bộ ngay</strong> sau mỗi thay đổi; nút ở khu vực vận hành là phương án thủ công dự phòng.</p>`},
  {icon:"devices",title:"Sử dụng trên nhiều thiết bị",summary:"Tải dữ liệu Host bằng tài khoản được cấp quyền.",html:`<p>Trên thiết bị khác, mở Host web app, dùng tài khoản Google được cấp quyền, kết nối Google Drive và chờ ứng dụng tải/đồng bộ bộ dữ liệu Host.</p><div class="help-callout"><strong>Lưu ý</strong><p>Đây không phải cơ chế cộng tác đồng thời theo thời gian thực. Hãy kiểm tra trạng thái đồng bộ trước khi chuyển thiết bị.</p></div>`},
  {icon:"database",title:"Sao lưu dữ liệu",summary:"Backup Drive tự động và bản sao JSON thủ công.",html:`<p>Trước khi cập nhật file Drive đã tồn tại, ứng dụng tạo bản sao dạng <code>cardflow-host-backup-YYYY-MM-DD.json</code>. Tab Hệ thống có nút <strong>Xuất bản sao JSON</strong> để tải bản sao local.</p>`},
  {icon:"table-properties",title:"Danh mục",summary:"Quản lý danh sách Ngân hàng dùng chung.",html:`<p>Tab <strong>Danh mục</strong> quản lý Mã ngân hàng và Tên ngân hàng. Hãy cấu hình ngân hàng trước khi chọn trong Card master. Ngân hàng đang được thẻ sử dụng không thể xóa.</p>`},
  {icon:"settings",title:"Hệ thống",summary:"Nhập Excel, xuất JSON và xem thông tin lưu trữ.",html:`<p>Tab <strong>Hệ thống</strong> cho phép tải template, nhập dữ liệu Excel, xem kết quả nhập, xuất bản sao JSON và xem namespace local/file Drive đang sử dụng.</p>`},
  {icon:"credit-card",title:"Cashback & Điều phối đơn",summary:"Thiết lập Thẻ ngân hàng, MCC, chương trình và theo dõi tiến độ.",html:`<ol class="guide-steps"><li>Trong <strong>Thẻ ngân hàng</strong>, chọn Hình thức hoàn Theo tháng hoặc Theo sao kê; Theo sao kê cần ngày sao kê.</li><li>Tạo <strong>Mã MCC</strong> rồi khai báo <strong>Chương trình hoàn tiền</strong> cho đúng sản phẩm thẻ.</li><li>Ghi <strong>Giao dịch</strong> theo Khách hàng → Card ID → MCC → Chương trình.</li><li>Xem tiến độ, nhắc việc và gợi ý thẻ tại <strong>Điều phối đơn</strong>.</li></ol><div class="help-callout"><strong>Chu kỳ</strong><p>Theo tháng dùng tháng dương lịch. Theo sao kê tính từ ngày sau sao kê kỳ trước đến ngày sao kê kỳ hiện tại, có xử lý tháng ngắn.</p></div><div class="help-callout example"><strong>Phân biệt ghi chú</strong><p>Ghi chú thủ công phản ánh chỉ dẫn vận hành; nhắc việc hệ thống được tính lại từ giao dịch và cấu hình, không lưu làm nguồn dữ liệu gốc.</p></div>`},
  {icon:"info",title:"Lưu ý khi sử dụng",summary:"Giữ dữ liệu nhất quán trên mọi kích thước màn hình.",html:`<ul><li>Cấu hình Card master trước khi gán thẻ.</li><li>Không tạo CardID trùng.</li><li>Các thẻ chung hạn mức phải đại diện cho cùng một hạn mức thực tế.</li><li>Kiểm tra trạng thái Drive trước khi đóng ứng dụng sau thay đổi quan trọng.</li><li>Host hỗ trợ desktop, tablet ngang/dọc và smartphone; màn hình nhỏ có thể dùng mục khách hàng/thẻ mở rộng thay cho bảng desktop đầy đủ.</li></ul>`}
];}
function renderAbout(){
  const guides=currentHostGuideItems(),activeTab=sessionStorage.getItem("cardflow-host-about-tab")==="guide"?"guide":"intro";
  const guideContent=`<div class="guide-list">${guides.map((guide,index)=>`<details class="guide-item" ${index===0?"open":""}><summary><span class="guide-icon">${icon(guide.icon)}</span><span class="guide-heading"><strong>${esc(guide.title)}</strong><small>${esc(guide.summary)}</small></span><span class="guide-chevron">${icon("chevron")}</span></summary><div class="guide-detail"><div class="guide-detail-inner">${guide.html}</div></div></details>`).join("")}</div>`;
  $("#view-about").innerHTML=`<div class="help-center host-help"><div class="help-tabs" role="tablist" aria-label="Nội dung Giới thiệu và Hướng dẫn"><button type="button" role="tab" data-help-tab="intro" aria-selected="${activeTab==="intro"}" class="${activeTab==="intro"?"active":""}">Giới thiệu</button><button type="button" role="tab" data-help-tab="guide" aria-selected="${activeTab==="guide"}" class="${activeTab==="guide"?"active":""}">Hướng dẫn sử dụng</button></div><section class="help-tab-panel" data-help-panel="intro" role="tabpanel" ${activeTab==="intro"?"":"hidden"}><div class="help-section-head"><span class="help-section-icon">${icon("info")}</span><div><h2>Giới thiệu</h2><p>Thông tin về ứng dụng và mô hình quản lý dữ liệu.</p></div></div><div class="about-layout"><article class="panel about-card about-main"><h2>QUẢN LÝ THẺ - HOST</h2><p>QUẢN LÝ THẺ - HOST là ứng dụng web hỗ trợ quản lý tập trung danh mục khách hàng, thẻ và mối quan hệ sở hữu thẻ. Ứng dụng hỗ trợ lưu dữ liệu local-first, tự động đồng bộ Google Drive sau các thay đổi dữ liệu và sử dụng trên nhiều thiết bị thông qua tài khoản Google được cấp quyền.</p><h3>Tính năng hiện có</h3><div class="about-features"><span>Tổng hợp</span><span>Quản lý khách hàng</span><span>Quản lý Dòng thẻ</span><span>Gán nhiều thẻ</span><span>Theo dõi hạn mức</span><span>Chung hạn mức</span><span>Tổng hạn mức hiệu dụng</span><span>CardID</span><span>Search & bộ lọc</span><span>Hạng thẻ</span><span>Credit / Debit</span><span>Tổ chức thẻ Quốc tế</span><span>Hình thức thẻ</span><span>Ngày sao kê</span><span>Hạn thanh toán</span><span>Auto-sync Google Drive</span><span>Backup Drive</span><span>Responsive</span></div></article><article class="panel about-card"><h2>Mô hình quản lý</h2><p><strong>Khách hàng</strong> sở hữu một hoặc nhiều CardID.</p><p><strong>CardID</strong> đại diện cho một dòng thẻ, gồm Ngân hàng, Tên thẻ, Hạng thẻ, Loại thẻ, Tổ chức thẻ Quốc tế và Hình thức thẻ.</p><p>Dữ liệu gán gồm Hạn mức, Ngày sao kê, Hạn thanh toán và Chung hạn mức.</p><div class="help-callout example"><strong>Chung hạn mức</strong><p>Nếu nhiều thẻ cùng sử dụng một hạn mức chung, tổng hạn mức của khách hàng chỉ tính hạn mức nhóm đó một lần. Ví dụ 3 thẻ MB cùng hạn mức 145.000.000 đ → tổng hiệu dụng là 145.000.000 đ, không phải 435.000.000 đ.</p></div></article><article class="panel about-card"><h2>Thông tin ứng dụng</h2><p><strong>Phiên bản:</strong> CardFlow Host Web App · Schema V2</p><div class="platform-list"><span>Web App</span><span>Google Drive Sync</span><span>Local-first storage</span><span>Responsive Desktop / Tablet / Mobile</span></div></article><article class="panel about-card author-card"><h2>Tác giả</h2><strong>NGUYỄN QUANG MINH</strong><span>Email</span><a href="mailto:quangminh071093@gmail.com">quangminh071093@gmail.com</a></article></div></section><section class="help-tab-panel" data-help-panel="guide" role="tabpanel" ${activeTab==="guide"?"":"hidden"}><div class="help-section-head"><span class="help-section-icon">${icon("circle-help")}</span><div><h2>Hướng dẫn sử dụng</h2><p>Chọn từng mục để mở hoặc thu gọn nội dung.</p></div></div>${guideContent}</section></div>`;
  $('[data-help-panel="intro"]').innerHTML=`<div class="help-section-head"><span class="help-section-icon">${icon("info")}</span><div><h2>Giới thiệu</h2><p>Công cụ quản lý và điều phối thẻ dành cho Host.</p></div></div>${currentAboutIntroduction()}`;
}

function bindTables(){
  enhanceResponsiveTables();
  $$('[data-filter]').forEach(el=>el.oninput=()=>{const [group,key]=el.dataset.filter.split(".");filters[group]||={};filters[group][key]=el.value;group==="customers"?renderCustomers():renderCards();bindTables();});
  $$('[data-compact-enable]').forEach(el=>el.onchange=()=>{const select=el.closest("label")?.querySelector("select");if(select){select.disabled=!el.checked;if(!el.checked)select.value="";}});
  $$('[data-compact-trigger]').forEach(button=>button.onclick=()=>{const panel=$(`[data-compact-panel="${button.dataset.compactTrigger}"]`),willOpen=panel?.hidden;closeAllCompactFilterPanels();if(panel&&willOpen){syncCompactPanelFromApplied(panel);panel.hidden=false;button.classList.add("active");registerCompactFilterOutsideClose(panel,button);}});
  $$('[data-compact-cancel]').forEach(button=>button.onclick=()=>closeCompactFilterPanelWithoutApply($(`[data-compact-panel="${button.dataset.compactCancel}"]`),$(`[data-compact-trigger="${button.dataset.compactCancel}"]`)));
  $$('[data-compact-apply]').forEach(button=>button.onclick=()=>{const group=button.dataset.compactApply;filters[group]||={};$$(`[data-compact-panel="${group}"] [data-compact-filter]`).forEach(select=>{const key=select.dataset.compactFilter.split(".")[1],enabled=select.closest("label")?.querySelector('[data-compact-enable]')?.checked;filters[group][key]=enabled?select.value:"";});removeCompactFilterOutsideListener();group==="customers"?renderCustomers():renderCards();bindTables();});
  $$('[data-compact-clear]').forEach(button=>button.onclick=()=>{const group=button.dataset.compactClear,q=filters[group]?.q||"";filters[group]={q};removeCompactFilterOutsideListener();group==="customers"?renderCustomers():renderCards();bindTables();});
  $$('[data-clear-filter]').forEach(el=>el.onclick=()=>{filters[currentView]={};render();});
  $$('table[data-entity] tr[data-id]').forEach(row=>{if(row.closest("table")?.dataset.featureTable)return;const selectRow=()=>{const table=row.closest("table");$$('tr.selected',table).forEach(x=>x.classList.remove("selected"));row.classList.add("selected");};row.onclick=event=>{if(event.target.closest('[data-responsive-toggle]'))return;selectRow();};row.ondblclick=()=>openDetail(row.closest("table").dataset.entity,row.dataset.id);row.oncontextmenu=e=>{e.preventDefault();selectRow();openContext(e,row.closest("table").dataset.entity,row.dataset.id);};});
  $$('th[data-sort]').forEach(th=>th.onclick=()=>{const table=th.closest("table"),body=$("tbody",table),index=Number(th.dataset.sort),direction=th.dataset.direction==="asc"?"desc":"asc";$$('th[data-sort]',table).forEach(x=>{delete x.dataset.direction;});th.dataset.direction=direction;const rows=$$('tr',body).sort((a,b)=>{const left=$("td:nth-child("+(index+1)+")",a)?.innerText.trim()||"",right=$("td:nth-child("+(index+1)+")",b)?.innerText.trim()||"";const ln=Number(left.replace(/\D/g,"")),rn=Number(right.replace(/\D/g,"")),result=left&&right&&Number.isFinite(ln)&&Number.isFinite(rn)&&/\d/.test(left)&&/\d/.test(right)?ln-rn:left.localeCompare(right,"vi",{sensitivity:"base"});return direction==="asc"?result:-result;});rows.forEach(row=>body.append(row));});
  $$('[data-add]').forEach(x=>x.onclick=()=>openForm(x.dataset.add));$$('[data-edit-selected]').forEach(x=>x.onclick=()=>selectedAction(x.dataset.editSelected,"edit"));$$('[data-delete-selected]').forEach(x=>x.onclick=()=>selectedAction(x.dataset.deleteSelected,"delete"));
  $('[data-card-cycle-guide]')?.addEventListener("click",openCardCycleGuide);
  $$('[data-responsive-customer-detail]').forEach(button=>button.onclick=event=>{event.stopPropagation();openCustomerDetail(button.dataset.responsiveCustomerDetail);});
  $$('[data-responsive-customer-edit]').forEach(button=>button.onclick=event=>{event.stopPropagation();openForm("customer",button.dataset.responsiveCustomerEdit);});
  $$('[data-responsive-customer-delete]').forEach(button=>button.onclick=event=>{event.stopPropagation();removeEntity("customer",button.dataset.responsiveCustomerDelete);});
  $('[data-download-template]')?.addEventListener("click",downloadTemplate);$('[data-import-excel]')?.addEventListener("click",()=>$("#excelFile").click());$('[data-export-json]')?.addEventListener("click",exportJson);
}
function bindHelpTabs(){$$('[data-help-tab]').forEach(button=>button.onclick=()=>{$$('[data-help-tab]').forEach(item=>{const selected=item===button;item.classList.toggle("active",selected);item.setAttribute("aria-selected",String(selected));});$$('[data-help-panel]').forEach(panel=>panel.hidden=panel.dataset.helpPanel!==button.dataset.helpTab);sessionStorage.setItem("cardflow-host-about-tab",button.dataset.helpTab);});}
function responsiveRowTitle(entity,row){
  const values=[...row.children].map(cell=>cell.textContent.trim()).filter(Boolean);
  if(entity==="customer")return [values[1],values[0],values[4]?`${values[4]} thẻ`:"",values[5]].filter(Boolean).join(" · ");
  if(entity==="product")return [values[1],values[2],values[0]].filter(Boolean).join(" · ");
  if(entity==="detail-links")return [values[0],values[1],values[4]].filter(Boolean).join(" · ");
  if(entity==="detail-owners")return [values[1],values[0],values[3]].filter(Boolean).join(" · ");
  return values.slice(0,2).join(" · ");
}
function enhanceResponsiveTables(){
  $$('table[data-entity]').forEach((table,tableIndex)=>{
    const entity=table.dataset.entity,rows=$$('tbody tr[data-id],tbody tr[data-product-link],tbody tr[data-customer-link]',table);
    if(!rows.length)return;
    table.classList.add('responsive-accordion-table');
    table.closest('.table-wrap')?.classList.add('responsive-accordion-wrap');
    rows.forEach((row,rowIndex)=>{
      if($('.responsive-toggle-cell',row))return;
      const id=row.dataset.id||row.dataset.productLink||row.dataset.customerLink||String(rowIndex),key=`${entity}|${id}`,expanded=expandedResponsiveRows.has(key),panelId=`responsive-row-${tableIndex}-${rowIndex}`;
      row.classList.add('responsive-record');row.classList.toggle('responsive-expanded',expanded);row.dataset.responsiveKey=key;row.id=panelId;
      row.insertAdjacentHTML('afterbegin',`<td class="responsive-toggle-cell"><button type="button" data-responsive-toggle aria-expanded="${expanded}" aria-controls="${panelId}"><span>${esc(responsiveRowTitle(entity,row))}</span>${icon('chevron')}</button></td>`);
    });
  });
  $$('[data-responsive-toggle]').forEach(button=>button.onclick=event=>{event.stopPropagation();const row=button.closest('.responsive-record'),expanded=!row.classList.contains('responsive-expanded');row.classList.toggle('responsive-expanded',expanded);button.setAttribute('aria-expanded',String(expanded));if(expanded)expandedResponsiveRows.add(row.dataset.responsiveKey);else expandedResponsiveRows.delete(row.dataset.responsiveKey);});
}
function selectedAction(entity,action){const row=$(`table[data-entity="${entity}"] tr.selected`);if(!row)return toast("Hãy chọn một dòng trước");action==="edit"?openForm(entity,row.dataset.id):removeEntity(entity,row.dataset.id);}
function openDetail(entity,id){if(entity==="customer")openCustomerDetail(id);else if(entity==="product")openProductDetail(id);else openForm(entity,id);}
function openContext(event,entity,id){const menu=$("#contextMenu");let actions=entity==="customer"?[["Xem chi tiết",()=>openCustomerDetail(id)],["Tùy chỉnh",()=>openForm(entity,id)],["Thêm thẻ cho khách hàng",()=>openForm("link",null,{customerId:id})],["Sao chép",()=>copyCustomer(id)],["Xóa",()=>removeEntity(entity,id),"danger"]]:entity==="product"?[["Xem chi tiết",()=>openProductDetail(id)],["Danh sách khách sở hữu",()=>openProductDetail(id)],["Tùy chỉnh",()=>openForm(entity,id)],["Xóa",()=>removeEntity(entity,id),"danger"]]:[["Tùy chỉnh",()=>openForm(entity,id)],["Xóa",()=>removeEntity(entity,id),"danger"]];menu.innerHTML=actions.map((x,i)=>`<button data-i="${i}" class="${x[2]||""}">${x[0]}</button>`).join("");menu.hidden=false;menu.style.left=`${Math.max(0,Math.min(event.clientX,innerWidth-235))}px`;menu.style.top=`${Math.max(0,Math.min(event.clientY,innerHeight-actions.length*42-15))}px`;$$('button',menu).forEach((b,i)=>b.onclick=()=>{menu.hidden=true;actions[i][1]();});}

function openForm(entity,id=null,preset={}){const modal=$("#modal"),form=$("form",modal),body=$(".modal-body",modal);form.dataset.entity=entity;form.dataset.id=id||"";modal.classList.toggle("customer-editor-modal",entity==="customer");let item;
  if(entity==="customer"){item=state.customers.find(x=>x.id===id)||preset;const links=id?linksForCustomer(id):(Array.isArray(preset.customerCards)?preset.customerCards:[]);$("h2",modal).textContent=id?"Tùy chỉnh khách hàng":"Thêm khách hàng";body.innerHTML=field("fullName","Họ tên",item.fullName,"text",true)+field("phone","Số điện thoại",item.phone)+field("email","Email",item.email,"email")+field("dateOfBirth","Ngày sinh",item.dateOfBirth,"date")+noteField(item.notes)+customerCardsEditor(links);bindCustomerCardEditor(body);}
  if(entity==="product"){item=state.cardProducts.find(x=>x.id===id)||preset;$("h2",modal).textContent=id?"Tùy chỉnh Thẻ ngân hàng":"Thêm Thẻ ngân hàng";body.innerHTML=field("cardId","Card ID",item.cardId,"text",true)+selectField("bankId","Mã ngân hàng",bankOptions(item.bankId),true)+(state.banks.length?"":'<div class="dependency-help full">Chưa có mã ngân hàng. Vui lòng tạo tại tab Mã ngân hàng.</div>')+field("cardName","Tên thẻ",item.cardName,"text",true)+selectField("cardRank","Hạng thẻ",rankOptions(item.cardRank||"Classic/Standard"),true)+selectField("ownershipType","Loại thẻ",OWNERSHIP_TYPES.map(value=>`<option value="${value}" ${value===(item.ownershipType||"credit")?"selected":""}>${ownershipTypeLabel(value)}</option>`).join(""),true)+selectField("cardBrand","Phôi",textValueOptions(cardBrandValues(),item.cardBrand||item.network||""),true)+selectField("cardForm","Hình thức thẻ",textValueOptions(CARD_FORMS,item.cardForm||"Vật lý"),true)+selectField("cashbackCycleMode","Hình thức hoàn",`<option value="monthly" ${item.cashbackCycleMode!=="statement"?"selected":""}>Hoàn theo tháng</option><option value="statement" ${item.cashbackCycleMode==="statement"?"selected":""}>Hoàn theo sao kê</option>`,true)+selectField("status","Trạng thái",statusOptions(item.status))+noteField(item.notes);if(!state.banks.length)$("[name='bankId']",body).disabled=true;}
  if(entity==="link"){item=state.customerCards.find(x=>x.id===id)||preset;$("h2",modal).textContent=id?"Tùy chỉnh thẻ khách hàng":"Thêm thẻ cho khách hàng";const missing=[];if(!state.customers.length)missing.push("Chưa có khách hàng.");if(!state.cardProducts.length)missing.push("Chưa có thẻ ngân hàng.");body.innerHTML=(missing.length?`<div class="dependency-help full">${esc(missing.join(" "))}</div>`:"")+selectField("customerId","Khách hàng",customerOptions(item.customerId),true)+selectField("cardProductId","Thẻ ngân hàng",customerCardProductOptions(item.cardProductId),true)+field("creditLimit","Hạn mức",formatVndInput(item.creditLimit||0),"text",true,"inputmode=numeric")+selectField("cashbackCycleModeOverride","Hình thức hoàn ngoại lệ",`<option value="">Kế thừa từ Thẻ ngân hàng</option><option value="monthly" ${item.cashbackCycleModeOverride==="monthly"?"selected":""}>Theo tháng</option><option value="statement" ${item.cashbackCycleModeOverride==="statement"?"selected":""}>Theo sao kê</option>`)+selectField("statementDay","Ngày sao kê",dayOptions(item.statementDay))+selectField("paymentDueDay","Hạn thanh toán",dayOptions(item.paymentDueDay))+field("openingDate","Ngày mở thẻ",item.openingDate,"date")+field("expiryDate","Ngày hết hạn",item.expiryDate,"date")+field("last4Digits","4 số cuối",item.last4Digits,"text",false,"inputmode=numeric maxlength=4 pattern=\\d{0,4}")+selectField("status","Trạng thái",statusOptions(item.status))+noteField(item.notes);if(!state.customers.length)$("[name='customerId']",body).disabled=true;if(!state.cardProducts.length)$("[name='cardProductId']",body).disabled=true;bindVndInput($('[name="creditLimit"]',body));const cardInput=$('[name="cardProductId"]',body),overrideInput=$('[name="cashbackCycleModeOverride"]',body),statementInput=$('[name="statementDay"]',body),statementLabel=statementInput.closest(".field").querySelector("label"),refreshStatementRequirement=()=>{const config=customerCardCycleConfig({cashbackCycleModeOverride:overrideInput.value,statementDay:statementInput.value},product(cardInput.value)||{});statementInput.required=config.statementDayRequired;statementLabel.textContent=`Ngày sao kê${config.statementDayRequired?" *":""}`;};cardInput.addEventListener("change",refreshStatementRequirement);overrideInput.addEventListener("change",refreshStatementRequirement);refreshStatementRequirement();}
  if(entity==="bank"){item=state.banks.find(x=>x.id===id)||preset;$("h2",modal).textContent=id?"Tùy chỉnh ngân hàng":"Thêm ngân hàng";body.innerHTML=field("code","Mã ngân hàng",item.code,"text",true)+field("name","Tên ngân hàng",item.name,"text",true);}
  if(entity==="orderType"){item=(state.orderTypes||[]).find(x=>x.id===id)||preset;$("h2",modal).textContent=id?"Tùy chỉnh Loại đơn":"Thêm Loại đơn";body.innerHTML=field("code","Mã loại đơn",item.code,"text",true)+field("description","Mô tả",item.description)+`<div class="field full"><label>Ghi chú</label><textarea name="note">${esc(item.note||"")}</textarea></div>`;}
  modal.classList.add("show");setTimeout(()=>$("input,select",body)?.focus(),0);
}
function statusOptions(value){const current=value||"active";return [["active","Đang hoạt động"],["closed","Đã đóng"],["inactive","Ngừng hoạt động"]].sort((a,b)=>compareText(a[1],b[1])).map(([key,label])=>`<option value="${key}" ${key===current?"selected":""}>${label}</option>`).join("");}
function normalizeSharedLimitGroups(links){
  const byProduct=new Map(links.map(link=>[link.cardProductId,link])),allIds=new Set(links.flatMap(link=>[link.cardProductId,...(link.sharedLimitCardIds||[])]).filter(id=>product(id))),parent=new Map([...allIds].map(id=>[id,id]));
  const find=id=>{const current=parent.get(id);if(!current)return null;if(current!==id)parent.set(id,find(current));return parent.get(id);};
  const join=(left,right)=>{const a=find(left),b=find(right);if(a&&b&&a!==b)parent.set(b,a);};
  links.forEach(link=>(link.sharedLimitCardIds||[]).forEach(id=>join(link.cardProductId,id)));
  const groups=new Map();allIds.forEach(id=>{const root=find(id);if(!groups.has(root))groups.set(root,[]);groups.get(root).push(id);});
  groups.forEach(ids=>ids.forEach(id=>{if(byProduct.has(id))byProduct.get(id).sharedLimitCardIds=ids.filter(other=>other!==id).sort((a,b)=>compareText(product(a)?.cardId,product(b)?.cardId));}));
}
function submitForm(event){event.preventDefault();const form=event.currentTarget,entity=form.dataset.entity,id=form.dataset.id,data=Object.fromEntries(new FormData(form));const now=new Date().toISOString();
  if(entity==="customer"){
    const existing=state.customers.find(x=>x.id===id);
    const customerId=id||uuid();
    const customerCode=existing?.customerCode||generateCustomerCode();
    const cardRows=$$(".customer-card-row",form).map(row=>({
      linkId:row.dataset.linkId||"",
      cardProductId:$("[data-card-product]",row)?.value||"",
      creditLimitRaw:$("[data-credit-limit]",row)?.value?.trim()||"",
      statementDay:$("[data-statement-day]",row)?.value||"",
      paymentDueDay:$("[data-payment-due-day]",row)?.value||"",
      sharedLimitCardIds:$$('[data-shared-chip]',row).map(x=>x.dataset.sharedChip)
    }));
    const meaningful=cardRows.filter(row=>row.cardProductId||row.creditLimitRaw||row.statementDay||row.paymentDueDay);
    if(meaningful.some(row=>!row.cardProductId))return toast("Hãy chọn thẻ cho tất cả các dòng đã nhập");
    if(meaningful.some(row=>row.cardProductId&&!row.creditLimitRaw))return toast("Hãy nhập hạn mức cho tất cả thẻ đã chọn");
    if(meaningful.some(row=>customerCardCycleConfig({statementDay:row.statementDay},product(row.cardProductId)||{}).statementDayRequired&&!row.statementDay))return toast("Chưa cấu hình ngày sao kê cho thẻ của khách hàng này.");
    const duplicateIds=meaningful.map(row=>row.cardProductId).filter((value,index,array)=>array.indexOf(value)!==index);
    if(duplicateIds.length)return toast("Một khách hàng không thể gán trùng cùng một dòng thẻ trong form này");
    const customerData={...(existing||{}),id:customerId,customerCode,fullName:String(data.fullName||"").trim(),phone:String(data.phone||"").trim(),email:String(data.email||"").trim(),dateOfBirth:toStorageDate(data.dateOfBirth),notes:String(data.notes||"").trim(),address:"",personInCharge:"",createdAt:existing?.createdAt||now,updatedAt:now};
    const customerIndex=state.customers.findIndex(x=>x.id===customerId);
    if(customerIndex>=0)state.customers[customerIndex]=customerData;else state.customers.push(customerData);
    const previousLinks=new Map(linksForCustomer(customerId).map(link=>[link.id,link]));
    const nextLinks=meaningful.map(row=>{
      const previous=previousLinks.get(row.linkId)||{};
      const master=product(row.cardProductId);
      return {...previous,id:previous.id||uuid(),customerId,cardProductId:row.cardProductId,cardBrand:previous.cardBrand||master?.cardBrand||master?.network||"",cardForm:master?.cardForm||"Vật lý",creditLimit:parseMoney(row.creditLimitRaw),statementDay:row.statementDay?Number(row.statementDay):"",paymentDueDay:row.paymentDueDay?Number(row.paymentDueDay):"",sharedLimitCardIds:row.sharedLimitCardIds.filter(value=>value!==row.cardProductId),openingDate:previous.openingDate||"",expiryDate:previous.expiryDate||"",last4Digits:previous.last4Digits||"",status:previous.status||"active",notes:previous.notes||"",createdAt:previous.createdAt||now,updatedAt:now};
    });
    normalizeSharedLimitGroups(nextLinks);
    state.customerCards=state.customerCards.filter(x=>x.customerId!==customerId);
    state.customerCards.push(...nextLinks);
  }
  if(entity==="product"){if(!state.banks.length||!data.bankId)return toast("Chưa có mã ngân hàng. Vui lòng tạo tại tab Mã ngân hàng.");if(state.cardProducts.some(x=>x.cardId.toLowerCase()===data.cardId.trim().toLowerCase()&&x.id!==id))return toast("Card ID đã tồn tại");const ownershipType=normalizeOwnershipType(data.ownershipType),existingProduct=state.cardProducts.find(x=>x.id===id);upsert("cardProducts",id,{...data,...(existingProduct?.defaultStatementDay?{defaultStatementDay:existingProduct.defaultStatementDay}:{}),cardId:data.cardId.trim(),cardName:data.cardName.trim(),cardRank:normalizeCardRank(data.cardRank),ownershipType,cardType:ownershipType,cardBrand:normalizeCardBrand(data.cardBrand),cardForm:data.cardForm.trim(),updatedAt:now});}
  if(entity==="link"){if(!data.customerId)return toast("Chưa có khách hàng.");if(!data.cardProductId)return toast("Chưa có thẻ ngân hàng.");const dayValue=n=>n===""?"":Number(n),cycleConfig=customerCardCycleConfig(data,product(data.cardProductId)||{});if(cycleConfig.statementDayRequired&&!data.statementDay)return toast("Chưa cấu hình ngày sao kê cho thẻ của khách hàng này.");if([data.statementDay,data.paymentDueDay].some(x=>x!==""&&(+x<1||+x>31)))return toast("Ngày sao kê/Hạn thanh toán phải từ 1 đến 31");upsert("customerCards",id,{...data,creditLimit:parseMoney(data.creditLimit),statementDay:dayValue(data.statementDay),paymentDueDay:dayValue(data.paymentDueDay),openingDate:toStorageDate(data.openingDate),expiryDate:toStorageDate(data.expiryDate),last4Digits:data.last4Digits.replace(/\D/g,"").slice(-4),updatedAt:now});}
  if(entity==="bank"){if(state.banks.some(x=>x.code.toLowerCase()===data.code.trim().toLowerCase()&&x.id!==id))return toast("Mã ngân hàng đã tồn tại");upsert("banks",id,{...data,code:data.code.trim().toUpperCase(),name:data.name.trim()});}
  if(entity==="orderType"){const code=String(data.code||"").trim().toUpperCase();if(!code)return toast("Mã loại đơn là bắt buộc");if((state.orderTypes||[]).some(x=>String(x.code||"").trim().toUpperCase()===code&&x.id!==id))return toast("Mã loại đơn đã tồn tại");upsert("orderTypes",id,{code,description:String(data.description||"").trim(),note:String(data.note||"").trim(),updatedAt:now});}
  closeModal();save();}
function upsert(collection,id,data){const index=state[collection].findIndex(x=>x.id===id);if(index>=0)state[collection][index]={...state[collection][index],...data};else state[collection].push({id:uuid(),createdAt:new Date().toISOString(),...data});}
function removeEntity(entity,id){let label,relations=0;if(entity==="customer"){label=customer(id)?.fullName;relations=linksForCustomer(id).length;}if(entity==="product"){label=product(id)?.cardName;relations=linksForProduct(id).length;}if(entity==="bank"){label=bank(id)?.name;relations=state.cardProducts.filter(x=>x.bankId===id).length;if(relations)return toast("Không thể xóa ngân hàng đang được dòng thẻ sử dụng");}if(entity==="orderType"){const item=(state.orderTypes||[]).find(x=>x.id===id);label=item?.code;relations=state.transactions.filter(x=>x.orderTypeCode===item?.code).length;}if(!confirm(`Xóa “${label}”${relations?` và giữ nguyên ${relations} đơn đang tham chiếu`:""}?`))return;if(entity==="customer"){state.customers=state.customers.filter(x=>x.id!==id);state.customerCards=state.customerCards.filter(x=>x.customerId!==id);}if(entity==="product"){state.cardProducts=state.cardProducts.filter(x=>x.id!==id);state.customerCards=state.customerCards.filter(x=>x.cardProductId!==id);}if(entity==="bank")state.banks=state.banks.filter(x=>x.id!==id);if(entity==="orderType")state.orderTypes=(state.orderTypes||[]).filter(x=>x.id!==id);save("Đã xóa an toàn");}
function copyCustomer(id){const source=customer(id);if(!source)return;openForm("customer",null,{...source,customerCode:"",fullName:`${source.fullName} (Bản sao)`,customerCards:linksForCustomer(id).map(link=>({...link,id:""}))});}

function openCustomerDetail(id){
  const c=customer(id);if(!c)return;const links=linksForCustomer(id),displayRows=buildSortedCustomerCardRows(links,state.cardProducts,state.banks),analysis=effectiveLimit(links),banks=new Set(links.map(x=>product(x.cardProductId)?.bankId));
  const rows=displayRows.map(({link:l,card:p})=>`<tr data-product-link="${p.id}">${cell("Card ID",`<strong>${esc(p.cardId||"—")}</strong>`)}${cell("Phôi",esc(p.cardBrand||p.network||l.cardBrand||"—"))}${cell("Hình thức hoàn",esc(cashbackCycleModeLabel(l.cashbackCycleModeOverride||p.cashbackCycleMode)))}${cell("Loại thẻ",ownershipTypeLabel(p.ownershipType))}${cell("Hạn mức",formatMoney(l.creditLimit))}${cell("Sao kê",formatDay(l.statementDay))}${cell("Hạn thanh toán",formatDay(l.paymentDueDay))}${cell("Chung hạn mức",l.sharedLimitCardIds?.length?`${l.sharedLimitCardIds.length+1} thẻ cùng nhóm`:"Không")}${cell("Trạng thái",badge(l.status))}</tr>`);
  openDetailModal("",`<div class="detail-info">${info("Mã KH",c.customerCode)}${info("Họ tên",c.fullName)}${info("Số điện thoại",c.phone)}${info("Email",c.email)}${info("Ngày sinh",formatDate(c.dateOfBirth))}${info("Ghi chú",c.notes)}</div>${limitInconsistencyWarning(analysis)}<div class="kpis" style="margin-top:14px"><div class="kpi blue"><small>Số thẻ</small><strong>${links.length}</strong></div><div class="kpi teal"><small>Tổng hạn mức</small><strong>${effectiveLimitDisplay(analysis)}</strong></div><div class="kpi amber"><small>Số ngân hàng</small><strong>${banks.size}</strong></div><div class="kpi red"><small>Không hoạt động</small><strong>${links.filter(x=>x.status!=="active").length}</strong></div></div><div class="panel" style="margin-top:14px"><div class="section-title"><h2>Danh sách thẻ đang sở hữu</h2><button class="primary" data-add-link>Thêm thẻ</button></div>${entityTable(["Card ID","Phôi","Hình thức hoàn","Loại thẻ","Hạn mức","Sao kê","Hạn thanh toán","Chung hạn mức","Trạng thái"],rows,"detail-links","Khách hàng chưa có thẻ.")}</div>`);$("h2",$("#detailModal")).innerHTML=`<span>Khách hàng:</span> <strong class="customer-name-accent">${esc(c.fullName.toLocaleUpperCase("vi"))}</strong>`;$('[data-add-link]').onclick=()=>{closeDetail();openForm("link",null,{customerId:id});};$$('[data-product-link]').forEach(x=>x.onclick=()=>openProductDetail(x.dataset.productLink));
}
function openProductDetail(id){
  const p=product(id);if(!p)return;const links=linksForProduct(id),analysis=attributedEffectiveLimits(effectiveLimit(state.customerCards)).get(id)||{total:0,inconsistencies:[]},rows=links.map(l=>{const c=customer(l.customerId);return `<tr data-customer-link="${c?.id||""}">${cell("Mã KH",esc(c?.customerCode||"—"))}${cell("Họ tên",esc(c?.fullName||"—"))}${cell("Số điện thoại",esc(c?.phone||"—"))}${cell("Hạn mức",formatMoney(l.creditLimit))}${cell("Ngày sao kê",formatDay(l.statementDay))}${cell("Hạn thanh toán",formatDay(l.paymentDueDay))}${cell("Trạng thái",badge(l.status))}</tr>`;});
  openDetailModal("",`<div class="detail-info">${info("Card ID",p.cardId)}${info("Ngân hàng",bank(p.bankId)?.name)}${info("Tên thẻ",p.cardName)}${info("Hạng thẻ",p.cardRank)}${info("Loại thẻ",ownershipTypeLabel(p.ownershipType))}${info("Tổ chức thẻ Quốc tế",p.cardBrand||p.network)}${info("Hình thức thẻ",p.cardForm)}${info("Ghi chú",p.notes)}</div><div class="kpis" style="margin-top:14px"><div class="kpi blue"><small>Số khách sở hữu</small><strong>${links.length}</strong></div><div class="kpi teal"><small>Tổng hạn mức</small><strong>${effectiveLimitDisplay(analysis)}</strong></div><div class="kpi indigo"><small>Hạn mức trung bình</small><strong>${analysis.inconsistencies.length?effectiveLimitDisplay(analysis):formatMoney(links.length?analysis.total/links.length:0,true)}</strong></div></div><div class="panel" style="margin-top:14px"><h2>Danh sách khách đang sở hữu</h2>${entityTable(["Mã KH","Họ tên","Số điện thoại","Hạn mức","Ngày sao kê","Hạn thanh toán","Trạng thái"],rows,"detail-owners","Chưa có khách hàng sở hữu thẻ này.")}</div>`);$("h2",$("#detailModal")).innerHTML=`<span>Dòng thẻ:</span> <strong class="card-id-accent">${esc(String(p.cardId||"—").toLocaleUpperCase("vi"))}</strong>`;$('[data-customer-link]').forEach(x=>x.onclick=()=>openCustomerDetail(x.dataset.customerLink));
}
function info(label,value){return `<div><small>${label}</small><strong>${esc(value||"—")}</strong></div>`;}function openDetailModal(title,html){const modal=$("#detailModal");$("h2",modal).textContent=title;$(".detail-body",modal).innerHTML=html;modal.classList.add("show");}function openCardCycleGuide(){const modal=$("#detailModal");modal.classList.add("card-cycle-guide-modal");openDetailModal("Hướng dẫn hình thức hoàn",`<div class="card-cycle-guide"><p>Tham khảo khi chọn Theo tháng hoặc Theo sao kê cho từng thẻ.</p><img src="./assets/reference/card-cashback-cycle-guide.png" alt="Tham khảo thẻ hoàn theo tháng hoặc theo sao kê"><small>Thông tin mang tính tham khảo và có thể thay đổi theo từng dòng thẻ/chương trình từng thời kỳ.</small></div>`);}function closeDetail(){const modal=$("#detailModal");modal.classList.remove("show","card-cycle-guide-modal");$(".detail-body",modal).innerHTML="";}function closeModal(){$("#modal").classList.remove("show");}

function downloadTemplate(){if(!window.XLSX)return toast("Chưa tải được thư viện Excel");const wb=XLSX.utils.book_new();const sheets={"01_KhachHang":[["MaKH","HoTen","SoDienThoai","Email","NgaySinh","GhiChu"]],"02_DongThe":[["CardID","NganHang","TenThe","HangThe","LoaiSoHuu","ToChucTheQuocTe","HinhThucThe","GhiChu"]],"03_TheKhachHang":[["MaKH","CardID","HanMuc","NgaySaoKe","NgayDenHan","NgayMoThe","NgayHetHan","BonSoCuoi","TrangThai","GhiChu"]],"04_HuongDan":[["HƯỚNG DẪN NHẬP DỮ LIỆU HOST"],["MaKH và CardID phải duy nhất."],["HangThe: Classic/Standard, Gold, Platinum, Signature hoặc Infinite/Back Card."],["LoaiSoHuu: Credit hoặc Debit; hiển thị trong ứng dụng là Loại thẻ."],["ToChucTheQuocTe: American Express, JCB, MasterCard, NAPAS, Union Pay hoặc Visa."],["03_TheKhachHang chỉ tham chiếu MaKH và CardID đã có."],["Ngày dùng DD-MM-YYYY hoặc YYYY-MM-DD. Ngày sao kê/đến hạn từ 1 đến 31."],["Không nhập số thẻ đầy đủ, CVV/CVC, OTP hoặc PIN."]]};Object.entries(sheets).forEach(([name,data])=>XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(data),name));XLSX.writeFile(wb,"CardFlow_Host_Import_Template.xlsx");}
async function importExcel(file){if(!file||!window.XLSX)return;const wb=XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:true});const read=name=>XLSX.utils.sheet_to_json(wb.Sheets[name]||{}, {defval:"",raw:false});const customers=read("01_KhachHang"),products=read("02_DongThe"),links=read("03_TheKhachHang"),errors=[],newCustomers=[],newProducts=[],newLinks=[];const customerCodes=new Map(state.customers.map(x=>[normalize(x.customerCode),x])),cardIds=new Map(state.cardProducts.map(x=>[normalize(x.cardId),x]));
  customers.forEach((r,i)=>{const code=String(r.MaKH).trim();if(!code||!String(r.HoTen).trim())errors.push(`01_KhachHang dòng ${i+2}: thiếu MaKH hoặc HoTen`);else if(customerCodes.has(normalize(code)))errors.push(`01_KhachHang dòng ${i+2}: trùng MaKH ${code}`);else{const item={id:uuid(),customerCode:code,fullName:String(r.HoTen).trim(),phone:String(r.SoDienThoai),email:String(r.Email),dateOfBirth:toStorageDate(r.NgaySinh),address:String(r.DiaChi),personInCharge:String(r.NguoiPhuTrach),notes:String(r.GhiChu),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};if(r.NgaySinh&&!item.dateOfBirth)errors.push(`01_KhachHang dòng ${i+2}: NgaySinh không hợp lệ`);else{customerCodes.set(normalize(code),item);newCustomers.push(item);}}});
  products.forEach((r,i)=>{const cid=String(r.CardID).trim(),bankName=String(r.NganHang).trim();if(!cid||!bankName||!String(r.TenThe).trim())errors.push(`02_DongThe dòng ${i+2}: thiếu CardID, NganHang hoặc TenThe`);else if(cardIds.has(normalize(cid)))errors.push(`02_DongThe dòng ${i+2}: trùng CardID ${cid}`);else{let b=state.banks.find(x=>normalize(x.name)===normalize(bankName)||normalize(x.code)===normalize(bankName));if(!b){b={id:uuid(),code:normalize(bankName).replace(/[^a-z0-9]/g,"").toUpperCase().slice(0,12)||"BANK",name:bankName};state.banks.push(b);}const legacyType=normalize(r.LoaiSoHuu||r.LoaiThe),ownershipType=normalizeOwnershipType(legacyType),cardBrand=normalizeCardBrand(r.ToChucTheQuocTe||r.MangThe||(!["credit","debit","tin dung","ghi no"].includes(legacyType)?r.LoaiThe:""));const item={id:uuid(),cardId:cid,bankId:b.id,cardName:String(r.TenThe).trim(),cardRank:normalizeCardRank(r.HangThe),ownershipType,cardType:ownershipType,network:String(r.ToChucTheQuocTe||r.MangThe),cardBrand,cardForm:String(r.HinhThucThe||"Vật lý"),status:"active",notes:String(r.GhiChu),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};cardIds.set(normalize(cid),item);newProducts.push(item);}});
  links.forEach((r,i)=>{const c=customerCodes.get(normalize(r.MaKH)),p=cardIds.get(normalize(r.CardID)),limit=String(r.HanMuc).replace(/[^\d]/g,"");const sd=Number(r.NgaySaoKe),dd=Number(r.NgayDenHan),opening=toStorageDate(r.NgayMoThe),expiry=toStorageDate(r.NgayHetHan);const rowErrors=[];if(!c)rowErrors.push(`MaKH không tồn tại: ${r.MaKH}`);if(!p)rowErrors.push(`CardID không tồn tại: ${r.CardID}`);if(!limit||!Number.isFinite(Number(limit)))rowErrors.push("HanMuc không hợp lệ");if(r.NgaySaoKe&&(!Number.isInteger(sd)||sd<1||sd>31))rowErrors.push("NgaySaoKe không hợp lệ");if(r.NgayDenHan&&(!Number.isInteger(dd)||dd<1||dd>31))rowErrors.push("NgayDenHan không hợp lệ");if(r.NgayMoThe&&!opening)rowErrors.push("NgayMoThe không hợp lệ");if(r.NgayHetHan&&!expiry)rowErrors.push("NgayHetHan không hợp lệ");if(rowErrors.length)errors.push(`03_TheKhachHang dòng ${i+2}: ${rowErrors.join("; ")}`);else newLinks.push({id:uuid(),customerId:c.id,cardProductId:p.id,creditLimit:Number(limit),statementDay:r.NgaySaoKe?sd:"",paymentDueDay:r.NgayDenHan?dd:"",openingDate:opening,expiryDate:expiry,last4Digits:String(r.BonSoCuoi).replace(/\D/g,"").slice(-4),status:normalize(r.TrangThai).includes("ngung")||normalize(r.TrangThai)==="inactive"?"inactive":"active",notes:String(r.GhiChu),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});});
  state.customers.push(...newCustomers);state.cardProducts.push(...newProducts);state.customerCards.push(...newLinks);save("Đã hoàn tất nhập Excel");const total=customers.length+products.length+links.length,success=newCustomers.length+newProducts.length+newLinks.length;const result=$("#importResult");if(result)result.innerHTML=`<div class="import-result"><p><strong>Tổng:</strong> ${total} · <strong>Thành công:</strong> ${success} · <strong>Bỏ qua:</strong> ${errors.length}</p>${errors.length?`<div class="error-list">${errors.map(x=>`<div>${esc(x)}</div>`).join("")}</div>`:"<p>Không có lỗi.</p>"}</div>`;}
function exportJson(){const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`cardflow-host-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);}

function setSidebarOpen(open){
  document.querySelector(".app-shell")?.classList.toggle("sidebar-open",open);
  document.querySelector(".menu-toggle")?.setAttribute("aria-expanded",String(open));
}
function setSidebarExpanded(expanded){
  document.querySelector(".app-shell")?.classList.toggle("sidebar-expanded",expanded);
  const toggle=document.querySelector(".sidebar-toggle");
  toggle?.setAttribute("aria-expanded",String(expanded));
  toggle?.setAttribute("aria-label",expanded?"Thu gọn thanh điều hướng":"Mở rộng thanh điều hướng");
  localStorage.setItem(SIDEBAR_STORAGE_KEY,String(expanded));
}
function setView(name){
  currentView=name;
  $$('.nav-btn').forEach(x=>x.classList.toggle("active",x.dataset.view===name));
  $$('.view').forEach(x=>x.classList.toggle("active",x.id===`view-${name}`));
  const meta=VIEW_META[name]||{title:name,description:""};
  $(".topbar h1").textContent=meta.title;
  $("#subtitle").textContent=meta.description;
  $(".drive-panel")?.toggleAttribute("hidden",name==="about");
  setSidebarOpen(false);
}
function renderSyncStatus(statusOverride=""){
  const meta=repo.loadMeta();
  let status=statusOverride||meta.status||"disconnected";
  if(!auth.hasToken() && status!=="error") status="disconnected";
  const labels={disconnected:"Chưa kết nối Google Drive",syncing:"Đang đồng bộ...",synced:"Đã đồng bộ",dirty:"Có thay đổi chưa đồng bộ",conflict:"Xung đột dữ liệu",error:"Lỗi đồng bộ"};
  const statusEl=$("#driveStatus");
  statusEl.textContent=labels[status]||status;
  statusEl.className=`drive-state ${status}`;
  $("#lastSync").textContent=meta.lastSyncAt?`Lần cuối: ${new Date(meta.lastSyncAt).toLocaleString("vi-VN")}`:"Chưa có lần đồng bộ thành công";
  const connected=auth.hasToken();
  $("#connectDrive").disabled=connectingDrive||!auth.isReady()||connected;
  $("#connectDrive").textContent=connected?"Đã kết nối":"Kết nối Google Drive";
  $("#syncDrive").disabled=!connected||connectingDrive;
  $("#disconnectDrive").disabled=!connected||connectingDrive;
}
function renderLoginGate(){
  const connected=auth.hasToken();
  const gate=$("#loginGate"), shell=$(".app-shell"), button=$("#gateConnectDrive"), status=$("#gateStatus");
  gate?.classList.toggle("show",!connected);
  shell?.classList.toggle("locked",!connected);
  if(button){button.disabled=connectingDrive||!auth.isReady();button.textContent=connectingDrive?"Đang kết nối...":"Kết nối Google Drive";}
  if(status){status.textContent=authMessage;status.classList.toggle("ok",connected);}
}
function connectionMessage(error){
  const code=String(error?.message||"");
  if(code==="missing-client-id") return "Chưa cấu hình Google OAuth Client ID cho app Host.";
  if(code==="gis-not-loaded") return "Chưa tải được dịch vụ đăng nhập Google. Vui lòng tải lại trang.";
  if(code==="popup_closed"||code==="popup_failed_to_open") return "Cửa sổ đăng nhập Google đã bị đóng hoặc bị trình duyệt chặn.";
  if(code==="access_denied") return "Tài khoản Google chưa cấp quyền truy cập Drive cho app Host.";
  if(code==="drive-404"){
    const operation=error?.operation||"Drive API";
    return `Google Drive trả về 404 tại bước ${operation}. Bản V2 đã bỏ fileId cũ, thử mọi file Host tìm thấy và tự tạo file mới khi cần.`;
  }
  if(code==="drive-create-missing-id") return "Google Drive đã phản hồi khi tạo file nhưng không trả về File ID. Hãy mở F12 > Console và gửi dòng [Host Google Drive Sync].";
  if(code==="drive-403") return "Google Drive API từ chối quyền truy cập. Hãy kiểm tra Drive API đã Enable và tài khoản đang nằm trong Test users.";
  return `Không thể kết nối Google Drive${code?`: ${code}`:"."}`;
}
async function connectGoogleDriveFromUi(){
  if(connectingDrive) return;
  if(!auth.isReady()){
    authMessage="Chưa tải được dịch vụ đăng nhập Google. Vui lòng tải lại trang.";
    renderLoginGate();renderSyncStatus("error");return;
  }
  connectingDrive=true;authMessage="Đang kết nối Google Drive...";renderLoginGate();renderSyncStatus("syncing");
  try{await auth.connect();}
  catch(error){authMessage=connectionMessage(error);auth.disconnect();renderSyncStatus("error");toast(authMessage);connectingDrive=false;renderLoginGate();renderSyncStatus();return;}
  try{await sync.syncNow();}
  catch(error){authMessage=connectionMessage(error);auth.disconnect();renderSyncStatus("error");toast(authMessage);connectingDrive=false;renderLoginGate();renderSyncStatus();return;}
  try{authMessage="";applyLoadedState(repo.load());setView("dashboard");toast("Đã kết nối Google Drive");}
  catch(error){console.error("[HOST_BOOT] Lỗi khởi tạo ứng dụng sau khi tải dữ liệu",error);authMessage=`Lỗi khởi tạo ứng dụng: ${error?.message||"Không xác định"}`;toast(authMessage);}
  finally{connectingDrive=false;renderLoginGate();renderSyncStatus();}
}
function watchGoogleSdkReadiness(){
  let attempts=0;
  const timer=setInterval(()=>{attempts+=1;renderLoginGate();renderSyncStatus();if(auth.isReady()||attempts>=100)clearInterval(timer);},100);
}

$$('.nav-btn').forEach(btn=>{
  btn.insertAdjacentHTML('afterbegin',icon(btn.dataset.icon));
  btn.title=btn.querySelector('.nav-label')?.textContent||'';
  btn.onclick=()=>setView(btn.dataset.view);
});
$('.menu-toggle')?.insertAdjacentHTML('afterbegin',icon('menu'));
$('.sidebar-toggle')?.insertAdjacentHTML('afterbegin',icon('menu'));
$('.sidebar-close')?.insertAdjacentHTML('afterbegin',icon('x'));
$('.menu-toggle')?.addEventListener('click',()=>setSidebarOpen(!$('.app-shell')?.classList.contains('sidebar-open')));
$('.sidebar-toggle')?.addEventListener('click',()=>setSidebarExpanded(!$('.app-shell')?.classList.contains('sidebar-expanded')));
$('.sidebar-close')?.addEventListener('click',()=>setSidebarOpen(false));
$('.sidebar-backdrop')?.addEventListener('click',()=>setSidebarOpen(false));
document.addEventListener('keydown',event=>{if(event.key==='Escape'){setSidebarOpen(false);closeModal();closeDetail();}});
$('form',$('#modal')).onsubmit=submitForm;
$$('[data-close]').forEach(x=>x.onclick=closeModal);
$('[data-close-detail]').onclick=closeDetail;
$('#detailModal').addEventListener('click',event=>{if(event.target===event.currentTarget)closeDetail();});
document.addEventListener('click',e=>{if(!e.target.closest('#contextMenu'))$('#contextMenu').hidden=true;});
document.addEventListener('keydown',e=>{if(e.key==='Escape')setSidebarOpen(false);});
$('#excelFile').onchange=e=>{importExcel(e.target.files[0]).catch(err=>toast(`Không thể đọc Excel: ${err.message}`));e.target.value='';};
$('#gateConnectDrive').onclick=()=>connectGoogleDriveFromUi();
$('#connectDrive').onclick=()=>connectGoogleDriveFromUi();
$('#syncDrive').onclick=()=>sync.syncNow().then(()=>{applyLoadedState(repo.load());toast('Đã đồng bộ');}).catch(e=>toast(`Đồng bộ lỗi: ${e.message}`));
$('#disconnectDrive').onclick=()=>{sync.disconnect();authMessage='';renderSyncStatus();renderLoginGate();toast('Đã ngắt kết nối Google Drive');};
$('[data-use-remote]').onclick=()=>{if(pendingRemote){sync.useRemote(pendingRemote);applyLoadedState(repo.load());}$('#conflict').hidden=true;renderSyncStatus();};
$('[data-keep-local]').onclick=()=>sync.syncNow({forceLocal:true}).then(()=>renderSyncStatus()).catch(e=>toast(e.message));
sync.addEventListener('status',e=>{
  renderSyncStatus(e.detail.status);
  if(e.detail.status==='conflict'){pendingRemote=e.detail.remote;$('#conflict').hidden=false;}
});

const savedSidebar=localStorage.getItem(SIDEBAR_STORAGE_KEY);
setSidebarExpanded(savedSidebar===null?true:savedSidebar==='true');
applyLoadedState(repo.load());
setView('dashboard');
renderSyncStatus();
renderLoginGate();
watchGoogleSdkReadiness();
