const SETUP_SQL='insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)\nvalues (\'pavo-media\',\'pavo-media\',true,52428800,array[\'image/jpeg\',\'image/png\',\'image/webp\',\'image/gif\',\'video/mp4\',\'video/webm\',\'video/quicktime\'])\non conflict (id) do update set public=true;\ndrop policy if exists "Public read pavo-media" on storage.objects;\ncreate policy "Public read pavo-media" on storage.objects for select using (bucket_id=\'pavo-media\');\ndrop policy if exists "Admins write pavo-media" on storage.objects;\ncreate policy "Admins write pavo-media" on storage.objects for all to authenticated\n using (bucket_id=\'pavo-media\' and public.is_admin()) with check (bucket_id=\'pavo-media\' and public.is_admin());\n';
/* PAVO admin. Security: writes are enforced by Supabase RLS (public.is_admin()), not by this page. */
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let players=[],matches=[],news=[],lineups=[],placed=[],sel=null,activeId=null;
const toast=m=>{const t=$('#toast');t.textContent=m;t.className='show';setTimeout(()=>t.className='',3500)};
const imgUrl=p=>{if(!p)return '';if(/^https?:\/\//i.test(p))return p;try{return supabaseClient.storage.from('pavo-media').getPublicUrl(p).data.publicUrl}catch{return ''}};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const slugify=s=>String(s||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const SCH={
 player:{table:'players',title:'player',list:'players',fields:[['full_name_en','Name (English)','text',1],['full_name_ar','Name (Arabic)','text',1],['slug','Slug (unique, auto if empty)','text'],['shirt_number','Shirt number','number'],['height_cm','Height (cm)','number'],['appearances','Appearances','number'],['goals','Goals','number'],['assists','Assists','number'],['position','Position','select',['Goalkeeper','Defender','Midfielder','Forward']],['nationality_en','Nationality (English)','text'],['nationality_ar','Nationality (Arabic)','text'],['photo_path','Player photo','image'],['bio_en','Bio (English)','textarea'],['bio_ar','Bio (Arabic)','textarea'],['is_active','Active','checkbox']]},
 match:{table:'matches',title:'match',list:'matches',fields:[['opponent_name_en','Opponent (English)','text',1],['opponent_name_ar','Opponent (Arabic)','text',1],['competition_en','Competition (English)','text'],['competition_ar','Competition (Arabic)','text'],['venue_en','Venue (English)','text'],['venue_ar','Venue (Arabic)','text'],['kickoff_at','Kick-off','datetime-local',1],['status','Status','select',['scheduled','live','finished','postponed','cancelled']],['home_score','PAVO score','number'],['away_score','Opponent score','number'],['is_published','Published','checkbox']]},
 news:{table:'news',title:'story',list:'news',fields:[['title_en','Title (English)','text',1],['title_ar','Title (Arabic)','text',1],['slug','Slug (unique, auto if empty)','text'],['summary_en','Summary (English)','textarea'],['summary_ar','Summary (Arabic)','textarea'],['content_en','Content (English)','textarea'],['content_ar','Content (Arabic)','textarea'],['cover_path','Cover image','image'],['video_path','Video (upload from device or paste a YouTube link)','video'],['category_en','Category (English)','text'],['category_ar','Category (Arabic)','text'],['status','Status','select',['draft','published','archived']]]}};
const store=()=>({players,matches,news});
const FORM={'4-3-3':[[8,50],[26,18],[26,39],[26,61],[26,82],[49,25],[49,50],[49,75],[73,18],[80,50],[73,82]],'4-2-3-1':[[8,50],[26,18],[26,39],[26,61],[26,82],[43,37],[43,63],[62,18],[62,50],[62,82],[79,50]],'4-4-2':[[8,50],[26,18],[26,39],[26,61],[26,82],[50,18],[50,39],[50,61],[50,82],[75,35],[75,65]],'3-5-2':[[8,50],[28,25],[28,50],[28,75],[51,12],[51,31],[51,50],[51,69],[51,88],[76,35],[76,65]]};

const upErr=e=>{const m=String(e&&e.message||e);return /bucket not found/i.test(m)?'Photo storage is not set up yet. See the status card in Overview.':/row-level security|not authorized|policy/i.test(m)?'No permission to upload. Sign in with an admin account.':/mime|exceeded|too large|maximum/i.test(m)?'Storage does not allow this file type or size. Run supabase-news-video.sql once, or use a smaller video (max 50 MB).':'Upload failed: '+m};
async function renderHealth(){const el=$('#health');if(!el)return;
 const act=players.filter(p=>p.is_active).length,pubM=matches.filter(m=>m.is_published).length,pubN=news.filter(n=>n.status==='published').length,cur=lineups.some(l=>l.status==='published'&&l.is_current);
 let st=null;try{const {error}=await supabaseClient.storage.from('pavo-media').list('',{limit:1});if(error)st=String(error.message)}catch(e){st=String(e.message||e)}
 const missing=st&&/not found/i.test(st);
 const row=(ok,t,hint)=>`<li class="${ok?'ok':'warn'}"><b>${ok?'✓':'!'}</b><span>${t}${!ok&&hint?`<small>${hint}</small>`:''}</span></li>`;
 el.innerHTML='<h2>Website status</h2><ul class="health">'+row(!st,'Photo storage',missing?'Not set up yet. The developer runs the storage setup once, then photos work from this page.':esc(st))+row(act>0,`${act} active players on the website`,'Add players or switch them to Active.')+row(pubM>0,`${pubM} published matches`,'Publish at least one match.')+row(pubN>0,`${pubN} published news stories`,'Set a story to Published.')+row(cur,'A published current line-up','Build a line-up and press Publish.')+'</ul>'+(missing?'<button class="btn btn-outline" id="copySql" type="button">Copy storage setup SQL</button>':'');
 const b=$('#copySql');if(b)b.onclick=async()=>{try{await navigator.clipboard.writeText(SETUP_SQL);toast('SQL copied. Paste it in Supabase SQL Editor and press Run.')}catch{toast('Copy failed. Use the file supabase-storage-setup.sql')}}}
function showTab(t){try{localStorage.setItem('pavo-tab',t)}catch{}document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===t));document.querySelectorAll('[data-panel]').forEach(p=>p.hidden=p.dataset.panel!==t);$('#stats').hidden=t!=='overview';{const h=$('#health');if(h)h.hidden=t!=='overview'}}
async function delLineup(){if(!activeId){toast('Load a saved line-up first.');return}if(!confirm('Delete this line-up? This cannot be undone.'))return;const {error}=await supabaseClient.from('lineups').delete().eq('id',activeId);if(error){toast(error.message);return}activeId=null;placed=[];toast('Line-up deleted');await loadAll()}

