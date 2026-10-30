/* SaralPDF app — all processing happens in the browser. */
(function(){
"use strict";
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const tick=()=>new Promise(r=>setTimeout(r,0));
const I=window.SaralI18n;const t=I.t;
if(window.pdfjsLib){try{pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";}catch(e){}}

/* ---------- tools ---------- */
const TOOLS={
  img2pdf:{h1:"Convert images to PDF",name:"Image to PDF",hint:"JPG → PDF",accept:"image",reorder:true,lede:"Turn photos and scans into <strong>one PDF</strong>. Each image becomes a page, in the order shown.",btn:"Create PDF",min:1},
  merge:{h1:"Merge PDF files into one",name:"Merge PDF",hint:"PDF + PDF",accept:"pdf",reorder:true,lede:"Join several PDFs into <strong>one file</strong>, in the order shown.",btn:"Merge PDFs",min:2},
  pdfcompress:{h1:"Compress PDF to reduce file size",name:"Compress PDF",hint:"PDF → KB",accept:"pdf",lede:"Make PDFs <strong>small enough to upload or email</strong>. Works best on scanned documents and image-heavy files.",btn:"Compress PDFs",min:1},
  pdf2img:{h1:"Convert PDF to JPG or PNG",name:"PDF to Image",hint:"PDF → JPG",accept:"pdf",lede:"Save each page of a PDF as a <strong>JPG or PNG</strong>. Several pages download together as a ZIP.",btn:"Convert pages",min:1},
  compress:{h1:"Compress images to an exact KB size",name:"Compress Image",hint:"MB → KB",accept:"image",lede:"Shrink photos for <strong>online forms, email and WhatsApp</strong>. Pick a quality, or set an exact KB limit.",btn:"Compress images",min:1},
  resize:{h1:"Resize images in pixels or percent",name:"Resize Image",hint:"W × H",accept:"image",lede:"Change image dimensions in <strong>pixels or by percentage</strong>.",btn:"Resize images",min:1},
  crop:{h1:"Crop images online",name:"Crop Image",hint:"✂ RATIO",accept:"image",editor:true,isNew:true,lede:"Cut out the part you need. Drag the box, or pick a ratio like <strong>passport 3.5 × 4.5 cm</strong> or <strong>1:1</strong>. You can also rotate and flip.",btn:"Crop images",min:1},
  exam:{h1:"Exam photo and signature resizer",name:"Exam Photo & Signature",hint:"SSC · IBPS · NEET",accept:"image",editor:true,isNew:true,lede:"Make your photo or signature match an exam form in one step: <strong>exact size in pixels and the right KB range</strong>.",btn:"Make exam file",min:1},
  convert:{h1:"Convert images: HEIC, JPG, PNG, WebP",name:"Convert Image",hint:"HEIC · JPG · PNG",accept:"image",isNew:true,lede:"Change image format: <strong>iPhone HEIC to JPG</strong>, PNG to JPG, JPG to PNG, or to WebP.",btn:"Convert images",min:1},
  enhance:{h1:"Enhance photos and scanned documents",name:"Enhance Quality",hint:"IMG · PDF",accept:"any",lede:"Make photos <strong>brighter and sharper</strong>, and turn grey, shadowy phone scans into <strong>clean white pages with dark text</strong>. Works on images and every page of a PDF.",btn:"Enhance",min:1},
  bgremove:{h1:"Remove the background from a photo",name:"Remove Background",hint:"AI · PNG",accept:"image",lede:"Cut out the person or object in a photo and get a <strong>transparent PNG</strong>, or place it on white for ID and form photos. The AI model downloads once, then runs on your device.",btn:"Remove background",min:1}
};
const SLUG={img2pdf:"image-to-pdf",merge:"merge-pdf",pdfcompress:"compress-pdf",pdf2img:"pdf-to-image",compress:"compress-image",resize:"resize-image",crop:"crop-image",exam:"exam-photo-signature",convert:"convert-image",enhance:"enhance",bgremove:"remove-background"};
const FROM_SLUG=Object.fromEntries(Object.entries(SLUG).map(([k,v])=>[v,k]));

/* Exam presets — checked October 2026 against published guidance. Users can edit every value. */
const PRESETS=[
  {id:"ibps_photo",group:"Bank exams (IBPS / SBI / RRB)",name:"IBPS photo",w:200,h:230,min:20,max:50,note:"200 × 230 px, 20–50 KB, JPG. Light background, recent photo."},
  {id:"ibps_sign",group:"Bank exams (IBPS / SBI / RRB)",name:"IBPS signature",w:140,h:60,min:10,max:20,note:"140 × 60 px, 10–20 KB. Black ink on white paper."},
  {id:"ssc_sign",group:"SSC (CGL / CHSL / MTS / GD)",name:"SSC signature",w:315,h:157,min:10,max:20,note:"4 × 2 cm (315 × 157 px at 200 DPI), 10–20 KB. SSC now takes your photo live during the application, so only the signature is uploaded."},
  {id:"neet_photo",group:"NEET (NTA)",name:"NEET passport photo",w:276,h:354,min:10,max:200,note:"10–200 KB, JPG. Passport size 3.5 × 4.5 cm (276 × 354 px at 200 DPI), white background."},
  {id:"neet_sign",group:"NEET (NTA)",name:"NEET signature",w:300,h:150,min:4,max:30,note:"4–30 KB, JPG. Black pen on white paper, not in capital letters."},
  {id:"upsc_photo",group:"UPSC",name:"UPSC photo",w:413,h:531,min:20,max:200,note:"20–200 KB, JPG. Recent photo, plain white background, face clearly visible."},
  {id:"upsc_sign",group:"UPSC",name:"UPSC signature",w:500,h:350,min:20,max:100,note:"20–100 KB, JPG. Black ink on white paper."},
  {id:"passport",group:"General",name:"Passport-size photo 3.5 × 4.5 cm",w:413,h:531,min:0,max:200,note:"3.5 × 4.5 cm at 300 DPI. Check the KB limit on your form."},
  {id:"custom",group:"General",name:"Custom size",w:300,h:400,min:10,max:100,note:"Enter the size and KB range from your form."}
];
const RATIOS=[["free","Free",null],["1:1","1:1",1],["passport","Passport 3.5 × 4.5",3.5/4.5],["4:3","4:3",4/3],["3:4","3:4",3/4],["16:9","16:9",16/9],["sign","Signature 2:1",2]];

const MAX=50*1024*1024;
const PAGE={a4:[595.28,841.89],letter:[612,792],legal:[612,1008]};
const page=window.SARAL_PAGE||{};
const st={tool:"img2pdf",files:[],results:null,busy:false,sel:null};
let uid=0;

/* ---------- helpers ---------- */
function fmt(n){if(n<1024)return n+" B";if(n<1048576){const k=n/1024;return (k<100?k.toFixed(1):Math.round(k))+" KB";}return (n/1048576).toFixed(n<10485760?2:1)+" MB";}
function base(name){return name.replace(/\.[^.]+$/,"")||"file";}
function extFor(type){return {"image/jpeg":"jpg","image/png":"png","image/webp":"webp"}[type]||"jpg";}
function accepts(tool,kind){return tool.accept==="any"?(kind==="image"||kind==="pdf"):kind===tool.accept;}
function kindOf(f){
  if(f.type==="application/pdf"||/\.pdf$/i.test(f.name))return"pdf";
  if(/\.(heic|heif)$/i.test(f.name)||/heic|heif/.test(f.type))return"heic";
  if(f.type.startsWith("image/")||/\.(jpe?g|png|webp|gif|bmp)$/i.test(f.name))return"image";
  return null;
}
function loadImage(src){return new Promise((res,rej)=>{const img=new Image();img.onload=()=>res(img);img.onerror=()=>rej(new Error("decode"));img.src=src;});}
async function imgFromFile(file){const url=URL.createObjectURL(file);try{return await loadImage(url);}finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}}
function canvasFor(img,w,h,opaque){
  const c=document.createElement("canvas");c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));
  const x=c.getContext("2d");if(opaque){x.fillStyle="#ffffff";x.fillRect(0,0,c.width,c.height);}
  x.imageSmoothingEnabled=true;x.imageSmoothingQuality="high";x.drawImage(img,0,0,c.width,c.height);return c;
}
function toBlob(c,type,q){return new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error("encode")),type,q));}
function isLockedErr(e){return e&&(e.name==="PasswordException"||/encrypt|password/i.test(e.message||""));}
const origType=f=>["image/jpeg","image/png","image/webp"].includes(f.file.type)?f.file.type:"image/jpeg";
const pages=n=>t(n===1?"{n} page":"{n} pages",{n});
const filesN=n=>t(n===1?"{n} file":"{n} files",{n});
const imagesN=n=>t(n===1?"{n} image":"{n} images",{n});

/* draw an image with rotation (deg) and horizontal flip applied */
function orientedCanvas(img,rot,flip,maxSide){
  const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
  let s=1;if(maxSide){const m=Math.max(iw,ih);if(m>maxSide)s=maxSide/m;}
  const w=iw*s,h=ih*s;const sw=rot%180?h:w,sh=rot%180?w:h;
  const c=document.createElement("canvas");c.width=Math.max(1,Math.round(sw));c.height=Math.max(1,Math.round(sh));
  const x=c.getContext("2d");x.imageSmoothingQuality="high";
  x.translate(c.width/2,c.height/2);x.rotate(rot*Math.PI/180);if(flip)x.scale(-1,1);
  x.drawImage(img,-w/2,-h/2,w,h);return c;
}
/* add JPEG comment segments so a file reaches a minimum size (some forms reject very small files) */
async function padJpeg(blob,minBytes){
  const buf=new Uint8Array(await blob.arrayBuffer());let need=minBytes-buf.length+64;if(need<=0)return blob;
  const segs=[];while(need>0){const n=Math.min(65533,Math.max(16,need));const seg=new Uint8Array(n+4);seg[0]=0xFF;seg[1]=0xFE;seg[2]=((n+2)>>8)&255;seg[3]=(n+2)&255;seg.fill(0x20,4);segs.push(seg);need-=n+4;}
  return new Blob([buf.slice(0,2),...segs,buf.slice(2)],{type:"image/jpeg"});
}

/* write DPI into the JPEG JFIF header so forms and print shops read the right physical size */
async function setJpegDpi(blob,dpi){
  const b=new Uint8Array(await blob.arrayBuffer());dpi=Math.round(dpi);
  if(b[0]!==0xFF||b[1]!==0xD8)return blob;
  if(b[2]===0xFF&&b[3]===0xE0&&b[6]===0x4A&&b[7]===0x46&&b[8]===0x49&&b[9]===0x46){
    b[13]=1;b[14]=dpi>>8;b[15]=dpi&255;b[16]=dpi>>8;b[17]=dpi&255;return new Blob([b],{type:"image/jpeg"});}
  const app0=new Uint8Array([0xFF,0xE0,0,16,0x4A,0x46,0x49,0x46,0,1,1,1,dpi>>8,dpi&255,dpi>>8,dpi&255,0,0]);
  return new Blob([b.slice(0,2),app0,b.slice(2)],{type:"image/jpeg"});
}

/* ---------- target size (KB / MB) ---------- */
/* read a size box with its KB/MB unit, in KB (0 when empty) */
function sizeKb(inp,unit){const v=+$(inp).value;if(!(v>0))return 0;return $(unit).value==="mb"?v*1024:v;}
function setSize(inp,unit,kb){const mb=kb>=1024&&kb%1024===0;$(unit).value=mb?"mb":"kb";$(inp).value=mb?kb/1024:kb;}
const sizeLabel=kb=>kb>=1024?(+(kb/1024).toFixed(2))+" MB":(+kb.toFixed(1))+" KB";
function bindSizeChips(chips,inp,unit){
  const mark=()=>{const v=sizeKb(inp,unit);document.querySelectorAll(chips+" .chip").forEach(c=>c.classList.toggle("on",Math.abs(+c.dataset.kb-v)<0.01));};
  $(chips).addEventListener("click",e=>{const c=e.target.closest("[data-kb]");if(!c)return;setSize(inp,unit,+c.dataset.kb);mark();});
  $(inp).addEventListener("input",mark);$(unit).addEventListener("change",mark);mark();
  return mark;
}
const decodeBlob=b=>window.createImageBitmap?createImageBitmap(b).catch(()=>imgFromFile(b)):imgFromFile(b);
/* Turn page sources ({blob,w,h}) into JPEGs whose total fits the budget.
   Quality is preferred over resolution: each scale step tries quality 0.35–0.92 before going smaller. */
