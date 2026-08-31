import test from "node:test";
import assert from "node:assert/strict";
import {DriveAuth} from "../services/drive-auth.js";

test("DriveAuth passes callbacks through initTokenClient and resolves token",async()=>{
 let config,overrideArgument="not-called";
 globalThis.window={google:{accounts:{oauth2:{initTokenClient:value=>{config=value;return {requestAccessToken:value=>{overrideArgument=value;config.callback({access_token:"token-1"});}};},revoke(){}}}}};
 const auth=new DriveAuth({googleClientId:"client.apps.googleusercontent.com"}),token=await auth.connect();
 assert.equal(token,"token-1");assert.equal(auth.hasToken(),true);assert.equal(typeof config.callback,"function");assert.equal(typeof config.error_callback,"function");assert.equal(overrideArgument,undefined);
});

test("DriveAuth rejects GIS popup errors and rebuilds the client",async()=>{
 let initializations=0;
 globalThis.window={google:{accounts:{oauth2:{initTokenClient:config=>{initializations+=1;return {requestAccessToken(){config.error_callback({type:"popup_closed"});}};},revoke(){}}}}};
 const auth=new DriveAuth({googleClientId:"client.apps.googleusercontent.com"});
 await assert.rejects(auth.connect(),/popup_closed/);await assert.rejects(auth.connect(),/popup_closed/);assert.equal(initializations,2);assert.equal(auth.tokenClient,null);
});
