/* PAVO admin. Security: writes are enforced by Supabase RLS (public.is_admin()), not by this page. */
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let players=[],matches=[],news=[],lineups=[],placed=[],sel=null,activeId=null;
const toast=m=>{const t=$('#toast');t.textContent=m;t.className='show';setTimeout(()=>t.className='',3500)};
const imgUrl=p=>{if(!p)return '';if(/^https?:\/\//i.test(p))return p;try{return supabaseClient.storage.from('pavo-media').getPublicUrl(p).data.publicUrl}catch{return ''}};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const slugify=s=>String(s||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const SCH={
 player:{table:'players',title:'player',list:'players',fields:[['full_name_en','Name (English)','text',1],['full_name_ar','Name (Arabic)','text',1],['slug','Slug (unique, auto if empty)','text'],['shirt_number','Shirt number','number'],['position','Position','select',['Goalkeeper','Defender','Midfielder','Forward']],['nationality_en','Nationality (English)','text'],['nationality_ar','Nationality (Arabic)','text'],['photo_path','Photo URL or storage path','text'],['bio_en','Bio (English)','textarea'],['bio_ar','Bio (Arabic)','textarea'],['is_active','Active','checkbox']]},
 match:{table:'matches',title:'match',list:'matches',fields:[['opponent_name_en','Opponent (English)','text',1],['opponent_name_ar','Opponent (Arabic)','text',1],['competition_en','Competition (English)','text'],['competition_ar','Competition (Arabic)','text'],['venue_en','Venue (English)','text'],['venue_ar','Venue (Arabic)','text'],['kickoff_at','Kick-off','datetime-local',1],['status','Status','select',['scheduled','live','finished','postponed','cancelled']],['home_score','PAVO score','number'],['away_score','Opponent score','number'],['is_published','Published','checkbox']]},
 news:{table:'news',title:'story',list:'news',fields:[['title_en','Title (English)','text',1],['title_ar','Title (Arabic)','text',1],['slug','Slug (unique, auto if empty)','text'],['summary_en','Summary (English)','textarea'],['summary_ar','Summary (Arabic)','textarea'],['content_en','Content (English)','textarea'],['content_ar','Content (Arabic)','textarea'],['cover_path','Cover URL or storage path','text'],['category_en','Category (English)','text'],['category_ar','Category (Arabic)','text'],['status','Status','select',['draft','published','archived']]]}};
const store=()=>({players,matches,news});
const FORM={'4-3-3':[[8,50],[26,18],[26,39],[26,61],[26,82],[49,25],[49,50],[49,75],[73,18],[80,50],[73,82]],'4-2-3-1':[[8,50],[26,18],[26,39],[26,61],[26,82],[43,37],[43,63],[62,18],[62,50],[62,82],[79,50]],'4-4-2':[[8,50],[26,18],[26,39],[26,61],[26,82],[50,18],[50,39],[50,61],[50,82],[75,35],[75,65]],'3-5-2':[[8,50],[28,25],[28,50],[28,75],[51,12],[51,31],[51,50],[51,69],[51,88],[76,35],[76,65]]};

async function start(){
 $('#loginForm').addEventListener('submit',login);
 $('#logoutBtn').addEventListener('click',async()=>{await supabaseClient.auth.signOut();showLogin()});
 document.querySelectorAll('[data-add]').forEach(b=>b.addEventListener('click',()=>openEditor(b.dataset.add)));
 $('#adminPitch').addEventListener('click',pitchClick);$('#pSearch').addEventListener('input',drawAvail);
 $('#formation').addEventListener('change',applyFormation);$('#loadBtn').addEventListener('click',loadLineup);
 $('#draftBtn').addEventListener('click',()=>saveLineup('draft'));$('#pubBtn').addEventListener('click',()=>saveLineup('published'));
 $('#newBtn').addEventListener('click',()=>{placed=[];activeId=null;$('#lnSaved').value='';drawPitch();drawAvail()});
 if(!supabaseClient){$('#loginMsg').textContent='Supabase is not configured. Check supabase.js.';return}
 const {data:{session}}=await supabaseClient.auth.getSession();if(session)await verify(session.user);
 supabaseClient.auth.onAuthStateChange((ev,s)=>{if(ev==='SIGNED_OUT')showLogin()});
}
async function login(e){e.preventDefault();$('#loginMsg').textContent='Signing in…';const fd=new FormData(e.currentTarget);
 const {data,error}=await supabaseClient.auth.signInWithPassword({email:fd.get('email'),password:fd.get('password')});
 if(error){$('#loginMsg').textContent=error.message;return}await verify(data.user)}
async function verify(user){
 const {data,error}=await supabaseClient.from('admin_profiles').select('*').eq('user_id',user.id).eq('is_active',true).maybeSingle();
 if(error||!data||!['super_admin','admin'].includes(data.role)){await supabaseClient.auth.signOut();$('#loginMsg').textContent='This account is not an active admin in admin_profiles.';return}
 $('#loginPanel').hidden=true;$('#dashboard').hidden=false;$('#logoutBtn').hidden=false;$('#welcome').textContent=`Signed in as ${data.display_name||user.email} (${data.role})`;
 await loadAll();
}
function showLogin(){$('#dashboard').hidden=true;$('#loginPanel').hidden=false;$('#logoutBtn').hidden=true}
async function rows(table,order,asc=false){const {data,error}=await supabaseClient.from(table).select('*').order(order,{ascending:asc});if(error){toast(`${table}: ${error.message}`);return []}return data||[]}
async function loadAll(){
 [players,matches,news,lineups]=await Promise.all([rows('players','shirt_number',true),rows('matches','kickoff_at'),rows('news','created_at'),rows('lineups','updated_at')]);
 $('#stats').innerHTML=[['Players',players.length],['Matches',matches.length],['News',news.length],['Line-ups',lineups.length]].map(x=>`<div class="admin-stat"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
 tables();
 $('#lnMatch').innerHTML='<option value="">No match linked</option>'+matches.map(m=>`<option value="${esc(m.id)}">${esc(m.opponent_name_en||m.opponent_name_ar)}</option>`).join('');
 $('#lnSaved').innerHTML='<option value="">New line-up</option>'+lineups.map(l=>`<option value="${esc(l.id)}">${esc(l.name_en||l.name_ar)} (${esc(l.status)}${l.is_current?', current':''})</option>`).join('');
 drawAvail();drawPitch();
}
function tbl(type,head,rs){return `<table class="data-table"><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}<th></th></tr></thead><tbody>${rs.map(r=>`<tr>${r[1].map(c=>`<td>${esc(c)}</td>`).join('')}<td><div class="row-actions"><button class="small-btn" data-edit="${type}" data-id="${esc(r[0])}">Edit</button><button class="small-btn danger" data-del="${type}" data-id="${esc(r[0])}">Delete</button></div></td></tr>`).join('')||`<tr><td colspan="${head.length+1}">No records yet.</td></tr>`}</tbody></table>`}
function tables(){
 $('#tPlayer').innerHTML=tbl('player',['Name','No.','Active'],players.map(p=>[p.id,[p.full_name_en||p.full_name_ar,p.shirt_number??'—',p.is_active?'Yes':'No']]));
 $('#tMatch').innerHTML=tbl('match',['Opponent','Date','Status','Public'],matches.map(m=>[m.id,[m.opponent_name_en||m.opponent_name_ar,m.kickoff_at?new Date(m.kickoff_at).toLocaleDateString():'',m.status,m.is_published?'Yes':'No']]));
 $('#tNews').innerHTML=tbl('news',['Story','Status'],news.map(n=>[n.id,[n.title_en||n.title_ar,n.status]]));
 document.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>openEditor(b.dataset.edit,b.dataset.id)));
 document.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',()=>del(b.dataset.del,b.dataset.id)));
}
function field(f,v){const [n,l,t,x]=f;if(t==='checkbox')return `<label class="check-label"><input type="checkbox" name="${n}" ${v?'checked':''}> ${l}</label>`;
 if(t==='select')return `<label>${l}<select name="${n}">${x.map(o=>`<option ${v===o?'selected':''}>${o}</option>`).join('')}</select></label>`;
 if(t==='textarea')return `<label>${l}<textarea name="${n}">${esc(v)}</textarea></label>`;
 if(t==='datetime-local'&&v){const d=new Date(v);v=new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,16)}
 return `<label>${l}<input name="${n}" type="${t}" value="${esc(v)}" ${x===1?'required':''}></label>`}
function openEditor(type,id){
 const s=SCH[type],old=id?store()[s.list].find(r=>r.id===id):null;
 $('#modalRoot').innerHTML=`<div class="modal-backdrop"><section class="modal-card" role="dialog" aria-modal="true"><button class="modal-close" type="button" aria-label="Close">×</button><h2>${old?'Edit':'Add'} ${s.title}</h2><form id="rf" class="modal-form">${s.fields.map(f=>field(f,old?old[f[0]]:(f[0]==='is_active'?true:''))).join('')}<div class="modal-actions"><button class="btn btn-outline" type="button" id="cx">Cancel</button><button class="btn btn-gold" type="submit">Save</button></div><p class="form-message" id="mm" role="alert"></p></form></section></div>`;
 const close=()=>$('#modalRoot').innerHTML='';$('.modal-close').onclick=close;$('#cx').onclick=close;
 $('#rf').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget),row={};
  for(const [n,,t] of s.fields){if(t==='checkbox')row[n]=fd.has(n);else if(t==='number')row[n]=fd.get(n)===''?null:Number(fd.get(n));else if(t==='datetime-local')row[n]=fd.get(n)?new Date(fd.get(n)).toISOString():null;else row[n]=(fd.get(n)||'').trim()||null}
  if('slug' in row){row.slug=slugify(row.slug||row.full_name_en||row.title_en);if(!row.slug){$('#mm').textContent='Slug could not be generated; enter an English name/title or slug.';return}}
  if(type==='news'){if(row.status==='published'&&!(old&&old.published_at))row.published_at=new Date().toISOString();if(row.status!=='published'&&!old?.published_at)row.published_at=null}
  const r=old?await supabaseClient.from(s.table).update(row).eq('id',old.id):await supabaseClient.from(s.table).insert(row);
  if(r.error){$('#mm').textContent=r.error.message;return}close();toast('Saved');await loadAll()}}
async function del(type,id){const s=SCH[type];if(!confirm(`Delete this ${s.title}? This cannot be undone.`))return;
 const {error}=await supabaseClient.from(s.table).delete().eq('id',id);if(error){toast(error.message.includes('foreign')?'Cannot delete: it is used in a line-up. Remove it there first.':error.message);return}toast('Deleted');await loadAll()}

/* ---- line-up editor ---- */
function drawAvail(){const k=($('#pSearch').value||'').toLowerCase(),used=new Set(placed.map(p=>p.player_id));
 $('#avail').innerHTML=players.filter(p=>p.is_active&&`${p.full_name_en||''} ${p.full_name_ar||''} ${p.shirt_number??''}`.toLowerCase().includes(k)).map(p=>`<button type="button" class="pick ${sel===p.id?'sel':''} ${used.has(p.id)?'used':''}" data-pick="${esc(p.id)}">#${esc(p.shirt_number??'—')} ${esc(p.full_name_en||p.full_name_ar)}</button>`).join('')||'<p class="muted">No active players.</p>';
 document.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{sel=b.dataset.pick;drawAvail()})}