const SET=[['hero','Home page banner',[['title_ar','Headline (Arabic)','text'],['title_en','Headline (English)','text'],['text_ar','Intro (Arabic)','textarea'],['text_en','Intro (English)','textarea']]],
['club','Club information',[['description_ar','About (Arabic)','textarea'],['description_en','About (English)','textarea'],['mission_ar','Mission (Arabic)','textarea'],['mission_en','Mission (English)','textarea'],['vision_ar','Vision (Arabic)','textarea'],['vision_en','Vision (English)','textarea']]],
['contact','Contact',[['email','Email','email'],['phone','Phone','text']]],
['social','Social links (full https:// URLs)',[['instagram','Instagram','url'],['facebook','Facebook','url'],['x','X (Twitter)','url'],['youtube','YouTube','url']]]];
let settings={};
function renderSettings(){const sf=$('#setForm');if(!sf)return;sf.innerHTML=SET.map(([g,t,fs])=>`<fieldset><legend>${t}</legend>${fs.map(([k,l,ty])=>{const v=esc((settings[g]||{})[k]);return ty==='textarea'?`<label>${l}<textarea name="${g}.${k}">${v}</textarea></label>`:`<label>${l}<input type="${ty}" name="${g}.${k}" value="${v}"></label>`}).join('')}</fieldset>`).join('')+'<div class="lineup-actions"><button class="btn btn-gold" type="submit">Save site content</button><span id="setMsg" class="form-message" role="status"></span></div>'}
async function saveSettings(e){e.preventDefault();const out={};for(const [k,v] of new FormData(e.currentTarget).entries()){const [g,f]=k.split('.');(out[g]=out[g]||{})[f]=String(v).trim()}
 const {error}=await supabaseClient.from('site_settings').upsert(Object.entries(out).map(([key,value])=>({key,value,is_public:true})),{onConflict:'key'});
 $('#setMsg').textContent=error?error.message:'Saved. The public site is updated.';if(!error){settings=out;toast('Site content saved')}}
