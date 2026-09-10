const mediaBackupURLs=new Map();
function backupMedia(path){
 if(mediaBackupURLs.has(path))return mediaBackupURLs.get(path);
 const entry=MEDIA_FALLBACKS[path];if(!entry)return null;
 const raw=atob(entry.data),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
 const url=URL.createObjectURL(new Blob([bytes],{type:entry.mime}));mediaBackupURLs.set(path,url);return url;
}
const $=s=>document.querySelector(s);
let doc={theme:'white',columns:1,cards:[{id:'first-card',name:'Card 1',columns:1,height:506,vertical:'top'}],blocks:[]},revision=null,canEdit=false,editing=false,selected=null,dirty=false,busy=false,loaded=false;
let opened=false,startY=null,uploadTarget=null,introReady=false;
setTimeout(()=>{
 $('#intro-message').textContent='Eu disse que você merecia algo melhor';
 $('#intro-message').classList.add('visible');
 const fadeTime=window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:900;
 setTimeout(()=>{introReady=true;startY=null;$('#heart').setAttribute('aria-disabled','false');$('#heart').setAttribute('aria-label','Entrar na homenagem. Arraste para cima ou pressione Enter.');},fadeTime);
},3000);
let activeCard='first-card',observer=null;
const animations=[];
const allBlocks=()=>doc.blocks;
function normalize(value){value.cards ||= [{id:'first-card',name:'Card 1',columns:1,height:506,vertical:'top'}];value.columns ||= 1;for(const b of value.blocks){b.cardId ||= value.cards[0].id;b.effect ||= 'none';b.trigger ||= 'card';b.delay ??= 0;b.duration ??= .9;b.span ??= 1;}return value;}
const labels={title:'Título',text:'Texto',image:'Foto',video:'Vídeo',gif:'GIF',divider:'Separador',counter:'Contador',distance:'Distância'};
function enter(){if(opened||!introReady)return;opened=true;$('#scene').inert=false;document.body.classList.add('entered');$('#intro').inert=true;$('#scene').focus({preventScroll:true});setTimeout(()=>{$('#intro').hidden=true;render();},1200);}
$('#intro').addEventListener('pointerdown',e=>{if(!introReady)return;startY=e.clientY;});
$('#intro').addEventListener('pointermove',e=>{if(startY!==null&&startY-e.clientY>55)enter();});
for(const name of ['pointerup','pointercancel'])$('#intro').addEventListener(name,()=>{startY=null;});
$('#intro').addEventListener('wheel',e=>{e.preventDefault();if(e.deltaY>12)enter();},{passive:false});
$('#heart').onclick=enter;
document.addEventListener('keydown',e=>{if(!opened&&['ArrowUp','ArrowDown','PageDown','Enter',' '].includes(e.key)){e.preventDefault();enter();}});
function theme(value){document.body.dataset.theme=value;document.querySelectorAll('.swatch').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.theme===value)));$('meta[name="theme-color"]').content={white:'#fafafa',black:'#111114',pink:'#fbeaf0'}[value];}
document.querySelectorAll('.swatch').forEach(button=>button.onclick=()=>{theme(button.dataset.theme);});
function element(tag,text,cls){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;}
function stopAnimations(){observer?.disconnect();for(const a of animations)a.cancel();animations.length=0;}
function playCard(cardNode){
 const card=doc.cards.find(c=>c.id===cardNode.dataset.card);
 const duration=(card.revealDuration??.8)*1000;
 const cardEffect=card.revealEffect||'up';
 const from={opacity:0,transform:cardEffect==='up'?'translateY(28px)':cardEffect==='zoom'?'scale(.96)':'none'};
 cardNode.inert=false;cardNode.style.opacity='1';
 animations.push(cardNode.animate([from,{opacity:1,transform:'none'}],{duration:cardEffect==='none'?0:duration,fill:'both',easing:'cubic-bezier(.2,.7,.2,1)'}));
 let previousEnd=0;
 for(const node of cardNode.querySelectorAll('.block')){
  const b=doc.blocks.find(b=>b.id===node.dataset.id);
  const delay=(b.trigger==='previous'?previousEnd:0)+(b.delay||0)*1000;
  const duration=(b.duration??.9)*1000;
  previousEnd=delay+(b.effect==='none'?0:duration);
  const first={opacity:0};
  const transforms={up:'translateY(24px)',down:'translateY(-24px)',left:'translateX(-24px)',right:'translateX(24px)',zoom:'scale(.92)'};
  if(transforms[b.effect])first.transform=transforms[b.effect];
  node.style.visibility='visible';
  const animation=node.animate([first,{opacity:1,transform:'none'}],{duration:b.effect==='none'?0:duration,delay,fill:'both',easing:'cubic-bezier(.2,.7,.2,1)'});
  animations.push(animation);
 }
}
function elapsedParts(startDate,now=Date.now()){
 const start=Date.parse(startDate+'T00:00:00-03:00');if(!Number.isFinite(start))return null;
 const seconds=Math.max(0,Math.floor((now-start)/1000));
 return {future:now<start,days:Math.floor(seconds/86400),hours:Math.floor(seconds/3600)%24,minutes:Math.floor(seconds/60)%60,seconds:seconds%60};
}
function updateCounter(clock){
 const parts=elapsedParts(clock.dataset.startDate);
 if(!parts){clock.replaceChildren(element('p','Escolha uma data para começar.','hint'));return;}
 if(parts.future){clock.replaceChildren(element('p','A contagem começa em '+clock.dataset.startDate.split('-').reverse().join('/'),'hint'));return;}
 if(!clock.querySelector('[data-part]')){clock.replaceChildren();for(const [key,label] of [['days','dias'],['hours','horas'],['minutes','minutos'],['seconds','segundos']]){const cell=element('div',undefined,'counter-unit');const value=element('strong');value.dataset.part=key;cell.append(value,element('span',label));clock.append(cell);}}
 for(const value of clock.querySelectorAll('[data-part]')){const text=String(parts[value.dataset.part]).padStart(2,'0');if(value.textContent!==text)value.textContent=text;}
}
setInterval(()=>{for(const clock of document.querySelectorAll('.elapsed-counter'))updateCounter(clock);},1000);
function render(){
 stopAnimations();
 const root=$('#cards');root.replaceChildren();root.style.setProperty('--columns',doc.columns);root.style.setProperty('--narrow-columns',Math.min(doc.columns,2));
 for(const card of doc.cards){
  const section=element('section',undefined,'glass'+(editing&&card.id===activeCard?' active-card':''));section.dataset.card=card.id;section.setAttribute('aria-label',card.name);section.style.minHeight=card.height+'px';
  if(!editing&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){section.style.opacity='0';section.inert=true;}
  if(editing){const pick=element('button',card.name,'card-label');pick.onclick=()=>{activeCard=card.id;selected=null;render();cardControls();properties();};section.append(pick);}
  const grid=element('div',undefined,'card-blocks');grid.style.setProperty('--inner-columns',card.columns);grid.style.alignContent={top:'start',center:'center',bottom:'end'}[card.vertical];section.append(grid);
  const blocks=doc.blocks.filter(b=>b.cardId===card.id);
  for(const block of blocks){
   const node=element('div',undefined,'block'+(selected===block.id?' selected':''));node.style.textAlign=block.align;node.dataset.id=block.id;node.style.minHeight=(block.space||0)+'px';node.style.display='flex';node.style.flexDirection='column';node.style.justifyContent={top:'flex-start',center:'center',bottom:'flex-end'}[block.vertical||'top'];if(block.span===0)node.style.gridColumn='1 / -1';
   if(block.type==='title'||block.type==='text')node.append(element(block.type==='title'?'h2':'p',block.text||(editing?'Escreva aqui…':'')));
   else if(block.type==='counter'){
    if(block.text)node.append(element('p',block.text,'widget-heading'));
    const clock=element('div',undefined,'elapsed-counter');clock.dataset.startDate=block.startDate||'';node.append(clock);updateCounter(clock);
   }
   else if(block.type==='distance'){
    if(block.text)node.append(element('p',block.text,'widget-heading'));
    const cities=element('div',undefined,'distance-cities');cities.append(element('span',block.cityFrom||'Primeira cidade'),element('span','↔','distance-connector'),element('span',block.cityTo||'Segunda cidade'));node.append(cities);
    node.append(element('p',block.distanceKm==null?'Informe a distância':new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(block.distanceKm)+' km','distance-value'));
   }
   else if(block.type==='divider')node.append(element('hr'));
   else if(block.url){const media=element(block.type==='video'?'video':'img');media.src=new URL(block.url,document.baseURI).href;if(block.type==='video'){media.controls=true;media.preload='metadata';media.playsInline=true;}else{media.alt=block.caption||'Lembrança';media.loading='eager';}let triedBackup=false;media.addEventListener('error',()=>{if(!triedBackup){triedBackup=true;const backup=backupMedia(block.url);if(backup){media.src=backup;return;}}media.hidden=true;node.prepend(element('p','Não foi possível abrir esta mídia. Recarregue a página.','media-missing'));});const layout=element('div',undefined,'media-layout '+(block.mediaLayout||'below'));layout.style.setProperty('--media-width',(block.mediaWidth??320)+'px');
    const figure=element('figure',undefined,'media-figure');figure.style.width=(block.mediaWidth??320)+'px';figure.style.alignSelf={left:'flex-start',center:'center',right:'flex-end'}[block.align];
    media.style.height=block.mediaHeight?block.mediaHeight+'px':'auto';media.style.maxHeight=(block.mediaHeight||360)+'px';media.style.objectFit=block.mediaFit||'contain';figure.append(media);if(block.caption)figure.append(element('figcaption',block.caption));layout.append(figure);
    if(block.sideText)layout.append(element('p',block.sideText,'media-copy'));node.append(layout);}
   else if(editing)node.append(element('div','Escolha um arquivo ou adicione um link.','media-missing'));
   if(editing){node.tabIndex=0;node.setAttribute('role','button');node.setAttribute('aria-label','Editar '+labels[block.type]);node.onclick=()=>select(block.id);node.onkeydown=e=>{if(e.target===node&&['Enter',' '].includes(e.key)){e.preventDefault();select(block.id);}};}
   if(editing&&['image','gif','video'].includes(block.type)){const adjust=element('button','Ajustar tamanho e texto','media-adjust');adjust.onclick=e=>{e.stopPropagation();select(block.id);};node.prepend(adjust);}
   grid.append(node);
  }
  if(editing&&!blocks.length)grid.append(element('p','Adicione textos ou lembranças a este card.','empty'));
  root.append(section);
 }
 if(!editing&&opened&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches&&'IntersectionObserver' in window){
  observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){playCard(entry.target);observer.unobserve(entry.target);}},{threshold:0,rootMargin:'0px 0px -30px 0px'});
  for(const card of root.children){for(const block of card.querySelectorAll('.block'))block.style.visibility='hidden';observer.observe(card);}
 }else if(opened){for(const card of root.children){card.style.opacity='1';card.inert=false;}}
}
async function load(){try{doc=normalize(JSON.parse(JSON.stringify(TRIBUTE_DATA)));loaded=true;theme(doc.theme);render();}catch(e){$('#cards').replaceChildren(element('p',e.message,'empty'));const retry=element('button','Tentar novamente');retry.onclick=load;$('#cards .empty').append(document.createElement('br'),retry);}}
load();
