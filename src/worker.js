// Cloudflare Worker: read-only public boards; admin writes require separate authentication.
// Bind D1 as DB and static assets as ASSETS in Cloudflare project settings.
const CATEGORIES = Object.freeze({
  '공지사항':'notices', '언론보도':'press', '소식지':'newsletters',
  '자료실':'resources', '재정보고':'finance',
  '판소리 역사발굴':'history', '판소리 이론사업':'research', '연희사업':'performances', '대외협력사업':'partnerships'
});
const ALLOWED = new Set(Object.values(CATEGORIES));
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
export default {
 async fetch(request,env){
   const url=new URL(request.url);
   if(url.pathname==='/api/health'){
     return json({ok:!!env.DB,database:env.DB?'bound':'missing'});
   }
   if(url.pathname==='/api/posts' && request.method==='GET'){
     if(!env.DB)return json({error:'D1 binding DB not configured'},503);
     const raw=url.searchParams.get('board')||url.searchParams.get('category')||'공지사항';
     const slug=CATEGORIES[raw]||raw;
     if(!ALLOWED.has(slug))return json({error:'Unknown board'},400);
     const page=Math.max(1,Math.min(100000,Number.parseInt(url.searchParams.get('page')||'1',10)||1));
     const limit=Math.max(1,Math.min(50,Number.parseInt(url.searchParams.get('limit')||'15',10)||15));
     const search=(url.searchParams.get('q')||'').trim().slice(0,100);
     try{
       const board=await env.DB.prepare('SELECT id,title,slug FROM boards WHERE slug=? AND is_public=1').bind(slug).first();
       if(!board)return json({board:slug,posts:[],total:0,page,limit});
       const where="WHERE board_id=? AND status='published' AND (title LIKE ? OR content LIKE ?)";
       const pattern='%'+search.replace(/[\\%_]/g,'\\$&')+'%';
       // Use a bound parameter for the search phrase and literal matching for standard SQLite LIKE.
       const queryWhere=where;
       const total=await env.DB.prepare('SELECT COUNT(*) AS n FROM posts '+queryWhere).bind(board.id,pattern,pattern).first();
       const {results}=await env.DB.prepare('SELECT id,title,excerpt,author_name,external_url,created_at,published_at,is_pinned FROM posts '+queryWhere+' ORDER BY is_pinned DESC, COALESCE(published_at,created_at) DESC,id DESC LIMIT ? OFFSET ?').bind(board.id,pattern,pattern,limit,(page-1)*limit).all();
       return json({board:board.slug,board_title:board.title,posts:results||[],total:total?.n||0,page,limit});
     }catch(e){return json({error:'Database query failed'},500)}
   }
   if(url.pathname.startsWith('/api/'))return json({error:'Not found'},404);
   if(!env.ASSETS)return new Response('Static assets binding ASSETS not configured',{status:503});
   return env.ASSETS.fetch(request);
 }
};