const on=(s,ev,fn)=>{const el=document.querySelector(s);if(el)el.addEventListener(ev,fn)};
async function start(){const lf=document.querySelector('#loginForm');if(lf)lf.addEventListener('submit',login);try{await start2()}catch(err){console.error(err);const m=document.querySelector('#loginMsg');if(m)m.textContent='Startup error: '+(err.message||err)}}
async function start2(){
 on('#stats','click',e=>{const c=e.target.closest('[data-go]');if(c)showTab(c.dataset.go)});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){const m=$('#modalRoot');if(m)m.innerHTML=''}});
 on('#setForm','submit',saveSettings);
 document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));on('#delLnBtn','click',delLineup);

 on('#logoutBtn','click',async()=>{await supabaseClient.auth.signOut();showLogin()});
 document.querySelectorAll('[data-add]').forEach(b=>b.addEventListener('click',()=>openEditor(b.dataset.add)));
 on('#adminPitch','click',pitchClick);on('#pSearch','input',drawAvail);
 on('#formation','change',applyFormation);on('#loadBtn','click',loadLineup);
 on('#draftBtn','click',()=>saveLineup('draft'));on('#pubBtn','click',()=>saveLineup('published'));
 on('#newBtn','click',()=>{placed=[];activeId=null;$('#lnSaved').value='';drawPitch();drawAvail()});
 if(!supabaseClient){$('#loginMsg').textContent='Supabase is not configured. Check supabase.js.';return}
 const {data:{session}}=await supabaseClient.auth.getSession();if(session)await verify(session.user);
 supabaseClient.auth.onAuthStateChange((ev,s)=>{if(ev==='SIGNED_OUT')showLogin()});
}
async function login(e){e.preventDefault();const msg=t=>$('#loginMsg').textContent=t;msg('Signing in…');const fd=new FormData(e.currentTarget);
 try{const {data,error}=await supabaseClient.auth.signInWithPassword({email:String(fd.get('email')).trim(),password:fd.get('password')});
  if(error){msg(/invalid login/i.test(error.message)?'Wrong email or password.':/not confirmed/i.test(error.message)?'Email not confirmed. In Supabase: Authentication > Users, confirm this user (or recreate it with Auto Confirm User).':error.message);return}
  await verify(data.user)}catch(err){msg('Login failed: '+(err.message||err))}}
async function verify(user){const msg=t=>$('#loginMsg').textContent=t;
 const {data,error}=await supabaseClient.from('admin_profiles').select('*').eq('user_id',user.id).maybeSingle();
 if(error){await supabaseClient.auth.signOut();msg('Could not read admin_profiles: '+error.message+' (run supabase-schema.sql in full).');return}
 if(!data){await supabaseClient.auth.signOut();msg('Signed in, but this account is not in admin_profiles. Run the INSERT INTO admin_profiles SQL with this exact email.');return}
 if(!data.is_active||!['super_admin','admin'].includes(data.role)){await supabaseClient.auth.signOut();msg('This account is not an active admin (role: '+data.role+').');return}
 $('#loginPanel').hidden=true;$('#dashboard').hidden=false;$('#logoutBtn').hidden=false;$('#welcome').textContent=`Signed in as ${data.display_name||user.email} (${data.role})`;
 try{await loadAll();showTab((()=>{try{const t=localStorage.getItem('pavo-tab');return['overview','players','matches','news','lineup','settings'].includes(t)?t:'overview'}catch{return'overview'}})())}catch(err){console.error(err);toast('Loaded with errors: '+(err.message||err))}}
