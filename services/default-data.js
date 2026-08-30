export const DEFAULT_BANKS = [
  {id:"BANK-TECHCOMBANK",code:"TCB",name:"Techcombank"},
  {id:"BANK-SACOMBANK",code:"SACOM",name:"Sacombank"},
  {id:"BANK-CAKE",code:"CAKE",name:"Cake by VPBank"}
];
export function createEmptyData(deviceId=""){
  return {schemaVersion:1,revision:0,updatedAt:new Date().toISOString(),deviceId,banks:structuredClone(DEFAULT_BANKS),customers:[],cardProducts:[],customerCards:[],settings:{}};
}