function drawPitch(){const pitch=$('#adminPitch');pitch.querySelectorAll('.pitch-player').forEach(x=>x.remove());
 placed.forEach(pl=>{const p=players.find(x=>x.id===pl.player_id);if(!p)return;const u=imgUrl(p.photo_path),el=document.createElement('div');
  el.className='pitch-player'+(u?' has-photo':'');el.style.left=pl.x_position+'%';el.style.top=pl.y_position+'%';
  el.innerHTML=`<button class="x" type="button" aria-label="Remove">×</button><span class="mk"><span class="av">${u?`<img src="${esc(u)}" alt="" onerror="this.remove()">`:''}</span><span class="shirt">${esc(p.shirt_number??'')}</span></span><small>${esc(p.full_name_en||p.full_name_ar)}</small>`;
  el.addEventListener('click',e=>e.stopPropagation());
  el.querySelector('.x').addEventListener('click',e=>{e.stopPropagation();placed=placed.filter(x=>x!==pl);drawPitch();drawAvail()});
  let drag=false;el.addEventListener('pointerdown',e=>{if(e.target.closest('.x'))return;drag=true;el.setPointerCapture(e.pointerId)});
  el.addEventListener('pointermove',e=>{if(!drag)return;const r=pitch.getBoundingClientRect();pl.x_position=Math.round(clamp((e.clientX-r.left)/r.width*100,4,96));pl.y_position=Math.round(clamp((e.clientY-r.top)/r.height*100,4,96));el.style.left=pl.x_position+'%';el.style.top=pl.y_position+'%'});
  el.addEventListener('pointerup',()=>drag=false);pitch.appendChild(el)})}