function showLogin(){$('#dashboard').hidden=true;$('#loginPanel').hidden=false;$('#logoutBtn').hidden=true}
async function rows(table,order,asc=false){const {data,error}=await supabaseClient.from(table).select('*').order(order,{ascending:asc});if(error){toast(`${table}: ${error.message}`);return []}return data||[]}
async function loadAll(){
 [players,matches,news,lineups]=await Promise.all([rows('players','shirt_number',true),rows('matches','kickoff_at'),rows('news','created_at'),rows('lineups','updated_at')]);
 $('#stats').innerHTML=[['Players',players.length,'players','👥'],['Matches',matches.length,'matches','📅'],['News',news.length,'news','📰'],['Line-ups',lineups.length,'lineup','⚽']].map(x=>`<div class="admin-stat" data-go="${x[2]}" role="button" tabindex="0"><span>${x[3]} ${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
 tables();
 {const st=await rows('site_settings','key',true);settings=Object.fromEntries(st.map(x=>[x.key,x.value||{}]));renderSettings()}
 $('#lnMatch').innerHTML='<option value="">No match linked</option>'+matches.map(m=>`<option value="${esc(m.id)}">${esc(m.opponent_name_en||m.opponent_name_ar)}</option>`).join('');
 $('#lnSaved').innerHTML='<option value="">New line-up</option>'+lineups.map(l=>`<option value="${esc(l.id)}">${esc(l.name_en||l.name_ar)} (${esc(l.status)}${l.is_current?', current':''})</option>`).join('');
 drawAvail();drawPitch();renderHealth();
}
const thumbHtml=p=>{const u=imgUrl(p.photo_path);return u?`<img class="thumb" draggable="false" src="${esc(u)}" alt="" onerror="this.remove()">`:''};
function tbl(type,head,rs){return `<table class="data-table"><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}<th></th></tr></thead><tbody>${rs.map(r=>`<tr>${r[1].map(c=>`<td>${c&&c.html?c.html:esc(c)}</td>`).join('')}<td><div class="row-actions"><button class="small-btn" data-edit="${type}" data-id="${esc(r[0])}">Edit</button><button class="small-btn danger" data-del="${type}" data-id="${esc(r[0])}">Delete</button></div></td></tr>`).join('')||`<tr><td colspan="${head.length+1}">No records yet.</td></tr>`}</tbody></table>`}
function tables(){
 $('#tPlayer').innerHTML=tbl('player',['Name','No.','Active'],players.map(p=>[p.id,[{html:thumbHtml(p)+esc(p.full_name_en||p.full_name_ar)},p.shirt_number??'—',p.is_active?'Yes':'No']]));
 $('#tMatch').innerHTML=tbl('match',['Opponent','Date','Status','Public'],matches.map(m=>[m.id,[m.opponent_name_en||m.opponent_name_ar,m.kickoff_at?new Date(m.kickoff_at).toLocaleDateString():'',m.status,m.is_published?'Yes':'No']]));
 $('#tNews').innerHTML=tbl('news',['Story','Status'],news.map(n=>[n.id,[n.title_en||n.title_ar,n.status]]));
 document.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>openEditor(b.dataset.edit,b.dataset.id)));
 document.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',()=>del(b.dataset.del,b.dataset.id)));
}
function field(f,v){const [n,l,t,x]=f;if(t==='checkbox')return `<label class="check-label"><input type="checkbox" name="${n}" ${v?'checked':''}> ${l}</label>`;
 if(t==='image'){const u=imgUrl(v);return `<div><span style="font-size:13px;font-weight:600;color:#c5ced7">${l}</span><span class="imgbox" style="margin-top:6px"><img class="preview" id="pv_${n}" src="${esc(u)}" alt="" title="Click to change" style="cursor:pointer" ${u?'':'hidden'}><span class="imgctl"><button type="button" class="btn btn-outline" id="pick_${n}">📷 Upload photo from device</button><input type="file" accept="image/*" name="file_${n}" data-pv="${n}" style="display:none"><span class="muted" id="st_${n}"></span><button type="button" class="small-btn" id="rm_${n}">Remove photo</button></span></span><input name="${n}" type="hidden" value="${esc(v)}"></div>`}
 if(t==='video'){return `<div><span style="font-size:13px;font-weight:600;color:#c5ced7">${l}</span><span class="imgctl" style="margin:6px 0"><button type="button" class="btn btn-outline" id="vpick_${n}">🎬 Upload video from device</button><input type="file" accept="video/*" data-vid="${n}" style="display:none"><span class="muted" id="vst_${n}">${v?'Video attached':''}</span><button type="button" class="small-btn" id="vrm_${n}">Remove video</button></span><input name="${n}" type="text" value="${esc(v)}" placeholder="…or paste a YouTube / Vimeo link"></div>`}
 if(t==='select')return `<label>${l}<select name="${n}">${x.map(o=>`<option ${v===o?'selected':''}>${o}</option>`).join('')}</select></label>`;
 if(t==='textarea')return `<label>${l}<textarea name="${n}">${esc(v)}</textarea></label>`;
 if(t==='datetime-local'&&v){const d=new Date(v);v=new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,16)}
 return `<label>${l}<input name="${n}" type="${t}" value="${esc(v)}" ${x===1?'required':''}></label>`}
async function uploadVideo(file,folder){if(!file||!file.size)return null;if(!file.type.startsWith('video/'))throw new Error('Please choose a video file.');if(file.size>50*1024*1024)throw new Error('Video is larger than 50 MB. Compress it, or paste a YouTube link instead.');
 const ext=((file.name.split('.').pop()||'mp4').toLowerCase().replace(/[^a-z0-9]/g,''))||'mp4';const path=`${folder}/videos/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
 const {error}=await supabaseClient.storage.from('pavo-media').upload(path,file,{contentType:file.type,cacheControl:'31536000'});if(error)throw error;return path}
