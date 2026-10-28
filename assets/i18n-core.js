/* SaralPDF language switch: English ⇄ Hindi. English text is the key; HI holds the Hindi. */
(function(){
"use strict";
const HI=window.SARAL_HI||{};
const KEY="saral-lang";
let lang="en";
try{const s=localStorage.getItem(KEY);if(s==="hi"||s==="en")lang=s;else if((navigator.language||"").toLowerCase().startsWith("hi"))lang="hi";}catch(_){}
const listeners=[];
function t(s,vars){
  let out=(lang==="hi"&&HI[s])?HI[s]:s;
  if(vars)out=out.replace(/\{(\w+)\}/g,(m,k)=>k in vars?vars[k]:m);
  return out;
}
/* translate static page text: text nodes whose trimmed text is a dictionary key */
const orig=new WeakMap();
const SKIP="script,style,[data-noi18n],#files,#res-list,#summary,#res-foot,#lede,#errors,#toast,#ptxt,#ed-name,.crop-dims,#ex-summary,#ex-note,#drop-title,#run,#pc-help,#en-mode-help,#rs-help,#fb-email,.wordmark,#lang-btn,#ex-preset,#pick-label,#mrun,#chain,#file-count,#tool-search";
function walk(root){
  const tw=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(n){
    const p=n.parentElement;if(!p||p.closest(SKIP))return NodeFilter.FILTER_REJECT;
    return n.nodeValue.trim()?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;}});
  const nodes=[];while(tw.nextNode())nodes.push(tw.currentNode);
  for(const n of nodes){
    const en=orig.has(n)?orig.get(n):n.nodeValue;const k=en.trim();
    if(lang==="hi"&&HI[k]){orig.set(n,en);n.nodeValue=en.replace(k,HI[k]);}
    else if(orig.has(n)){n.nodeValue=en;}
  }
  root.querySelectorAll("[placeholder],[aria-label]").forEach(el=>{
    ["placeholder","aria-label"].forEach(a=>{
      if(!el.hasAttribute(a)||el.closest(SKIP))return;const store="en"+a.replace(/-./g,m=>m[1].toUpperCase()).replace(/^./,m=>m.toUpperCase());
      if(el.dataset[store]===undefined)el.dataset[store]=el.getAttribute(a);
      const en=el.dataset[store];el.setAttribute(a,lang==="hi"&&HI[en]?HI[en]:en);
    });
  });
}
function apply(){
  document.documentElement.lang=lang==="hi"?"hi":"en";
  walk(document.body);
  const b=document.getElementById("lang-btn");
  if(b){b.querySelector("span").textContent=lang==="hi"?"English":"हिंदी";b.setAttribute("aria-label",lang==="hi"?"Switch to English":"हिंदी में देखें");b.lang=lang==="hi"?"en":"hi";}
}
function set(l){
  lang=l;try{localStorage.setItem(KEY,l);}catch(_){}
  apply();listeners.forEach(fn=>{try{fn(l);}catch(e){console.error(e);}});
}
window.SaralI18n={t,get lang(){return lang;},set,onChange(fn){listeners.push(fn);},apply};
document.addEventListener("click",e=>{if(e.target.closest("#lang-btn"))set(lang==="hi"?"en":"hi");});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",apply);else apply();
})();
