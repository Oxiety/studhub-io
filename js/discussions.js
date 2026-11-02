// Обсуждения StudHub: Supabase при подключённом backend, локальный режим — без изменений схемы аккаунтов.
const DISC_CATS=['Вопросы','Идеи','Учёба','Общага','Ищу команду','Оффтоп'];
const seedDiscussions=[];
let discCat='Все',discSort='hot',discQ='',discMine=false, discRows=null, discBusy=false, activeDiscThread=null;
const discCommentsCache={};
function discMapRow(r){return {id:r.id,title:r.title,text:r.body||'',cat:r.category,author:r.author_name||'Студент',authorId:r.author_id,ts:Date.parse(r.created_at)||Date.now(),base:r.score||0,c0:r.comment_count||0,mine:r.author_id===activeUserId(),db:true};}
function getDiscs(){return discRows!==null?[...discRows,...seedDiscussions.filter(s=>!BACKEND)]:[...lsGet('studhub_discussions',[]),...seedDiscussions];}
function renderDiscFilters(){
 const cats=document.getElementById('discCats');if(cats)cats.innerHTML=['Все',...DISC_CATS].map((c,i)=>`<button class="tab-btn${(discCat===c?' active':'')}" onclick="setDisc('cat','${c}',this)">${c}</button>`).join('');
 const select=document.getElementById('discCat');if(select)select.innerHTML=DISC_CATS.map(c=>`<option>${c}</option>`).join('');
}
function setDisc(kind,val,btn){
 if(kind==='mine'){discMine=!discMine;btn.classList.toggle('active',discMine)}
 else {if(kind==='cat')discCat=val;else discSort=val;btn.parentElement.querySelectorAll('.tab-btn:not([data-mine])').forEach(b=>b.classList.remove('active'));btn.classList.add('active');}
 renderDiscussions();
}
async function loadDiscussions(){
 if(!BACKEND||!sb)return;
 const box=document.getElementById('discList');if(box&&discRows===null)box.innerHTML='<div class="disc-loading"><span class="disc-spinner"></span> Загружаем обсуждения…</div>';
 try{
  const {data,error}=await sb.from('discussions').select('id,title,body,category,author_id,author_name,score,comment_count,created_at').order('created_at',{ascending:false}).limit(200);
  if(error)throw error;discRows=(data||[]).map(discMapRow);renderDiscussions();
 }catch(e){console.error('Не удалось загрузить обсуждения',e);if(box)box.innerHTML='<div class="empty-state"><div class="empty-state-title">Не удалось загрузить обсуждения</div><div class="empty-state-desc">Проверьте таблицы и политики Supabase, затем попробуйте ещё раз.</div><button class="btn-submit" onclick="loadDiscussions()">Повторить</button></div>';}
}
function renderDiscussions(){
 const box=document.getElementById('discList');if(!box)return;
 const votes=lsGet('studhub_votes',{}),list=getDiscs().filter(d=>(discCat==='Все'||d.cat===discCat)&&(!discMine&&(true)||d.mine)&&(!discQ||(d.title+' '+d.text+' '+d.author).toLowerCase().includes(discQ)));
 const score=d=>BACKEND?(interactionCache.votes['disc-'+d.id]?.score||0):d.base+(votes['disc-'+d.id]||0),comments=d=>d.db?(d.c0||0):(d.c0||0)+getComments('disc-'+d.id).length;
 const hot=d=>(score(d)+comments(d)+1)/Math.pow((Date.now()-d.ts)/36e5+2,1.2);
 list.sort(discSort==='new'?(a,b)=>b.ts-a.ts:discSort==='top'?(a,b)=>score(b)-score(a):discSort==='comments'?(a,b)=>comments(b)-comments(a):(a,b)=>hot(b)-hot(a));
 const total=getDiscs().length, mine=getDiscs().filter(d=>d.mine).length;
 const stats=document.getElementById('discStats');if(stats)stats.innerHTML=`<div class="disc-stat"><span class="disc-stat-icon">☰</span><div><b>${total}</b><small>обсуждений</small></div></div><div class="disc-stat"><span class="disc-stat-icon">💬</span><div><b>${getDiscs().reduce((n,d)=>n+comments(d),0)}</b><small>ответов</small></div></div><div class="disc-stat"><span class="disc-stat-icon">✦</span><div><b>${mine}</b><small>моих тем</small></div></div>`;
 box.innerHTML=list.map(d=>`<article class="disc-card"><div class="disc-vote">${voteBox('disc-'+d.id,d.base,true)}</div><div class="disc-body"><div class="disc-meta"><span class="post-tag green" style="margin:0 6px 0 0;padding:3px 10px">${escapeHtml(d.cat)}</span><span class="disc-author-avatar">${escapeHtml((d.author||'S').trim().slice(0,1).toUpperCase())}</span><b>${escapeHtml(d.author)}</b><span>· ${ago(d.ts)}</span>${d.mine?'<span class="disc-you">Вы автор</span>':''}</div><div class="disc-title" onclick="openDiscThread('${d.id}')">${escapeHtml(d.title)}</div>${d.text?`<div class="disc-text">${escapeHtml(d.text)}</div>`:''}<div class="disc-card-footer"><button class="disc-action disc-open-thread" onclick="openDiscThread('${d.id}')">▱ <span>Открыть обсуждение · ${comments(d)} ответов</span></button><button class="disc-action" onclick="shareDiscussion('${d.id}')">↗ Поделиться</button>${d.mine?`<button class="disc-action danger" onclick="deleteDiscussion('${d.id}')">Удалить</button>`:''}</div></div></article>`).join('')||'<div class="empty-state"><div class="empty-state-title">Пока здесь тихо</div><div class="empty-state-desc">Подходящих обсуждений не нашлось. Измените фильтры или начните новую тему.</div><button class="btn-submit" onclick="openDiscModal()">＋ Создать обсуждение</button></div>';
}
function discCommentsBox(d){return '';}

