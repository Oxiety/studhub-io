// Общие комментарии и оценки. В Supabase состояние хранится на сервере;
// localStorage используется только в автономном режиме.
function lsGet(k,d){try{const v=JSON.parse(userStore.getItem(k));return v==null?d:v}catch(e){return d}}
function lsSet(k,v){userStore.setItem(k,JSON.stringify(v))}
function ago(ts){const m=Math.floor((Date.now()-ts)/60000);if(m<1)return 'только что';if(m<60)return m+' мин назад';const h=Math.floor(m/60);if(h<24)return h+' ч назад';return Math.floor(h/24)+' дн назад'}
const fmtRub=n=>n.toLocaleString('ru-RU')+' ₽';
const scoreText=n=>n<0?'−'+Math.abs(n):String(n);
function openModal(id){document.getElementById(id).classList.add('show')}
function closeModal(id){document.getElementById(id).classList.remove('show')}

const interactionCache={votes:{},comments:{},loading:{},counts:{}};
async function loadCommentCount(key){if(!BACKEND||!sb||interactionCache.counts[key]!==undefined)return;const t=interactionTarget(key);if(!t||t.type==='discussion')return;try{const {count,error}=await sb.from('content_comments').select('id',{count:'exact',head:true}).eq('target_type',t.type).eq('target_id',t.id);if(error)throw error;interactionCache.counts[key]=count||0;document.querySelectorAll(`.cc[data-key="${key}"]`).forEach(e=>e.textContent=String((count||0)+(+e.dataset.base||0)))}catch(e){console.warn('Не удалось загрузить количество комментариев',e)}}
function interactionTarget(key){const i=String(key).indexOf('-');if(i<1)return null;const p=key.slice(0,i),id=key.slice(i+1);if(!['post','proj','uproj','disc'].includes(p))return null;return {key,type:p==='post'?'post':(p==='proj'||p==='uproj')?'project':'discussion',id};}
function setVoteUi(key,score,mine){document.querySelectorAll(`.vote-control[data-key="${key}"]`).forEach(box=>{box.dataset.base=String(score);box.querySelector('.up')?.classList.toggle('active',mine===1);box.querySelector('.down')?.classList.toggle('active',mine===-1);const c=box.querySelector('.vote-count');if(c){c.textContent=scoreText(score);c.className='vote-count '+(score<0?'negative':'positive')}})}
async function loadVoteState(key){
 if(!BACKEND||!sb)return;
 const t=interactionTarget(key);if(!t)return;
 try{const {data,error}=await sb.from('content_votes').select('user_id,value').eq('target_type',t.type).eq('target_id',t.id);if(error)throw error;const rows=data||[],score=rows.reduce((n,r)=>n+(+r.value||0),0),mine=rows.find(r=>r.user_id===activeUserId());interactionCache.votes[key]={score,mine:mine?+mine.value:0};setVoteUi(key,score,mine?+mine.value:0)}catch(e){console.warn('Не удалось загрузить оценки',e)}
}
function voteBox(key,base,vert){
 const cached=interactionCache.votes[key],v=BACKEND?(cached?cached.mine:0):(lsGet('studhub_votes',{})[key]||0),s=BACKEND?(cached?cached.score:0):base+v;
 const html=`<div class="vote-control${vert?' vert':''}" data-key="${key}" data-base="${s}"><button class="vote-btn up${v===1?' active':''}" onclick="castVote('${key}',1)" aria-label="Положительная оценка"><svg viewBox="0 0 24 24"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg></button><span class="vote-count ${s<0?'negative':'positive'}">${scoreText(s)}</span><button class="vote-btn down${v===-1?' active':''}" onclick="castVote('${key}',-1)" aria-label="Отрицательная оценка"><svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg></button></div>`;
 if(BACKEND&&sb&&!interactionCache.loading['v'+key]){interactionCache.loading['v'+key]=true;setTimeout(()=>loadVoteState(key),0)}return html;
}
async function castVote(key,dir){
 if(BACKEND&&sb){if(!activeUserId()){showToast('Войдите в аккаунт, чтобы ставить оценки','error');return}const t=interactionTarget(key);if(!t)return;const cur=interactionCache.votes[key]?.mine||0;try{if(cur===dir){const {error}=await sb.from('content_votes').delete().eq('target_type',t.type).eq('target_id',t.id).eq('user_id',activeUserId());if(error)throw error}else{const {error}=await sb.from('content_votes').upsert({target_type:t.type,target_id:t.id,user_id:activeUserId(),value:dir},{onConflict:'target_type,target_id,user_id'});if(error)throw error}await loadVoteState(key)}catch(e){console.error(e);showToast('Не удалось сохранить оценку','error')}return}
 const m=lsGet('studhub_votes',{});m[key]=m[key]===dir?0:dir;lsSet('studhub_votes',m);document.querySelectorAll(`.vote-control[data-key="${key}"]`).forEach(box=>{const s=+box.dataset.base+m[key];box.querySelector('.up').classList.toggle('active',m[key]===1);box.querySelector('.down').classList.toggle('active',m[key]===-1);const c=box.querySelector('.vote-count');c.textContent=scoreText(s);c.className='vote-count '+(s<0?'negative':'positive')});
}
const getComments=key=>lsGet('studhub_comments',{})[key]||[];
async function fetchContentComments(key){
 const t=interactionTarget(key);if(!t||!BACKEND||!sb)return getComments(key);
 if(t.type==='discussion')return getComments(key); // ответы обсуждений используют discussion_comments
 const {data,error}=await sb.from('content_comments').select('id,author_id,author_name,body,created_at').eq('target_type',t.type).eq('target_id',t.id).order('created_at',{ascending:true});if(error)throw error;
 const rows=(data||[]).map(c=>({id:c.id,author:c.author_name||'Студент',authorId:c.author_id,text:c.body,ts:Date.parse(c.created_at)||Date.now()}));interactionCache.comments[key]=rows;interactionCache.counts[key]=rows.length;return rows;
}
async function renderComments(key){
 const boxes=[...document.querySelectorAll(`.comments-box[data-key="${key}"]`)];if(!boxes.length)return;
 boxes.forEach(b=>b.innerHTML='<div class="comment" style="color:var(--muted-2)">Загружаем комментарии…</div>');
 let list=[];try{list=await fetchContentComments(key)}catch(e){console.error(e);boxes.forEach(b=>b.innerHTML='<div class="comment" style="color:var(--muted-2)">Не удалось загрузить комментарии.</div>');return}
 document.querySelectorAll(`.cc[data-key="${key}"]`).forEach(e=>e.textContent=list.length+(+e.dataset.base||0));
 boxes.forEach(box=>{box.innerHTML=(list.map(c=>`<div class="comment"><b>${escapeHtml(c.author)}</b><small>${ago(c.ts)}</small><div>${escapeHtml(c.text)}</div></div>`).join('')||'<div class="comment" style="color:var(--muted-2)">Пока нет комментариев — начните обсуждение.</div>')+`<div class="comment-form"><input class="pill-input" placeholder="Написать комментарий..." onkeydown="if(event.key==='Enter')addComment('${key}',this)"><button class="btn-submit" onclick="addComment('${key}',this.previousElementSibling)">Отправить</button></div>`});
}
async function addComment(key,input){
 const t=String(input.value||'').trim();if(!t)return;if(t.length>2000){showToast('Комментарий слишком длинный (максимум 2000 символов)','error');return}
 if(BACKEND&&sb){if(!activeUserId()){showToast('Войдите в аккаунт, чтобы комментировать','error');return}const target=interactionTarget(key);if(!target||target.type==='discussion'){showToast('Откройте обсуждение, чтобы написать ответ','error');return}try{const {error}=await sb.from('content_comments').insert({target_type:target.type,target_id:target.id,author_id:activeUserId(),author_name:getCurrentUser().name,body:t});if(error)throw error;input.value='';interactionCache.counts[key]=undefined;await renderComments(key);showToast('Комментарий сохранён','success')}catch(e){console.error(e);showToast('Не удалось сохранить комментарий','error')}return}
 const all=lsGet('studhub_comments',{});(all[key]=all[key]||[]).push({author:getCurrentUser().name,text:t,ts:Date.now()});lsSet('studhub_comments',all);input.value='';await renderComments(key);showToast('Комментарий добавлен','success');
}
function toggleComments(key){const b=document.querySelector(`.comments-box[data-key="${key}"]`);if(!b)return;b.classList.toggle('open');if(b.classList.contains('open'))renderComments(key)}
const commentBtn=(key,base)=>{if(BACKEND&&sb)setTimeout(()=>loadCommentCount(key),0);return `<div class="post-stat" onclick="toggleComments('${key}')">💬 <span class="cc" data-key="${key}" data-base="${base}">${(interactionCache.counts[key]??getComments(key).length)+base}</span> комментариев</div>`};
const commentsBox=key=>`<div class="comments-box" data-key="${key}"></div>`;
function mountRating(el,key,base){if(!el)return;if(BACKEND&&sb)setTimeout(()=>loadCommentCount(key),0);el.innerHTML=`<div style="display:flex;align-items:center;gap:12px;margin:14px 0 6px">${voteBox(key,base)}<span class="post-stat" style="cursor:default">💬 <span class="cc" data-key="${key}" data-base="0">${getComments(key).length}</span></span></div><div class="comments-box open" data-key="${key}"></div>`;renderComments(key)}
