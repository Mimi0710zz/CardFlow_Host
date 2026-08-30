import {parseMoney} from "./money.js";

const clean=value=>String(value??"").trim();
const isNone=value=>["","không","khong"].includes(clean(value).toLocaleLowerCase("vi"));

export function calculateEffectiveCreditLimit(customerCards=[],cardProducts=[]){
  const productsById=new Map(cardProducts.map(card=>[clean(card.id),card]));
  const productsByCardId=new Map(cardProducts.map(card=>[clean(card.cardId).toLocaleLowerCase("vi"),card]));
  const nodes=(Array.isArray(customerCards)?customerCards:[]).filter(link=>link&&productsById.has(clean(link.cardProductId))).map((link,index)=>({key:`${clean(link.customerId)}\u0000${clean(link.cardProductId)}`,link,index}));
  const nodeByKey=new Map(nodes.map(node=>[node.key,node])),parent=new Map(nodes.map(node=>[node.key,node.key]));
  const find=key=>{if(!parent.has(key))return null;const value=parent.get(key);if(value!==key)parent.set(key,find(value));return parent.get(key);};
  const join=(left,right)=>{const a=find(left),b=find(right);if(a&&b&&a!==b)parent.set(b,a);};
  const resolveProductId=value=>{if(isNone(value))return "";const raw=clean(value);return productsById.has(raw)?raw:productsByCardId.get(raw.toLocaleLowerCase("vi"))?.id||"";};

  nodes.forEach(node=>{
    const refs=Array.isArray(node.link.sharedLimitCardIds)?node.link.sharedLimitCardIds:[node.link.sharedLimitCardIds??node.link.sharedLimitCardId];
    new Set(refs.map(resolveProductId).filter(Boolean)).forEach(productId=>{
      if(productId!==node.link.cardProductId)join(node.key,`${clean(node.link.customerId)}\u0000${productId}`);
    });
  });

  const components=new Map();
  nodes.forEach(node=>{const root=find(node.key);if(!components.has(root))components.set(root,[]);components.get(root).push(node);});
  const groups=[...components.values()].map(members=>{
    members.sort((a,b)=>{
      const left=productsById.get(a.link.cardProductId)?.cardId||a.link.cardProductId,right=productsById.get(b.link.cardProductId)?.cardId||b.link.cardProductId;
      return clean(a.link.customerId).localeCompare(clean(b.link.customerId),"vi")||clean(left).localeCompare(clean(right),"vi",{sensitivity:"base",numeric:true});
    });
    const limits=[...new Set(members.map(node=>parseMoney(node.link.creditLimit)))],consistent=limits.length<=1;
    return {members:members.map(node=>node.link),limits,consistent,contribution:consistent?(limits[0]||0):0};
  }).sort((a,b)=>clean(a.members[0]?.customerId).localeCompare(clean(b.members[0]?.customerId),"vi")||clean(a.members[0]?.cardProductId).localeCompare(clean(b.members[0]?.cardProductId),"vi"));
  const inconsistencies=groups.filter(group=>!group.consistent);
  return {total:groups.reduce((total,group)=>total+group.contribution,0),groups,inconsistencies};
}
