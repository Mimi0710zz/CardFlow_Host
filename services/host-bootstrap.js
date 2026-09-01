<<<<<<< HEAD
import {canonicalize} from "./local-repository.js?v=20260901-cashback-target-auto-v8";
=======
import {canonicalize} from "./local-repository.js?v=20260901-cashback-rate-decimal-v7";
>>>>>>> c3daf67232f9a2bb394c17952107f3809ea102de

export function applyHostBootstrapData(data,{applyState,renderApp,canonicalizeData=canonicalize}={}){
  const nextState=canonicalizeData(data);
  if(typeof applyState==="function")applyState(nextState);
  if(typeof renderApp==="function")renderApp(nextState);
  return nextState;
}
