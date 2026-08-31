import {canonicalize} from "./local-repository.js?v=20260901-cashback-rate-decimal-v7";

export function applyHostBootstrapData(data,{applyState,renderApp,canonicalizeData=canonicalize}={}){
  const nextState=canonicalizeData(data);
  if(typeof applyState==="function")applyState(nextState);
  if(typeof renderApp==="function")renderApp(nextState);
  return nextState;
}
