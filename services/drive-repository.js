const API="https://www.googleapis.com/drive/v3/files", UPLOAD="https://www.googleapis.com/upload/drive/v3/files", FILE="cardflow-host-data.json";
function body(name,payload){const boundary="hostflow_boundary";return {type:`multipart/related; boundary=${boundary}`,value:[`--${boundary}`,"Content-Type: application/json; charset=UTF-8","",JSON.stringify({name,mimeType:"application/json"}),`--${boundary}`,"Content-Type: application/json; charset=UTF-8","",JSON.stringify(payload,null,2),`--${boundary}--`].join("\r\n")};}
export class DriveRepository{
  constructor(auth){this.auth=auth;} async request(url,options={}){if(!this.auth.hasToken())throw new Error("not-authenticated");const r=await fetch(url,{...options,headers:{Authorization:`Bearer ${this.auth.accessToken}`,...options.headers}});if(!r.ok)throw new Error(`drive-${r.status}`);return r.status===204?null:r.json();}
  async findDataFile(){const q=new URLSearchParams({q:`name='${FILE}' and trashed=false`,spaces:"drive",fields:"files(id,name,modifiedTime)"});return (await this.request(`${API}?${q}`)).files?.[0]||null;}
  readFile(id){return this.request(`${API}/${id}?alt=media`);} async createFile(payload){const p=body(FILE,payload);return this.request(`${UPLOAD}?uploadType=multipart&fields=id,name`,{method:"POST",headers:{"Content-Type":p.type},body:p.value});}
  async updateFile(id,payload){const p=body(FILE,payload);return this.request(`${UPLOAD}/${id}?uploadType=multipart&fields=id,name`,{method:"PATCH",headers:{"Content-Type":p.type},body:p.value});}
  async createBackup(payload){const p=body(`cardflow-host-backup-${new Date().toISOString().slice(0,10)}.json`,payload);return this.request(`${UPLOAD}?uploadType=multipart&fields=id,name`,{method:"POST",headers:{"Content-Type":p.type},body:p.value});}
}
