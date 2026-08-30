import {LocalRepository,uuid} from "./services/local-repository.js?v=20260830-customer-tagsv5";
import {DriveAuth} from "./services/drive-auth.js?v=20260830-customercardsv3";
import {DriveRepository} from "./services/drive-repository.js?v=20260830-customercardsv3";
import {SyncService} from "./services/sync-service.js?v=20260830-customer-tagsv5";
import {formatMoney,parseMoney,formatVndInput,bindVndInput} from "./services/money.js?v=20260830-customer-tagsv5";
import {formatDate,formatDay,toStorageDate} from "./services/date.js?v=20260830-customercardsv3";
import {compareText,sortByLabel,compareCards,compareCustomers} from "./services/sorting.js?v=20260830-customer-tagsv5";

const $=(selector,root=document)=>root.querySelector(selector), $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
const repo=new LocalRepository(); let state=repo.load(), currentView="dashboard", filters={}, sorts={}, pendingRemote=null;
const auth=new DriveAuth(window.HostFlowConfig), drive=new DriveRepository(auth);
const sync=new SyncService({localRepository:repo,driveRepository:drive,auth,getState:()=>state,setState:value=>{state=value;render();renderSyncStatus();}});
const SIDEBAR_STORAGE_KEY="cardflow-host-sidebar-expanded";
const VIEW_META={
  dashboard:{title:"Tổng hợp",description:"Tổng quan danh mục khách hàng và thẻ"},
  customers:{title:"Khách hàng",description:"Quản lý khách hàng và thẻ đang sở hữu"},
  cards:{title:"Thẻ",description:"Quản lý dòng thẻ dùng chung"},
  catalog:{title:"Danh mục",description:"Quản lý dữ liệu danh mục"},
  system:{title:"Hệ thống",description:"Nhập liệu, đồng bộ và sao lưu"},
  about:{title:"Giới thiệu",description:"Thông tin và hướng dẫn"}
};
const ICON_PATHS={
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  x:'<path d="m18 6-12 12M6 6l12 12"/>',
  "layout-dashboard":'<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
  "credit-card":'<rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  "table-properties":'<path d="M15 3v18M3 9h18M3 15h18"/><rect width="18" height="18" x="3" y="3" rx="2"/>',
  settings:'<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"/><circle cx="12" cy="12" r="3"/>',
  "circle-help":'<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 1 1 5.83 1c0 2-3 2-3 4M12 18h.01"/>'
};
function icon(name){return `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name]||ICON_PATHS["circle-help"]}</svg>`;}
let connectingDrive=false, authMessage="";
const normalize=value=>String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").toLowerCase();
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const bank=id=>state.banks.find(x=>x.id===id); const customer=id=>state.customers.find(x=>x.id===id); const product=id=>state.cardProducts.find(x=>x.id===id);
const linksForCustomer=id=>state.customerCards.filter(x=>x.customerId===id); const linksForProduct=id=>state.customerCards.filter(x=>x.cardProductId===id);
const sum=(items,fn)=>items.reduce((total,item)=>total+Number(fn(item)||0),0);
function save(message="Đã lưu thay đổi"){state=repo.save(state);repo.saveMeta({...repo.loadMeta(),status:auth.hasToken()?"dirty":"disconnected"});render();renderSyncStatus();toast(message);}
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
const DEFAULT_CARD_BRANDS=["American Express","JCB","Mastercard","Napas","Visa"];
const CARD_FORMS=["Phi vật lý","Vật lý"];
const cardBrandValues=()=>[...new Set([...DEFAULT_CARD_BRANDS,...state.cardProducts.flatMap(x=>[x.cardBrand,x.network]).filter(Boolean)])].sort(compareText);
const textValueOptions=(values,value,placeholder="-- Chọn --")=>`<option value="">${placeholder}</option>`+values.slice().sort(compareText).map(item=>`<option value="${esc(item)}" ${item===value?"selected":""}>${esc(item)}</option>`).join("");
const sortedCardProducts=()=>[...state.cardProducts].sort((a,b)=>compareCards(a,b,x=>bank(x.bankId)?.name||""));
const sortedCardProductsById=()=>[...state.cardProducts].sort((a,b)=>compareText(a.cardId,b.cardId));
const bankOptions=value=>`<option value="">-- Chọn --</option>`+sortByLabel(state.banks,x=>x.name).map(x=>`<option value="${esc(x.id)}" ${x.id===value?"selected":""}>${esc(`${x.code} — ${x.name}`)}</option>`).join("");
const customerOptions=value=>`<option value="">-- Chọn --</option>`+[...state.customers].sort(compareCustomers).map(x=>`<option value="${esc(x.id)}" ${x.id===value?"selected":""}>${esc(`${x.customerCode} — ${x.fullName}`)}</option>`).join("");
function customerCardProductOptions(value=""){
  return `<option value="">-- Chọn thẻ --</option>`+sortedCardProductsById().map(p=>`<option value="${esc(p.id)}" ${p.id===value?"selected":""}>${esc(p.cardId||"")}</option>`).join("");
}
function customerCreditLimitOptions(){
  const values=[...new Set(state.customerCards.map(x=>Number(x.creditLimit)||0).filter(x=>x>0))].sort((a,b)=>a-b);
  return values.map(value=>`<option value="${esc(formatMoney(value))}"></option>`).join("");
}
function sharedLimitChip(productId){
  const card=product(productId);return card?`<span class="shared-limit-chip" data-shared-chip="${esc(card.id)}"><span>${esc(card.cardId)}</span><button type="button" data-remove-shared-chip aria-label="Bỏ ${esc(card.cardId)}">×</button></span>`:"";
}
function sharedLimitControl(link={}){
  const selected=[...new Set(link.sharedLimitCardIds||[])].filter(id=>product(id)&&id!==link.cardProductId);
  return `<div class="shared-limit-tags" data-shared-limit>${selected.map(sharedLimitChip).join("")}<input type="text" data-shared-search autocomplete="off" placeholder="Không / Tìm CardID..." aria-label="Tìm CardID chung hạn mức"><div class="shared-limit-suggestions" data-shared-suggestions hidden></div></div>`;
}
function customerCardRow(link={}){
  const master=product(link.cardProductId);
  return `<div class="customer-card-row" data-link-id="${esc(link.id||"")}">
    <div class="customer-card-cell card-choice"><label>Thẻ</label><select data-card-product>${customerCardProductOptions(link.cardProductId||"")}</select></div>
    <div class="customer-card-cell form-cell"><label>Hình thức thẻ</label><input data-card-form type="text" value="${esc(master?.cardForm||link.cardForm||"Vật lý")}" readonly></div>
    <div class="customer-card-cell money-cell"><label>Hạn mức</label><input data-credit-limit type="text" inputmode="numeric" list="customerCreditLimitOptions" value="${esc(link.creditLimit!==undefined&&link.creditLimit!==""?formatVndInput(link.creditLimit):"")}" placeholder="0 đ"></div>
    <div class="customer-card-cell statement-cell"><label>Ngày sao kê</label><select data-statement-day>${dayOptions(link.statementDay)}</select></div>
    <div class="customer-card-cell payment-cell"><label>Hạn thanh toán</label><select data-payment-due-day>${dayOptions(link.paymentDueDay)}</select></div>
    <div class="customer-card-cell shared-cell"><label>Chung hạn mức</label>${sharedLimitControl(link)}</div>
    <button type="button" class="customer-card-remove" data-remove-customer-card aria-label="Xóa dòng thẻ" title="Xóa dòng thẻ">×</button>
  </div>`;
}
function customerCardsEditor(links=[]){
  const rows=links.length?links:[{}];
  return `<div class="customer-card-editor full">
    <div class="customer-card-title"><div><h3>Thẻ của khách hàng</h3><p>Gán nhiều thẻ và thiết lập hạn mức dùng chung.</p></div></div>
    <datalist id="customerCreditLimitOptions">${customerCreditLimitOptions()}</datalist>
    <div class="customer-card-rows">${rows.map(customerCardRow).join("")}</div>
    <div class="customer-card-add-line"><button type="button" class="customer-card-add" data-add-customer-card aria-label="Thêm một thẻ" title="Thêm một thẻ">+</button></div>
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
    const updatePlaceholder=()=>{input.placeholder=selectedIds().size?"Tìm thêm CardID...":"Không / Tìm CardID...";};
    const bindChip=chip=>{$("[data-remove-shared-chip]",chip).onclick=()=>{chip.remove();updatePlaceholder();renderSuggestions();input.focus();};};
    const addChip=id=>{if(!id||selectedIds().has(id)||id===$("[data-card-product]",row)?.value)return;const html=sharedLimitChip(id);if(!html)return;input.insertAdjacentHTML("beforebegin",html);bindChip(input.previousElementSibling);input.value="";updatePlaceholder();renderSuggestions();input.focus();};
    const removeChip=id=>{const chip=$$("[data-shared-chip]",control).find(item=>item.dataset.sharedChip===id);if(chip)chip.remove();updatePlaceholder();};
    const renderSuggestions=()=>{
      const query=normalize(input.value),current=$("[data-card-product]",row)?.value,selected=selectedIds();
      const matches=sortedCardProductsById().filter(card=>card.id!==current&&!selected.has(card.id)&&(!query||normalize(card.cardId).includes(query)));
      activeIndex=-1;suggestions.innerHTML=matches.map(card=>`<button type="button" data-shared-suggestion="${esc(card.id)}">${esc(card.cardId)}</button>`).join("");
      suggestions.hidden=!matches.length||document.activeElement!==input;
      $$('[data-shared-suggestion]',suggestions).forEach(button=>button.onclick=()=>addChip(button.dataset.sharedSuggestion));
    };
    $$("[data-shared-chip]",control).forEach(bindChip);
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
    const cardSelect=$("[data-card-product]",row);
    if(cardSelect)cardSelect.onchange=()=>{
      const master=product(cardSelect.value);
      $("[data-card-form]",row).value=master?.cardForm||"";
      $("[data-shared-limit]",row)?._remove?.(cardSelect.value);
      refreshChoices();
    };
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
  $("[data-add-customer-card]",root).onclick=()=>{
    rows.insertAdjacentHTML("beforeend",customerCardRow());
    const row=rows.lastElementChild;bindRow(row);
    $("[data-card-product]",row)?.focus();
    row.scrollIntoView({block:"nearest",behavior:"smooth"});
    refreshChoices();
  };
}
function entityTable(headers,rows,entity){return rows.length?`<div class="table-wrap"><table class="mobile" data-entity="${entity}"><thead><tr>${headers.map((h,i)=>`<th data-sort="${i}">${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`:`<div class="empty">Không có dữ liệu phù hợp.<br><button data-clear-filter>Xóa tìm kiếm và bộ lọc</button></div>`;}
function cell(label,value){return `<td data-label="${label}">${value}</td>`;}

function render(){renderDashboard();renderCustomers();renderCards();renderCatalog();renderSystem();renderAbout();bindTables();}
function renderDashboard(){
  const active=state.customerCards.filter(x=>x.status==="active"), totalLimit=sum(active,x=>x.creditLimit);
  const byBank=state.banks.map(b=>{const links=active.filter(l=>product(l.cardProductId)?.bankId===b.id);return {name:b.name,count:links.length,limit:sum(links,x=>x.creditLimit)}}).filter(x=>x.count).sort((a,b)=>b.limit-a.limit);
  const topProducts=state.cardProducts.map(p=>({name:`${bank(p.bankId)?.name||""} ${p.cardName}`,count:linksForProduct(p.id).length})).sort((a,b)=>b.count-a.count).slice(0,5);
  const topCustomers=state.customers.map(c=>{const links=linksForCustomer(c.id);return {id:c.id,name:c.fullName,count:links.length,limit:sum(links,x=>x.creditLimit)}}).sort((a,b)=>b.count-a.count||b.limit-a.limit).slice(0,5);
  const today=new Date().getDate(), upcoming=[0,3,7].map(range=>({range,items:active.filter(x=>[x.statementDay,x.paymentDueDay].some(day=>day&&((day-today+31)%31)<=range))}));
  $("#view-dashboard").innerHTML=`<div class="kpis"><div class="kpi blue"><small>Tổng khách hàng</small><strong>${state.customers.length}</strong></div><div class="kpi teal"><small>Tổng thẻ đang quản lý</small><strong>${active.length}</strong></div><div class="kpi amber"><small>Tổng hạn mức</small><strong>${formatMoney(totalLimit)}</strong></div><div class="kpi indigo"><small>Số dòng thẻ</small><strong>${state.cardProducts.length}</strong></div></div>
  <div class="grid-2"><div class="panel"><h2>Thống kê theo ngân hàng</h2>${simpleTable(["Ngân hàng","Số thẻ","Tổng hạn mức"],byBank.map(x=>[x.name,x.count,formatMoney(x.limit)]))}</div><div class="panel"><h2>Top dòng thẻ</h2>${simpleTable(["Dòng thẻ","Khách sở hữu"],topProducts.map(x=>[x.name,x.count]))}</div><div class="panel"><h2>Khách hàng có nhiều thẻ nhất</h2>${simpleTable(["Khách hàng","Số thẻ","Tổng hạn mức"],topCustomers.map(x=>[`<a href="#" data-open-customer="${x.id}">${esc(x.name)}</a>`,x.count,formatMoney(x.limit)]))}</div><div class="panel"><h2>Ngày sắp tới</h2><div class="upcoming">${upcoming.map((x,i)=>`<div><span>${i===0?"Hôm nay":`${x.range} ngày tới`}</span><strong>${x.items.length} thẻ</strong></div>`).join("")}</div></div></div>`;
  $$('[data-open-customer]').forEach(x=>x.onclick=e=>{e.preventDefault();openCustomerDetail(x.dataset.openCustomer);});
}
function simpleTable(headers,rows){return rows.length?`<div class="table-wrap"><table><thead><tr>${headers.map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(x=>`<td>${x}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`:`<div class="empty">Chưa có dữ liệu.</div>`;}

function renderCustomers(){
  const f=filters.customers||{}, q=normalize(f.q), bankFilter=f.bank||"", status=f.status||"", brand=f.brand||"";
  let items=state.customers.filter(c=>{const links=linksForCustomer(c.id),products=links.map(x=>product(x.cardProductId)).filter(Boolean);const hay=[c.customerCode,c.fullName,c.phone,c.email,...products.flatMap(p=>[p.cardId,p.cardName,p.cardBrand,p.network,p.cardForm,bank(p.bankId)?.name])].map(normalize).join(" ");return (!q||hay.includes(q))&&(!bankFilter||products.some(p=>p.bankId===bankFilter))&&(!status||links.some(x=>x.status===status))&&(!brand||products.some(p=>(p.cardBrand||p.network)===brand));});
  items.sort(compareCustomers);
  const rows=items.map(c=>{const links=linksForCustomer(c.id),products=links.map(x=>product(x.cardProductId)).filter(Boolean),banks=[...new Set(products.map(p=>bank(p.bankId)?.name).filter(Boolean))];return `<tr data-id="${c.id}">${cell("Mã KH",esc(c.customerCode))}${cell("Họ tên",`<strong>${esc(c.fullName)}</strong>`)}${cell("Số điện thoại",esc(c.phone||"—"))}${cell("Email",esc(c.email||"—"))}${cell("Số thẻ",links.length)}${cell("Tổng hạn mức",formatMoney(sum(links,x=>x.creditLimit)))}${cell("Ngân hàng",esc(banks.join(", ")||"—"))}${cell("Ghi chú",esc(c.notes||"—"))}</tr>`;});
  $("#view-customers").innerHTML=`<div class="panel"><div class="section-title"><h2>Khách hàng</h2></div><div class="toolbar"><input class="search" data-filter="customers.q" placeholder="Tìm Mã KH, tên, điện thoại, email, ngân hàng, tên thẻ, Card ID..." value="${esc(f.q||"")}">${filterSelect("customers.bank","Ngân hàng",state.banks,f.bank,x=>x.name)}${plainFilter("customers.status","Trạng thái",["active|Đang hoạt động","closed|Đã đóng","inactive|Ngừng hoạt động"],f.status)}${plainFilter("customers.brand","Loại thẻ",cardBrandValues().map(x=>`${x}|${x}`),f.brand)}<button class="primary" data-add="customer">Thêm</button><button data-edit-selected="customer">Tùy chỉnh</button><button class="danger" data-delete-selected="customer">Xóa</button></div>${entityTable(["Mã KH","Họ tên","Số điện thoại","Email","Số thẻ","Tổng hạn mức","Ngân hàng","Ghi chú"],rows,"customer")}</div>`;
}
function renderCards(){
  const f=filters.cards||{}, q=normalize(f.q);let items=state.cardProducts.filter(p=>{const links=linksForProduct(p.id),owners=links.map(x=>customer(x.customerId)).filter(Boolean);const hay=[p.cardId,bank(p.bankId)?.name,p.cardName,p.cardBrand,p.network,p.cardForm,...owners.map(x=>x.fullName)].map(normalize).join(" ");return (!q||hay.includes(q))&&(!f.bank||p.bankId===f.bank)&&(!f.status||p.status===f.status)&&(!f.brand||(p.cardBrand||p.network)===f.brand)&&(!f.form||p.cardForm===f.form);});
  items.sort((a,b)=>compareCards(a,b,x=>bank(x.bankId)?.name||""));
  const rows=items.map(p=>{const links=linksForProduct(p.id),total=sum(links,x=>x.creditLimit);return `<tr data-id="${p.id}">${cell("Card ID",esc(p.cardId))}${cell("Ngân hàng",esc(bank(p.bankId)?.name||"—"))}${cell("Tên thẻ",`<strong>${esc(p.cardName)}</strong>`)}${cell("Loại thẻ",esc(p.cardBrand||p.network||"—"))}${cell("Hình thức thẻ",esc(p.cardForm||"—"))}${cell("Số khách sở hữu",links.length)}${cell("Tổng hạn mức",formatMoney(total))}${cell("Hạn mức trung bình",formatMoney(links.length?total/links.length:0))}${cell("Ghi chú",esc(p.notes||"—"))}</tr>`;});
  $("#view-cards").innerHTML=`<div class="panel"><div class="section-title"><h2>Dòng thẻ</h2></div><div class="toolbar"><input class="search" data-filter="cards.q" placeholder="Tìm Card ID, ngân hàng, tên thẻ, loại thẻ, hình thức, khách sở hữu..." value="${esc(f.q||"")}">${filterSelect("cards.bank","Ngân hàng",state.banks,f.bank,x=>x.name)}${plainFilter("cards.status","Trạng thái",["active|Đang hoạt động","inactive|Ngừng hoạt động"],f.status)}${plainFilter("cards.brand","Loại thẻ",cardBrandValues().map(x=>`${x}|${x}`),f.brand)}${plainFilter("cards.form","Hình thức thẻ",CARD_FORMS.map(x=>`${x}|${x}`),f.form)}<button class="primary" data-add="product">Thêm</button><button data-edit-selected="product">Tùy chỉnh</button><button class="danger" data-delete-selected="product">Xóa</button></div>${entityTable(["Card ID","Ngân hàng","Tên thẻ","Loại thẻ","Hình thức thẻ","Số khách sở hữu","Tổng hạn mức","Hạn mức TB","Ghi chú"],rows,"product")}</div>`;
}
function filterSelect(path,label,items,value,toLabel){return `<select data-filter="${path}"><option value="">${label}: Tất cả</option>${sortByLabel(items,toLabel).map(x=>`<option value="${x.id}" ${x.id===value?"selected":""}>${esc(toLabel(x))}</option>`).join("")}</select>`;}
function plainFilter(path,label,items,value){return `<select data-filter="${path}"><option value="">${label}: Tất cả</option>${items.map(raw=>{const [v,l]=String(raw).split("|");return {v,l};}).sort((a,b)=>compareText(a.l,b.l)).map(({v,l})=>`<option value="${esc(v)}" ${v===value?"selected":""}>${esc(l)}</option>`).join("")}</select>`;}

function renderCatalog(){const rows=state.banks.slice().sort((a,b)=>a.name.localeCompare(b.name,"vi")).map(b=>`<tr data-id="${b.id}">${cell("Mã ngân hàng",esc(b.code))}${cell("Tên ngân hàng",esc(b.name))}</tr>`);$("#view-catalog").innerHTML=`<div class="panel"><h2>Danh mục ngân hàng</h2><div class="toolbar"><button class="primary" data-add="bank">Thêm</button><button data-edit-selected="bank">Tùy chỉnh</button><button class="danger" data-delete-selected="bank">Xóa</button></div>${entityTable(["Mã ngân hàng","Tên ngân hàng"],rows,"bank")}</div>`;}
function renderSystem(){$("#view-system").innerHTML=`<div class="grid-2"><div class="panel"><h2>Nhập dữ liệu Excel</h2><p>Dùng template 4 sheet để nhập Customer, Card Product và quan hệ sở hữu. Dòng lỗi không bị bỏ qua im lặng.</p><div class="actions"><button data-download-template>Tải template Excel</button><button class="primary" data-import-excel>Nhập Excel</button></div><div id="importResult"></div></div><div class="panel"><h2>Dữ liệu & sao lưu</h2><p>Namespace local: <code>cardflow-host-data-v1</code></p><p>File Drive: <code>cardflow-host-data.json</code></p><button data-export-json>Xuất bản sao JSON</button></div></div>`;}
function renderAbout(){$("#view-about").innerHTML=`<div class="panel"><h2>Giới thiệu QUẢN LÝ THẺ - HOST</h2><p>Ứng dụng độc lập quản lý khách hàng, dòng thẻ và quan hệ sở hữu. Không lưu số thẻ đầy đủ, CVV/CVC, OTP, PIN hoặc thông tin đăng nhập ngân hàng.</p><h3>Quy ước dữ liệu</h3><p>Tiền hiển thị theo định dạng Việt Nam; ngày theo DD-MM-YYYY; ngày sao kê và đến hạn là ngày trong tháng.</p><h3>Phiên bản</h3><p>Host Schema V2 — local-first, tự động đồng bộ Google Drive sau khi lưu.</p></div>`;}

function bindTables(){
  $$('[data-filter]').forEach(el=>el.oninput=()=>{const [group,key]=el.dataset.filter.split(".");filters[group]||={};filters[group][key]=el.value;group==="customers"?renderCustomers():renderCards();bindTables();});
  $$('[data-clear-filter]').forEach(el=>el.onclick=()=>{filters[currentView]={};render();});
  $$('tr[data-id]').forEach(row=>{row.onclick=()=>{const table=row.closest("table");$$('tr.selected',table).forEach(x=>x.classList.remove("selected"));row.classList.add("selected");if(innerWidth<768)row.classList.toggle("expanded");};row.ondblclick=()=>openDetail(row.closest("table").dataset.entity,row.dataset.id);row.oncontextmenu=e=>{e.preventDefault();openContext(e,row.closest("table").dataset.entity,row.dataset.id);};});
  $$('th[data-sort]').forEach(th=>th.onclick=()=>{const table=th.closest("table"),body=$("tbody",table),index=Number(th.dataset.sort),direction=th.dataset.direction==="asc"?"desc":"asc";$$('th[data-sort]',table).forEach(x=>{delete x.dataset.direction;});th.dataset.direction=direction;const rows=$$('tr',body).sort((a,b)=>{const left=$("td:nth-child("+(index+1)+")",a)?.innerText.trim()||"",right=$("td:nth-child("+(index+1)+")",b)?.innerText.trim()||"";const ln=Number(left.replace(/\D/g,"")),rn=Number(right.replace(/\D/g,"")),result=left&&right&&Number.isFinite(ln)&&Number.isFinite(rn)&&/\d/.test(left)&&/\d/.test(right)?ln-rn:left.localeCompare(right,"vi",{sensitivity:"base"});return direction==="asc"?result:-result;});rows.forEach(row=>body.append(row));});
  $$('[data-add]').forEach(x=>x.onclick=()=>openForm(x.dataset.add));$$('[data-edit-selected]').forEach(x=>x.onclick=()=>selectedAction(x.dataset.editSelected,"edit"));$$('[data-delete-selected]').forEach(x=>x.onclick=()=>selectedAction(x.dataset.deleteSelected,"delete"));
  $('[data-download-template]')?.addEventListener("click",downloadTemplate);$('[data-import-excel]')?.addEventListener("click",()=>$("#excelFile").click());$('[data-export-json]')?.addEventListener("click",exportJson);
}
function selectedAction(entity,action){const row=$(`table[data-entity="${entity}"] tr.selected`);if(!row)return toast("Hãy chọn một dòng trước");action==="edit"?openForm(entity,row.dataset.id):removeEntity(entity,row.dataset.id);}
function openDetail(entity,id){if(entity==="customer")openCustomerDetail(id);else if(entity==="product")openProductDetail(id);else openForm(entity,id);}
function openContext(event,entity,id){const menu=$("#contextMenu");let actions=entity==="customer"?[["Xem chi tiết",()=>openCustomerDetail(id)],["Tùy chỉnh",()=>openForm(entity,id)],["Thêm thẻ cho khách hàng",()=>openForm("link",null,{customerId:id})],["Sao chép",()=>copyCustomer(id)],["Xóa",()=>removeEntity(entity,id),"danger"]]:entity==="product"?[["Xem chi tiết",()=>openProductDetail(id)],["Danh sách khách sở hữu",()=>openProductDetail(id)],["Tùy chỉnh",()=>openForm(entity,id)],["Xóa",()=>removeEntity(entity,id),"danger"]]:[["Tùy chỉnh",()=>openForm(entity,id)],["Xóa",()=>removeEntity(entity,id),"danger"]];menu.innerHTML=actions.map((x,i)=>`<button data-i="${i}" class="${x[2]||""}">${x[0]}</button>`).join("");menu.hidden=false;menu.style.left=`${Math.min(event.clientX,innerWidth-235)}px`;menu.style.top=`${Math.min(event.clientY,innerHeight-actions.length*42-15)}px`;$$('button',menu).forEach((b,i)=>b.onclick=()=>{menu.hidden=true;actions[i][1]();});}

function openForm(entity,id=null,preset={}){const modal=$("#modal"),form=$("form",modal),body=$(".modal-body",modal);form.dataset.entity=entity;form.dataset.id=id||"";modal.classList.toggle("customer-editor-modal",entity==="customer");let item;
  if(entity==="customer"){item=state.customers.find(x=>x.id===id)||preset;const links=id?linksForCustomer(id):(Array.isArray(preset.customerCards)?preset.customerCards:[]);$("h2",modal).textContent=id?"Tùy chỉnh khách hàng":"Thêm khách hàng";body.innerHTML=field("fullName","Họ tên",item.fullName,"text",true)+field("phone","Số điện thoại",item.phone)+field("email","Email",item.email,"email")+field("dateOfBirth","Ngày sinh",item.dateOfBirth,"date")+noteField(item.notes)+customerCardsEditor(links);bindCustomerCardEditor(body);}
  if(entity==="product"){item=state.cardProducts.find(x=>x.id===id)||preset;$("h2",modal).textContent=id?"Tùy chỉnh dòng thẻ":"Thêm dòng thẻ";body.innerHTML=field("cardId","Card ID",item.cardId,"text",true)+selectField("bankId","Ngân hàng",bankOptions(item.bankId),true)+field("cardName","Tên thẻ",item.cardName,"text",true)+selectField("cardBrand","Loại thẻ",textValueOptions(cardBrandValues(),item.cardBrand||item.network||""),true)+selectField("cardForm","Hình thức thẻ",textValueOptions(CARD_FORMS,item.cardForm||"Vật lý"),true)+selectField("status","Trạng thái",statusOptions(item.status))+noteField(item.notes);}
  if(entity==="link"){item=state.customerCards.find(x=>x.id===id)||preset;$("h2",modal).textContent=id?"Tùy chỉnh thẻ khách hàng":"Thêm thẻ cho khách hàng";body.innerHTML=selectField("customerId","Khách hàng",customerOptions(item.customerId),true)+selectField("cardProductId","Dòng thẻ",customerCardProductOptions(item.cardProductId),true)+field("creditLimit","Hạn mức",formatVndInput(item.creditLimit||0),"text",true,"inputmode=numeric")+selectField("statementDay","Ngày sao kê",dayOptions(item.statementDay))+selectField("paymentDueDay","Ngày đến hạn",dayOptions(item.paymentDueDay))+field("openingDate","Ngày mở thẻ",item.openingDate,"date")+field("expiryDate","Ngày hết hạn",item.expiryDate,"date")+field("last4Digits","4 số cuối",item.last4Digits,"text",false,"inputmode=numeric maxlength=4 pattern=\\d{0,4}")+selectField("status","Trạng thái",statusOptions(item.status))+noteField(item.notes);bindVndInput($('[name="creditLimit"]',body));}
  if(entity==="bank"){item=state.banks.find(x=>x.id===id)||preset;$("h2",modal).textContent=id?"Tùy chỉnh ngân hàng":"Thêm ngân hàng";body.innerHTML=field("code","Mã ngân hàng",item.code,"text",true)+field("name","Tên ngân hàng",item.name,"text",true);}
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
      cardForm:$("[data-card-form]",row)?.value||"",
      creditLimitRaw:$("[data-credit-limit]",row)?.value?.trim()||"",
      statementDay:$("[data-statement-day]",row)?.value||"",
      paymentDueDay:$("[data-payment-due-day]",row)?.value||"",
      sharedLimitCardIds:$$('[data-shared-chip]',row).map(x=>x.dataset.sharedChip)
    }));
    const meaningful=cardRows.filter(row=>row.cardProductId||row.creditLimitRaw||row.statementDay||row.paymentDueDay);
    if(meaningful.some(row=>!row.cardProductId))return toast("Hãy chọn thẻ cho tất cả các dòng đã nhập");
    if(meaningful.some(row=>row.cardProductId&&!row.creditLimitRaw))return toast("Hãy nhập hạn mức cho tất cả thẻ đã chọn");
    const duplicateIds=meaningful.map(row=>row.cardProductId).filter((value,index,array)=>array.indexOf(value)!==index);
    if(duplicateIds.length)return toast("Một khách hàng không thể gán trùng cùng một dòng thẻ trong form này");
    const customerData={...(existing||{}),id:customerId,customerCode,fullName:String(data.fullName||"").trim(),phone:String(data.phone||"").trim(),email:String(data.email||"").trim(),dateOfBirth:toStorageDate(data.dateOfBirth),notes:String(data.notes||"").trim(),address:"",personInCharge:"",createdAt:existing?.createdAt||now,updatedAt:now};
    const customerIndex=state.customers.findIndex(x=>x.id===customerId);
    if(customerIndex>=0)state.customers[customerIndex]=customerData;else state.customers.push(customerData);
    const previousLinks=new Map(linksForCustomer(customerId).map(link=>[link.id,link]));
    const nextLinks=meaningful.map(row=>{
      const previous=previousLinks.get(row.linkId)||{};
      const master=product(row.cardProductId);
      return {...previous,id:previous.id||uuid(),customerId,cardProductId:row.cardProductId,cardBrand:previous.cardBrand||master?.cardBrand||master?.network||"",cardForm:master?.cardForm||row.cardForm||"Vật lý",creditLimit:parseMoney(row.creditLimitRaw),statementDay:row.statementDay?Number(row.statementDay):"",paymentDueDay:row.paymentDueDay?Number(row.paymentDueDay):"",sharedLimitCardIds:row.sharedLimitCardIds.filter(value=>value!==row.cardProductId),openingDate:previous.openingDate||"",expiryDate:previous.expiryDate||"",last4Digits:previous.last4Digits||"",status:previous.status||"active",notes:previous.notes||"",createdAt:previous.createdAt||now,updatedAt:now};
    });
    normalizeSharedLimitGroups(nextLinks);
    state.customerCards=state.customerCards.filter(x=>x.customerId!==customerId);
    state.customerCards.push(...nextLinks);
  }
  if(entity==="product"){if(state.cardProducts.some(x=>x.cardId.toLowerCase()===data.cardId.trim().toLowerCase()&&x.id!==id))return toast("Card ID đã tồn tại");upsert("cardProducts",id,{...data,cardId:data.cardId.trim(),cardName:data.cardName.trim(),cardBrand:data.cardBrand.trim(),cardForm:data.cardForm.trim(),updatedAt:now});}
  if(entity==="link"){const dayValue=n=>n===""?"":Number(n);if([data.statementDay,data.paymentDueDay].some(x=>x!==""&&(+x<1||+x>31)))return toast("Ngày sao kê/đến hạn phải từ 1 đến 31");upsert("customerCards",id,{...data,creditLimit:parseMoney(data.creditLimit),statementDay:dayValue(data.statementDay),paymentDueDay:dayValue(data.paymentDueDay),openingDate:toStorageDate(data.openingDate),expiryDate:toStorageDate(data.expiryDate),last4Digits:data.last4Digits.replace(/\D/g,"").slice(-4),updatedAt:now});}
  if(entity==="bank"){if(state.banks.some(x=>x.code.toLowerCase()===data.code.trim().toLowerCase()&&x.id!==id))return toast("Mã ngân hàng đã tồn tại");upsert("banks",id,{...data,code:data.code.trim().toUpperCase(),name:data.name.trim()});}
  closeModal();save();}
function upsert(collection,id,data){const index=state[collection].findIndex(x=>x.id===id);if(index>=0)state[collection][index]={...state[collection][index],...data};else state[collection].push({id:uuid(),createdAt:new Date().toISOString(),...data});}
function removeEntity(entity,id){let label,relations=0;if(entity==="customer"){label=customer(id)?.fullName;relations=linksForCustomer(id).length;}if(entity==="product"){label=product(id)?.cardName;relations=linksForProduct(id).length;}if(entity==="bank"){label=bank(id)?.name;relations=state.cardProducts.filter(x=>x.bankId===id).length;if(relations)return toast("Không thể xóa ngân hàng đang được dòng thẻ sử dụng");}if(!confirm(`Xóa “${label}”${relations?` và ${relations} quan hệ liên quan`:""}?`))return;if(entity==="customer"){state.customers=state.customers.filter(x=>x.id!==id);state.customerCards=state.customerCards.filter(x=>x.customerId!==id);}if(entity==="product"){state.cardProducts=state.cardProducts.filter(x=>x.id!==id);state.customerCards=state.customerCards.filter(x=>x.cardProductId!==id);}if(entity==="bank")state.banks=state.banks.filter(x=>x.id!==id);save("Đã xóa an toàn");}
function copyCustomer(id){const source=customer(id);if(!source)return;openForm("customer",null,{...source,customerCode:"",fullName:`${source.fullName} (Bản sao)`,customerCards:linksForCustomer(id).map(link=>({...link,id:""}))});}

function openCustomerDetail(id){const c=customer(id);if(!c)return;const links=linksForCustomer(id),banks=new Set(links.map(x=>product(x.cardProductId)?.bankId));const rows=links.map(l=>{const p=product(l.cardProductId);return `<tr data-product-link="${p?.id||""}">${cell("Card ID",esc(p?.cardId||"—"))}${cell("Ngân hàng",esc(bank(p?.bankId)?.name||"—"))}${cell("Tên thẻ",esc(p?.cardName||"—"))}${cell("Loại thẻ",esc(l.cardBrand||p?.cardBrand||p?.network||"—"))}${cell("Hình thức",esc(l.cardForm||p?.cardForm||"—"))}${cell("Hạn mức",formatMoney(l.creditLimit))}${cell("Ngày sao kê",formatDay(l.statementDay))}${cell("Ngày đến hạn",formatDay(l.paymentDueDay))}${cell("Chung hạn mức",l.sharedLimitCardIds?.length?`${l.sharedLimitCardIds.length} thẻ`:"Không")}${cell("Trạng thái",badge(l.status))}</tr>`;});openDetailModal(`Khách hàng: ${c.fullName}`,`<div class="detail-info">${info("Mã KH",c.customerCode)}${info("Họ tên",c.fullName)}${info("Số điện thoại",c.phone)}${info("Email",c.email)}${info("Ngày sinh",formatDate(c.dateOfBirth))}${info("Ghi chú",c.notes)}</div><div class="kpis" style="margin-top:14px"><div class="kpi blue"><small>Số thẻ</small><strong>${links.length}</strong></div><div class="kpi teal"><small>Tổng hạn mức</small><strong>${formatMoney(sum(links,x=>x.creditLimit))}</strong></div><div class="kpi amber"><small>Số ngân hàng</small><strong>${banks.size}</strong></div><div class="kpi red"><small>Không hoạt động</small><strong>${links.filter(x=>x.status!=="active").length}</strong></div></div><div class="panel" style="margin-top:14px"><div class="section-title"><h2>Danh sách thẻ đang sở hữu</h2><button class="primary" data-add-link>Thêm thẻ</button></div>${entityTable(["Card ID","Ngân hàng","Tên thẻ","Loại thẻ","Hình thức","Hạn mức","Sao kê","Đến hạn","Chung hạn mức","Trạng thái"],rows,"detail-links")}</div>`);$('[data-add-link]').onclick=()=>{closeDetail();openForm("link",null,{customerId:id});};$$('[data-product-link]').forEach(x=>x.onclick=()=>openProductDetail(x.dataset.productLink));}
function openProductDetail(id){const p=product(id);if(!p)return;const links=linksForProduct(id),total=sum(links,x=>x.creditLimit),rows=links.map(l=>{const c=customer(l.customerId);return `<tr data-customer-link="${c?.id||""}">${cell("Mã KH",esc(c?.customerCode||"—"))}${cell("Họ tên",esc(c?.fullName||"—"))}${cell("Số điện thoại",esc(c?.phone||"—"))}${cell("Hạn mức",formatMoney(l.creditLimit))}${cell("Ngày sao kê",formatDay(l.statementDay))}${cell("Ngày đến hạn",formatDay(l.paymentDueDay))}${cell("Trạng thái",badge(l.status))}</tr>`;});openDetailModal(`Dòng thẻ: ${p.cardName}`,`<div class="detail-info">${info("Card ID",p.cardId)}${info("Ngân hàng",bank(p.bankId)?.name)}${info("Tên thẻ",p.cardName)}${info("Loại thẻ",p.cardBrand||p.network)}${info("Hình thức thẻ",p.cardForm)}${info("Ghi chú",p.notes)}</div><div class="kpis" style="margin-top:14px"><div class="kpi blue"><small>Số khách sở hữu</small><strong>${links.length}</strong></div><div class="kpi teal"><small>Tổng hạn mức</small><strong>${formatMoney(total)}</strong></div><div class="kpi indigo"><small>Hạn mức trung bình</small><strong>${formatMoney(links.length?total/links.length:0)}</strong></div></div><div class="panel" style="margin-top:14px"><h2>Danh sách khách đang sở hữu</h2>${entityTable(["Mã KH","Họ tên","Số điện thoại","Hạn mức","Ngày sao kê","Ngày đến hạn","Trạng thái"],rows,"detail-owners")}</div>`);$$('[data-customer-link]').forEach(x=>x.onclick=()=>openCustomerDetail(x.dataset.customerLink));}
function info(label,value){return `<div><small>${label}</small><strong>${esc(value||"—")}</strong></div>`;}function openDetailModal(title,html){const modal=$("#detailModal");$("h2",modal).textContent=title;$(".detail-body",modal).innerHTML=html;modal.classList.add("show");}function closeDetail(){$("#detailModal").classList.remove("show");}function closeModal(){$("#modal").classList.remove("show");}

function downloadTemplate(){if(!window.XLSX)return toast("Chưa tải được thư viện Excel");const wb=XLSX.utils.book_new();const sheets={"01_KhachHang":[["MaKH","HoTen","SoDienThoai","Email","NgaySinh","GhiChu"]],"02_DongThe":[["CardID","NganHang","TenThe","LoaiThe","HinhThucThe","GhiChu"]],"03_TheKhachHang":[["MaKH","CardID","HanMuc","NgaySaoKe","NgayDenHan","NgayMoThe","NgayHetHan","BonSoCuoi","TrangThai","GhiChu"]],"04_HuongDan":[["HƯỚNG DẪN NHẬP DỮ LIỆU HOST"],["MaKH và CardID phải duy nhất."],["03_TheKhachHang chỉ tham chiếu MaKH và CardID đã có."],["Ngày dùng DD-MM-YYYY hoặc YYYY-MM-DD. Ngày sao kê/đến hạn từ 1 đến 31."],["Không nhập số thẻ đầy đủ, CVV/CVC, OTP hoặc PIN."]]};Object.entries(sheets).forEach(([name,data])=>XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(data),name));XLSX.writeFile(wb,"CardFlow_Host_Import_Template.xlsx");}
async function importExcel(file){if(!file||!window.XLSX)return;const wb=XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:true});const read=name=>XLSX.utils.sheet_to_json(wb.Sheets[name]||{}, {defval:"",raw:false});const customers=read("01_KhachHang"),products=read("02_DongThe"),links=read("03_TheKhachHang"),errors=[],newCustomers=[],newProducts=[],newLinks=[];const customerCodes=new Map(state.customers.map(x=>[normalize(x.customerCode),x])),cardIds=new Map(state.cardProducts.map(x=>[normalize(x.cardId),x]));
  customers.forEach((r,i)=>{const code=String(r.MaKH).trim();if(!code||!String(r.HoTen).trim())errors.push(`01_KhachHang dòng ${i+2}: thiếu MaKH hoặc HoTen`);else if(customerCodes.has(normalize(code)))errors.push(`01_KhachHang dòng ${i+2}: trùng MaKH ${code}`);else{const item={id:uuid(),customerCode:code,fullName:String(r.HoTen).trim(),phone:String(r.SoDienThoai),email:String(r.Email),dateOfBirth:toStorageDate(r.NgaySinh),address:String(r.DiaChi),personInCharge:String(r.NguoiPhuTrach),notes:String(r.GhiChu),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};if(r.NgaySinh&&!item.dateOfBirth)errors.push(`01_KhachHang dòng ${i+2}: NgaySinh không hợp lệ`);else{customerCodes.set(normalize(code),item);newCustomers.push(item);}}});
  products.forEach((r,i)=>{const cid=String(r.CardID).trim(),bankName=String(r.NganHang).trim();if(!cid||!bankName||!String(r.TenThe).trim())errors.push(`02_DongThe dòng ${i+2}: thiếu CardID, NganHang hoặc TenThe`);else if(cardIds.has(normalize(cid)))errors.push(`02_DongThe dòng ${i+2}: trùng CardID ${cid}`);else{let b=state.banks.find(x=>normalize(x.name)===normalize(bankName)||normalize(x.code)===normalize(bankName));if(!b){b={id:uuid(),code:normalize(bankName).replace(/[^a-z0-9]/g,"").toUpperCase().slice(0,12)||"BANK",name:bankName};state.banks.push(b);}const legacyType=normalize(r.LoaiThe),legacyCreditType=legacyType.includes("ghi")||legacyType==="debit"?"debit":"credit",cardBrand=String(r.MangThe||(!["credit","debit","tin dung","ghi no"].includes(legacyType)?r.LoaiThe:"")).trim();const item={id:uuid(),cardId:cid,bankId:b.id,cardName:String(r.TenThe).trim(),network:String(r.MangThe),cardType:legacyCreditType,cardBrand,cardForm:String(r.HinhThucThe||"Vật lý"),status:"active",notes:String(r.GhiChu),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};cardIds.set(normalize(cid),item);newProducts.push(item);}});
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
  try{
    await sync.connect();
    authMessage="";
    state=repo.load();
    render();setView("dashboard");renderSyncStatus();toast("Đã kết nối Google Drive");
  }catch(error){
    authMessage=connectionMessage(error);
    auth.disconnect();
    renderSyncStatus("error");toast(authMessage);
  }finally{
    connectingDrive=false;renderLoginGate();renderSyncStatus();
  }
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
$('form',$('#modal')).onsubmit=submitForm;
$$('[data-close]').forEach(x=>x.onclick=closeModal);
$('[data-close-detail]').onclick=closeDetail;
document.addEventListener('click',e=>{if(!e.target.closest('#contextMenu'))$('#contextMenu').hidden=true;});
document.addEventListener('keydown',e=>{if(e.key==='Escape')setSidebarOpen(false);});
$('#excelFile').onchange=e=>{importExcel(e.target.files[0]).catch(err=>toast(`Không thể đọc Excel: ${err.message}`));e.target.value='';};
$('#gateConnectDrive').onclick=()=>connectGoogleDriveFromUi();
$('#connectDrive').onclick=()=>connectGoogleDriveFromUi();
$('#syncDrive').onclick=()=>sync.syncNow().then(()=>{renderSyncStatus();toast('Đã đồng bộ');}).catch(e=>toast(`Đồng bộ lỗi: ${e.message}`));
$('#disconnectDrive').onclick=()=>{sync.disconnect();authMessage='';renderSyncStatus();renderLoginGate();toast('Đã ngắt kết nối Google Drive');};
$('[data-use-remote]').onclick=()=>{if(pendingRemote)sync.useRemote(pendingRemote);$('#conflict').hidden=true;renderSyncStatus();};
$('[data-keep-local]').onclick=()=>sync.syncNow({forceLocal:true}).then(()=>renderSyncStatus()).catch(e=>toast(e.message));
sync.addEventListener('status',e=>{
  renderSyncStatus(e.detail.status);
  if(e.detail.status==='conflict'){pendingRemote=e.detail.remote;$('#conflict').hidden=false;}
});

const savedSidebar=localStorage.getItem(SIDEBAR_STORAGE_KEY);
setSidebarExpanded(savedSidebar===null?true:savedSidebar==='true');
render();
setView('dashboard');
renderSyncStatus();
renderLoginGate();
watchGoogleSdkReadiness();