const FIT_SCALES=[1,.8,.66,.53,.42,.33,.26,.2,.15];
async function jpegsUnder(srcs,budget,status){
  const px=srcs.reduce((a,s)=>a+s.w*s.h,0);let last=null;
  for(let si=0;si<FIT_SCALES.length;si++){
    const s=FIT_SCALES[si],final=si===FIT_SCALES.length-1;
    const cache=px*s*s<=16e6?[]:null; // keep canvases in memory only when they are small
    const canvas=async i=>{if(cache&&cache[i])return cache[i];const img=await decodeBlob(srcs[i].blob);const c=canvasFor(img,srcs[i].w*s,srcs[i].h*s,true);if(img.close)img.close();if(cache)cache[i]=c;return c;};
    const enc=async(q,full)=>{const out=[];let sum=0;
      for(let i=0;i<srcs.length;i++){const c=await canvas(i);const b=await toBlob(c,"image/jpeg",q);if(!cache)c.width=c.height=0;out.push(b);sum+=b.size;if(!full&&sum>budget)return null;}
      return {out,sum,q};};
    status(s);await tick();
    const lo0=final?0.05:0.35;let r=await enc(lo0,final);
    if(!r||r.sum>budget){last=r;continue;}
    let best=r,lo=lo0,hi=0.92;
    for(let k=0;k<5;k++){const q=(lo+hi)/2;const x=await enc(q,false);if(x){best=x;lo=q;}else hi=q;}
    if(cache)cache.forEach(c=>c.width=c.height=0);
    return {jpgs:best.out,scale:s,q:best.q,ok:true};
  }
  return {jpgs:last.out,scale:FIT_SCALES[FIT_SCALES.length-1],q:0.05,ok:false};
}
/* build a PDF from fitted JPEGs; PDF structure adds a little, so re-fit with a smaller budget if needed */
async function fitPdf(srcs,maxBytes,build,status){
  let budget=maxBytes-1500-600*srcs.length,r,bytes;
  for(let k=0;k<4;k++){
    r=await jpegsUnder(srcs,Math.max(budget,512*srcs.length),status);
    bytes=await build(r.jpgs);
    if(bytes.length<=maxBytes||!r.ok)break;
    budget-=bytes.length-maxBytes+1024;
  }
  return {bytes,ok:bytes.length<=maxBytes,scale:r.scale};
}

/* ---------- toast & errors ---------- */
let toastT;
function toast(msg){const el=$("#toast");el.textContent=msg;el.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>el.hidden=true,3200);}
let errs=[];
function showErrors(){const e=$("#errors");e.hidden=!errs.length;e.innerHTML=errs.map(m=>"<p>"+esc(m)+"</p>").join("");}
function addErr(m){errs.push(m);showErrors();}

/* ---------- saving ---------- */
const dlReady=(window.claude&&typeof window.claude.use==="function")?window.claude.use("downloads").catch(()=>null):Promise.resolve(null);
async function save(blob,filename){
  const dl=await dlReady;
  if(dl){
    try{await dl.save({filename,data:blob});toast(t("Downloaded {name}",{name:filename}));}
    catch(e){const c=e&&e.code;toast(c==="declined"?t("Save cancelled"):t("Saving isn't available in this view"));}
    return;
  }
  const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),4000);
}
function uniqueNames(items){const seen={};return items.map(it=>{let n=it.name;if(seen[n]){const b=base(n),e=n.slice(b.length);let i=2;while(seen[b+"-"+i+e])i++;n=b+"-"+i+e;}seen[n]=1;return n;});}
async function saveZip(){
  const r=st.results;if(!r)return;
  const zip=new JSZip();const names=uniqueNames(r.items);
  r.items.forEach((it,i)=>zip.file(names[i],it.blob));
  const btn=$("#zip-btn");if(btn){btn.disabled=true;btn.textContent=t("Packing ZIP…");}
  const blob=await zip.generateAsync({type:"blob",compression:"STORE"});
  if(btn){btn.disabled=false;btn.textContent=t("Download all (ZIP)");}
  save(blob,r.zipName);
}

/* ---------- HEIC (iPhone) support ---------- */
const HEIC_LIB="https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js";
let heicP=null;
function loadHeic(){
  if(window.heic2any)return Promise.resolve(window.heic2any);
  if(!heicP)heicP=new Promise((res,rej)=>{const s=document.createElement("script");s.src=HEIC_LIB;s.onload=()=>window.heic2any?res(window.heic2any):rej(new Error("heic"));s.onerror=()=>{heicP=null;rej(new Error("heic"));};document.head.appendChild(s);});
  return heicP;
}
async function heicToJpeg(file){
  try{const img=await imgFromFile(file);const c=canvasFor(img,img.naturalWidth,img.naturalHeight,true);return await toBlob(c,"image/jpeg",0.92);}catch(_){}
  const h2a=await loadHeic();let out=await h2a({blob:file,toType:"image/jpeg",quality:0.92});if(Array.isArray(out))out=out[0];return out;
}

/* ---------- adding files ---------- */
function addFiles(list){
  const tool=TOOLS[st.tool];const arr=Array.from(list||[]);if(!arr.length)return;
  errs=[];let added=0;
  for(const f of arr){
    let k=kindOf(f);
    const isHeic=k==="heic";if(isHeic)k="image";
    if(!accepts(tool,k)){
      const need=tool.accept==="any"?t("JPG, PNG, WebP or PDF files."):tool.accept==="pdf"?t("PDF files."):t("JPG, PNG, WebP or HEIC images.");
      addErr(t("“{name}” can't be used here. {tool} needs {need}",{name:f.name,tool:t(tool.name),need}));continue;}
    if(f.size>MAX){addErr(t("“{name}” is {size}. The limit is 50 MB per file.",{name:f.name,size:fmt(f.size)}));continue;}
    if(!added)st.files=st.files.filter(x=>!x.sample);
    const item={id:++uid,file:f,name:f.name||("pasted-"+uid+".png"),size:f.size,kind:k,thumb:null,info:t("Reading…"),rot:0,flip:false,crop:null};
    if(isHeic){item.heic=true;item.info=t("Converting iPhone photo…");}
    st.files.push(item);added++;prepare(item);
  }
  if(added){st.results=null;if(TOOLS[st.tool].editor&&!fileById(st.sel))st.sel=st.files.find(x=>x.kind==="image")?.id||null;}
  render();
}
async function prepare(item){
  if(item.heic){
    try{const jpg=await heicToJpeg(item.file);item.origSize=item.file.size;item.file=new File([jpg],base(item.name)+".jpg",{type:"image/jpeg"});item.name=base(item.name)+".jpg";item.size=item.file.size;item.converted=true;}
    catch(e){item.bad=true;item.info=t("Couldn't read this iPhone photo. Export it as JPG and try again.");renderFiles();updateRun();return;}
  }
  makeThumb(item);
}
async function makeThumb(item){
  try{
    if(item.kind==="image"){
      const img=await imgFromFile(item.file);item.img=img;
      item.thumb=URL.createObjectURL(item.file);item.w=img.naturalWidth;item.h=img.naturalHeight;
      item.info=item.w+" × "+item.h+" px"+(item.converted?" · "+t("converted from HEIC"):"");
      if(st.tool==="resize"&&st.files.find(x=>x.w)===item)syncResizeDefaults();
      if(TOOLS[st.tool].editor&&(st.sel===item.id||!fileById(st.sel))){st.sel=item.id;renderEditor();}
    }else{
      const doc=await pdfjsLib.getDocument({data:new Uint8Array(await item.file.arrayBuffer())}).promise;
      item.pages=doc.numPages;item.info=pages(doc.numPages);
      const p=await doc.getPage(1);const v0=p.getViewport({scale:1});const v=p.getViewport({scale:112/Math.max(v0.width,v0.height)});
      const c=document.createElement("canvas");c.width=Math.ceil(v.width);c.height=Math.ceil(v.height);
      await p.render({canvasContext:c.getContext("2d"),viewport:v}).promise;item.thumb=c.toDataURL("image/png");closeDoc(doc);
    }
  }catch(e){
    console.warn("SaralPDF: couldn't read",item.name,e);
    item.bad=true;
    if(isLockedErr(e)){item.locked=true;item.info=t("Password-protected");}
    else item.info=item.kind==="pdf"?t("Can't open this PDF"):t("Can't read this image");
  }
  renderFiles();updateRun();
}
const fileById=id=>st.files.find(f=>f.id===id)||null;

