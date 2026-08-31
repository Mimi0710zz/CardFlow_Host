const SCOPE="https://www.googleapis.com/auth/drive.file";
export class DriveAuth{
  constructor(config){this.clientId=config?.googleClientId||"";this.accessToken="";this.tokenClient=null;}
  isConfigured(){return Boolean(this.clientId&&!this.clientId.startsWith("YOUR_"));} hasToken(){return Boolean(this.accessToken);} isReady(){return this.isConfigured()&&Boolean(window.google?.accounts?.oauth2);}
  async connect(){
    if(!this.isConfigured()) throw new Error("missing-client-id"); if(!window.google?.accounts?.oauth2) throw new Error("gis-not-loaded");
    return new Promise((resolve,reject)=>{
      let settled=false;
      const fail=code=>{if(settled)return;settled=true;this.tokenClient=null;reject(new Error(code||"auth-error"));};
      const succeed=response=>{if(settled)return;if(response?.error||!response?.access_token)return fail(response?.error||"missing-access-token");settled=true;this.accessToken=response.access_token;resolve(response.access_token);};
      try{
        this.tokenClient=window.google.accounts.oauth2.initTokenClient({client_id:this.clientId,scope:SCOPE,callback:succeed,error_callback:error=>fail(error?.type)});
        this.tokenClient.requestAccessToken();
      }catch(error){fail(error?.message);}
    });
  }
  disconnect(){if(this.accessToken&&window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(this.accessToken,()=>{});this.accessToken="";this.tokenClient=null;}
}
