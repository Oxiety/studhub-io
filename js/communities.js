// Сообщества
// All Communities
const allCommunitiesData = [];
let communityFilter = 'all';
function setCommunityFilter(filter, btn) {
 communityFilter = filter;
 document.querySelectorAll('#communityFilters .tab-btn').forEach(b=>b.classList.remove('active'));
 btn.classList.add('active'); renderAllCommunities();
}
function renderAllCommunities() {
 const grid=document.getElementById('allCommunitiesGrid'); if(!grid) return;
 const q=(document.getElementById('communitySearch')?.value||'').trim().toLowerCase();
 let data=allCommunitiesData.filter(c=>!q || (c.name+' '+c.desc).toLowerCase().includes(q));
 if(communityFilter==='mine') data=data.filter(c=>c.joined);
 if(communityFilter==='popular') data=data.slice().sort((a,b)=>b.members-a.members);
 if(communityFilter==='new') data=data.slice().sort((a,b)=>b.id-a.id);
 if(!data.length){grid.innerHTML='<div class="empty-state" style="grid-column:1/-1;text-align:center;color:var(--muted);padding:40px 16px;font-size:14px;line-height:1.6"><div style="font-size:34px;margin-bottom:8px">👥</div><b style="color:var(--text)">Сообществ пока нет</b><br>'+(q?'По запросу ничего не найдено.':'Здесь появятся сообщества, когда их создадут.')+'</div>';renderSidebarCommunities();return;}
 grid.innerHTML=data.map(c=>`<div class="community-card" onclick="openCommunity(${c.id})"><div class="community-card-cover ${c.color}"><div class="community-card-icon ${c.icon}">${c.letter}</div></div><div class="community-card-name">${c.name}</div><div class="community-card-desc">${c.desc}</div><div class="community-card-meta"><div class="community-card-members">${c.members.toLocaleString()} участников</div><button class="community-card-btn ${c.joined?'joined':'join'}" onclick="event.stopPropagation();toggleCommunityJoin(${c.id},this)">${c.joined?'Вы участник':'Вступить'}</button></div></div>`).join('') || '<div class="empty-state"><div class="empty-state-title">Сообщества не найдены</div><div class="empty-state-desc">Измени поисковый запрос или фильтр.</div></div>';
}
function openCommunity(id) {
 const c=allCommunitiesData.find(x=>x.id===id); if(!c)return;
 switchView('community');
 const name=document.querySelector('#view-community .community-name');
 const fullname=document.querySelector('#view-community .community-fullname');
 const location=document.querySelector('#view-community .community-location');
 const coverText=document.querySelector('#view-community .cover-building-text');
 const coverLogo=document.querySelector('#view-community .cover-logo');
 if(name)name.textContent=c.name; if(fullname)fullname.textContent=c.desc; if(location)location.textContent='Сообщество StudHub';
 if(coverText)coverText.innerHTML=c.name+'<span>'+c.location+'</span>'; if(coverLogo)coverLogo.textContent=c.letter;
const coverInner=document.querySelector('#view-community .community-cover-inner');
 if(coverInner){
   coverInner.style.background=c.cover; coverInner.dataset.communityCover='true';
   const sky=coverInner.querySelector('.cover-sky'), building=coverInner.querySelector('.cover-building');
   if(sky)sky.style.background='transparent';
   if(building)building.style.background='rgba(255,255,255,.10)';
 }
const aboutCard=document.querySelector('#view-community .community-info + div'); if(aboutCard){aboutCard.querySelector('h2').textContent='О сообществе'; aboutCard.querySelectorAll('p')[0].textContent=c.about || c.desc; const p2=aboutCard.querySelectorAll('p')[1]; if(p2)p2.textContent='Участники сообщества публикуют новости, задают вопросы, делятся опытом и находят единомышленников.';}
 const stats=document.querySelectorAll('#view-community .community-stat-num'); if(stats[0])stats[0].textContent=c.members.toLocaleString(); if(stats[1])stats[1].textContent=c.online;
 const join=document.querySelector('#view-community .btn-joined'); if(join){join.textContent=c.joined?'Вы участник':'Вступить';join.onclick=()=>{c.joined=!c.joined;openCommunity(id);showToast(c.joined?'Вы вступили в сообщество':'Вы покинули сообщество','success')};}
 const posts=document.getElementById('communityDetailPosts');
 const relevant=homePostsData.filter(p=>p.community===c.name);
 posts.innerHTML=`<div class="section-header"><h2 class="section-title">Публикации сообщества</h2><span style="color:var(--muted);font-size:13px">${relevant.length} публикаций</span></div>`+(relevant.length?relevant.map(p=>`<article class="post-card"><div class="post-header"><div class="post-author"><div class="post-avatar ${p.avatarClass}">${p.avatarLetter}</div><div class="post-meta"><span class="post-community">${p.community}</span><span class="post-info">${p.author} · ${p.time}</span></div></div></div><h3 class="post-title">${p.title}</h3>${p.text?`<p class="post-text">${p.text}</p>`:''}<div class="post-footer">${voteBox('home-'+p.id,p.votes)}${commentBtn('home-'+p.id,p.comments)}</div>${commentsBox('home-'+p.id)}</article>`).join(''):`<div class="empty-state"><div class="empty-state-title">Пока нет публикаций</div><div class="empty-state-desc">Здесь будут появляться посты участников сообщества.</div></div>`);
}
function toggleCommunityJoin(id, btn) { const c=allCommunitiesData.find(x=>x.id===id); if(!c)return; c.joined=!c.joined; renderAllCommunities(); showToast(c.joined?'Вы вступили в сообщество «'+c.name+'»':'Вы покинули сообщество','success'); }

// Блок «Мои сообщества» в левом меню: только реальные сообщества, в которые вступил пользователь
function renderSidebarCommunities(){
 const box=document.getElementById('sbCommunities'); if(!box) return;
 const mine=allCommunitiesData.filter(c=>c.joined);
 box.innerHTML=mine.length?mine.map(c=>`<a class="nav-item" onclick="openCommunity(${c.id})"><div style="width:24px;height:24px;border-radius:6px;background:var(--accent-soft);color:var(--accent);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;">${escapeHtml(c.letter||'#')}</div>${escapeHtml(c.name)}</a>`).join(''):'<div style="padding:6px 14px 10px;font-size:12px;color:var(--muted)">Вы пока не вступили ни в одно сообщество</div>';
}
renderSidebarCommunities();