function pitchClick(e){if(!sel){toast('Pick a player from the list first.');return}const r=e.currentTarget.getBoundingClientRect();
 placed=placed.filter(p=>p.player_id!==sel);if(placed.length>=11){toast('A line-up has at most 11 starters.');return}
 placed.push({player_id:sel,x_position:Math.round(clamp((e.clientX-r.left)/r.width*100,4,96)),y_position:Math.round(clamp((e.clientY-r.top)/r.height*100,4,96)),tactical_position:null});sel=null;drawPitch();drawAvail()}
function applyFormation(){const c=FORM[$('#formation').value]||FORM['4-3-3'];placed.forEach((p,i)=>{if(c[i]){p.x_position=c[i][0];p.y_position=c[i][1]}});drawPitch()}
async function loadLineup(){const id=$('#lnSaved').value;const lp=lineups.find(l=>l.id===id);if(!lp){toast('Choose a saved line-up first.');return}
 const {data,error}=await supabaseClient.from('lineup_players').select('*').eq('lineup_id',id).order('sort_order');if(error){toast(error.message);return}
 activeId=id;placed=(data||[]).filter(r=>players.some(p=>p.id===r.player_id)).map(r=>({player_id:r.player_id,x_position:Number(r.x_position),y_position:Number(r.y_position),tactical_position:r.tactical_position}));
 $('#lnEn').value=lp.name_en||'';$('#lnAr').value=lp.name_ar||'';$('#formation').value=lp.formation_code||'4-3-3';$('#lnMatch').value=lp.match_id||'';drawPitch();drawAvail();toast('Line-up loaded')}