async function shrink(file,max){try{const bmp=await createImageBitmap(file);const k=Math.min(1,max/Math.max(bmp.width,bmp.height));const c=document.createElement('canvas');c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);const b=await new Promise(r=>c.toBlob(r,'image/jpeg',0.85));return b||file}catch{return file}}
async function uploadImage(file,folder,max=1200){if(!file||!file.size)return null;if(!file.type.startsWith('image/'))throw new Error('Only image files are allowed.');
 const blob=await shrink(file,max);if(blob.size>8*1024*1024)throw new Error('Image is too large.');
 const path=`${folder}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.jpg`;
 const {error}=await supabaseClient.storage.from('pavo-media').upload(path,blob,{contentType:'image/jpeg',cacheControl:'31536000'});if(error)throw error;return path}
function openEditor(type,id){
 const s=SCH[type],old=id?store()[s.list].find(r=>r.id===id):null;
 $('#modalRoot').innerHTML=`<div class="modal-backdrop"><section class="modal-card" role="dialog" aria-modal="true"><button class="modal-close" type="button" aria-label="Close">×</button><h2>${old?'Edit':'Add'} ${s.title}</h2><form id="rf" class="modal-form">${s.fields.map(f=>field(f,old?old[f[0]]:(f[0]==='is_active'?true:''))).join('')}<div class="modal-actions"><button class="btn btn-outline" type="button" id="cx">Cancel</button><button class="btn btn-gold" type="submit">Save</button></div><p class="form-message" id="mm" role="alert"></p></form></section></div>`;
 const close=()=>$('#modalRoot').innerHTML='';$('.modal-close').onclick=close;$('#cx').onclick=close;
document.querySelectorAll('[data-pv]').forEach(i=>{const n=i.dataset.pv,p=$('#pv_'+n),st=$('#st_'+n),inp=document.querySelector(`input[name="${n}"]`),save=$('#rf button[type=submit]'),open=()=>i.click();
  $('#pick_'+n).addEventListener('click',open);p.addEventListener('click',open);
  i.addEventListener('change',async()=>{const f=i.files[0];if(!f)return;p.src=URL.createObjectURL(f);p.hidden=false;st.textContent='Uploading…';save.disabled=true;
   try{inp.value=await uploadImage(f,s.table,n==='cover_path'?1600:1000);st.textContent='Uploaded ✓';try{const r=await fetch(imgUrl(inp.value),{method:'HEAD'});if(!r.ok)st.textContent='Uploaded, but the photo is not publicly readable. Photo storage setup is incomplete (see Overview).'}catch{}}catch(err){st.textContent=upErr(err);i.value=''}finally{save.disabled=false}});
  $('#rm_'+n).addEventListener('click',()=>{inp.value='';i.value='';p.hidden=true;st.textContent=''})});
 document.querySelectorAll('[data-vid]').forEach(i=>{const n=i.dataset.vid,st=$('#vst_'+n),inp=document.querySelector(`input[name="${n}"]`),save=$('#rf button[type=submit]');
  $('#vpick_'+n).addEventListener('click',()=>i.click());
  i.addEventListener('change',async()=>{const f=i.files[0];if(!f)return;st.textContent='Uploading video… please wait and keep this window open.';save.disabled=true;
   try{inp.value=await uploadVideo(f,s.table);st.textContent='Video uploaded ✓'}catch(err){st.textContent=upErr(err);i.value=''}finally{save.disabled=false}});
  $('#vrm_'+n).addEventListener('click',()=>{inp.value='';i.value='';st.textContent=''})});
 $('#rf').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget),row={};
  for(const [n,,t] of s.fields){if(t==='checkbox')row[n]=fd.has(n);else if(t==='number')row[n]=fd.get(n)===''?null:Number(fd.get(n));else if(t==='datetime-local')row[n]=fd.get(n)?new Date(fd.get(n)).toISOString():null;else row[n]=(fd.get(n)||'').trim()||null}
  $('#mm').textContent='Saving…';
  if(type==='player')['appearances','goals','assists'].forEach(k=>{if(row[k]==null)row[k]=0});
  if('slug' in row){row.slug=slugify(row.slug||row.full_name_en||row.title_en);if(!row.slug){$('#mm').textContent='Slug could not be generated; enter an English name/title or slug.';return}}
  if(type==='news'){if(row.status==='published'&&!(old&&old.published_at))row.published_at=new Date().toISOString();if(row.status!=='published'&&!old?.published_at)row.published_at=null}
  const r=old?await supabaseClient.from(s.table).update(row).eq('id',old.id):await supabaseClient.from(s.table).insert(row);
  if(r.error){$('#mm').textContent=r.error.message;return}close();toast('Saved');await loadAll()}}