/* ---------- render ---------- */
function renderTools(){
  document.querySelectorAll("#tools .tool").forEach(a=>{
    const k=a.dataset.tool;if(!TOOLS[k])return;
    a.querySelector(".t-name").textContent=t(TOOLS[k].name);
    if(k===st.tool)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");
  });
}
const ICO={
  up:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 10l4-4 4 4"/></svg>',
  down:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6l4 4 4-4"/></svg>',
  x:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
  grip:'<svg class="grip" viewBox="0 0 16 16" fill="currentColor"><circle cx="6" cy="4" r="1.2"/><circle cx="10" cy="4" r="1.2"/><circle cx="6" cy="8" r="1.2"/><circle cx="10" cy="8" r="1.2"/><circle cx="6" cy="12" r="1.2"/><circle cx="10" cy="12" r="1.2"/></svg>'
};
function renderFiles(){
  const tool=TOOLS[st.tool];const ul=$("#files");const n=st.files.length;
  ul.classList.toggle("no-reorder",!tool.reorder);
  ul.innerHTML=st.files.map((f,i)=>
    '<li class="file'+(f.bad?" bad":"")+(tool.editor?" clickable":"")+(tool.editor&&st.sel===f.id?" sel":"")+'" data-id="'+f.id+'"'+(tool.reorder?' draggable="true"':'')+'>'+
      '<div class="ord" title="'+(tool.reorder?esc(t("Drag to reorder")):"")+'">'+(tool.reorder?ICO.grip:"")+'<span>'+(i+1)+'</span></div>'+
      '<div class="thumb'+(f.kind==="pdf"?" pdf":"")+'">'+(f.thumb?'<img alt="" src="'+f.thumb+'">':'<span class="ph">'+(f.kind==="pdf"?"PDF":"IMG")+'</span>')+'</div>'+
      '<div style="min-width:0"><div class="fname">'+esc(f.name)+(f.sample?'<span class="badge">'+esc(t("Example"))+'</span>':'')+'</div><div class="finfo"><span>'+fmt(f.size)+'</span><span>'+esc(f.info)+'</span></div></div>'+
      '<div class="row-act">'+
        (tool.reorder?'<button type="button" class="icon-btn" data-act="up" aria-label="'+esc(t("Move up"))+'"'+(i===0?" disabled":"")+'>'+ICO.up+'</button>'+
        '<button type="button" class="icon-btn" data-act="down" aria-label="'+esc(t("Move down"))+'"'+(i===n-1?" disabled":"")+'>'+ICO.down+'</button>':'')+
        '<button type="button" class="icon-btn rm" data-act="rm" aria-label="'+esc(t("Remove"))+'">'+ICO.x+'</button>'+
      '</div></li>').join("");
  $("#files-empty").hidden=n>0;
  $("#file-count").textContent=n?"("+n+")":"";
  const total=st.files.reduce((a,f)=>a+f.size,0);
  const pg=st.files.reduce((a,f)=>a+(f.pages||0),0);
  const foot=$("#list-foot");foot.hidden=!n;
  let hint="";
  if(st.files.some(f=>f.sample))hint=t("Examples shown. Add your own files to replace them.");
  else if(tool.editor&&n>1)hint=t("Tap a file to adjust its crop");
  else if(tool.reorder&&n>1)hint=t("Drag rows to change the order");
  syncSizeEst();
  foot.innerHTML=n?"<span>"+esc(filesN(n))+", "+fmt(total)+(tool.accept==="pdf"&&pg?", "+esc(pages(pg)):"")+"</span>"+(hint?"<span>"+esc(hint)+"</span>":""):"";
}
function updateRun(){
  const tool=TOOLS[st.tool];const ok=st.files.filter(f=>!f.bad&&(f.kind!=="image"||f.img||f.sample||!tool.editor)).length;
  const b=$("#run");b.textContent=t(tool.btn)+(ok>1&&!["img2pdf","merge"].includes(st.tool)?" ("+ok+")":"");
  b.disabled=st.busy||ok<tool.min;
  if(st.tool==="merge"&&ok<2&&!st.busy)b.textContent=t("Add at least 2 PDFs");
  const m=$("#mrun");m.textContent=st.busy?t("Working…"):b.textContent;m.disabled=b.disabled;
  $("#run-hint").hidden=st.files.length>0;
  syncMbar();
}
let runVisible=true;
function syncMbar(){$("#mbar").hidden=!(st.files.length&&!st.results&&!runVisible);}
if("IntersectionObserver" in window)new IntersectionObserver(es=>{runVisible=es[0].isIntersecting;syncMbar();}).observe($("#run"));
$("#mrun").addEventListener("click",()=>{run();});
const OUT_TOOLS={pdf:["pdfcompress","merge","pdf2img","enhance"],image:["compress","resize","crop","img2pdf","convert","exam"]};
function renderResults(){
  const r=st.results;const sec=$("#results");sec.hidden=!r;$("#chain").hidden=!r;if(!r)return;
  const before=r.items.reduce((a,x)=>a+(x.before||0),0),after=r.items.reduce((a,x)=>a+x.blob.size,0);
  let line;
  if(r.compare&&before){
    const pct=Math.round((1-after/before)*100);
    line='<div class="sz">'+fmt(before)+'<span class="arrow">→</span>'+fmt(after)+'</div><div class="sub">'+
      (pct>0?'<span class="pct">'+esc(t("{n}% smaller",{n:pct}))+'</span>, ':pct<0?esc(t("{n}% larger",{n:-pct}))+', ':'')+esc(r.label)+'</div>';
  }else line='<div class="sz">'+fmt(after)+'</div><div class="sub">'+esc(r.label)+'</div>';
  if(r.fit){const ok=r.items.every(it=>it.blob.size<=r.fit*1024);
    line+='<div class="fit '+(ok?"ok":"no")+'">'+esc(ok?"✓ "+t("Fits under {size}",{size:sizeLabel(r.fit)}):t("Over {size}",{size:sizeLabel(r.fit)}))+'</div>';}
  const formTool=["exam","compress","crop","bgremove"].includes(st.tool);
  $("#summary").innerHTML='<div>'+line+'</div><div class="stamp" aria-hidden="true"><b>'+esc(t(formTool?"Form ready":"Ready"))+'</b><small>'+esc(filesN(r.items.length))+'</small></div>';
  $("#res-list").innerHTML=r.items.length>1||r.items[0].note||r.items[0].preview?r.items.map((it,i)=>{
    let s=fmt(it.blob.size);
    if(it.before){const d=Math.round((1-it.blob.size/it.before)*100);s=fmt(it.before)+" → "+fmt(it.blob.size)+(d>0?' <span class="down">−'+d+'%</span>':d<0?' <span class="up">+'+(-d)+'%</span>':'');}
    if(it.dims)s+=", "+esc(it.dims);
    return '<li><div style="min-width:0;display:flex;gap:12px;align-items:center">'+(it.preview?'<div class="pv"><img alt="" src="'+it.preview+'"></div>':'')+'<div style="min-width:0"><div class="rn">'+esc(it.name)+'</div><div class="rs">'+s+'</div></div></div>'+
      (r.items.length>1?'<button type="button" class="btn" data-save="'+i+'">'+esc(t("Download"))+'</button>':'<span></span>')+(it.note?'<div class="note">'+esc(it.note)+'</div>':'')+'</li>';
  }).join(""):"";
  $("#res-foot").innerHTML=(r.items.length>1?'<button type="button" class="btn primary big wide" id="zip-btn">'+esc(t("Download all (ZIP)"))+'</button>':'<button type="button" class="btn primary big wide" data-save="0">'+esc(t("Download {name}",{name:r.items[0].name}))+'</button>')+
    '<button type="button" class="btn quiet" id="again">'+esc(t("Start over with new files"))+'</button>';
  const kind=r.items.every(it=>/pdf$/i.test(it.name))?"pdf":r.items.every(it=>/\.(jpe?g|png|webp)$/i.test(it.name))?"image":null;
  const next=kind?OUT_TOOLS[kind].filter(k=>k!==st.tool&&(TOOLS[k].min<=r.items.length)):[];
  $("#chain").hidden=!next.length;
  $("#chain").innerHTML='<p>'+esc(t(r.items.length>1?"Do more with these files":"Do more with this file"))+'</p><div class="chips">'+next.map(k=>'<button type="button" class="chip" data-chain="'+k+'">'+esc(t(TOOLS[k].name))+'</button>').join("")+'</div>';
  syncMbar();
}
async function continueWith(k){
  const r=st.results;if(!r||st.busy)return;
  const files=r.items.map(it=>new File([it.blob],it.name,{type:it.blob.type||(/pdf$/i.test(it.name)?"application/pdf":"image/jpeg")}));
  st.files=[];st.results=null;st.sel=null;
  selectTool(k,"click");addFiles(files);
  $("#work").scrollIntoView({behavior:"smooth",block:"start"});
}
function render(){
  const tool=TOOLS[st.tool];
  renderTools();syncHeading();
  $("#lede").innerHTML=t(tool.lede);
  const has=st.files.length>0;$("#work").classList.toggle("has-files",has);
  $("#drop-title").textContent=has?t("Add more files"):tool.accept==="any"?t("Drop images or PDFs here"):tool.accept==="pdf"?t("Drop PDF files here"):t("Drop images here");
  $("#pick-label").textContent=has?t("Add files"):t("Choose files");
  $("#pick-label").classList.toggle("big",!has);$("#pick-label").classList.toggle("primary",!has);
  $("#try-example").hidden=!accepts(tool,"image");
  document.querySelectorAll(".drop .img-only").forEach(el=>el.hidden=tool.accept==="pdf");
  document.querySelectorAll(".drop .pdf-only").forEach(el=>el.hidden=tool.accept!=="pdf");
  $("#picker").accept=tool.accept==="any"?"image/*,.heic,.heif,application/pdf,.pdf":tool.accept==="pdf"?"application/pdf,.pdf":"image/*,.heic,.heif";
  $("#picker").multiple=true;
  if(st.tool==="enhance")syncEnhanceUI();
  if(st.tool==="exam")syncPreset(false);
  if(st.tool==="convert")syncConvertUI();
  document.querySelectorAll("[data-for]").forEach(el=>el.hidden=!el.dataset.for.split(" ").includes(st.tool));
  document.querySelectorAll("[data-tool-content]").forEach(el=>el.hidden=el.dataset.toolContent!==st.tool);
  renderFiles();updateRun();renderResults();showErrors();renderEditor();
}

/* heading and breadcrumb follow the tool when switching in place; the page's own heading is restored when coming back */
const heroH1=$(".tool-hero h1"),heroCrumbs=$(".tool-hero .crumbs");
const heroOrig={h1:heroH1&&heroH1.innerHTML,crumbs:heroCrumbs&&heroCrumbs.innerHTML};
function syncHeading(){
  if(!heroH1)return;const own=st.tool===(page.tool||st.tool);
  if(own){if(heroH1.hasAttribute("data-noi18n")){heroH1.innerHTML=heroOrig.h1;heroCrumbs.innerHTML=heroOrig.crumbs;heroH1.removeAttribute("data-noi18n");heroCrumbs.removeAttribute("data-noi18n");I.apply();}return;}
  const tool=TOOLS[st.tool];heroH1.setAttribute("data-noi18n","");heroCrumbs.setAttribute("data-noi18n","");
  heroH1.textContent=t(tool.h1);heroCrumbs.innerHTML='<a href="/">'+esc(t("Home"))+'</a><span>/</span><span>'+esc(t(tool.name))+'</span>';
}

/* ---------- progress ---------- */
function prog(i,n,label){const p=$("#progress");p.hidden=false;$("#bar").style.width=(n?Math.round(i/n*100):0)+"%";$("#ptxt").textContent=label;}
function progDone(){$("#progress").hidden=true;$("#bar").style.width="0";}

/* ---------- crop editor ---------- */
const ed={canvas:null,key:"",drag:null};
function currentRatio(){
  if(st.tool==="exam"){const p=presetVals();return p.w>0&&p.h>0?p.w/p.h:null;}
  const r=RATIOS.find(x=>x[0]===$("#cr-ratio").value);return r?r[2]:null;
}
function fitRect(W,H,ratio){ // largest centred rect with ratio, 92% of the image
  if(!ratio)return{x:.04,y:.04,w:.92,h:.92};
  let w=W*.92,h=w/ratio;if(h>H*.92){h=H*.92;w=h*ratio;}
  return{x:(W-w)/2/W,y:(H-h)/2/H,w:w/W,h:h/H};
}
function ensureCrop(f){
  if(!f.img)return;
  const W=f.rot%180?f.h:f.w,H=f.rot%180?f.w:f.h;const ratio=currentRatio();
  if(!f.crop||(ratio&&Math.abs((f.crop.w*W)/(f.crop.h*H)-ratio)>0.01))f.crop=fitRect(W,H,ratio);
}
function renderEditor(){
  const panel=$("#editor-panel");const tool=TOOLS[st.tool];
  if(!tool.editor){panel.hidden=true;return;}
  const f=fileById(st.sel)||st.files.find(x=>x.img);
  if(!f||!f.img){panel.hidden=true;return;}
  st.sel=f.id;panel.hidden=false;
  $("#ed-name").textContent=f.name;
  const key=f.id+":"+f.rot+":"+f.flip;
  if(ed.key!==key){ed.canvas=orientedCanvas(f.img,f.rot,f.flip,1400);ed.key=key;const stage=$("#stage");stage.querySelector("canvas")?.remove();stage.prepend(ed.canvas);}
  ensureCrop(f);drawBox();
}
function drawBox(){
  const f=fileById(st.sel);if(!f||!f.crop)return;
  const c=f.crop;
  [$("#crop-box"),$("#crop-frame")].forEach(box=>{box.style.left=c.x*100+"%";box.style.top=c.y*100+"%";box.style.width=c.w*100+"%";box.style.height=c.h*100+"%";});
  const W=f.rot%180?f.h:f.w,H=f.rot%180?f.w:f.h;
  $("#crop-dims").textContent=Math.round(c.w*W)+" × "+Math.round(c.h*H)+" px";
}
(function initEditor(){
  const stage=$("#stage"),box=$("#crop-frame");if(!stage)return;
  box.addEventListener("pointerdown",e=>{
    const f=fileById(st.sel);if(!f||!f.crop)return;e.preventDefault();
    const hd=e.target.closest(".hd");const r=stage.getBoundingClientRect();
    ed.drag={mode:hd?hd.dataset.h:"move",sx:e.clientX,sy:e.clientY,c:{...f.crop},rw:r.width,rh:r.height};
    box.setPointerCapture(e.pointerId);
  });
  box.addEventListener("pointermove",e=>{
    const d=ed.drag;if(!d)return;const f=fileById(st.sel);if(!f)return;
    const dx=(e.clientX-d.sx)/d.rw,dy=(e.clientY-d.sy)/d.rh;let {x,y,w,h}=d.c;
    const ratio=currentRatio();const W=f.rot%180?f.h:f.w,H=f.rot%180?f.w:f.h;const nr=ratio?ratio*H/W:null; // ratio in normalised units
    const minN=0.04;
    if(d.mode==="move"){x=Math.min(1-w,Math.max(0,x+dx));y=Math.min(1-h,Math.max(0,y+dy));}
    else{
      const left=d.mode.includes("w"),top=d.mode.includes("n");
      const ax=left?x+w:x,ay=top?y+h:y; // fixed corner
      let nw=Math.max(minN,left?w-dx:w+dx),nh=Math.max(minN,top?h-dy:h+dy);
      if(nr){if(Math.abs(dx)*1>=Math.abs(dy)*nr)nh=nw/nr;else nw=nh*nr;}
      const maxW=left?ax:1-ax,maxH=top?ay:1-ay;
      if(nw>maxW){nw=maxW;if(nr)nh=nw/nr;}
      if(nh>maxH){nh=maxH;if(nr)nw=nh*nr;}
      w=nw;h=nh;x=left?ax-w:ax;y=top?ay-h:ay;
    }
    f.crop={x,y,w,h};drawBox();
  });
  const end=()=>{ed.drag=null;};box.addEventListener("pointerup",end);box.addEventListener("pointercancel",end);
  $("#ed-tools").addEventListener("click",e=>{
    const b=e.target.closest("[data-ed]");if(!b)return;const f=fileById(st.sel);if(!f)return;
    const a=b.dataset.ed;
    if(a==="left")f.rot=(f.rot+270)%360;else if(a==="right")f.rot=(f.rot+90)%360;else if(a==="flip")f.flip=!f.flip;
    if(a==="reset"){f.rot=0;f.flip=false;}
    f.crop=null;renderEditor();
  });
  $("#cr-ratio").addEventListener("change",()=>{st.files.forEach(f=>f.crop=null);renderEditor();});
})();
async function croppedCanvas(f){
  const img=f.img||await imgFromFile(f.file);
  const W=f.rot%180?img.naturalHeight:img.naturalWidth,H=f.rot%180?img.naturalWidth:img.naturalHeight;
  if(!f.crop){f.w=img.naturalWidth;f.h=img.naturalHeight;f.img=img;ensureCrop(f);}
  const full=orientedCanvas(img,f.rot,f.flip,0);const c=f.crop;
  const sx=Math.round(c.x*W),sy=Math.round(c.y*H),sw=Math.max(1,Math.round(c.w*W)),sh=Math.max(1,Math.round(c.h*H));
  const out=document.createElement("canvas");out.width=sw;out.height=sh;out.getContext("2d").drawImage(full,sx,sy,sw,sh,0,0,sw,sh);
  full.width=full.height=0;return out;
}

