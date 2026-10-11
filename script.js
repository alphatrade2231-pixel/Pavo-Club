/* PAVO Club — public site. Data comes ONLY from Supabase; no demo/sample fallback. */
const TXT={ar:{home:'الرئيسية',club:'النادي',players:'اللاعبون',matches:'المباريات',lineup:'التشكيلة',news:'الأخبار',admin:'إدارة النادي',
heroT:'نادٍ واحد.<br>طموح واحد.',heroP:'هوية تجمعنا، وطموح يقودنا، وشعار نفخر به. أهلًا بك في الموقع الرسمي لنادي بافو.',explore:'تعرّف على الفريق',
latest:'آخر الأخبار',squad:'الفريق',upcoming:'المباريات القادمة',results:'النتائج',lineupT:'التشكيلة الحالية',all:'عرض الكل',search:'ابحث بالاسم أو الرقم أو المركز',
emptyP:'لم تتم إضافة لاعبين بعد.',emptyM:'لا توجد مباريات منشورة.',emptyN:'لا توجد أخبار منشورة.',emptyL:'لم يتم نشر تشكيلة حالية بعد.',emptyC:'لم تتم إضافة معلومات النادي بعد.',noRes:'لا توجد نتائج مطابقة.',
err:'تعذّر تحميل هذا القسم. تحقق من الاتصال وإعدادات Supabase ثم أعد المحاولة.',noDb:'لم يتم ربط قاعدة البيانات. راجع ملف supabase.js.',back:'← رجوع للأخبار',notFound:'الخبر غير موجود.',
mission:'رسالتنا',vision:'رؤيتنا',about:'عن النادي',vs:'ضد',
status:{scheduled:'قادمة',live:'مباشر',finished:'انتهت',postponed:'مؤجلة',cancelled:'ملغاة'},pos:{Goalkeeper:'حارس مرمى',Defender:'مدافع',Midfielder:'وسط',Forward:'مهاجم'}},
en:{home:'Home',club:'The Club',players:'Players',matches:'Matches',lineup:'Line-up',news:'News',admin:'Club administration',
heroT:'ONE CLUB.<br>ONE AMBITION.',heroP:'Built on identity, driven by ambition, united by the badge. Welcome to the official home of PAVO Club.',explore:'Meet the squad',
latest:'Latest news',squad:'Squad',upcoming:'Upcoming matches',results:'Results',lineupT:'Current line-up',all:'View all',search:'Search by name, number or position',
emptyP:'No players have been added yet.',emptyM:'No matches have been published.',emptyN:'No news has been published.',emptyL:'No current line-up has been published yet.',emptyC:'Club information has not been added yet.',noRes:'No matching results.',
err:'This section could not be loaded. Check your connection and Supabase setup, then try again.',noDb:'Database is not connected. Check supabase.js.',back:'← Back to news',notFound:'Story not found.',
mission:'Our mission',vision:'Our vision',about:'About the club',vs:'vs',
status:{scheduled:'Upcoming',live:'Live',finished:'Full time',postponed:'Postponed',cancelled:'Cancelled'},pos:{Goalkeeper:'Goalkeeper',Defender:'Defender',Midfielder:'Midfielder',Forward:'Forward'}}};
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let lang=localStorage.getItem('pavo-language')==='en'?'en':'ar';
const tr=k=>TXT[lang][k]??k;
const S={players:[],matches:[],news:[],lineup:null,settings:{},ok:{}};
const pick=(r,b)=>r?.[`${b}_${lang}`]||r?.[`${b}_${lang==='ar'?'en':'ar'}`]||'';
const fmt=(d,o)=>{try{return d?new Date(d).toLocaleString(lang==='ar'?'ar-EG':'en-GB',o):''}catch{return ''}};
const imgUrl=p=>{if(!p)return '';if(/^https?:\/\//i.test(p))return p;try{return supabaseClient.storage.from('pavo-media').getPublicUrl(p).data.publicUrl}catch{return ''}};
const safeUrl=u=>/^https?:\/\//i.test(u||'')?u:'';
async function q(table,sel,build){try{let r=supabaseClient.from(table).select(sel);if(build)r=build(r);const {data,error}=await r;if(error)throw error;return data||[]}catch(e){console.error('PAVO',table,e.message||e);return null}}
async function load(){
 if(!supabaseClient)return;
 const [p,m,n,l,s]=await Promise.all([
  q('players','*',r=>r.eq('is_active',true).order('shirt_number',{nullsFirst:false})),
  q('matches','*',r=>r.eq('is_published',true).order('kickoff_at',{ascending:true})),
  q('news','*',r=>r.eq('status','published').order('published_at',{ascending:false})),
  q('lineups','*, lineup_players(*, players(*))',r=>r.eq('status','published').eq('is_current',true).limit(1)),
  q('site_settings','key,value')]);
 S.ok={players:p!==null,matches:m!==null,news:n!==null,lineup:l!==null,settings:s!==null};
 S.players=p||[];S.matches=m||[];S.news=n||[];S.lineup=(l&&l[0])||null;S.settings=Object.fromEntries((s||[]).map(x=>[x.key,x.value||{}]));
}
const state=(key,len,emptyK)=>!supabaseClient?`<div class="state err">${tr('noDb')}</div>`:!S.ok[key]?`<div class="state err">${tr('err')}</div>`:len?'':`<div class="state">${tr(emptyK)}</div>`;
const head=(t,link)=>`<div class="section-head"><h2>${esc(t)}</h2>${link?`<a class="btn btn-outline" href="#${link}">${tr('all')}</a>`:''}</div>`;
const photo=(path,alt)=>{const u=imgUrl(path);return u?`<img loading="lazy" src="${esc(u)}" alt="${esc(alt)}" onerror="this.remove()">`:''};
function playerCard(p){const n=pick(p,'full_name');return `<article class="card"><div class="player-visual">${photo(p.photo_path,n)}<span class="number">${esc(p.shirt_number??'')}</span></div><div class="card-body"><span class="tag">${esc(tr('pos')[p.position]||p.position||'')}</span><h3>${esc(n)}</h3><p>${esc(pick(p,'nationality'))}</p><p>${esc(pick(p,'bio'))}</p></div></article>`}
function matchCard(m){const o=pick(m,'opponent_name');const sc=m.status!=='scheduled'&&m.home_score!=null?`${m.home_score} - ${m.away_score??0}`:'VS';
 return `<article class="card match-card"><div class="match-meta"><span>${esc(pick(m,'competition'))}</span><span>${esc(fmt(m.kickoff_at,{dateStyle:'medium',timeStyle:'short'}))}</span></div><div class="scoreline"><span>PAVO</span><span class="score">${esc(sc)}</span><span>${esc(o)}</span></div><div class="match-bottom"><span>${esc(pick(m,'venue'))}</span><span class="status ${esc(m.status)}">${esc(tr('status')[m.status]||m.status)}</span></div></article>`}
function newsCard(n){const t=pick(n,'title');return `<a class="card" href="#news/${encodeURIComponent(n.slug)}"><div class="news-image">${photo(n.cover_path,t)}</div><div class="card-body"><span class="eyebrow">${esc(pick(n,'category'))}</span><h3>${esc(t)}</h3><p>${esc(pick(n,'summary'))}</p><p>${esc(fmt(n.published_at,{dateStyle:'medium'}))}</p></div></a>`}
function pitch(lp){const pl=(lp.lineup_players||[]).filter(x=>x.players&&x.is_starter!==false);
 const mk=pl.map(x=>{const p=x.players,c=v=>Math.max(4,Math.min(96,Number(v)||50)),n=pick(p,'full_name'),u=imgUrl(p.photo_path);
  return `<div class="pitch-player ${u?'has-photo':''}" style="left:${c(x.x_position)}%;top:${c(x.y_position)}%"><span class="mk"><span class="av">${u?`<img loading="lazy" src="${esc(u)}" alt="${esc(n)}" onerror="this.parentNode.parentNode.parentNode.classList.remove('has-photo');this.remove()">`:''}</span><span class="shirt">${esc(p.shirt_number??'')}</span></span><small>${esc(n)}</small></div>`}).join('');
 return `<p><span class="tag">${esc(lp.formation_code||'')}</span> ${esc(pick(lp,'name'))}</p><div class="pitch-wrap"><div class="pitch" role="img" aria-label="${esc(pick(lp,'name'))}"><div class="pitch-circle"></div><div class="pbox l"></div><div class="pbox r"></div><div class="gbox l"></div><div class="gbox r"></div><div class="goal l"></div><div class="goal r"></div>${mk}</div></div>`}
const lineupBlock=()=>S.lineup?pitch(S.lineup):state('lineup',0,'emptyL');
const upc=()=>S.matches.filter(m=>['scheduled','live'].includes(m.status));
const done=()=>S.matches.filter(m=>!['scheduled','live'].includes(m.status)).reverse();
const grid=(arr,fn,key,e)=>arr.length?`<div class="cards">${arr.map(fn).join('')}</div>`:state(key,0,e);
const list=(x)=>x?String(x).split(/\n+/).map(s=>`<p>${esc(s)}</p>`).join(''):'';
const VIEWS={
 home:()=>{const c=S.settings.club||{};return `<div class="container"><section class="hero"><div><div class="eyebrow">PAVO CLUB</div><h1>${tr('heroT')}</h1><p>${tr('heroP')}</p><div class="hero-actions"><a class="btn btn-gold" href="#players">${tr('explore')}</a><a class="btn btn-outline" href="#matches">${tr('matches')}</a></div></div><div class="hero-emblem" aria-hidden="true">
  <img
    class="hero-logo"
    src="pavo%20logo.jpg.jpeg"
    alt=""
  >
</div>
 <section class="section">${head(tr('latest'),'news')}${grid(S.news.slice(0,3),newsCard,'news','emptyN')}</section>
 <section class="section">${head(tr('upcoming'),'matches')}${grid(upc().slice(0,3),matchCard,'matches','emptyM')}</section>
 <section class="section">${head(tr('squad'),'players')}${grid(S.players.slice(0,4),playerCard,'players','emptyP')}</section>
 <section class="section">${head(tr('lineupT'),'lineup')}${lineupBlock()}</section>
 ${pick(c,'description')?`<section class="section">${head(tr('about'))}<div class="info-panel">${list(pick(c,'description'))}</div></section>`:''}</div>`},
 club:()=>{const c=S.settings.club||{};const has=pick(c,'description')||pick(c,'mission')||pick(c,'vision');
  return `<div class="light"><div class="container section">${head(tr('club'))}${!has?state('settings',0,'emptyC'):`<div class="club-grid">${[['about','description'],['mission','mission'],['vision','vision']].filter(x=>pick(c,x[1])).map(x=>`<article class="info-panel"><h3>${tr(x[0])}</h3>${list(pick(c,x[1]))}</article>`).join('')}</div>`}</div></div>`},
 players:()=>`<div class="container section">${head(tr('players'))}<div class="search-row"><input id="ps" type="search" aria-label="${esc(tr('search'))}" placeholder="${esc(tr('search'))}"></div><div id="pg">${grid(S.players,playerCard,'players','emptyP')}</div></div>`,
 matches:()=>`<div class="container section">${head(tr('upcoming'))}${grid(upc(),matchCard,'matches','emptyM')}<div style="height:36px"></div>${head(tr('results'))}${grid(done(),matchCard,'matches','emptyM')}</div>`,
 lineup:()=>`<div class="container section">${head(tr('lineupT'))}${lineupBlock()}</div>`,
 news:(slug)=>{if(!slug)return `<div class="container section">${head(tr('news'))}${grid(S.news,newsCard,'news','emptyN')}</div>`;
  const n=S.news.find(x=>x.slug===slug);if(!n)return `<div class="container section"><a class="btn btn-outline" href="#news">${tr('back')}</a><div class="state" style="margin-top:20px">${S.ok.news?tr('notFound'):tr('err')}</div></div>`;
  return `<div class="container section"><article class="article"><a class="btn btn-outline" href="#news">${tr('back')}</a><p class="eyebrow" style="margin-top:22px">${esc(pick(n,'category'))} ${esc(fmt(n.published_at,{dateStyle:'medium'}))}</p><h1>${esc(pick(n,'title'))}</h1>${photo(n.cover_path,pick(n,'title'))}${list(pick(n,'content')||pick(n,'summary'))}</article></div>`}};
function render(){
 document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';
 $('#languageToggle').textContent=lang==='ar'?'English':'عربي';
 document.querySelectorAll('[data-t]').forEach(e=>e.textContent=tr(e.dataset.t));
 const [r,arg]=(location.hash.slice(1)||'home').split('/');const route=VIEWS[r]?r:'home';
 document.querySelectorAll('[data-nav]').forEach(a=>a.classList.toggle('active',a.dataset.nav===route));
 $('#app').innerHTML=VIEWS[route](arg?decodeURIComponent(arg):'');
 const ps=$('#ps');if(ps)ps.addEventListener('input',()=>{const k=ps.value.trim().toLowerCase();
  const f=S.players.filter(p=>`${p.full_name_ar||''} ${p.full_name_en||''} ${p.shirt_number??''} ${tr('pos')[p.position]||''} ${p.position||''}`.toLowerCase().includes(k));
  $('#pg').innerHTML=f.length?`<div class="cards">${f.map(playerCard).join('')}</div>`:`<div class="state">${tr('noRes')}</div>`});
 const s=S.settings,ct=s.contact||{},so=s.social||{};
 $('#footerInfo').innerHTML=[ct.email&&`<a href="mailto:${esc(ct.email)}">${esc(ct.email)}</a>`,ct.phone&&`<span dir="ltr">${esc(ct.phone)}</span>`,
  ...['instagram','facebook','x','youtube'].map(k=>safeUrl(so[k])&&`<a href="${esc(so[k])}" target="_blank" rel="noopener">${k}</a>`)].filter(Boolean).join(' &nbsp; ');
 $('#year').textContent=new Date().getFullYear();window.scrollTo(0,0);
}
$('#languageToggle').addEventListener('click',()=>{lang=lang==='ar'?'en':'ar';localStorage.setItem('pavo-language',lang);render()});
$('#menuToggle').addEventListener('click',()=>{const o=$('#mainNav').classList.toggle('open');$('#menuToggle').setAttribute('aria-expanded',o)});
$('#mainNav').addEventListener('click',e=>{if(e.target.closest('a'))$('#mainNav').classList.remove('open')});
window.addEventListener('hashchange',render);
(async()=>{render();await load();render()})();