async function del(type,id){const s=SCH[type];if(!confirm(`Delete this ${s.title}? This cannot be undone.`))return;
 const {error}=await supabaseClient.from(s.table).delete().eq('id',id);if(error){toast(error.message.includes('foreign')?'Cannot delete: it is used in a line-up. Remove it there first.':error.message);return}toast('Deleted');await loadAll()}

/* ---- line-up editor ---- */
function drawAvail(){const k=($('#pSearch').value||'').toLowerCase(),used=new Set(placed.map(p=>p.player_id));
 $('#avail').innerHTML=players.filter(p=>p.is_active&&`${p.full_name_en||''} ${p.full_name_ar||''} ${p.shirt_number??''}`.toLowerCase().includes(k)).map(p=>{const u=imgUrl(p.photo_path),on=used.has(p.id);return `<button type="button" class="pick ${on?'used':''}" data-pick="${esc(p.id)}">${u?`<img class="thumb" draggable="false" src="${esc(u)}" alt="" onerror="this.remove()">`:''}<span>#${esc(p.shirt_number??'—')} ${esc(p.full_name_en||p.full_name_ar)}</span>${on?'<b>✓</b>':''}</button>`}).join('')||'<p class="muted">No active players.</p>';
 document.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>togglePlayer(b.dataset.pick))}
