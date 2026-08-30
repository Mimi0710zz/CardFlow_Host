import {canonicalize} from "./local-repository.js";
const isDrive404=error=>error?.status===404||error?.code==="drive-404"||error?.message==="drive-404";
export class SyncService extends EventTarget{
  constructor({localRepository,driveRepository,auth,getState,setState}){super();Object.assign(this,{localRepository,driveRepository,auth,getState,setState});}
  emit(status,detail={}){this.localRepository.saveMeta({...this.localRepository.loadMeta(),status});this.dispatchEvent(new CustomEvent("status",{detail:{status,...detail}}));}
  async connect(){await this.auth.connect();return this.syncNow();}
  disconnect(){this.auth.disconnect();this.localRepository.clearDriveLink();this.emit("disconnected");}
  async resolveDriveFile(local){
    let meta=this.localRepository.loadMeta();
    let fileId=meta.fileId||"";
    let remote=null;

    if(fileId){
      try{
        remote=canonicalize(await this.driveRepository.readFile(fileId));
      }catch(error){
        if(!isDrive404(error)) throw error;
        console.warn("[Host Google Drive] Cached fileId is missing or inaccessible; rediscovering Host data file.",fileId);
        fileId="";
        this.localRepository.saveMeta({...this.localRepository.loadMeta(),fileId:"",baseRevision:0,status:"dirty"});
      }
    }

    if(!fileId){
      const found=await this.driveRepository.findDataFile();
      if(found){
        fileId=found.id;
      }else{
        const created=await this.driveRepository.createFile({...local,revision:Number(local.revision)||0,updatedAt:new Date().toISOString()});
        fileId=created.id;
      }
      this.localRepository.saveMeta({...this.localRepository.loadMeta(),fileId});
    }

    if(!remote) remote=canonicalize(await this.driveRepository.readFile(fileId));
    return {fileId,remote};
  }
  async syncNow({forceLocal=false}={}){
    try{
      this.emit("syncing");
      let local=canonicalize(this.getState());
      const {fileId,remote}=await this.resolveDriveFile(local);
      const current=this.localRepository.loadMeta();
      if(current.dirty){
        if(!forceLocal&&remote.revision!==current.baseRevision){this.emit("conflict",{remote});return;}
        if(remote.revision>0)await this.driveRepository.createBackup(remote);
        const upload={...local,revision:remote.revision+1,updatedAt:new Date().toISOString()};
        await this.driveRepository.updateFile(fileId,upload);
        this.setState(upload);
        this.localRepository.save(upload,{dirty:false});
        this.localRepository.markClean(upload.revision);
      }else if(remote.revision>local.revision){
        this.setState(remote);
        this.localRepository.save(remote,{dirty:false});
        this.localRepository.markClean(remote.revision);
      }else this.localRepository.markClean(local.revision);
      this.localRepository.saveMeta({...this.localRepository.loadMeta(),fileId});
      this.emit("synced");
    }catch(error){this.emit("dirty",{error});throw error;}
  }
  useRemote(remote){this.setState(remote);this.localRepository.save(remote,{dirty:false});this.localRepository.markClean(remote.revision);this.emit("synced");}
}