async function saveLineup(status){
 if(!placed.length){toast('Place at least one player first.');return}
 const msg=t=>$('#lnMsg').textContent=t;msg('Saving…');
 const row={match_id:$('#lnMatch').value||null,name_en:$('#lnEn').value.trim()||'First Team',name_ar:$('#lnAr').value.trim()||'تشكيلة الفريق',formation_code:$('#formation').value,status,is_current:status==='published',published_at:status==='published'?new Date().toISOString():null};
 if(activeId){const {error}=await supabaseClient.from('lineups').update(row).eq('id',activeId);if(error){msg(error.message);return}}
 else{const {data,error}=await supabaseClient.from('lineups').insert(row).select().single();if(error){msg(error.message);return}activeId=data.id}
 const {error:de}=await supabaseClient.from('lineup_players').delete().eq('lineup_id',activeId);if(de){msg(de.message);return}
 const {error:ie}=await supabaseClient.from('lineup_players').insert(placed.map((p,i)=>({lineup_id:activeId,player_id:p.player_id,x_position:p.x_position,y_position:p.y_position,tactical_position:p.tactical_position,is_starter:true,is_captain:false,sort_order:i})));
 if(ie){msg('Players were not saved: '+ie.message);return}
 if(status==='published')await supabaseClient.from('lineups').update({is_current:false}).neq('id',activeId).eq('is_current',true);
 msg(status==='published'?'Published.':'Draft saved.');toast(status==='published'?'Line-up published':'Draft saved');await loadAll();$('#lnSaved').value=activeId}
start();
