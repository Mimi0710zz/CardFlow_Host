const text=value=>String(value??"").trim();
const key=value=>text(value).toLocaleLowerCase("vi");
const number=value=>{if(typeof value==="number")return Number.isFinite(value)?value:0;const raw=text(value).replace(/[^0-9,.-]/g,"").replace(/\./g,"").replace(",",".");const parsed=Number(raw);return Number.isFinite(parsed)?parsed:0;};
const split=value=>text(value).split(/[,;\n]/).map(item=>item.trim()).filter(Boolean);
const makeId=prefix=>globalThis.crypto?.randomUUID?.()||`${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const cycleLabel=value=>value==="statement"?"Theo sao kê":"Theo tháng";
const ownershipLabel=value=>value==="debit"?"Ghi nợ":"Tín dụng";

export const HOST_EXPORTABLE_SHEETS=Object.freeze([
  {key:"customers",label:"Khách hàng",sheetName:"Khách hàng"},
  {key:"cardProducts",label:"Thẻ ngân hàng",sheetName:"Thẻ ngân hàng"},
  {key:"customerCards",label:"Thẻ khách hàng",sheetName:"Thẻ khách hàng"},
  {key:"cashbackPrograms",label:"Chương trình Cashback",sheetName:"Chương trình Cashback"},
  {key:"transactions",label:"Giao dịch",sheetName:"Giao dịch"},
  {key:"mccCategories",label:"Bảng MCC",sheetName:"Bảng MCC"},
  {key:"orderTypes",label:"Loại đơn",sheetName:"Loại đơn"},
  {key:"sourceNames",label:"Tên nguồn",sheetName:"Tên nguồn"},
  {key:"banks",label:"Mã ngân hàng",sheetName:"Mã ngân hàng"}
]);

export const HOST_IMPORTABLE_SHEETS=HOST_EXPORTABLE_SHEETS.filter(item=>item.key!=="transactions");

function refs(state={}){
  const banks=new Map((state.banks||[]).map(x=>[x.id,x]));
  const customers=new Map((state.customers||[]).map(x=>[x.id,x]));
  const products=new Map((state.cardProducts||[]).map(x=>[x.id,x]));
  const links=new Map((state.customerCards||[]).map(x=>[x.id,x]));
  const mcc=new Map((state.mccCategories||[]).map(x=>[x.id,x]));
  return {banks,customers,products,links,mcc};
}

function programRows(state){
  const {products,mcc}=refs(state);
  const spendToMax=(rate,max)=>{const r=Number(rate)||0,m=Number(max)||0;return r>0&&m>0?Math.round(m/(r/100)):"";};
  const conditionRow=(program,condition,{packageId="",packageName="",groupId="",groupName="",index=0}={})=>{
    const product=products.get(program.cardProductId||program.bankCardProductId),all=condition.allMcc===true||condition.mccSelectionMode==="all",ids=all?[]:[...new Set(condition.mccCategoryIds||condition.mccIds||[])],selected=ids.map(id=>mcc.get(id)).filter(Boolean),unlimited=condition.maxCashbackUnlimited===true||condition.maxType==="UNLIMITED",max=unlimited?null:Number(condition.max??condition.maxCashback??condition.maxAmount)||0,rate=Number(condition.rate)||0,total=program.totalSpendMinimum??program.totalTarget??program.totalSpendCondition?.amount??"",eligible=condition.eligibleSpendMinimum??condition.eligibleTarget??condition.minSpend??"",method=(condition.channel??condition.transactionMethod??"")||"Tất cả",conditionId=condition.id||`${program.id||"PROGRAM"}-COND-${index+1}`,conditionName=condition.name||`Điều kiện ${index+1}`,mccNames=all?"Tất cả":selected.map(x=>x.name).join(", "),mccCodes=all?"Tất cả":[...new Set(selected.flatMap(x=>x.codes||[]))].join(", ");
    return {
      ProgramID:program.id||"",CardID:product?.cardId||"",ProgramName:program.name||"",ConditionMode:program.conditionMode||"independent",ProgramTotalSpendMinimum:total,PackageID:packageId,PackageName:packageName,GroupID:groupId,GroupName:groupName,ConditionID:conditionId,ConditionName:conditionName,MCC:mccNames,TransactionMethod:method,RatePercent:rate,MaxType:unlimited?"UNLIMITED":"LIMITED",MaxCashback:unlimited?"":max,SpendToMax:unlimited?"":spendToMax(rate,max),ConditionSpendMinimum:eligible,Note:condition.note||program.notes||"",Status:program.status||"active",
      "Program ID":program.id||"","Card ID":product?.cardId||"","Tên chương trình":program.name||"","Điều kiện kết hợp":program.combineOperator||"OR","Chi tiêu tổng":total,"Condition ID":conditionId,"Điều kiện":conditionName,"% Cashback":rate,"Max Cashback":unlimited?"Không giới hạn":max,"Chi để Max":eligible,"Hình thức giao dịch":method,"Nhóm MCC":mccNames,"Mã MCC":mccCodes,"Trạng thái":program.status==="inactive"?"Ngừng":"Hoạt động","Ghi chú":condition.note||program.notes||""
    };
  };
  return (state.cashbackPrograms||[]).flatMap(program=>{
    if(Array.isArray(program.packages)&&program.packages.length)return program.packages.flatMap(pkg=>(pkg.groups||[]).flatMap((group,gIndex)=>(group.conditions||[]).map((condition,index)=>conditionRow(program,condition,{packageId:pkg.id||"",packageName:pkg.name||"",groupId:group.id||`${program.id}-GROUP-${gIndex+1}`,groupName:group.name||"",index}))));
    const conditions=Array.isArray(program.conditions)&&program.conditions.length?program.conditions:[program];
    return conditions.map((condition,index)=>conditionRow(program,condition,{index}));
  });
}
export function exportHostSheetRows(state={},sheetKey){
  const {banks,customers,products,links,mcc}=refs(state);
  switch(sheetKey){
    case "customers": return (state.customers||[]).map(x=>({"Mã KH":x.customerCode||"","Họ tên":x.fullName||"","SĐT":x.phone||"","Email":x.email||"","Ngày sinh":x.dateOfBirth||"","Địa chỉ":x.address||"","Người phụ trách":x.personInCharge||"","Ghi chú":x.notes||""}));
    case "cardProducts": return (state.cardProducts||[]).map(x=>({"Card ID":x.cardId||"","Mã ngân hàng":banks.get(x.bankId)?.code||"","Tên thẻ":x.cardName||"","Hạng thẻ":x.cardRank||"","Loại thẻ":ownershipLabel(x.ownershipType),"Phôi":x.cardBrand||x.network||"","Hình thức thẻ":x.cardForm||"","Hình thức hoàn":cycleLabel(x.cashbackCycleMode),"Ngày sao kê mặc định":x.defaultStatementDay||"","Trạng thái":x.status||"active","Ghi chú":x.notes||""}));
    case "customerCards": return (state.customerCards||[]).map(x=>({"Mã KH":customers.get(x.customerId)?.customerCode||"","Card ID":products.get(x.cardProductId)?.cardId||"","Hạn mức":Number(x.creditLimit)||0,"Ngày sao kê":x.statementDay||"","Hạn thanh toán":x.paymentDueDay||"","Ngày mở thẻ":x.openingDate||"","Ngày hết hạn":x.expiryDate||"","4 số cuối":x.last4Digits||"","Trạng thái":x.status||"active","Ghi chú":x.notes||""}));
    case "cashbackPrograms": return programRows(state);
    case "transactions": return (state.transactions||[]).map(x=>({"Transaction ID":x.id||"","Ngày":x.date||"","Mã KH":customers.get(x.customerId)?.customerCode||"","Card ID":products.get(links.get(x.customerCardId)?.cardProductId)?.cardId||"","Loại đơn":x.orderTypeCode||"","Nhóm MCC":mcc.get(x.mccCategoryId)?.name||"","Mã MCC":x.mccCode||"","Tiền đơn":Number(x.amount)||0,"Hình thức giao dịch":x.transactionMethod||"","Tên nguồn":x.sourceName||"","Trạng thái nguồn":x.sourcePaymentStatus||"","Trạng thái KH":x.customerPaymentStatus||"","Lời":Number(x.profit)||0,"Ghi chú":x.notes||""}));
    case "mccCategories": return (state.mccCategories||[]).map(x=>({"Nhóm MCC":x.name||"","Mã MCC":(x.codes||[]).join(", "),"Mô tả":x.description||"","Ghi chú":x.notes||""}));
    case "orderTypes": return (state.orderTypes||[]).map(x=>({"Mã loại đơn":x.code||"","Màu":x.color||"","Mô tả":x.description||"","Ghi chú":x.note||""}));
    case "sourceNames": return (state.sourceNames||[]).map(x=>({"Tên nguồn":x.name||"","Mô tả":x.description||"","Ghi chú":x.note||""}));
    case "banks": return (state.banks||[]).map(x=>({"Mã ngân hàng":x.code||"","Tên ngân hàng":x.name||""}));
    default:return [];
  }
}

const sheetToCollection=new Map(HOST_IMPORTABLE_SHEETS.map(item=>[item.sheetName,item.key]));
const naturalKey={
  banks:item=>key(item.code),customers:item=>key(item.customerCode),cardProducts:item=>key(item.cardId),mccCategories:item=>key(item.name),orderTypes:item=>key(item.code),sourceNames:item=>key(item.name),cashbackPrograms:item=>text(item.id)||`${key(item.bankCardProductId)}|${key(item.name)}`,customerCards:item=>`${key(item.customerId)}|${key(item.cardProductId)}`
};

function parseRowsForCollection(collection,rows,state){
  const bankByCode=new Map((state.banks||[]).map(x=>[key(x.code),x])),customerByCode=new Map((state.customers||[]).map(x=>[key(x.customerCode),x])),productByCardId=new Map((state.cardProducts||[]).map(x=>[key(x.cardId),x])),mccByName=new Map((state.mccCategories||[]).map(x=>[key(x.name),x]));
  if(collection==="banks")return rows.map(r=>({code:text(r["Mã ngân hàng"]).toUpperCase(),name:text(r["Tên ngân hàng"])})).filter(x=>x.code);
  if(collection==="customers")return rows.map(r=>({customerCode:text(r["Mã KH"]),fullName:text(r["Họ tên"]),phone:text(r["SĐT"]),email:text(r["Email"]),dateOfBirth:text(r["Ngày sinh"]),address:text(r["Địa chỉ"]),personInCharge:text(r["Người phụ trách"]),notes:text(r["Ghi chú"])})).filter(x=>x.customerCode);
  if(collection==="cardProducts")return rows.map(r=>{const bank=bankByCode.get(key(r["Mã ngân hàng"]));return {cardId:text(r["Card ID"]),bankId:bank?.id||"",cardName:text(r["Tên thẻ"]),cardRank:text(r["Hạng thẻ"]),ownershipType:/ghi nợ|debit/i.test(text(r["Loại thẻ"]))?"debit":"credit",cardBrand:text(r["Phôi"]),cardForm:text(r["Hình thức thẻ"]),cashbackCycleMode:/sao kê/i.test(text(r["Hình thức hoàn"]))?"statement":"monthly",defaultStatementDay:number(r["Ngày sao kê mặc định"])||"",status:/ngừng|inactive/i.test(text(r["Trạng thái"]))?"inactive":"active",notes:text(r["Ghi chú"])};}).filter(x=>x.cardId);
  if(collection==="customerCards")return rows.map(r=>{const customer=customerByCode.get(key(r["Mã KH"])),product=productByCardId.get(key(r["Card ID"]));return {customerId:customer?.id||"",cardProductId:product?.id||"",creditLimit:number(r["Hạn mức"]),statementDay:number(r["Ngày sao kê"])||"",paymentDueDay:number(r["Hạn thanh toán"])||"",openingDate:text(r["Ngày mở thẻ"]),expiryDate:text(r["Ngày hết hạn"]),last4Digits:text(r["4 số cuối"]).replace(/\D/g,"").slice(-4),status:/ngừng|inactive/i.test(text(r["Trạng thái"]))?"inactive":"active",notes:text(r["Ghi chú"])};}).filter(x=>x.customerId&&x.cardProductId);
  if(collection==="mccCategories")return rows.map(r=>({name:text(r["Nhóm MCC"]),codes:split(r["Mã MCC"]),description:text(r["Mô tả"]),notes:text(r["Ghi chú"])})).filter(x=>x.name);
  if(collection==="orderTypes")return rows.map(r=>({code:text(r["Mã loại đơn"]).toUpperCase(),color:text(r["Màu"]),description:text(r["Mô tả"]),note:text(r["Ghi chú"])})).filter(x=>x.code);
  if(collection==="sourceNames")return rows.map(r=>({name:text(r["Tên nguồn"]),description:text(r["Mô tả"]),note:text(r["Ghi chú"])})).filter(x=>x.name);
  if(collection==="cashbackPrograms"){
    const programs=new Map();
    rows.forEach((r,rowIndex)=>{
      const cardId=text(r.CardID??r["Card ID"]),product=productByCardId.get(key(cardId)),name=text(r.ProgramName??r["Tên chương trình"]),programId=text(r.ProgramID??r["Program ID"])||makeId("cashback-program");
      if(!product||!name)return;
      const programKey=programId,conditionId=text(r.ConditionID??r["Condition ID"])||`${programId}-COND-${rowIndex+1}`,conditionName=text(r.ConditionName??r["Điều kiện"])||`Điều kiện ${rowIndex+1}`,mccRaw=text(r.MCC??r["Nhóm MCC"]),all=key(mccRaw)==="tất cả"||key(r["Mã MCC"])==="tất cả",ids=all?[]:split(mccRaw).map(groupName=>mccByName.get(key(groupName))?.id).filter(Boolean),maxType=text(r.MaxType),legacyMax=r["Max Cashback"],unlimited=maxType?maxType.toUpperCase()==="UNLIMITED":/không giới hạn/i.test(text(legacyMax)),maxRaw=r.MaxCashback??legacyMax,rate=number(r.RatePercent??r["% Cashback"]),eligibleCanonical=text(r.ConditionSpendMinimum)!==""?number(r.ConditionSpendMinimum):null,eligibleLegacy=text(r["Chi để Max"])!==""?number(r["Chi để Max"]):null,condition={id:conditionId,name:conditionName,allMcc:all,mccSelectionMode:all?"all":"selected",mccIds:ids,mccCategoryIds:ids,eligibleMccCategoryIds:ids,excludedMccCategoryIds:[],channel:/^tất cả$/i.test(text(r.TransactionMethod??r["Hình thức giao dịch"]))?"":text(r.TransactionMethod??r["Hình thức giao dịch"]),transactionMethod:/^tất cả$/i.test(text(r.TransactionMethod??r["Hình thức giao dịch"]))?"":text(r.TransactionMethod??r["Hình thức giao dịch"]),rate,maxType:unlimited?"UNLIMITED":"LIMITED",max:unlimited?null:number(maxRaw),maxAmount:unlimited?null:number(maxRaw),maxCashback:unlimited?null:number(maxRaw),maxCashbackUnlimited:unlimited,eligibleSpendMinimum:unlimited?null:(eligibleCanonical??eligibleLegacy),eligibleTarget:unlimited?null:(eligibleCanonical??eligibleLegacy),note:text(r.Note??r["Ghi chú"])};
      let program=programs.get(programKey);
      if(!program){const totalRaw=r.ProgramTotalSpendMinimum??r["Chi tiêu tổng"],total=text(totalRaw)===""?null:number(totalRaw);program={id:programId,cardProductId:product.id,bankCardProductId:product.id,name,combineOperator:/^or$/i.test(text(r["Điều kiện kết hợp"]))?"OR":"AND",conditionMode:text(r.ConditionMode)||(/^and$/i.test(text(r["Điều kiện kết hợp"]))?"all_required":"independent"),totalSpendMinimum:total,totalSpendCondition:{enabled:total!=null,amount:total},totalTarget:total,conditions:[],packages:[],status:/ngừng|inactive/i.test(text(r.Status??r["Trạng thái"]))?"inactive":"active",notes:""};programs.set(programKey,program);}
      const packageId=text(r.PackageID),packageName=text(r.PackageName),groupId=text(r.GroupID),groupName=text(r.GroupName);
      if(packageId){let pkg=program.packages.find(item=>item.id===packageId);if(!pkg){pkg={id:packageId,name:packageName||packageId,groups:[]};program.packages.push(pkg);}const gid=groupId||`${programId}-GROUP-${conditionId}`;let group=pkg.groups.find(item=>item.id===gid);if(!group){group={id:gid,name:groupName||conditionName,conditionCombination:"OR",totalSpendMinimum:null,note:"",conditions:[]};pkg.groups.push(group);}group.conditions.push(condition);}else program.conditions.push(condition);
    });
    return [...programs.values()];
  }
  return [];
}

function mergeCollection(existing,incoming,collection,mode){
  const keyFn=naturalKey[collection],current=[...(existing||[])],byKey=new Map(current.map((item,index)=>[keyFn(item),{item,index}])),seen=new Set();let added=0,updated=0;
  for(const raw of incoming){const k=keyFn(raw);if(!k)continue;seen.add(k);const hit=byKey.get(k);if(hit){current[hit.index]={...hit.item,...raw,id:hit.item.id||raw.id||makeId(collection),updatedAt:new Date().toISOString()};updated+=1;}else if(mode!=="update"){current.push({...raw,id:raw.id||makeId(collection),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});added+=1;}}
  let deleted=0,next=current;
  if(mode==="master"){next=current.filter(item=>{const keep=seen.has(keyFn(item));if(!keep)deleted+=1;return keep;});}
  return {next,added,updated,deleted};
}

function importPass(state,workbookRows,mode,apply){
  let working={...state},added=0,updated=0,deleted=0;
  const ordered=["Mã ngân hàng","Khách hàng","Thẻ ngân hàng","Bảng MCC","Loại đơn","Tên nguồn","Chương trình Cashback","Thẻ khách hàng"];
  for(const sheetName of ordered){if(!Object.hasOwn(workbookRows||{},sheetName))continue;const collection=sheetToCollection.get(sheetName);if(!collection)continue;const parsed=parseRowsForCollection(collection,workbookRows[sheetName]||[],working),result=mergeCollection(working[collection],parsed,collection,mode);added+=result.added;updated+=result.updated;deleted+=result.deleted;if(apply)working={...working,[collection]:result.next};else working={...working,[collection]:result.next};}
  return {state:working,added,updated,deleted};
}

export function previewHostImport(state,workbookRows,mode="upsert"){const result=importPass(state,workbookRows,mode,false);return {added:result.added,updated:result.updated,deleted:result.deleted};}
export function applyHostImportRows(state,workbookRows,mode="upsert"){return importPass(state,workbookRows,mode,true).state;}