/* ---------- tools ---------- */
const radio=name=>document.querySelector('input[name="'+name+'"]:checked').value;
const cleanName=(v,fb)=>(v||"").trim().replace(/[\\/:*?"<>|]+/g,"-").replace(/\.pdf$/i,"")||fb;

async function runImg2Pdf(files){
  const {PDFDocument}=PDFLib;const doc=await PDFDocument.create();
  const size=$("#i2p-size").value,orient=radio("i2p-orient"),m=+radio("i2p-margin"),maxKb=sizeKb("#i2p-kb","#i2p-unit");
  const place=(d,emb,iw,ih)=>{ // iw, ih: original pixel size, so page layout doesn't change when images are shrunk to fit
    let pw,ph;
    if(size==="fit"){pw=iw*0.75+2*m;ph=ih*0.75+2*m;}
    else{[pw,ph]=PAGE[size];const land=orient==="landscape"||(orient==="auto"&&iw>ih);if(land)[pw,ph]=[ph,pw];}
    const s=size==="fit"?0.75:Math.min((pw-2*m)/iw,(ph-2*m)/ih);
    const w=iw*s,h=ih*s;d.addPage([pw,ph]).drawImage(emb,{x:(pw-w)/2,y:(ph-h)/2,width:w,height:h});
  };
  let before=0,n=0,note="";const srcs=[];
  for(let i=0;i<files.length;i++){
    const f=files[i];prog(i,files.length,t("Adding page {i} of {n}",{i:i+1,n:files.length})+" · "+f.name);await tick();
    try{
      if(maxKb){const img=await imgFromFile(f.file);const iw=img.naturalWidth,ih=img.naturalHeight,k=Math.min(1,2400/Math.max(iw,ih));
        srcs.push({blob:f.file,w:iw*k,h:ih*k,iw,ih});before+=f.size;n++;continue;}
      let emb;
      if(f.file.type==="image/png"){emb=await doc.embedPng(await f.file.arrayBuffer());}
      else{const img=await imgFromFile(f.file);const c=canvasFor(img,img.naturalWidth,img.naturalHeight,true);emb=await doc.embedJpg(await (await toBlob(c,"image/jpeg",0.92)).arrayBuffer());}
      place(doc,emb,emb.width,emb.height);
      before+=f.size;n++;
    }catch(e){addErr(t("Skipped “{name}”: the image couldn't be read.",{name:f.name}));}
  }
  if(!n)throw new Error(t("No images could be added to the PDF."));
  let bytes;
  if(maxKb){
    const fit=await fitPdf(srcs,maxKb*1024,async jpgs=>{
      const d=await PDFDocument.create();
      for(let i=0;i<jpgs.length;i++)place(d,await d.embedJpg(await jpgs[i].arrayBuffer()),srcs[i].iw,srcs[i].ih);
      return d.save();
    },()=>prog(1,2,t("Finding the best quality under {size}…",{size:sizeLabel(maxKb)})));
    bytes=fit.bytes;if(!fit.ok)note=t("Couldn't get under {size}. This is the smallest version.",{size:sizeLabel(maxKb)});
  }else{prog(1,1,t("Writing PDF…"));await tick();bytes=await doc.save();}
  const name=cleanName($("#i2p-name").value,"saralpdf-document")+".pdf";
  return {items:[{name,blob:new Blob([bytes],{type:"application/pdf"}),before,note}],compare:false,label:pages(n)+" · "+(size==="fit"?t("page size matches each image"):$("#i2p-size").selectedOptions[0].text)+(maxKb?" · "+t("under {size}",{size:sizeLabel(maxKb)}):""),fit:maxKb,zipName:name};
}
function parseRange(str,max){
  str=str.trim();if(!str)return Array.from({length:max},(_,i)=>i+1);
  const out=new Set();
  for(const part of str.split(/[,\s]+/).filter(Boolean)){
    const m=part.match(/^(\d+)(?:-(\d*))?$/);if(!m){const e=new Error(t("Pages: “{p}” isn't a page number or range like 2-5.",{p:part}));e.range=true;throw e;}
    const a=+m[1],b=m[2]===undefined?a:(m[2]===""?max:+m[2]);
    for(let p=Math.min(a,b);p<=Math.max(a,b);p++)if(p>=1&&p<=max)out.add(p);
  }
  return [...out].sort((x,y)=>x-y);
}
function closeDoc(d){try{if(d&&typeof d.destroy==="function")d.destroy();else if(d&&typeof d.cleanup==="function")d.cleanup();}catch(_){}}
async function openPdf(f){return pdfjsLib.getDocument({data:new Uint8Array(await f.file.arrayBuffer())}).promise;}
const pdfErr=(f,e)=>isLockedErr(e)?t("“{name}” is password-protected. Remove the password and try again.",{name:f.name}):t("“{name}” couldn't be opened. It may be damaged.",{name:f.name});
async function runPdf2Img(files){
  const type=radio("p2i-fmt"),dpi=+$("#p2i-dpi").value,rangeStr=$("#p2i-pages").value;
  const items=[];let total=0,done=0;const docs=[];
  for(const f of files){
    try{const d=await openPdf(f);const pg=parseRange(rangeStr,d.numPages);docs.push({f,d,pg});total+=pg.length;}
    catch(e){if(e.range)throw e;addErr(pdfErr(f,e));}
  }
  if(!total)throw new Error(rangeStr.trim()?t("None of those page numbers exist in the selected PDFs."):t("No pages to convert."));
  for(const {f,d,pg} of docs){
    const pad=String(d.numPages).length;
    for(const p of pg){
      prog(done,total,t("Page {i} of {n}",{i:done+1,n:total})+" · "+f.name);await tick();
      const pageObj=await d.getPage(p);let scale=dpi/72;const v0=pageObj.getViewport({scale:1});
      if(Math.max(v0.width,v0.height)*scale>8000)scale=8000/Math.max(v0.width,v0.height);
      const v=pageObj.getViewport({scale});const c=document.createElement("canvas");c.width=Math.ceil(v.width);c.height=Math.ceil(v.height);
      const ctx=c.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,c.width,c.height);
      await pageObj.render({canvasContext:ctx,viewport:v}).promise;
      const blob=await toBlob(c,type,0.9);
      items.push({name:base(f.name)+"_page-"+String(p).padStart(pad,"0")+"."+extFor(type),blob,dims:c.width+" × "+c.height+" px"});
      c.width=c.height=0;done++;
    }
    closeDoc(d);
  }
  return {items,compare:false,label:imagesN(items.length)+" · "+dpi+" DPI "+(type==="image/png"?"PNG":"JPG"),zipName:(files.length===1?base(files[0].name):"saralpdf")+"_pages.zip"};
}
async function runMerge(files){
  const {PDFDocument}=PDFLib;const out=await PDFDocument.create();let n=0,before=0,used=0;
  for(let i=0;i<files.length;i++){
    const f=files[i];prog(i,files.length,t("Adding {name}",{name:f.name}));await tick();
    try{const src=await PDFDocument.load(await f.file.arrayBuffer());const cp=await out.copyPages(src,src.getPageIndices());cp.forEach(p=>out.addPage(p));n+=cp.length;before+=f.size;used++;}
    catch(e){addErr(isLockedErr(e)?t("Skipped “{name}”: it's password-protected.",{name:f.name}):t("Skipped “{name}”: it couldn't be read.",{name:f.name}));}
  }
  if(used<2)throw new Error(t("At least 2 readable PDFs are needed to merge."));
  prog(1,1,t("Writing PDF…"));await tick();
  const bytes=await out.save();const name=cleanName($("#mg-name").value,"merged")+".pdf";
  return {items:[{name,blob:new Blob([bytes],{type:"application/pdf"}),before}],compare:false,label:t("{n} files joined",{n:used})+" · "+pages(n),zipName:name};
}
/* find the highest JPEG/WebP quality that fits under maxBytes, shrinking the image if allowed */
async function fitUnder(img,w,h,type,maxBytes,allowScale){
  let s=1,best=null,smallest=null;
  for(let round=0;round<(allowScale?10:1)&&!best;round++){
    const c=img instanceof HTMLCanvasElement&&s===1&&img.width===Math.round(w)&&img.height===Math.round(h)?img:canvasFor(img,w*s,h*s,type==="image/jpeg");
    let lo=0.05,hi=0.95;
    for(let k=0;k<7;k++){const q=(lo+hi)/2;const b=await toBlob(c,type,q);
      if(!smallest||b.size<smallest.blob.size)smallest={blob:b,w:c.width,h:c.height,q};
      if(b.size<=maxBytes){if(!best||q>best.q)best={blob:b,q,w:c.width,h:c.height};lo=q;}else hi=q;}
    if(!best){const b=await toBlob(c,type,0.05);if(b.size<=maxBytes)best={blob:b,q:.05,w:c.width,h:c.height};}
    s*=0.8;
  }
  return {best,smallest};
}
async function compressOne(f,o){
  const img=await imgFromFile(f.file);let w=img.naturalWidth,h=img.naturalHeight;
  if(o.maxw&&w>o.maxw){h=h*o.maxw/w;w=o.maxw;}
  const orig=origType(f);let type=o.fmt==="keep"?orig:o.fmt;
  if(o.mode==="target"&&type==="image/png")type="image/jpeg";
  const resized=w!==img.naturalWidth;let note="";
  if(o.mode==="target"){
    const {best,smallest}=await fitUnder(img,w,h,type,o.kb*1024,true);const pick=best||smallest;
    let blob=pick.blob;
    if(!best)note=t("Couldn't get under {size}. This is the smallest version.",{size:sizeLabel(o.kb)});
    else if(pick.w!==Math.round(w))note=t("Scaled to {w} × {h} px to fit the size limit.",{w:pick.w,h:pick.h});
    if(best&&o.grow&&type==="image/jpeg"&&blob.size<o.kb*1024*0.9){
      blob=await padJpeg(blob,Math.floor(o.kb*1024*0.97)-64);note=t("Size raised to about {size}. The image itself is unchanged.",{size:sizeLabel(o.kb)});}
    return {blob,dims:pick.w+" × "+pick.h+" px",note,type:blob.type||type};
  }
  const c=canvasFor(img,w,h,type==="image/jpeg");let blob=await toBlob(c,type,o.q);
  if(!resized&&type===orig&&blob.size>=f.size){blob=f.file;note=t("Already well compressed, so the original was kept.");}
  return {blob,dims:c.width+" × "+c.height+" px",note,type:blob.type||type,kept:blob===f.file};
}
async function runCompress(files){
  const o={mode:radio("cp-mode"),q:+$("#cp-q").value/100,kb:sizeKb("#cp-kb","#cp-unit")||100,grow:$("#cp-grow").checked,fmt:$("#cp-fmt").value,maxw:+$("#cp-maxw").value};
  const items=[];
  for(let i=0;i<files.length;i++){const f=files[i];prog(i,files.length,t("Compressing {i} of {n}",{i:i+1,n:files.length})+" · "+f.name);await tick();
    try{const r=await compressOne(f,o);items.push({name:base(f.name)+(r.kept?"":"-compressed")+"."+extFor(r.type),blob:r.blob,before:f.size,dims:r.dims,note:r.note});}
    catch(e){addErr(t("Skipped “{name}”: the image couldn't be read.",{name:f.name}));}}
  if(!items.length)throw new Error(t("No images could be compressed."));
  return {items,compare:true,label:o.mode==="target"?t("target {size} each",{size:sizeLabel(o.kb)}):t("quality {q}",{q:Math.round(o.q*100)}),fit:o.mode==="target"?o.kb:0,zipName:"saralpdf-compressed.zip"};
}
async function runResize(files){
  const mode=radio("rs-mode"),unit=radio("rs-unit"),dpi=rsDpi(),W=Math.round(toPx(+$("#rs-w").value)),H=Math.round(toPx(+$("#rs-h").value)),lock=$("#rs-lock").checked,pct=+$("#rs-pct").value/100,fmtSel=$("#rs-fmt").value;
  const phys=mode==="px"&&unit!=="px";
  if(mode==="px"&&(!(W>0)||!(H>0)))throw new Error(t("Enter a width and height greater than 0."));
  if(mode==="pct"&&!(pct>0))throw new Error(t("Enter a percentage greater than 0."));
  const items=[];
  for(let i=0;i<files.length;i++){const f=files[i];prog(i,files.length,t("Resizing {i} of {n}",{i:i+1,n:files.length})+" · "+f.name);await tick();
    try{
      const img=await imgFromFile(f.file);const iw=img.naturalWidth,ih=img.naturalHeight;let w,h;
      if(mode==="pct"){w=iw*pct;h=ih*pct;}else if(lock){const s=Math.min(W/iw,H/ih);w=iw*s;h=ih*s;}else{w=W;h=H;}
      w=Math.min(10000,Math.max(1,Math.round(w)));h=Math.min(10000,Math.max(1,Math.round(h)));
      const type=fmtSel==="keep"?origType(f):fmtSel;
      const c=canvasFor(img,w,h,type==="image/jpeg");let blob=await toBlob(c,type,0.92);
      if(phys&&blob.type==="image/jpeg")blob=await setJpegDpi(blob,dpi);
      items.push({name:base(f.name)+"-"+w+"x"+h+"."+extFor(blob.type||type),blob,before:f.size,dims:iw+" × "+ih+" → "+w+" × "+h+" px"});
    }catch(e){addErr(t("Skipped “{name}”: the image couldn't be read.",{name:f.name}));}}
  if(!items.length)throw new Error(t("No images could be resized."));
  return {items,compare:true,label:mode==="pct"?t("scaled to {n}%",{n:Math.round(pct*100)}):t(lock?"fit within {w} × {h} px":"exactly {w} × {h} px",{w:W,h:H})+(phys?" · "+(+$("#rs-w").value)+" × "+(+$("#rs-h").value)+" "+unit+" @ "+dpi+" DPI":""),zipName:"saralpdf-resized.zip"};
}
async function runCrop(files){
  const fmtSel=$("#cr-fmt").value;const items=[];
  for(let i=0;i<files.length;i++){const f=files[i];prog(i,files.length,t("Cropping {i} of {n}",{i:i+1,n:files.length})+" · "+f.name);await tick();
    try{
      const c=await croppedCanvas(f);const type=fmtSel==="keep"?origType(f):fmtSel;
      let out=c;if(type==="image/jpeg"){out=document.createElement("canvas");out.width=c.width;out.height=c.height;const x=out.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.drawImage(c,0,0);}
      const blob=await toBlob(out,type,0.92);
      items.push({name:base(f.name)+"-cropped."+extFor(blob.type||type),blob,before:f.size,dims:c.width+" × "+c.height+" px",preview:URL.createObjectURL(blob)});
    }catch(e){addErr(t("Skipped “{name}”: the image couldn't be read.",{name:f.name}));}}
  if(!items.length)throw new Error(t("No images could be cropped."));
  return {items,compare:false,label:imagesN(items.length),zipName:"saralpdf-cropped.zip"};
}
function presetVals(){
  return {w:Math.round(+$("#ex-w").value),h:Math.round(+$("#ex-h").value),min:Math.max(0,+$("#ex-min").value||0),max:Math.max(1,+$("#ex-max").value||1)};
}
async function runExam(files){
  const p=presetVals();const pre=PRESETS.find(x=>x.id===$("#ex-preset").value);
  if(!(p.w>0&&p.h>0))throw new Error(t("Enter a width and height greater than 0."));
  if(p.min>p.max)throw new Error(t("The minimum KB can't be more than the maximum."));
  const items=[];
  for(let i=0;i<files.length;i++){const f=files[i];prog(i,files.length,t("Preparing {i} of {n}",{i:i+1,n:files.length})+" · "+f.name);await tick();
    try{
      const crop=await croppedCanvas(f);
      const c=document.createElement("canvas");c.width=p.w;c.height=p.h;const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,p.w,p.h);
      x.imageSmoothingQuality="high";x.drawImage(crop,0,0,p.w,p.h);
      let {best,smallest}=await fitUnder(c,p.w,p.h,"image/jpeg",p.max*1024,false);
      let blob,note="";
      if(best)blob=best.blob;else{blob=smallest.blob;note=t("Couldn't get under {kb} KB at this size. Try a simpler photo or a higher limit.",{kb:p.max});}
      if(p.min&&blob.size<p.min*1024){
        const hiQ=await toBlob(c,"image/jpeg",1);if(hiQ.size<=p.max*1024&&hiQ.size>blob.size)blob=hiQ;
        if(blob.size<p.min*1024){blob=await padJpeg(blob,Math.min(p.min*1024+512,p.max*1024));note=t("Size raised to meet the {kb} KB minimum. The image itself is unchanged.",{kb:p.min});}
      }
      const tag=pre&&pre.id!=="custom"?pre.id.replace(/_/g,"-"):"exam";
      items.push({name:tag+"-"+p.w+"x"+p.h+".jpg",blob,before:f.size,dims:p.w+" × "+p.h+" px",preview:URL.createObjectURL(blob),note});
    }catch(e){addErr(t("Skipped “{name}”: the image couldn't be read.",{name:f.name}));}}
  if(!items.length)throw new Error(t("No images could be prepared."));
  return {items,compare:false,label:(pre&&pre.id!=="custom"?t(pre.name)+" · ":"")+p.w+" × "+p.h+" px · "+(p.min?p.min+"–":"≤ ")+p.max+" KB",zipName:"saralpdf-exam-files.zip"};
}
async function runConvert(files){
  const type=radio("cv-fmt"),q=+$("#cv-q").value/100;const items=[];
  for(let i=0;i<files.length;i++){const f=files[i];prog(i,files.length,t("Converting {i} of {n}",{i:i+1,n:files.length})+" · "+f.name);await tick();
    try{
      const img=await imgFromFile(f.file);const c=canvasFor(img,img.naturalWidth,img.naturalHeight,type==="image/jpeg");
      const blob=await toBlob(c,type,type==="image/png"?undefined:q);
      items.push({name:base(f.name)+"."+extFor(type),blob,before:f.origSize||f.size,dims:c.width+" × "+c.height+" px",note:f.converted?t("Converted from iPhone HEIC."):""});
    }catch(e){addErr(t("Skipped “{name}”: the image couldn't be read.",{name:f.name}));}}
  if(!items.length)throw new Error(t("No images could be converted."));
  return {items,compare:true,label:t("converted to {f}",{f:extFor(type).toUpperCase()}),zipName:"saralpdf-converted.zip"};
}
const PC_LEVEL={light:{dpi:150,q:0.8,label:"Light",help:"150 DPI, high quality. Smaller savings."},medium:{dpi:110,q:0.62,label:"Recommended",help:"110 DPI, good quality. Suits most forms and email."},strong:{dpi:80,q:0.45,label:"Strong",help:"80 DPI, smallest files. Small text may blur."}};
const PC_TARGET_DPI=150;
async function pdfCompressTarget(f,d,maxKb,gray,step){
  const maxBytes=maxKb*1024,size=sizeLabel(maxKb);
  if(f.size<=maxBytes){step(d.numPages);return {blob:f.file,name:f.name,note:t("Already under {size}, so the original was kept.",{size})};}
  const srcs=[];
  for(let p=1;p<=d.numPages;p++){
    step(1);await tick();
    const pg=await d.getPage(p);const v1=pg.getViewport({scale:1});
    let scale=PC_TARGET_DPI/72;if(Math.max(v1.width,v1.height)*scale>3000)scale=3000/Math.max(v1.width,v1.height);
    const c=renderCanvas(pg,scale,gray);await c.done;
    srcs.push({blob:await toBlob(c.canvas,"image/jpeg",0.92),w:c.canvas.width,h:c.canvas.height,pw:v1.width,ph:v1.height});
    c.canvas.width=c.canvas.height=0;
  }
  const fit=await fitPdf(srcs,maxBytes,async jpgs=>{
    const out=await PDFLib.PDFDocument.create();
    for(let i=0;i<jpgs.length;i++){const s=srcs[i];out.addPage([s.pw,s.ph]).drawImage(await out.embedJpg(await jpgs[i].arrayBuffer()),{x:0,y:0,width:s.pw,height:s.ph});}
    return out.save({useObjectStreams:true});
  },sc=>prog(1,1,t("Finding the best quality under {size}…",{size})+" · "+f.name+" · "+Math.round(PC_TARGET_DPI*sc)+" DPI"));
  const blob=new Blob([fit.bytes],{type:"application/pdf"});
  if(!fit.ok&&blob.size>=f.size)return {blob:f.file,name:f.name,note:t("Couldn't get under {size}. This is the smallest version.",{size})};
  return {blob,name:base(f.name)+"-compressed.pdf",dpi:Math.round(PC_TARGET_DPI*fit.scale),note:fit.ok?"":t("Couldn't get under {size}. This is the smallest version.",{size})};
}
function renderCanvas(pg,scale,gray){
  const v=pg.getViewport({scale});const c=document.createElement("canvas");c.width=Math.ceil(v.width);c.height=Math.ceil(v.height);
  const ctx=c.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,c.width,c.height);
  const done=pg.render({canvasContext:ctx,viewport:v}).promise.then(()=>{
    if(gray){const im=ctx.getImageData(0,0,c.width,c.height),a=im.data;for(let i=0;i<a.length;i+=4){const y=a[i]*.299+a[i+1]*.587+a[i+2]*.114;a[i]=a[i+1]=a[i+2]=y;}ctx.putImageData(im,0,0);}});
  return {canvas:c,done};
}
async function runPdfCompress(files){
  const {PDFDocument}=PDFLib;const lv=PC_LEVEL[radio("pc-level")],gray=$("#pc-gray").checked;
  const maxKb=radio("pc-mode")==="target"?sizeKb("#pc-kb","#pc-unit"):0;
  if(radio("pc-mode")==="target"&&!maxKb)throw new Error(t("Enter a target size greater than 0."));
  const docs=[];let total=0;
  for(const f of files){try{const d=await openPdf(f);docs.push({f,d});total+=d.numPages;}catch(e){addErr(pdfErr(f,e));}}
  if(!total)throw new Error(t("No readable PDFs to compress."));
  const items=[];let done=0;
  for(const {f,d} of docs){
    if(maxKb){
      const r=await pdfCompressTarget(f,d,maxKb,gray,k=>{done+=k;prog(done,total,t("Page {i} of {n}",{i:Math.min(done,total),n:total})+" · "+f.name);});
      items.push({name:r.name,blob:r.blob,before:f.size,dims:pages(d.numPages)+(r.dpi?" · "+r.dpi+" DPI":""),note:r.note});
      closeDoc(d);continue;
    }
    const out=await PDFDocument.create();
    for(let p=1;p<=d.numPages;p++){
      prog(done,total,t("Page {i} of {n}",{i:done+1,n:total})+" · "+f.name);await tick();
      const pg=await d.getPage(p);const v1=pg.getViewport({scale:1});
      let scale=lv.dpi/72;if(Math.max(v1.width,v1.height)*scale>6000)scale=6000/Math.max(v1.width,v1.height);
      const v=pg.getViewport({scale});const c=document.createElement("canvas");c.width=Math.ceil(v.width);c.height=Math.ceil(v.height);
      const ctx=c.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,c.width,c.height);
      await pg.render({canvasContext:ctx,viewport:v}).promise;
      if(gray){const im=ctx.getImageData(0,0,c.width,c.height),a=im.data;for(let i=0;i<a.length;i+=4){const y=a[i]*.299+a[i+1]*.587+a[i+2]*.114;a[i]=a[i+1]=a[i+2]=y;}ctx.putImageData(im,0,0);}
      const jpg=await toBlob(c,"image/jpeg",lv.q);const emb=await out.embedJpg(await jpg.arrayBuffer());
      out.addPage([v1.width,v1.height]).drawImage(emb,{x:0,y:0,width:v1.width,height:v1.height});
      c.width=c.height=0;done++;
    }
    prog(done,total,t("Writing {name}…",{name:f.name}));await tick();
    let blob=new Blob([await out.save({useObjectStreams:true})],{type:"application/pdf"});let note="",name=base(f.name)+"-compressed.pdf";
    if(blob.size>=f.size){blob=f.file;name=f.name;note=t("This PDF is already compact, so the original was kept.");}
    items.push({name,blob,before:f.size,dims:pages(d.numPages),note});
    closeDoc(d);
  }
  return {items,compare:true,label:(maxKb?t("target {size} each",{size:sizeLabel(maxKb)}):t(lv.label))+(gray?" · "+t("black and white"):""),fit:maxKb,zipName:"saralpdf-compressed-pdfs.zip"};
}
const BG_LIB="https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.8/+esm";
let bgLibP=null;
function loadBgLib(){if(!bgLibP)bgLibP=import(BG_LIB).catch(e=>{bgLibP=null;throw e;});return bgLibP;}
const bgOffline=()=>t("The AI model couldn't be downloaded. Check your internet connection and try again.");
async function runBgRemove(files){
  const out=radio("bg-out"),model=radio("bg-model");const fill=out==="color"?$("#bg-color").value:(out==="none"?null:out);
  prog(0,files.length,t("Loading the background remover…"));await tick();
  let lib;try{lib=await loadBgLib();}catch(e){throw new Error(bgOffline());}
  const removeBackground=lib.removeBackground||(lib.default&&lib.default.removeBackground)||lib.default;
  if(typeof removeBackground!=="function")throw new Error(bgOffline());
  const items=[];
  for(let i=0;i<files.length;i++){
    const f=files[i];const label=t("Removing background {i} of {n}",{i:i+1,n:files.length})+" · "+f.name;prog(i,files.length,label);await tick();
    try{
      const cut=await removeBackground(f.file,{model,output:{format:"image/png"},progress:(key,cur,tot)=>{
        if(/fetch/.test(key)&&tot>0)prog(cur,tot,t("Downloading AI model (first time only)")+" · "+fmt(cur)+" / "+fmt(tot));
        else if(/compute/.test(key))prog(i,files.length,label);}});
      let blob=cut,type="image/png";
      const url=URL.createObjectURL(cut);const img=await loadImage(url);
      if(fill){const c=document.createElement("canvas");c.width=img.naturalWidth;c.height=img.naturalHeight;const x=c.getContext("2d");x.fillStyle=fill;x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0);
        blob=await toBlob(c,"image/jpeg",0.92);type="image/jpeg";URL.revokeObjectURL(url);}
      items.push({name:base(f.name)+"-no-bg."+extFor(type),blob,before:f.size,dims:img.naturalWidth+" × "+img.naturalHeight+" px",preview:fill?URL.createObjectURL(blob):url});
    }catch(e){
      const msg=String(e&&e.message||e);
      if(/fetch|network|load|404|Failed/i.test(msg)&&!items.length)throw new Error(bgOffline());
      addErr(t("Skipped “{name}”: the background couldn't be removed.",{name:f.name}));
    }
  }
  if(!items.length)throw new Error(t("No backgrounds could be removed."));
  return {items,compare:false,label:(fill?t("on a solid background")+" · JPG":t("transparent PNG"))+" · "+imagesN(items.length),zipName:"saralpdf-no-background.zip"};
}
/* ---------- enhance ---------- */
const ENH={
  photo:{low:{lo:.002,hi:.998,sat:.08,sharp:.25},medium:{lo:.005,hi:.995,sat:.15,sharp:.5},high:{lo:.01,hi:.99,sat:.25,sharp:.85}},
  doc:{low:{lo:.01,hi:.98,sat:0,sharp:.2},medium:{lo:.03,hi:.95,sat:0,sharp:.4},high:{lo:.06,hi:.9,sat:0,sharp:.7}}
};
function lumHist(d){const h=new Uint32Array(256);for(let i=0;i<d.length;i+=4)h[(d[i]*77+d[i+1]*150+d[i+2]*29)>>8]++;return h;}
function levels(d,lo,hi){
  const h=lumHist(d),n=d.length/4;let c=0,lv=0,hv=255;
  for(let v=0;v<256;v++){c+=h[v];if(c>=n*lo){lv=v;break;}}
  c=0;for(let v=255;v>=0;v--){c+=h[v];if(c>=n*(1-hi)){hv=v;break;}}
  if(hv-lv<24)return;const s=255/(hv-lv);
  for(let i=0;i<d.length;i+=4){d[i]=(d[i]-lv)*s;d[i+1]=(d[i+1]-lv)*s;d[i+2]=(d[i+2]-lv)*s;}
}
function saturate(d,a){for(let i=0;i<d.length;i+=4){const g=(d[i]*77+d[i+1]*150+d[i+2]*29)>>8;d[i]=g+(d[i]-g)*(1+a);d[i+1]=g+(d[i+1]-g)*(1+a);d[i+2]=g+(d[i+2]-g)*(1+a);}}
function toGray(d){for(let i=0;i<d.length;i+=4){const g=(d[i]*77+d[i+1]*150+d[i+2]*29)>>8;d[i]=d[i+1]=d[i+2]=g;}}
function sharpen(d,w,h,a){
  const s=d.slice(),r=w*4;
  for(let y=1;y<h-1;y++){let i=y*r+4;for(let x=1;x<w-1;x++,i+=4){
    for(let k=0;k<3;k++){const j=i+k,c=s[j];d[j]=c+a*(4*c-s[j-4]-s[j+4]-s[j-r]-s[j+r]);}}}
}
function otsu(d){const h=lumHist(d),n=d.length/4;let sum=0;for(let i=0;i<256;i++)sum+=i*h[i];
  let sB=0,wB=0,best=0,th=128;for(let i=0;i<256;i++){wB+=h[i];if(!wB)continue;const wF=n-wB;if(!wF)break;sB+=i*h[i];
    const mB=sB/wB,mF=(sum-sB)/wF,v=wB*wF*(mB-mF)*(mB-mF);if(v>best){best=v;th=i;}}return th;}
