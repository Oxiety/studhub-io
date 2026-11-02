// Лента на главной: посты и голосование
const homePostsData = [];
const homeVoteState = {};
const homeOriginalVotes = {};
function renderPosts(sortType) {
const container = document.getElementById('postsContainer');
if (!container) return;
let sorted = [...homePostsData];
if (sortType === 'top') sorted.sort((a, b) => b.votes - a.votes);
else if (sortType === 'week') sorted.sort((a, b) => b.comments - a.comments);
else if (sortType === 'new') sorted.sort((a, b) => a.timeSort - b.timeSort);
container.innerHTML = sorted.map(post => {
const voteClass = post.votes >= 0 ? 'positive' : 'negative';
const voteDisplay = post.votes < 0 ? '−' + Math.abs(post.votes) : post.votes;
const upActive = homeVoteState[post.id] === 'up' ? 'active' : '';
const downActive = homeVoteState[post.id] === 'down' ? 'active' : '';
let imageHtml = '';
if (post.hasImage) {
imageHtml = '';
}
const starHtml = `<div class="post-stat star-btn" onclick="toggleStar(this)"><svg viewBox="0 0 24 24"><path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/></svg></div>`;
const joinHtml = post.hasJoin ? `<button class="btn-join"><svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:currentColor;"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>Вступить</button><button class="btn-more">···</button>` : `<button class="btn-more">···</button>`;
const textHtml = post.text ? `<p class="post-text">${post.text}</p>` : '';
const titleSection = post.hasStar ? `<div style="display:flex;align-items:center;gap:16px;"><div style="flex:1;"><h2 class="post-title" style="margin-bottom:0;">${post.title}</h2></div><div style="width:80px;height:80px;background:#f0e8f8;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg width="40" height="40" viewBox="0 0 24 24" fill="#8b6ab5"><path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24l-7.19-.62L12 2z"/></svg></div></div>` : `<h2 class="post-title">${post.title}</h2>`;
return `<div class="post-card" data-id="${post.id}">
<div class="post-header"><div class="post-author"><div class="post-avatar ${post.avatarClass}">${post.avatarLetter}</div><div class="post-meta"><span class="post-community">${post.community}</span><span class="post-info">Запостил ${post.author} <span>·</span> ${post.time}</span></div></div><div style="display:flex;align-items:center;gap:8px;">${joinHtml}</div></div>
<div class="post-tag ${post.tagClass}">${post.tag}</div>
${titleSection}
${textHtml}
${imageHtml}
<div class="post-footer">
<div class="vote-control">
<button class="vote-btn up ${upActive}" onclick="homeVote(this,'up',${post.id})"><svg viewBox="0 0 24 24"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg></button>
<span class="vote-count ${voteClass}" id="hvote-${post.id}">${voteDisplay}</span>
<button class="vote-btn down ${downActive}" onclick="homeVote(this,'down',${post.id})"><svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg></button>
</div>
<div class="post-stat"><svg viewBox="0 0 24 24"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/></svg>${post.comments} комментария</div>
<div class="post-stat"><svg viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>Поделиться</div>
${starHtml}
</div>
</div>`;
}).join('');
}
function sortPosts(type, btn) { btn.parentElement.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active')); btn.classList.add('active'); renderPosts(type); }
function homeVote(btn, direction, postId) {
const control = btn.closest('.vote-control');
const upBtn = control.querySelector('.up');
const downBtn = control.querySelector('.down');
const countEl = control.querySelector('.vote-count');
const post = homePostsData.find(p => p.id === postId);
if (homeVoteState[postId] === direction) {
homeVoteState[postId] = null;
upBtn.classList.remove('active');
downBtn.classList.remove('active');
post.votes = homeOriginalVotes[postId];
} else {
homeVoteState[postId] = direction;
upBtn.classList.remove('active');
downBtn.classList.remove('active');
btn.classList.add('active');
post.votes = homeOriginalVotes[postId] + (direction === 'up' ? 1 : -1);
}
const val = post.votes;
countEl.textContent = val < 0 ? '−' + Math.abs(val) : val;
countEl.className = 'vote-count ' + (val >= 0 ? 'positive' : 'negative');
}
