const PREF_KEY="cardflow-host-table-column-widths-v1";
const MIN_WIDTH=56;
const EDGE_WIDTH=10;

const read=()=>{try{return JSON.parse(localStorage.getItem(PREF_KEY)||"{}");}catch{return {};}};
const write=value=>{try{localStorage.setItem(PREF_KEY,JSON.stringify(value));}catch{}};
const tableKey=(table,index)=>`${table.closest(".view")?.id||"global"}:${table.dataset.entity||table.dataset.featureTable||table.className||"table"}:${index}`;
const columnKey=(th,index)=>th.dataset.columnKey||th.textContent.trim();
const legacyColumnKey=(th,index)=>`${index}:${th.textContent.trim()}`;
const suppressHeaderClick=()=>{window.__tableResizeSuppressClickUntil=Date.now()+800;};

const ensureColgroup=(table,count)=>{
  let colgroup=[...table.children].find(node=>node.tagName==="COLGROUP");
  if(!colgroup){
    colgroup=document.createElement("colgroup");
    table.insertBefore(colgroup,table.firstElementChild);
  }
  while(colgroup.children.length<count)colgroup.append(document.createElement("col"));
  return [...colgroup.children].slice(0,count);
};

const apply=(table,th,index,width)=>{
  const value=Math.max(MIN_WIDTH,Math.round(width));
  const col=ensureColgroup(table,table.querySelectorAll("thead th").length)[index];
  table.style.tableLayout="fixed";
  table.style.width="max-content";
  table.style.minWidth="max-content";
  col.style.width=`${value}px`;
  col.style.minWidth=`${value}px`;
  th.style.width=`${value}px`;
  th.style.minWidth=`${value}px`;
};

function beginResize({event,table,th,index,stableKey,saved,key}){
  event.preventDefault();
  event.stopPropagation();
  suppressHeaderClick();
  const startX=event.clientX,startWidth=th.getBoundingClientRect().width;
  document.body.classList.add("table-resizing");
  const move=e=>apply(table,th,index,startWidth+e.clientX-startX);
  const end=()=>{
    suppressHeaderClick();
    document.body.classList.remove("table-resizing");
    saved[key]||=(saved[key]={});
    saved[key][stableKey]=Math.round(th.getBoundingClientRect().width);
    write(saved);
    window.removeEventListener("pointermove",move);
  };
  window.addEventListener("pointermove",move);
  window.addEventListener("pointerup",end,{once:true});
}

function edgeResizeTarget(event,headers,index){
  const rect=headers[index].getBoundingClientRect();
  if(event.clientX-rect.left<=EDGE_WIDTH&&index>0)return index-1;
  if(rect.right-event.clientX<=EDGE_WIDTH)return index;
  return -1;
}

export function attachResizableTables(root=document){
  if(window.matchMedia?.("(max-width:767px)").matches)return;
  const saved=read();
  root.querySelectorAll("table").forEach((table,tableIndex)=>{
    if(table.dataset.noResize!==undefined||table.closest(".matrix-stacked")||table.classList.contains("matrix-table"))return;
    const headers=[...table.querySelectorAll("thead th")];
    if(!headers.length)return;
    const key=tableKey(table,tableIndex);
    headers.forEach((th,index)=>{
      const stableKey=columnKey(th,index),stored=saved[key]?.[stableKey]||saved[key]?.[legacyColumnKey(th,index)];
      if(stored)apply(table,th,index,stored);
      if(!th.dataset.tableResizeEdgeBound){
        th.dataset.tableResizeEdgeBound="true";
        th.addEventListener("pointerdown",event=>{
          if(event.target.closest("[data-table-resize-handle]"))return;
          const targetIndex=edgeResizeTarget(event,headers,index);
          if(targetIndex<0)return;
          const targetTh=headers[targetIndex],targetStableKey=columnKey(targetTh,targetIndex);
          beginResize({event,table,th:targetTh,index:targetIndex,stableKey:targetStableKey,saved,key});
        });
      }
      if(th.querySelector("[data-table-resize-handle]"))return;
      const handle=document.createElement("span");
      handle.className="table-resize-handle";
      handle.dataset.tableResizeHandle="";
      handle.setAttribute("aria-label",`Kéo để đổi độ rộng ${th.textContent.trim()}`);
      th.append(handle);
      handle.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();suppressHeaderClick();});
      handle.addEventListener("pointerdown",event=>beginResize({event,table,th,index,stableKey,saved,key}));
    });
  });
}