function threshold(d,th){for(let i=0;i<d.length;i+=4){const v=d[i]>th?255:0;d[i]=d[i+1]=d[i+2]=v;}}
function backgroundOf(c){
  const w=c.width,h=c.height,sw=Math.max(8,Math.round(w/24)),sh=Math.max(8,Math.round(h/24));
  const sm=document.createElement("canvas");sm.width=sw;sm.height=sh;const sx=sm.getContext("2d",{willReadFrequently:true});
  sx.imageSmoothingQuality="high";sx.drawImage(c,0,0,sw,sh);
  const im=sx.getImageData(0,0,sw,sh);const d=im.data;
  for(let it=0;it<3;it++){const s=d.slice();
    for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){const i=(y*sw+x)*4;
      for(let k=0;k<3;k++){let m=0;for(let dy=-1;dy<=1;dy++){const yy=y+dy;if(yy<0||yy>=sh)continue;for(let dx=-1;dx<=1;dx++){const xx=x+dx;if(xx<0||xx>=sw)continue;const v=s[(yy*sw+xx)*4+k];if(v>m)m=v;}}d[i+k]=m;}}}
  sx.putImageData(im,0,0);
  const big=document.createElement("canvas");big.width=w;big.height=h;const bx=big.getContext("2d",{willReadFrequently:true});
  bx.imageSmoothingEnabled=true;bx.imageSmoothingQuality="high";bx.drawImage(sm,0,0,w,h);
  const out=bx.getImageData(0,0,w,h).data;big.width=big.height=0;return out;
}
function enhanceCanvas(c,mode,lvl,color){
  const w=c.width,h=c.height,ctx=c.getContext("2d",{willReadFrequently:true});const P=ENH[mode][lvl];
  const bg=mode==="doc"?backgroundOf(c):null;
  const im=ctx.getImageData(0,0,w,h),d=im.data;
  if(bg){for(let i=0;i<d.length;i+=4){d[i]=d[i]*255/(bg[i]||1);d[i+1]=d[i+1]*255/(bg[i+1]||1);d[i+2]=d[i+2]*255/(bg[i+2]||1);}}
  if(mode==="doc"&&color!=="colour")toGray(d);
  levels(d,P.lo,P.hi);
  if(P.sat)saturate(d,P.sat);
  if(P.sharp)sharpen(d,w,h,P.sharp);
  if(mode==="doc"&&color==="bw")threshold(d,otsu(d));
  ctx.putImageData(im,0,0);
}
async function runEnhance(files){
  const {PDFDocument}=PDFLib;const pick=radio("en-mode"),lvl=radio("en-lvl"),color=$("#en-color").value,dpi=+$("#en-dpi").value;
  const total=files.reduce((a,f)=>a+(f.kind==="pdf"?(f.pages||1):1),0);let done=0;const items=[];
  for(const f of files){
    const mode=pick==="auto"?(f.kind==="pdf"?"doc":"photo"):pick;
    try{
      if(f.kind==="pdf"){
        const d=await openPdf(f);const out=await PDFDocument.create();
        for(let p=1;p<=d.numPages;p++){
          prog(done,total,t("Enhancing page {i} of {n}",{i:p,n:d.numPages})+" · "+f.name);await tick();
          const pg=await d.getPage(p);const v1=pg.getViewport({scale:1});let scale=dpi/72;
          if(Math.max(v1.width,v1.height)*scale>5000)scale=5000/Math.max(v1.width,v1.height);
          const v=pg.getViewport({scale});const c=document.createElement("canvas");c.width=Math.ceil(v.width);c.height=Math.ceil(v.height);
          const ctx=c.getContext("2d",{willReadFrequently:true});ctx.fillStyle="#fff";ctx.fillRect(0,0,c.width,c.height);
          await pg.render({canvasContext:ctx,viewport:v}).promise;await tick();
          enhanceCanvas(c,mode,lvl,color);
          const jpg=await toBlob(c,"image/jpeg",mode==="doc"&&color==="bw"?0.8:0.86);
          out.addPage([v1.width,v1.height]).drawImage(await out.embedJpg(await jpg.arrayBuffer()),{x:0,y:0,width:v1.width,height:v1.height});
          c.width=c.height=0;done++;
        }
        const blob=new Blob([await out.save({useObjectStreams:true})],{type:"application/pdf"});
        items.push({name:base(f.name)+"-enhanced.pdf",blob,before:f.size,dims:pages(d.numPages)+" · "+t(mode==="doc"?"document":"photo")});
        closeDoc(d);
      }else{
        prog(done,total,t("Enhancing {name}",{name:f.name}));await tick();
        const img=await imgFromFile(f.file);let w=img.naturalWidth,h=img.naturalHeight;if(Math.max(w,h)>8000){const s=8000/Math.max(w,h);w*=s;h*=s;}
        const orig=origType(f);const c=canvasFor(img,w,h,orig==="image/jpeg");await tick();
        enhanceCanvas(c,mode,lvl,color);
        const blob=await toBlob(c,orig,0.92);
        items.push({name:base(f.name)+"-enhanced."+extFor(blob.type||orig),blob,before:f.size,dims:c.width+" × "+c.height+" px · "+t(mode==="doc"?"document":"photo"),preview:URL.createObjectURL(blob)});
        done++;
      }
    }catch(e){addErr(isLockedErr(e)?t("Skipped “{name}”: it's password-protected.",{name:f.name}):t("Skipped “{name}”: it couldn't be read.",{name:f.name}));done++;}
  }
  if(!items.length)throw new Error(t("Nothing could be enhanced."));
  const L={low:"Gentle",medium:"Medium",high:"Strong"}[lvl];
  return {items,compare:false,label:t(L)+" · "+filesN(items.length),zipName:"saralpdf-enhanced.zip"};
}
const RUN={img2pdf:runImg2Pdf,pdf2img:runPdf2Img,merge:runMerge,pdfcompress:runPdfCompress,compress:runCompress,resize:runResize,crop:runCrop,exam:runExam,convert:runConvert,enhance:runEnhance,bgremove:runBgRemove};