function openDiscModal(){['discTitle','discText'].forEach(i=>document.getElementById(i).value='');document.getElementById('discCat').value='Вопросы';openModal('discModal');setTimeout(()=>document.getElementById('discTitle').focus(),80)}
async function submitDiscussion(){
 const title=document.getElementById('discTitle').value.trim(),body=document.getElementById('discText').value.trim(),cat=document.getElementById('discCat').value;
 if(title.length<4){showToast('Заголовок должен содержать минимум 4 символа','error');return}if(title.length>120||body.length>5000){showToast('Слишком длинный текст','error');return}
 if(BACKEND){
  if(!sb||!activeUserId()){showToast('Войдите в аккаунт, чтобы создавать обсуждения','error');return}
  const btn=document.querySelector('#discModal .btn-submit');if(btn){btn.disabled=true;btn.textContent='Публикуем…'}
  try{const {data,error}=await sb.from('discussions').insert({title,body,category:cat}).select('id,title,body,category,author_id,author_name,score,comment_count,created_at').single();if(error)throw error;discRows=[discMapRow(data),...(discRows||[])];closeModal('discModal');renderDiscussions();showToast('Обсуждение опубликовано','success')}
  catch(e){console.error(e);showToast(typeof backendErrorText==='function'?backendErrorText(e):'Не удалось опубликовать обсуждение','error')}
  finally{if(btn){btn.disabled=false;btn.textContent='Опубликовать'}}return;
 }
 const list=lsGet('studhub_discussions',[]);list.unshift({id:'u'+Date.now(),title,text:body,cat,author:getCurrentUser().name,ts:Date.now(),base:0,c0:0,mine:true});lsSet('studhub_discussions',list);closeModal('discModal');renderDiscussions();showToast('Обсуждение создано','success');
}
async function deleteDiscussion(id){
 if(!confirm('Удалить обсуждение?'))return;
 if(BACKEND){try{const {error}=await sb.from('discussions').delete().eq('id',id);if(error)throw error;discRows=(discRows||[]).filter(d=>d.id!==id);renderDiscussions();showToast('Обсуждение удалено','success')}catch(e){showToast(typeof backendErrorText==='function'?backendErrorText(e):'Не удалось удалить обсуждение','error')}return;}
 lsSet('studhub_discussions',lsGet('studhub_discussions',[]).filter(d=>d.id!==id));renderDiscussions();
}
async function openDiscThread(id){
 const d=getDiscs().find(x=>String(x.id)===String(id));if(!d)return;
 activeDiscThread=String(id);
 const modal=document.getElementById('discThreadModal');if(!modal)return;
 const content=document.getElementById('discThreadContent');
 content.innerHTML=`<div class="disc-thread-topic"><div class="disc-meta"><span class="post-tag green" style="margin:0;padding:3px 10px">${escapeHtml(d.cat)}</span><span class="disc-author-avatar">${escapeHtml((d.author||'S').trim().slice(0,1).toUpperCase())}</span><b>${escapeHtml(d.author)}</b><span>· ${ago(d.ts)}</span></div><h2>${escapeHtml(d.title)}</h2>${d.text?`<p class="disc-thread-topic-text">${escapeHtml(d.text)}</p>`:''}</div><div class="disc-thread-replies-head"><div><h3>Ответы</h3><p>Обсуждайте тему по существу и помогайте друг другу</p></div><span class="disc-thread-count">${d.c0||0}</span></div><div class="disc-thread-replies" id="discThreadReplies"><div class="disc-replies-empty">Загружаем ответы…</div></div>`;
 const input=document.getElementById('discThreadReply');if(input)input.value='';
 openModal('discThreadModal');await loadDiscReplies(id,true);
}
async function toggleDiscComments(id){return openDiscThread(id)}
async function loadDiscReplies(id,threadMode=false){
 const list=threadMode?document.getElementById('discThreadReplies'):document.getElementById('discReplyList-'+id);if(!list)return;
 let html='';
 if(!BACKEND){const comments=getComments('disc-'+id);html=comments.map(c=>`<article class="disc-thread-reply"><div class="disc-thread-reply-avatar">${escapeHtml((c.author||'S').trim().slice(0,1).toUpperCase())}</div><div class="disc-thread-reply-content"><div class="disc-thread-reply-meta"><b>${escapeHtml(c.author)}</b><time>${ago(c.ts)}</time></div><p>${escapeHtml(c.text)}</p></div></article>`).join('');}
 else {
  list.innerHTML='<div class="disc-replies-empty"><span class="disc-spinner"></span> Загружаем ответы…</div>';
  try{const {data,error}=await sb.from('discussion_comments').select('id,body,author_id,author_name,created_at').eq('discussion_id',id).order('created_at',{ascending:true});if(error)throw error;
   html=(data||[]).map(c=>`<article class="disc-thread-reply"><div class="disc-thread-reply-avatar">${escapeHtml((c.author_name||'S').trim().slice(0,1).toUpperCase())}</div><div class="disc-thread-reply-content"><div class="disc-thread-reply-meta"><b>${escapeHtml(c.author_name||'Студент')}</b><time>${ago(Date.parse(c.created_at))}</time></div><p>${escapeHtml(c.body)}</p></div></article>`).join('');
   const d=(discRows||[]).find(x=>String(x.id)===String(id));if(d)d.c0=(data||[]).length;
  }catch(e){console.error(e);list.innerHTML='<div class="disc-replies-empty">Не удалось загрузить ответы. Проверьте настройки Supabase.</div>';return}
 }
 list.innerHTML=html||'<div class="disc-thread-empty"><span>✦</span><b>Пока нет ответов</b><p>Начните разговор — ваш ответ будет первым.</p></div>';
 if(threadMode){const count=document.querySelector('#discThreadContent .disc-thread-count');if(count)count.textContent=String((html.match(/disc-thread-reply"/g)||[]).length);}
 discCommentsCache[id]=html;
}
async function submitDiscReply(id){
 const threadMode=!!(activeDiscThread&&String(activeDiscThread)===String(id)&&document.getElementById('discThreadModal')?.classList.contains('show'));
 const input=document.getElementById(threadMode?'discThreadReply':'discReply-'+id),body=input&&input.value.trim();if(!body)return;
 if(body.length>1000){showToast('Ответ слишком длинный','error');return}
 const btn=document.getElementById('discThreadSend');if(threadMode&&btn){btn.disabled=true;btn.textContent='Отправляем…'}
 if(BACKEND){if(!activeUserId()){showToast('Войдите в аккаунт, чтобы отвечать','error');if(threadMode&&btn){btn.disabled=false;btn.textContent='Отправить ответ'}return}try{const {error}=await sb.from('discussion_comments').insert({discussion_id:id,body});if(error)throw error;input.value='';await loadDiscReplies(id,threadMode);renderDiscussions();showToast('Ответ добавлен','success')}catch(e){showToast(typeof backendErrorText==='function'?backendErrorText(e):'Не удалось отправить ответ','error')}finally{if(threadMode&&btn){btn.disabled=false;btn.textContent='Отправить ответ'}}return}
 const all=lsGet('studhub_comments',{});(all['disc-'+id]=all['disc-'+id]||[]).push({author:getCurrentUser().name,text:body,ts:Date.now()});lsSet('studhub_comments',all);input.value='';await loadDiscReplies(id,threadMode);renderDiscussions();
}

function shareDiscussion(id){const d=getDiscs().find(x=>x.id===id);if(!d)return;const url=location.href.split('#')[0]+'#discussion-'+id;if(navigator.share)navigator.share({title:d.title,url}).catch(()=>{});else if(navigator.clipboard)navigator.clipboard.writeText(url).then(()=>showToast('Ссылка скопирована','success')).catch(()=>showToast(url));else showToast(url)}