let targetSlot=null;
const FPOS={'4-3-3':['GK','LB','CB','CB','RB','CM','CM','CM','LW','ST','RW'],'4-2-3-1':['GK','LB','CB','CB','RB','CDM','CDM','LW','CAM','RW','ST'],'4-4-2':['GK','LB','CB','CB','RB','LM','CM','CM','RM','ST','ST'],'3-5-2':['GK','CB','CB','CB','LWB','CM','CDM','CM','RWB','ST','ST']};
const slots=()=>FORM[$('#formation').value]||FORM['4-3-3'];
const near=(p,c)=>Math.hypot(p.x_position-c[0],(p.y_position-c[1])*.67)<4;
const occupied=i=>placed.some(p=>near(p,slots()[i]));
function togglePlayer(id){const ex=placed.find(p=>p.player_id===id);
 if(ex)placed=placed.filter(p=>p!==ex);
 else{if(placed.length>=11){toast('A line-up has at most 11 starters.');return}
  const sl=slots();let i=(targetSlot!==null&&!occupied(targetSlot))?targetSlot:sl.findIndex((_,k)=>!occupied(k));if(i<0)i=0;targetSlot=null;
  placed.push({player_id:id,slot:i,x_position:sl[i][0],y_position:sl[i][1],tactical_position:null})}
 drawPitch();drawAvail()}
function drawPitch(){const pitch=$('#adminPitch'),sl=slots(),pos=FPOS[$('#formation').value]||[];
 pitch.querySelectorAll('.pitch-player,.slot').forEach(x=>x.remove());
 sl.forEach((c,i)=>{if(occupied(i))return;const b=document.createElement('button');b.type='button';b.className='slot'+(targetSlot===i?' sel':'');b.style.left=c[0]+'%';b.style.top=c[1]+'%';b.textContent=pos[i]||'';b.title='Tap, then choose a player from the list';
  b.addEventListener('click',e=>{e.stopPropagation();targetSlot=targetSlot===i?null:i;drawPitch()});pitch.appendChild(b)});
 placed.forEach(pl=>{const p=players.find(x=>x.id===pl.player_id);if(!p)return;const u=imgUrl(p.photo_path),el=document.createElement('div');
  el.className='pitch-player'+(u?' has-photo':'');el.style.left=pl.x_position+'%';el.style.top=pl.y_position+'%';
  el.innerHTML=`<button class="x" type="button" aria-label="Remove">×</button><button class="cbtn ${pl.is_captain?'on':''}" type="button" aria-label="Captain">C</button><span class="mk"><span class="av">${u?`<img draggable="false" src="${esc(u)}" alt="">`:''}</span><span class="shirt">${esc(p.shirt_number??'')}</span></span><small>${esc(p.full_name_en||p.full_name_ar)}</small>`;
  const img=el.querySelector('img');if(img)img.addEventListener('error',()=>{img.remove();el.classList.remove('has-photo')});
  el.querySelector('.x').addEventListener('click',e=>{e.stopPropagation();placed=placed.filter(x=>x!==pl);drawPitch();drawAvail()});
  el.querySelector('.cbtn').addEventListener('click',e=>{e.stopPropagation();const was=pl.is_captain;placed.forEach(x=>x.is_captain=false);pl.is_captain=!was;drawPitch()});
  el.addEventListener('click',e=>e.stopPropagation());
  el.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;e.preventDefault();el.setPointerCapture(e.pointerId);el.classList.add('dragging');
   const st={x:pl.x_position,y:pl.y_position,slot:pl.slot};let snap=null;const snapOn=()=>{const s=$('#snap');return !s||s.checked};
   const move=ev=>{const r=pitch.getBoundingClientRect();let x=clamp((ev.clientX-r.left)/r.width*100,4,96),y=clamp((ev.clientY-r.top)/r.height*100,4,96);snap=null;
    if(snapOn()){let best=6;sl.forEach((c,i)=>{const d=Math.hypot(c[0]-x,(c[1]-y)*.67);if(d<best){best=d;snap=i}});if(snap!==null){x=sl[snap][0];y=sl[snap][1]}}
    pl.x_position=Math.round(x);pl.y_position=Math.round(y);el.style.left=pl.x_position+'%';el.style.top=pl.y_position+'%'};
   const up=()=>{el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up);
    if(snap!==null){const c=sl[snap],o=placed.find(q=>q!==pl&&near(q,c));if(o){o.x_position=st.x;o.y_position=st.y;o.slot=st.slot}pl.slot=snap}
    drawPitch();drawAvail()};
   el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);move(e)});
  pitch.appendChild(el)})}