async function run(){
  if(st.busy)return;const files=st.files.filter(f=>!f.bad);if(files.length<TOOLS[st.tool].min)return;
  st.busy=true;errs=[];showErrors();st.results=null;renderResults();updateRun();
  try{st.results=await RUN[st.tool](files);toast(st.results.items.length>1?t("Done. Your files are ready to download."):t("Done. Your file is ready to download."));}
  catch(e){addErr(e.message||t("Something went wrong while processing."));}
  finally{st.busy=false;progDone();updateRun();renderResults();
    if(st.results)$("#results").scrollIntoView({behavior:"smooth",block:"nearest"});}
}

/* ---------- settings UI ---------- */
function syncEnhanceUI(){const m=radio("en-mode");$("#en-color-field").hidden=m==="photo";
  $("#en-mode-help").textContent=t({auto:"Auto treats PDFs as documents and images as photos.",photo:"Brightens, balances contrast, boosts colour and sharpens.",doc:"Removes shadows, whitens the paper and darkens the text."}[m]);}
document.querySelectorAll('input[name="en-mode"]').forEach(r=>r.addEventListener("change",syncEnhanceUI));
function syncPcHelp(){$("#pc-help").textContent=t(PC_LEVEL[radio("pc-level")].help);}
document.querySelectorAll('input[name="pc-level"]').forEach(r=>r.addEventListener("change",syncPcHelp));
document.querySelectorAll('input[name="bg-out"]').forEach(r=>r.addEventListener("change",()=>{$("#bg-color-field").hidden=radio("bg-out")!=="color";}));
$("#bg-swatches").addEventListener("click",e=>{const c=e.target.closest("[data-color]");if(c)$("#bg-color").value=c.dataset.color;});
function syncResizeDefaults(){const f=st.files.find(x=>x.w);if(!f)return;$("#rs-w").value=fromPx(Math.round(f.w/2));$("#rs-h").value=fromPx(Math.round(f.h/2));syncRsOut();}
/* resize units: physical sizes become pixels through the DPI */
const PER_INCH={cm:2.54,mm:25.4,in:1};
const rsDpi=()=>Math.max(1,+$("#rs-dpi").value||300);
function toPx(v,u){u=u||radio("rs-unit");return u==="px"?v:v/PER_INCH[u]*rsDpi();}
function fromPx(px,u){u=u||radio("rs-unit");if(u==="px")return Math.round(px);const v=px/rsDpi()*PER_INCH[u];return +v.toFixed(u==="mm"?1:2);}
let rsUnitPrev="px";
function syncRsUnit(){
  const u=radio("rs-unit");
  ["#rs-w","#rs-h"].forEach(s=>{const v=+$(s).value;if(v>0)$(s).value=fromPx(toPx(v,rsUnitPrev),u);$(s).step=u==="px"?"1":"any";});
  rsUnitPrev=u;$("#rs-dpi-field").hidden=u==="px";syncRsOut();
}
function syncRsOut(){
  const u=radio("rs-unit"),w=Math.round(toPx(+$("#rs-w").value)),h=Math.round(toPx(+$("#rs-h").value));
  setEst("#rs-out",u==="px"||!(w>0&&h>0)?"":esc(t("= {w} × {h} px at {dpi} DPI",{w,h,dpi:rsDpi()})));
}
["#rs-w","#rs-h"].forEach(s=>$(s).addEventListener("input",()=>setTimeout(syncRsOut)));$("#rs-dpi").addEventListener("change",syncRsOut);
document.querySelectorAll('input[name="rs-unit"]').forEach(r=>r.addEventListener("change",syncRsUnit));
function ratio(){const f=st.files.find(x=>x.w);return f?f.h/f.w:null;}
function syncRsHelp(){$("#rs-help").textContent=t($("#rs-lock").checked?"With aspect ratio kept, each image fits inside this box.":"Every image is stretched to exactly this size.");}
function syncConvertUI(){$("#cv-q-field").hidden=radio("cv-fmt")==="image/png";}
document.querySelectorAll('input[name="cv-fmt"]').forEach(r=>r.addEventListener("change",syncConvertUI));
$("#cv-q").addEventListener("input",()=>$("#cv-q-out").value=$("#cv-q").value);
// exam presets
function buildPresetSelect(){
  const sel=$("#ex-preset");const cur=sel.value||"ibps_photo";const groups=[...new Set(PRESETS.map(p=>p.group))];
  sel.innerHTML=groups.map(g=>'<optgroup label="'+esc(t(g))+'">'+PRESETS.filter(p=>p.group===g).map(p=>'<option value="'+p.id+'">'+esc(t(p.name))+'</option>').join("")+'</optgroup>').join("");
  sel.value=cur;
}
function syncPreset(apply){
  const p=PRESETS.find(x=>x.id===$("#ex-preset").value)||PRESETS[0];
  if(apply){$("#ex-w").value=p.w;$("#ex-h").value=p.h;$("#ex-min").value=p.min;$("#ex-max").value=p.max;}
  const v=presetVals();
  $("#ex-summary").textContent=v.w+" × "+v.h+" px · "+(v.min?v.min+"–"+v.max:"≤ "+v.max)+" KB · JPG";
  $("#ex-note").textContent=t(p.note);
}
$("#ex-preset").addEventListener("change",()=>{syncPreset(true);st.files.forEach(f=>f.crop=null);renderEditor();});
["#ex-w","#ex-h","#ex-min","#ex-max"].forEach(s=>$(s).addEventListener("input",()=>{syncPreset(false);if(s==="#ex-w"||s==="#ex-h"){st.files.forEach(f=>f.crop=null);renderEditor();}}));

