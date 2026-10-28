/* SaralPDF shared page UI: tools menu, tool search (home), feedback dialog. */
(function(){
"use strict";
const $=s=>document.querySelector(s);
const t=(s,v)=>window.SaralI18n?window.SaralI18n.t(s,v):s;

/* tools menu */
const btn=$("#menu-btn"),menu=$("#tools");
if(btn&&menu){
  const open=v=>{menu.hidden=!v;btn.setAttribute("aria-expanded",String(v));};
  btn.addEventListener("click",e=>{e.stopPropagation();open(menu.hidden);});
  document.addEventListener("click",e=>{if(!menu.hidden&&!menu.contains(e.target)&&e.target!==btn)open(false);});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!menu.hidden){open(false);btn.focus();}});
  menu.addEventListener("click",e=>{if(e.target.closest("a.tool"))setTimeout(()=>open(false),0);});
}

/* search on the home page */
const q=$("#tool-search");
if(q){
  const norm=s=>s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g,"");
  const items=[...document.querySelectorAll(".directory a.tool")];
  const filter=()=>{
    const words=norm(q.value).split(/\s+/).filter(Boolean);let shown=0;
    items.forEach(a=>{
      const hay=norm(a.textContent+" "+(a.dataset.k||""));
      const ok=words.every(w=>hay.includes(w));a.parentElement.hidden=!ok;if(ok)shown++;
    });
    document.querySelectorAll(".dgroup").forEach(g=>g.hidden=![...g.querySelectorAll("li")].some(li=>!li.hidden));
    $("#no-match").hidden=shown>0;
  };
  q.addEventListener("input",filter);
  q.addEventListener("keydown",e=>{if(e.key==="Enter"){const first=items.find(a=>!a.parentElement.hidden);if(first)location.href=first.href;}});
  document.querySelectorAll("[data-q]").forEach(b=>b.addEventListener("click",()=>{q.value=b.dataset.q;filter();q.focus();}));
}

/* feedback dialog */
const modal=$("#fb-modal");
if(modal){
  const MAIL=["anandd201r","gmail.com"].join("@");const sub=encodeURIComponent("SaralPDF feedback");
  $("#fb-email").textContent=MAIL;
  $("#fb-gmail").href="https://mail.google.com/mail/?view=cm&fs=1&to="+MAIL+"&su="+sub;
  $("#fb-mailto").href="mailto:"+MAIL+"?subject="+sub;
  let last=null;
  const openFb=()=>{last=document.activeElement;modal.hidden=false;$("#fb-copy").focus();};
  const closeFb=()=>{modal.hidden=true;if(last&&last.focus)last.focus();};
  document.addEventListener("click",e=>{if(e.target.closest("[data-feedback]")){e.preventDefault();openFb();}});
  $("#fb-close").addEventListener("click",closeFb);
  modal.addEventListener("click",e=>{if(e.target===modal)closeFb();});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!modal.hidden)closeFb();});
  $("#fb-copy").addEventListener("click",async()=>{
    const toast=m=>{const el=$("#toast");if(!el)return;el.textContent=m;el.hidden=false;clearTimeout(el._t);el._t=setTimeout(()=>el.hidden=true,3000);};
    try{await navigator.clipboard.writeText(MAIL);toast(t("Email address copied"));}
    catch(_){const r=document.createRange();r.selectNodeContents($("#fb-email"));const s=getSelection();s.removeAllRanges();s.addRange(r);toast(t("Press Ctrl + C to copy"));}
  });
}
})();
