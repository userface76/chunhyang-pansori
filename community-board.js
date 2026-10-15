(()=>{
const root=document.querySelector('[data-community-board]');if(!root)return;
const slug=root.dataset.communityBoard,tbody=document.getElementById('community-rows'),search=document.getElementById('community-search'),count=document.getElementById('community-count');
let rows=[],total=0,page=1;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pager=document.createElement('div');pager.className='community-pagination';tbody.closest('table')?.parentElement?.after(pager);
function draw(){
 const q=search.value.trim().toLowerCase(),shown=rows.filter(p=>String(p.title||'').toLowerCase().includes(q));
 count.textContent=total+'건';
 tbody.innerHTML=shown.length?shown.map((p,i)=>'<tr><td>'+(total-(page-1)*50-i)+'</td><td><a href="./community-post.html?id='+encodeURIComponent(p.id)+'">'+(p.is_pinned?'📌 ':'')+esc(p.title)+'</a></td><td>'+esc(p.author_name||'춘향관리자')+'</td><td>'+esc((p.published_at||p.created_at||'').slice(0,10))+'</td></tr>').join(''):'<tr><td colspan="4">'+(q?'검색 결과가 없습니다.':'등록된 공개 게시글이 없습니다.')+'</td></tr>';
 pager.replaceChildren();if(total>50){for(let n=1;n<=Math.ceil(total/50);n++){const b=document.createElement('button');b.type='button';b.textContent=String(n);b.disabled=n===page;b.onclick=()=>load(n);pager.append(b)}}
}
async function load(nextPage=1){
 page=nextPage;count.textContent='불러오는 중…';
 try{const r=await fetch('/api/posts?board='+encodeURIComponent(slug)+'&page='+page+'&limit=50',{cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error||'API 응답 오류');
 rows=Array.isArray(d.posts)?d.posts:[];total=Number(d.total)||rows.length;draw();
 }catch(e){count.textContent='게시판 연결 확인 필요';tbody.innerHTML='<tr><td colspan="4">게시글을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.</td></tr>';pager.replaceChildren();console.error('게시판 조회 오류:',e)}
}
search.addEventListener('input',draw);load();
})();