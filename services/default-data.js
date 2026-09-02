export function createEmptyData(deviceId=""){
  return {schemaVersion:3,revision:0,updatedAt:new Date().toISOString(),deviceId,banks:[],customers:[],cardProducts:[],customerCards:[],cashbackPrograms:[],mccCategories:[],orderTypes:[],sourceNames:[],transactions:[],settings:{}};
}