function pitchClick(){}
function applyFormation(){targetSlot=null;const c=FORM[$('#formation').value]||FORM['4-3-3'];placed.forEach((p,i)=>{p.slot=i;if(c[i]){p.x_position=c[i][0];p.y_position=c[i][1]}});drawPitch()}
async function loadLineup(){const id=$('#lnSaved').value;const lp=lineups.find(l=>l.id===id);if(!lp){toast('Choose a saved line-up first.');return}
 const {data,error}=await supabaseClient.from('lineup_players').select('*').eq('lineup_id',id).order('sort_order');if(error){toast(error.message);return}
 activeId=id;placed=(data||[]).filter(r=>players.some(p=>p.id===r.player_id)).map((r,i)=>({slot:i,player_id:r.player_id,x_position:Number(r.x_position),y_position:Number(r.y_position),tactical_position:r.tactical_position,is_captain:!!r.is_captain}));
 $('#lnEn').value=lp.name_en||'';$('#lnAr').value=lp.name_ar||'';$('#formation').value=lp.formation_code||'4-3-3';$('#lnMatch').value=lp.match_id||'';drawPitch();drawAvail();toast('Line-up loaded')}
async function saveLineup(status){
 if(!placed.length){toast('Place at least one player first.');return}
 const msg=t=>$('#lnMsg').textContent=t;msg('Saving…');
 const row={match_id:$('#lnMatch').value||null,name_en:$('#lnEn').value.trim()||'First Team',name_ar:$('#lnAr').value.trim()||'تشكيلة الفريق',formation_code:$('#formation').value,status,is_current:status==='published',published_at:status==='published'?new Date().toISOString():null};
 if(activeId){const {error}=await supabaseClient.from('lineups').update(row).eq('id',activeId);if(error){msg(error.message);return}}
 else{const {data,error}=await supabaseClient.from('lineups').insert(row).select().single();if(error){msg(error.message);return}activeId=data.id}
 const {error:de}=await supabaseClient.from('lineup_players').delete().eq('lineup_id',activeId);if(de){msg(de.message);return}
 const {error:ie}=await supabaseClient.from('lineup_players').insert(placed.map((p,i)=>({lineup_id:activeId,player_id:p.player_id,x_position:p.x_position,y_position:p.y_position,tactical_position:(FPOS[$('#formation').value]||[])[p.slot]||p.tactical_position||null,is_starter:true,is_captain:!!p.is_captain,sort_order:i})));
 if(ie){msg('Players were not saved: '+ie.message);return}
 if(status==='published')await supabaseClient.from('lineups').update({is_current:false}).neq('id',activeId).eq('is_current',true);
 msg(status==='published'?'Published.':'Draft saved.');toast(status==='published'?'Line-up published':'Draft saved');await loadAll();$('#lnSaved').value=activeId}
start();