/* ---------- tool switching ---------- */
function selectTool(k,how){
  if(!TOOLS[k]||st.busy)return;
  if(k===st.tool&&how!=="init")return;
  st.tool=k;st.results=null;errs=[];
  st.files=st.files.filter(f=>accepts(TOOLS[k],f.kind));
  if(TOOLS[k].editor&&!fileById(st.sel))st.sel=st.files.find(x=>x.img)?.id||null;
  if(k==="resize")syncResizeDefaults();
  render();
  if(how==="click"){
    try{history.pushState({tool:k},"","/"+SLUG[k]+"/");}catch(_){}
    document.title=t(TOOLS[k].name)+" – SaralPDF";
  }
}
document.addEventListener("click",e=>{
  const a=e.target.closest("a.tool[data-tool]");if(!a||e.ctrlKey||e.metaKey||e.shiftKey||e.button)return;
  if(!TOOLS[a.dataset.tool])return;e.preventDefault();selectTool(a.dataset.tool,"click");
});
window.addEventListener("popstate",()=>{selectTool(toolFromLocation()||page.tool||"img2pdf","pop");});
function toolFromLocation(){
  const seg=location.pathname.replace(/\/+$/,"").split("/").pop();
  return FROM_SLUG[seg]||FROM_SLUG[(location.hash||"").slice(1)]||null;
}

/* ---------- events ---------- */
const picker=$("#picker");picker.addEventListener("change",()=>{addFiles(picker.files);picker.value="";});
const drop=$("#drop");
["dragenter","dragover"].forEach(ev=>drop.addEventListener(ev,e=>{if(e.dataTransfer&&[...e.dataTransfer.types].includes("Files")){e.preventDefault();drop.classList.add("over");}}));
["dragleave","drop"].forEach(ev=>drop.addEventListener(ev,()=>drop.classList.remove("over")));
drop.addEventListener("drop",e=>{e.preventDefault();addFiles(e.dataTransfer.files);});
window.addEventListener("dragover",e=>{if(e.dataTransfer&&[...e.dataTransfer.types].includes("Files"))e.preventDefault();});
window.addEventListener("drop",e=>{if(e.dataTransfer&&e.dataTransfer.files.length){e.preventDefault();addFiles(e.dataTransfer.files);}});
document.addEventListener("paste",e=>{
  if(e.target.matches&&e.target.matches("input[type=text],input[type=number]"))return;
  const fs=[...(e.clipboardData?e.clipboardData.files:[])];if(!fs.length)return;e.preventDefault();
  addFiles(fs.map((f,i)=>new File([f],f.name&&f.name!=="image.png"?f.name:"pasted-"+Date.now()+"-"+(i+1)+"."+(f.type.split("/")[1]||"png"),{type:f.type})));
});
const ul=$("#files");
ul.addEventListener("click",e=>{
  const li=e.target.closest("li");if(!li||st.busy)return;const id=+li.dataset.id;const i=st.files.findIndex(f=>f.id===id);if(i<0)return;
  const b=e.target.closest("[data-act]");
  if(!b){if(TOOLS[st.tool].editor&&st.files[i].img){st.sel=id;renderFiles();renderEditor();}return;}
  const a=b.dataset.act;
  if(a==="rm"){const [r]=st.files.splice(i,1);if(r.thumb&&r.kind==="image")URL.revokeObjectURL(r.thumb);if(st.sel===id)st.sel=null;}
  else if(a==="up"&&i>0)[st.files[i-1],st.files[i]]=[st.files[i],st.files[i-1]];
  else if(a==="down"&&i<st.files.length-1)[st.files[i+1],st.files[i]]=[st.files[i],st.files[i+1]];
  st.results=null;renderFiles();updateRun();renderResults();renderEditor();
  const nb=ul.querySelector('[data-id="'+id+'"] [data-act="'+a+'"]');if(nb&&!nb.disabled)nb.focus();
});
let dragId=null;
ul.addEventListener("dragstart",e=>{const li=e.target.closest("li");if(!li||!TOOLS[st.tool].reorder)return;dragId=+li.dataset.id;li.classList.add("dragging");e.dataTransfer.effectAllowed="move";try{e.dataTransfer.setData("text/plain",String(dragId));}catch(_){}});
ul.addEventListener("dragend",()=>{dragId=null;ul.querySelectorAll("li").forEach(l=>l.classList.remove("dragging","drop-before","drop-after"));});
ul.addEventListener("dragover",e=>{if(dragId==null)return;e.preventDefault();e.stopPropagation();const li=e.target.closest("li");ul.querySelectorAll("li").forEach(l=>l.classList.remove("drop-before","drop-after"));
  if(!li||+li.dataset.id===dragId)return;const r=li.getBoundingClientRect();li.classList.add(e.clientY<r.top+r.height/2?"drop-before":"drop-after");});
ul.addEventListener("drop",e=>{if(dragId==null)return;e.preventDefault();e.stopPropagation();const li=e.target.closest("li");if(!li)return;
  const tid=+li.dataset.id;if(tid===dragId)return;const after=li.classList.contains("drop-after");
  const from=st.files.findIndex(f=>f.id===dragId);const [m]=st.files.splice(from,1);let to=st.files.findIndex(f=>f.id===tid);if(after)to++;st.files.splice(to,0,m);
  dragId=null;st.results=null;renderFiles();renderResults();});
$("#clear").addEventListener("click",startOver);
function startOver(){if(st.busy)return;st.files.forEach(f=>{if(f.thumb&&f.kind==="image")URL.revokeObjectURL(f.thumb);});st.files=[];st.results=null;st.sel=null;errs=[];render();}
$("#run").addEventListener("click",run);
$("#results").addEventListener("click",e=>{
  const s=e.target.closest("[data-save]");if(s){const it=st.results.items[+s.dataset.save];save(it.blob,it.name);return;}
  if(e.target.closest("#zip-btn")){saveZip();return;}
  if(e.target.closest("#again"))startOver();
});
$("#chain").addEventListener("click",e=>{const c=e.target.closest("[data-chain]");if(c)continueWith(c.dataset.chain);});
$("#try-example").addEventListener("click",()=>{loadSamples();});
/* whole-page drop overlay */
(function(){let depth=0;const ov=$("#drop-overlay");const isFiles=e=>e.dataTransfer&&[...e.dataTransfer.types].includes("Files");
  window.addEventListener("dragenter",e=>{if(!isFiles(e))return;depth++;ov.hidden=false;});
  window.addEventListener("dragleave",e=>{if(!isFiles(e))return;depth=Math.max(0,depth-1);if(!depth)ov.hidden=true;});
  window.addEventListener("drop",()=>{depth=0;ov.hidden=true;});})();
