const DRIVE_API = "https://www.googleapis.com/drive/v3/files";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3/files";
const FILE_NAME = "cardflow-host-data.json";

function multipartBody(metadata, payload){
  const boundary = "cardflow_host_boundary";
  return {
    contentType: `multipart/related; boundary=${boundary}`,
    body: [
      `--${boundary}`,
      "Content-Type: application/json; charset=UTF-8",
      "",
      JSON.stringify(metadata),
      `--${boundary}`,
      "Content-Type: application/json; charset=UTF-8",
      "",
      JSON.stringify(payload, null, 2),
      `--${boundary}--`
    ].join("\r\n")
  };
}

export class DriveRepository {
  constructor(auth){
    this.auth = auth;
  }

  async request(url, options = {}, operation = "request"){
    if(!this.auth.hasToken()) throw new Error("not-authenticated");
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.auth.accessToken}`,
        ...(options.headers || {})
      }
    });

    if(!response.ok){
      const text = await response.text().catch(() => "");
      console.error("[Host Google Drive API]", {
        operation,
        status: response.status,
        statusText: response.statusText,
        body: text,
        url
      });
      const error = new Error(`drive-${response.status}`);
      error.code = `drive-${response.status}`;
      error.status = response.status;
      error.body = text;
      error.operation = operation;
      error.requestUrl = url;
      throw error;
    }

    return response.status === 204 ? null : response.json();
  }

  async findDataFiles({signal} = {}){
    const params = new URLSearchParams({
      q: `name='${FILE_NAME}' and trashed=false`,
      spaces: "drive",
      orderBy: "modifiedTime desc",
      pageSize: "20",
      fields: "files(id,name,mimeType,modifiedTime,size)"
    });
    const result = await this.request(`${DRIVE_API}?${params}`, {signal}, "findDataFiles");
    return result.files || [];
  }

  async findDataFile(options = {}){
    return (await this.findDataFiles(options))[0] || null;
  }

  async readFile(fileId, {signal} = {}){
    return this.request(`${DRIVE_API}/${encodeURIComponent(fileId)}?alt=media`, {signal}, "readFile");
  }

  async createFile(payload, {signal} = {}){
    const parts = multipartBody({name:FILE_NAME, mimeType:"application/json"}, payload);
    return this.request(`${UPLOAD_API}?uploadType=multipart&fields=id,name,modifiedTime`, {
      method: "POST",
      signal,
      headers: {"Content-Type": parts.contentType},
      body: parts.body
    }, "createFile");
  }

  async updateFile(fileId, payload, {signal} = {}){
    const parts = multipartBody({name:FILE_NAME, mimeType:"application/json"}, payload);
    return this.request(`${UPLOAD_API}/${encodeURIComponent(fileId)}?uploadType=multipart&fields=id,name,modifiedTime`, {
      method: "PATCH",
      signal,
      headers: {"Content-Type": parts.contentType},
      body: parts.body
    }, "updateFile");
  }

  async createBackup(payload, {signal} = {}){
    const stamp = new Date().toISOString().slice(0,10);
    const parts = multipartBody({name:`cardflow-host-backup-${stamp}.json`, mimeType:"application/json"}, payload);
    return this.request(`${UPLOAD_API}?uploadType=multipart&fields=id,name,modifiedTime`, {
      method: "POST",
      signal,
      headers: {"Content-Type": parts.contentType},
      body: parts.body
    }, "createBackup");
  }
}
