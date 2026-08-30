import {canonicalize} from "./local-repository.js";
export class SyncService extends EventTarget{
  constructor({localRepository,driveRepository,auth,getState,setState}){super();Object.assign(this,{localRepository,driveRepository,auth,getState,setState});}
  emit(status,detail={}){this.localRepository.saveMeta({...this.localRepository.loadMeta(),status});this.dispatchEvent(new CustomEvent("status",{detail:{status,...detail}}));}
  async connect(){await this.auth.connect();return this.syncNow();} disconnect(){this.auth.disconnect();this.localRepository.clearDriveLink();this.emit("disconnected");}
  async syncNow({forceLocal=false}={}){try{this.emit("syncing");const meta=this.localRepository.loadMeta();let local=canonicalize(this.getState());let fileId=meta.fileId; if(!fileId){const found=await this.driveRepository.findDataFile();if(found)fileId=found.id;else{const made=await this.driveRepository.createFile(local);fileId=made.id;}this.localRepository.saveMeta({...this.localRepository.loadMeta(),fileId});}
    const remote=canonicalize(await this.driveRepository.readFile(fileId)); const current=this.localRepository.loadMeta();
    if(current.dirty){if(!forceLocal&&remote.revision!==current.baseRevision){this.emit("conflict",{remote});return;}if(remote.revision>0)await this.driveRepository.createBackup(remote);const upload={...local,revision:remote.revision+1,updatedAt:new Date().toISOString()};await this.driveRepository.updateFile(fileId,upload);this.setState(upload);this.localRepository.save(upload,{dirty:false});this.localRepository.markClean(upload.revision);}
    else if(remote.revision>local.revision){this.setState(remote);this.localRepository.save(remote,{dirty:false});this.localRepository.markClean(remote.revision);}else this.localRepository.markClean(local.revision);
    this.emit("synced");
  }catch(error){this.emit("dirty",{error});throw error;}}
  useRemote(remote){this.setState(remote);this.localRepository.save(remote,{dirty:false});this.localRepository.markClean(remote.revision);this.emit("synced");}
}