const cpq=$("#cp-q");cpq.addEventListener("input",()=>$("#cp-q-out").value=cpq.value);
function syncCpMode(){const tg=radio("cp-mode")==="target";$("#cp-t-field").hidden=!tg;$("#cp-q-field").hidden=tg;syncSizeEst();}
document.querySelectorAll('input[name="cp-mode"]').forEach(r=>r.addEventListener("change",syncCpMode));
function syncPcMode(){const tg=radio("pc-mode")==="target";$("#pc-t-field").hidden=!tg;$("#pc-level-field").hidden=tg;syncSizeEst();}
document.querySelectorAll('input[name="pc-mode"]').forEach(r=>r.addEventListener("change",syncPcMode));
const SIZE_BOX={compress:["cp-mode","#cp-kb","#cp-unit","#cp-chips"],pdfcompress:["pc-mode","#pc-kb","#pc-unit","#pc-chips"],img2pdf:[null,"#i2p-kb","#i2p-unit","#i2p-chips"]};
const markSize={};Object.entries(SIZE_BOX).forEach(([k,b])=>{markSize[k]=bindSizeChips(b[3],b[1],b[2]);
  [b[1],b[2],b[3]].forEach(s=>["input","change","click"].forEach(ev=>$(s).addEventListener(ev,syncSizeEst)));});
["#cp-grow"].forEach(s=>$(s).addEventListener("change",syncSizeEst));
/* live hint under each size box: how the target compares to the files added */
function setEst(id,html,warn){const el=$(id);el.hidden=!html;el.innerHTML=html||"";el.classList.toggle("warn",!!warn);}
function syncSizeEst(){
  const ok=st.files.filter(f=>!f.bad),big=ok.reduce((a,f)=>Math.max(a,f.size),0);
  const smaller=(from,kb)=>' <span class="down">'+esc(t("about {n}% smaller",{n:Math.max(1,Math.round((1-kb*1024/from)*100))}))+'</span>';
  if(st.tool==="pdfcompress"){
    const kb=sizeKb("#pc-kb","#pc-unit"),size=sizeLabel(kb);
    if(!ok.length||!kb||radio("pc-mode")!=="target")return setEst("#pc-est","");
    if(big<=kb*1024)return setEst("#pc-est",esc(t(ok.length>1?"All your PDFs are already under {size}. They will be kept as they are.":"Your PDF is already under {size}. It will be kept as it is.",{size})));
    const pg=Math.max(...ok.map(f=>f.pages||1));
    if(kb*1024/pg<12*1024)return setEst("#pc-est",esc(t("{size} is very small for {n} pages. Text may be hard to read.",{size,n:pg})),true);
    return setEst("#pc-est",esc(fmt(big))+" → "+esc(t("under {size}",{size}))+smaller(big,kb));
  }
  if(st.tool==="compress"){
    const kb=sizeKb("#cp-kb","#cp-unit"),size=sizeLabel(kb);
    if(!ok.length||!kb||radio("cp-mode")!=="target")return setEst("#cp-est","");
    if(big<=kb*1024)return setEst("#cp-est",esc($("#cp-grow").checked?t("{from} → about {size}. The file is made bigger, the picture stays the same.",{from:fmt(big),size}):t("Already under {size}. Tick the box below if your form needs a bigger file.",{size})));
    return setEst("#cp-est",esc(fmt(big))+" → "+esc(t("under {size}",{size}))+smaller(big,kb));
  }
  if(st.tool==="img2pdf"){
    const kb=sizeKb("#i2p-kb","#i2p-unit"),size=sizeLabel(kb),tot=ok.reduce((a,f)=>a+f.size,0);
    if(!ok.length||!kb)return setEst("#i2p-est","");
    if(kb*1024/ok.length<15*1024)return setEst("#i2p-est",esc(t("{size} is very small for {n} pages. Photos may look blurry.",{size,n:ok.length})),true);
    return setEst("#i2p-est",esc(t("{n} images, {from} → PDF under {size}",{n:ok.length,from:fmt(tot),size})));
  }
}
/* preset a target size from the page (e.g. /compress-pdf-to-200kb/) or from ?kb=200 */
function applyTargetKb(tool,kb){
  const b=SIZE_BOX[tool];if(!b||!(kb>0))return;
  setSize(b[1],b[2],kb);markSize[tool]();
  if(b[0]){document.querySelector('input[name="'+b[0]+'"][value="target"]').checked=true;syncCpMode();syncPcMode();}
}
document.querySelectorAll('input[name="rs-mode"]').forEach(r=>r.addEventListener("change",()=>{const p=radio("rs-mode")==="pct";$("#rs-pct-field").hidden=!p;$("#rs-px-field").hidden=p;}));
document.querySelectorAll("[data-pct]").forEach(c=>c.addEventListener("click",()=>$("#rs-pct").value=c.dataset.pct));
$("#rs-w").addEventListener("input",()=>{const r=ratio();if($("#rs-lock").checked&&r&&st.files.length===1)$("#rs-h").value=fromPx(Math.max(1,toPx(+$("#rs-w").value)*r));});
$("#rs-h").addEventListener("input",()=>{const r=ratio();if($("#rs-lock").checked&&r&&st.files.length===1)$("#rs-w").value=fromPx(Math.max(1,toPx(+$("#rs-h").value)/r));});
$("#rs-lock").addEventListener("change",syncRsHelp);

/* ---------- example files ---------- */
async function makeSample(kind){
  const c=document.createElement("canvas");const x=c.getContext("2d");
  if(kind==="doc"){
    c.width=1240;c.height=1754;x.fillStyle="#fbfaf6";x.fillRect(0,0,c.width,c.height);
    x.fillStyle="#1d2a5c";x.fillRect(90,90,1060,8);x.font="bold 54px Georgia,serif";x.fillText("Fee Receipt",90,190);
    x.font="28px Arial,sans-serif";x.fillStyle="#555";x.fillText("Semester 3 · Academic year 2026–27",90,240);
    x.strokeStyle="#c9ccd6";x.lineWidth=2;
    [["Tuition fee","₹ 45,000"],["Hostel fee","₹ 18,500"],["Library fee","₹ 1,200"],["Exam fee","₹ 2,500"]].forEach((r,i)=>{const y=360+i*90;x.beginPath();x.moveTo(90,y+30);x.lineTo(1150,y+30);x.stroke();x.fillStyle="#222";x.font="32px Arial,sans-serif";x.fillText(r[0],90,y);x.textAlign="right";x.fillText(r[1],1150,y);x.textAlign="left";});
    x.font="bold 36px Arial,sans-serif";x.fillText("Total",90,760);x.textAlign="right";x.fillText("₹ 67,200",1150,760);x.textAlign="left";
    x.fillStyle="#e4e6ee";for(let i=0;i<14;i++)x.fillRect(90,880+i*46,(i%3===2?700:1060),14);
    x.strokeStyle="#b3261e";x.lineWidth=6;x.beginPath();x.arc(980,1500,110,0,Math.PI*2);x.stroke();x.fillStyle="#b3261e";x.font="bold 34px Arial";x.textAlign="center";x.fillText("PAID",980,1512);x.textAlign="left";
    const sh=x.createRadialGradient(300,300,200,700,1100,1500);sh.addColorStop(0,"rgba(90,80,60,0.08)");sh.addColorStop(1,"rgba(60,50,40,0.42)");x.fillStyle=sh;x.fillRect(0,0,c.width,c.height);
  }else if(kind==="portrait"){
    c.width=900;c.height=1200;x.fillStyle="#c9d3df";x.fillRect(0,0,900,1200);
    x.fillStyle="#b9c4d2";x.fillRect(0,0,900,420);
    x.fillStyle="#2f3e5c";x.beginPath();x.ellipse(450,1180,330,300,0,Math.PI,0);x.fill();
    x.fillStyle="#d9a983";x.fillRect(395,700,110,140);
    x.beginPath();x.ellipse(450,560,165,205,0,0,Math.PI*2);x.fill();
    x.fillStyle="#2b2018";x.beginPath();x.ellipse(450,420,175,110,0,Math.PI,0);x.fill();x.fillRect(275,410,40,140);x.fillRect(585,410,40,140);
    x.fillStyle="#2b2018";x.beginPath();x.arc(390,560,12,0,7);x.arc(510,560,12,0,7);x.fill();
    x.strokeStyle="#8a4f3a";x.lineWidth=6;x.beginPath();x.arc(450,640,45,.2*Math.PI,.8*Math.PI);x.stroke();
  }else{
    c.width=1600;c.height=1000;const g=x.createLinearGradient(0,0,0,1000);g.addColorStop(0,"#f6c27a");g.addColorStop(.55,"#e9876b");g.addColorStop(1,"#5b4b8a");x.fillStyle=g;x.fillRect(0,0,1600,1000);
    x.fillStyle="#fff3d6";x.beginPath();x.arc(1150,420,110,0,Math.PI*2);x.fill();
    x.fillStyle="#3a3563";x.beginPath();x.moveTo(0,760);x.lineTo(320,520);x.lineTo(620,720);x.lineTo(980,470);x.lineTo(1300,690);x.lineTo(1600,560);x.lineTo(1600,1000);x.lineTo(0,1000);x.fill();
    x.fillStyle="#252244";x.beginPath();x.moveTo(0,880);x.lineTo(420,720);x.lineTo(800,860);x.lineTo(1200,740);x.lineTo(1600,860);x.lineTo(1600,1000);x.lineTo(0,1000);x.fill();
    for(let i=0;i<4000;i++){x.fillStyle="rgba(255,255,255,"+(Math.random()*.05)+")";x.fillRect(Math.random()*1600,Math.random()*1000,2,2);}
  }
  const blob=await toBlob(c,"image/jpeg",0.95);
  return new File([blob],{doc:"fee-receipt-scan.jpg",photo:"hills-photo.jpg",portrait:"portrait-photo.jpg"}[kind],{type:"image/jpeg"});
}
let sampling=false;
async function loadSamples(){
  if(sampling)return;sampling=true;
  try{
    const kinds=["exam","crop","bgremove"].includes(st.tool)?["portrait"]:["doc","photo"];
    const fs=await Promise.all(kinds.map(makeSample));
    if(st.files.length||!accepts(TOOLS[st.tool],"image"))return;
    fs.forEach(f=>{const it={id:++uid,file:f,name:f.name,size:f.size,kind:"image",thumb:null,info:t("Reading…"),sample:true,rot:0,flip:false,crop:null};st.files.push(it);makeThumb(it);});
    if(TOOLS[st.tool].editor)st.sel=st.files[0].id;
    render();
  }catch(e){}finally{sampling=false;}
}

/* ---------- language ---------- */
function refreshLanguage(){
  buildPresetSelect();syncPreset(false);syncPcHelp();syncRsHelp();syncRsOut();
  st.files.forEach(f=>{if(f.img)f.info=f.w+" × "+f.h+" px"+(f.converted?" · "+t("converted from HEIC"):"");else if(f.pages)f.info=pages(f.pages);});
  if(!st.busy&&st.results)st.results.label=st.results.label; // labels keep the language they were made in
  render();
}
I.onChange(refreshLanguage);

/* ---------- start ---------- */
buildPresetSelect();
{const pre=new URLSearchParams(location.search).get("preset");if(pre&&PRESETS.some(p=>p.id===pre))$("#ex-preset").value=pre;}
syncPreset(true);syncPcHelp();syncRsHelp();
const start=toolFromLocation()||page.tool||"img2pdf";
st.tool=start;
syncPcMode();applyTargetKb(start,+new URLSearchParams(location.search).get("kb")||page.kb);
selectTool(start,"init");
if(location.hash&&FROM_SLUG[location.hash.slice(1)])requestAnimationFrame(()=>$("#tools-sec").scrollIntoView({block:"start"}));
})();
