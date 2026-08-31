import {canonicalize} from "./local-repository.js?v=20260901-priority-root-fix-v3";

const isDrive404 = error => error?.status === 404 || error?.code === "drive-404" || error?.message === "drive-404";

export class SyncService extends EventTarget {
  constructor({localRepository, driveRepository, auth, getState, setState}){
    super();
    Object.assign(this, {localRepository, driveRepository, auth, getState, setState});
    this.autoSyncDelay=650;
    this.autoSyncTimer=null;
    this.syncPromise=null;
    this.pendingSync=false;
    this.pendingOptions={};
    this.mutationVersion=0;
    this.localRepository.addEventListener("mutation",()=>{
      this.mutationVersion+=1;
      if(this.syncPromise)this.pendingSync=true;
      else this.scheduleAutoSync();
    });
  }

  scheduleAutoSync(){
    if(!this.auth.hasToken())return;
    clearTimeout(this.autoSyncTimer);
    this.autoSyncTimer=setTimeout(()=>this.syncNow().catch(()=>{}),this.autoSyncDelay);
  }

  emit(status, detail = {}){
    this.localRepository.saveMeta({...this.localRepository.loadMeta(), status});
    this.dispatchEvent(new CustomEvent("status", {detail:{status, ...detail}}));
  }

  async connect(){
    await this.auth.connect();
    return this.syncNow();
  }

  disconnect(){
    this.auth.disconnect();
    this.localRepository.clearDriveLink();
    this.emit("disconnected");
  }

  clearCachedFileId(){
    const meta = this.localRepository.loadMeta();
    this.localRepository.saveMeta({...meta, fileId:"", baseRevision:0, status:"dirty"});
  }

  async resolveExistingDriveFile(){
    const meta = this.localRepository.loadMeta();

    // 1) Try the cached file id first.
    if(meta.fileId){
      try{
        const remote = canonicalize(await this.driveRepository.readFile(meta.fileId));
        return {fileId:meta.fileId, remote, created:false};
      }catch(error){
        if(!isDrive404(error)) throw error;
        console.warn("[Host Google Drive] Cached fileId is stale; clearing it.", meta.fileId);
        this.clearCachedFileId();
      }
    }

    // 2) Search every matching Host data file. If one result has become stale,
    // skip it instead of failing the whole connection.
    const candidates = await this.driveRepository.findDataFiles();
    for(const file of candidates){
      if(!file?.id) continue;
      try{
        const remote = canonicalize(await this.driveRepository.readFile(file.id));
        this.localRepository.saveMeta({...this.localRepository.loadMeta(), fileId:file.id});
        return {fileId:file.id, remote, created:false};
      }catch(error){
        if(!isDrive404(error)) throw error;
        console.warn("[Host Google Drive] Search returned an unreadable/stale file; skipping it.", file.id);
      }
    }

    return null;
  }

  async createDriveFileFromLocal(local){
    const meta = this.localRepository.loadMeta();
    const nextRevision = meta.dirty
      ? Math.max(Number(local.revision)||0, Number(meta.baseRevision)||0) + 1
      : Number(local.revision)||0;
    const payload = canonicalize({...local, revision:nextRevision, updatedAt:new Date().toISOString()});
    const created = await this.driveRepository.createFile(payload);
    if(!created?.id){
      const error = new Error("drive-create-missing-id");
      error.code = "drive-create-missing-id";
      error.operation = "createFile";
      throw error;
    }
    this.localRepository.saveMeta({...this.localRepository.loadMeta(), fileId:created.id});
    return {fileId:created.id, remote:payload, created:true};
  }

  async resolveDriveFile(local){
    const existing = await this.resolveExistingDriveFile();
    if(existing) return existing;
    return this.createDriveFileFromLocal(local);
  }

  syncNow(options = {}){
    clearTimeout(this.autoSyncTimer);
    this.autoSyncTimer=null;
    if(this.syncPromise){
      this.pendingSync=true;
      this.pendingOptions={...this.pendingOptions,...options};
      return this.syncPromise;
    }
    this.syncPromise=this.runSyncQueue(options).finally(()=>{this.syncPromise=null;});
    return this.syncPromise;
  }

  async runSyncQueue(options){
    let nextOptions=options;
    do{
      this.pendingSync=false;
      this.pendingOptions={};
      await this.performSync(nextOptions);
      nextOptions=this.pendingOptions;
    }while(this.pendingSync);
  }

  async performSync({forceLocal=false} = {}){
    const startMutationVersion=this.mutationVersion;
    try{
      this.emit("syncing");
      let local = canonicalize(this.getState());
      const resolved = await this.resolveDriveFile(local);
      const {fileId, remote, created} = resolved;

      // A brand-new Drive file already contains the full local payload. Do not
      // immediately GET/PATCH the file again. This also avoids a needless
      // second request during the first connection.
      if(created){
        if(this.mutationVersion===startMutationVersion){
          this.setState(remote);
          this.localRepository.save(remote, {dirty:false});
          this.localRepository.markClean(remote.revision);
        }else{
          const latest=canonicalize({...this.getState(),revision:remote.revision});
          this.setState(latest);
          this.localRepository.save(latest,{dirty:true,notify:false});
          this.localRepository.saveMeta({...this.localRepository.loadMeta(),baseRevision:remote.revision,status:"dirty"});
          this.pendingSync=true;
        }
        this.localRepository.saveMeta({...this.localRepository.loadMeta(), fileId});
        this.emit(this.pendingSync?"dirty":"synced");
        return;
      }

      const current = this.localRepository.loadMeta();
      if(current.dirty){
        if(!forceLocal && remote.revision !== current.baseRevision){
          this.emit("conflict", {remote});
          return;
        }
        if(remote.revision > 0) await this.driveRepository.createBackup(remote);
        const upload = canonicalize({...local, revision:remote.revision + 1, updatedAt:new Date().toISOString()});
        await this.driveRepository.updateFile(fileId, upload);
        if(this.mutationVersion===startMutationVersion){
          this.setState(upload);
          this.localRepository.save(upload, {dirty:false});
          this.localRepository.markClean(upload.revision);
        }else{
          const latest=canonicalize({...this.getState(),revision:upload.revision});
          this.setState(latest);
          this.localRepository.save(latest,{dirty:true,notify:false});
          this.localRepository.saveMeta({...this.localRepository.loadMeta(),baseRevision:upload.revision,status:"dirty"});
          this.pendingSync=true;
        }
      }else if(remote.revision > local.revision){
        this.setState(remote);
        this.localRepository.save(remote, {dirty:false});
        this.localRepository.markClean(remote.revision);
      }else{
        this.localRepository.markClean(local.revision);
      }

      this.localRepository.saveMeta({...this.localRepository.loadMeta(), fileId});
      this.emit(this.pendingSync?"dirty":"synced");
    }catch(error){
      console.error("[Host Google Drive Sync]", {
        operation:error?.operation,
        name:error?.name,
        message:error?.message,
        code:error?.code,
        status:error?.status,
        requestUrl:error?.requestUrl,
        body:error?.body
      });
      this.emit("error", {error});
      throw error;
    }
  }

  useRemote(remote){
    this.setState(remote);
    this.localRepository.save(remote, {dirty:false});
    this.localRepository.markClean(remote.revision);
    this.emit("synced");
  }
}
