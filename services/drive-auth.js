const SCOPE="https://www.googleapis.com/auth/drive.file";
export class DriveAuth{
  constructor(config){this.clientId=config?.googleClientId||"";this.accessToken="";this.tokenClient=null;}
  isConfigured(){return Boolean(this.clientId&&!this.clientId.startsWith("YOUR_"));} hasToken(){return Boolean(this.accessToken);}
  async connect(){
    if(!this.isConfigured()) throw new Error("missing-client-id"); if(!window.google?.accounts?.oauth2) throw new Error("gis-not-loaded");
    this.tokenClient ||= google.accounts.oauth2.initTokenClient({client_id:this.clientId,scope:SCOPE,callback:()=>{}});
    return new Promise((resolve,reject)=>{this.tokenClient.callback=r=>r.error?reject(new Error(r.error)):(this.accessToken=r.access_token,resolve(r.access_token));this.tokenClient.error_callback=e=>reject(new Error(e?.type||"auth-error"));this.tokenClient.requestAccessToken({});});
  }
  disconnect(){if(this.accessToken&&window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(this.accessToken,()=>{});this.accessToken="";}
}
