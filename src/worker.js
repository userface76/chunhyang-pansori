// Chunhyang public posts + secret-protected content management, D1 + R2.
// Configure bindings DB (D1), UPLOADS (R2), ASSETS (Workers Static Assets)
// and Worker secret ADMIN_API_TOKEN (32+ random characters).
const SLUGS = new Set(['notices','press','newsletters','gallery','resources','finance','history','research','performances','partnerships']);
const NAMES = {'공지사항':'notices','언론보도':'press','소식지':'newsletters','갤러리':'gallery','자료실':'resources','재정보고':'finance'};
const PUBLIC_HEADERS = {'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:PUBLIC_HEADERS});
const idOK=x=>/^\d+$/.test(String(x))&&Number(x)>0;
const clamp=(x,max)=>String(x??'').trim().slice(0,max);
const admin=(req,env)=>{
 const token=env.ADMIN_API_TOKEN,provided=req.headers.get('authorization')||'';
 if(typeof token!=='string'||token.length<32||!provided.startsWith('Bearer '))return false;
 const v=provided.slice(7);if(v.length!==token.length)return false;
 let diff=0;for(let i=0;i<v.length;i++)diff|=v.charCodeAt(i)^token.charCodeAt(i);return diff===0;
};
const boardSlug=url=>NAMES[url.searchParams.get('board')||url.searchParams.get('category')]||url.searchParams.get('board')||NAMES[url.searchParams.get('category')]||'notices';
const fileType=(name,type)=>{
 const ext=name.toLowerCase().split('.').pop();
 const permitted={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',pdf:'application/pdf',txt:'text/plain',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',hwp:'application/x-hwp',hwpx:'application/zip',zip:'application/zip',mp4:'video/mp4'};
 if(!permitted[ext])return null;
 if(type&&type!=='application/octet-stream'&&type!==permitted[ext]&&!(ext==='hwpx'&&type==='application/x-hwpx'))return null;
 return {mime:permitted[ext],kind:['jpg','jpeg','png','webp','gif'].includes(ext)?'image':ext==='mp4'?'video':'attachment'};
};

const STAFF_BOARDS=new Set(['notices','press','newsletters','gallery','resources','finance']);
const hex=u=>Array.from(u,b=>b.toString(16).padStart(2,'0')).join('');
const bytes=h=>new Uint8Array((h.match(/../g)||[]).map(x=>parseInt(x,16)));
const secureEqual=(a,b)=>{if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0};
const passwordHash=async(password,salt)=>{const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return hex(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:bytes(salt),iterations:180000,hash:'SHA-256'},k,256)))};
const sign=async(message,env)=>{const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.ADMIN_API_TOKEN),'HMAC',false,['sign']);return hex(new Uint8Array(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(message))))};
const issueSession=async(user,env)=>{const p=btoa(JSON.stringify({id:user.id,v:user.session_version,exp:Date.now()+8*3600*1000})).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');return 'staff.'+p+'.'+await sign(p,env)};
const authUser=async(req,env)=>{
 if(admin(req,env))return {role:'super',display_name:'최고관리자'};
 const raw=(req.headers.get('authorization')||'').replace(/^Bearer /,'');
 const parts=raw.split('.');if(parts.length!==3||parts[0]!=='staff'||!env.DB||!env.ADMIN_API_TOKEN)return null;
 if(!/^[a-zA-Z0-9_-]+$/.test(parts[1])||!secureEqual(parts[2],await sign(parts[1],env)))return null;
 let p;try{p=JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')))}catch{return null}
 if(!Number.isInteger(p.id)||!Number.isFinite(p.exp)||p.exp<Date.now())return null;
 const u=await env.DB.prepare('SELECT id,display_name,session_version,active FROM staff_users WHERE id=?').bind(p.id).first();
 return u&&u.active===1&&u.session_version===p.v?{role:'staff',id:u.id,display_name:u.display_name}:null;
};
const allowedBoard=(u,slug)=>u.role==='super'||STAFF_BOARDS.has(slug);
const allowedPost=async(u,id,env)=>{if(u.role==='super')return true;const x=await env.DB.prepare('SELECT b.slug FROM posts p JOIN boards b ON p.board_id=b.id WHERE p.id=?').bind(id).first();return !!x&&STAFF_BOARDS.has(x.slug)};

export default {async fetch(request,env){
 const url=new URL(request.url),path=url.pathname,method=request.method;
 if(path==='/api/health')return reply({ok:!!env.DB,database:env.DB?'bound':'missing',uploads:env.UPLOADS?'bound':'missing',assets:env.ASSETS?'bound':'missing'});
 if(path==='/api/admin/check'){const u=await authUser(request,env);return u?reply({ok:true,role:u.role,display_name:u.display_name}):reply({error:'관리자 인증 실패'},401)}
 if(path.startsWith('/api/')&&!env.DB)return reply({error:'D1 binding DB 미설정'},503);
 try{
 if(path==='/api/staff/login'&&method==='POST'){
   const v=await request.json(),username=clamp(v.username,50).toLowerCase(),password=String(v.password||'');
   if(!/^[a-z0-9_-]{3,50}$/.test(username)||password.length<1)return reply({error:'로그인 정보를 확인하세요'},401);
   const u=await env.DB.prepare('SELECT * FROM staff_users WHERE username=? AND active=1').bind(username).first();
   if(!u||!secureEqual(await passwordHash(password,u.password_salt),u.password_hash))return reply({error:'아이디 또는 비밀번호가 틀립니다'},401);
   return reply({ok:true,token:await issueSession(u,env),display_name:u.display_name,role:'staff'});
 }
 if(path==='/api/posts'&&method==='GET'){
   const slug=boardSlug(url);if(!SLUGS.has(slug))return reply({error:'게시판 이름 오류'},400);
   const page=Math.max(1,Math.min(100000,parseInt(url.searchParams.get('page')||'1',10)||1));
   const limit=Math.max(1,Math.min(50,parseInt(url.searchParams.get('limit')||'15',10)||15));
   const q=clamp(url.searchParams.get('q'),100);
   const b=await env.DB.prepare('SELECT id,title,slug FROM boards WHERE slug=? AND is_public=1').bind(slug).first();
   if(!b)return reply({board:slug,posts:[],total:0,page,limit});
   const where="WHERE board_id=? AND status='published' AND (title LIKE ? OR content LIKE ?)";
   const like='%'+q+'%';
   const total=await env.DB.prepare('SELECT COUNT(*) n FROM posts '+where).bind(b.id,like,like).first();
   const x=await env.DB.prepare('SELECT id,title,excerpt,author_name,created_at,published_at,is_pinned FROM posts '+where+' ORDER BY is_pinned DESC, COALESCE(published_at,created_at) DESC,id DESC LIMIT ? OFFSET ?').bind(b.id,like,like,limit,(page-1)*limit).all();
   return reply({board:slug,posts:x.results||[],total:total?.n||0,page,limit});
 }
 const single=path.match(/^\/api\/posts\/(\d+)$/);
 if(single&&method==='GET'){
   const post=await env.DB.prepare("SELECT p.id,p.title,p.content,p.excerpt,p.author_name,p.status,p.is_pinned,p.published_at,p.created_at,b.slug board FROM posts p JOIN boards b ON p.board_id=b.id WHERE p.id=? AND p.status='published' AND b.is_public=1").bind(+single[1]).first();
   if(!post)return reply({error:'게시글 없음'},404);
   const files=await env.DB.prepare('SELECT id,original_name,mime_type,byte_size,kind FROM post_files WHERE post_id=? ORDER BY sort_order,id').bind(post.id).all();
   return reply({post,files:files.results||[]});
 }
 const file=path.match(/^\/api\/files\/(\d+)$/);
 if(file&&method==='GET'){
   if(!env.UPLOADS)return reply({error:'R2 UPLOADS 바인딩 필요'},503);
   const f=await env.DB.prepare("SELECT f.r2_key,f.original_name,f.mime_type FROM post_files f JOIN posts p ON f.post_id=p.id JOIN boards b ON p.board_id=b.id WHERE f.id=? AND p.status='published' AND b.is_public=1").bind(+file[1]).first();
   if(!f)return reply({error:'파일 없음'},404);
   const o=await env.UPLOADS.get(f.r2_key);if(!o)return reply({error:'저장 파일 없음'},404);
   const name=encodeURIComponent(f.original_name);
   return new Response(o.body,{headers:{'content-type':f.mime_type||'application/octet-stream','content-disposition':"attachment; filename*=UTF-8''"+name,'x-content-type-options':'nosniff','cache-control':'private, max-age=300'}});
 }
 if(path.startsWith('/api/admin/')){
   const actor=await authUser(request,env);if(!actor)return reply({error:'관리자 인증 필요'},401);
   if(path==='/api/admin/staff'&&method==='POST'){
     if(actor.role!=='super')return reply({error:'최고관리자 권한 필요'},403);
     const v=await request.json(),username=clamp(v.username,50).toLowerCase(),password=String(v.password||'');
     if(!/^[a-z0-9_-]{3,50}$/.test(username)||password.length<12||password.length>128)return reply({error:'아이디 3~50자, 비밀번호 12~128자 필요'},400);
     const salt=hex(crypto.getRandomValues(new Uint8Array(16))),hash=await passwordHash(password,salt);
     await env.DB.prepare('INSERT INTO staff_users(username,display_name,password_salt,password_hash) VALUES(?,?,?,?)').bind(username,clamp(v.display_name||'춘향관리자',40),salt,hash).run();
     return reply({ok:true},201);
   }
   if(path==='/api/admin/staff'&&method==='GET'){
     if(actor.role!=='super')return reply({error:'최고관리자 권한 필요'},403);
     const x=await env.DB.prepare('SELECT id,username,display_name,active,created_at FROM staff_users ORDER BY id DESC').all();
     return reply({users:x.results||[]});
   }
   const staffDeactivate=path.match(/^\\/api\\/admin\\/staff\\/(\\d+)\\/deactivate$/);
   if(staffDeactivate&&method==='POST'){
     if(actor.role!=='super')return reply({error:'최고관리자 권한 필요'},403);
     await env.DB.prepare('UPDATE staff_users SET active=0,session_version=session_version+1 WHERE id=?').bind(+staffDeactivate[1]).run();
     return reply({ok:true});
   }
   if(path==='/api/admin/posts'&&method==='GET'){
     const slug=boardSlug(url);if(!SLUGS.has(slug)||!allowedBoard(actor,slug))return reply({error:'게시판 권한 없음'},403);
     const x=await env.DB.prepare('SELECT p.id,p.title,p.status,p.created_at,p.author_name FROM posts p JOIN boards b ON p.board_id=b.id WHERE b.slug=? ORDER BY p.id DESC LIMIT 100').bind(slug).all();
     return reply({posts:x.results||[]});
   }
   if(path==='/api/admin/posts'&&method==='POST'){
     let v;try{v=await request.json()}catch{return reply({error:'잘못된 JSON'},400)}
     const slug=NAMES[v.board]||v.board;if(!SLUGS.has(slug))return reply({error:'게시판 오류'},400);
     const title=clamp(v.title,200),content=clamp(v.content,100000),author=clamp(v.author_name||'춘향관리자',60);
     if(!title)return reply({error:'제목 필수'},400);
     const b=await env.DB.prepare('SELECT id FROM boards WHERE slug=?').bind(slug).first();if(!b)return reply({error:'게시판 D1 초기화 필요'},404);
     const status=v.status==='draft'?'draft':'published';
     const x=await env.DB.prepare("INSERT INTO posts(board_id,title,content,excerpt,author_name,status,is_pinned,published_at) VALUES(?,?,?,?,?,?,?,CASE WHEN ?='published' THEN datetime('now') ELSE NULL END)").bind(b.id,title,content,clamp(content,160),author,status,v.is_pinned?1:0,status).run();
     return reply({ok:true,id:x.meta.last_row_id},201);
   }
   const adminPost=path.match(/^\/api\/admin\/posts\/(\d+)$/);
   if(adminPost&&method==='GET'){
     const p=await env.DB.prepare('SELECT p.*,b.slug board FROM posts p JOIN boards b ON p.board_id=b.id WHERE p.id=?').bind(+adminPost[1]).first();if(!p)return reply({error:'게시글 없음'},404);if(!allowedBoard(actor,p.board))return reply({error:'게시글 권한 없음'},403);
     const x=await env.DB.prepare('SELECT id,original_name,byte_size FROM post_files WHERE post_id=?').bind(p.id).all();
     return reply({post:p,files:x.results||[]});
   }
   if(adminPost&&method==='PUT'){
     if(!(await allowedPost(actor,+adminPost[1],env)))return reply({error:'게시글 권한 없음'},403);
     const v=await request.json(),title=clamp(v.title,200),content=clamp(v.content,100000),author=clamp(v.author_name||'춘향관리자',60);
     if(!title)return reply({error:'제목 필수'},400);
     const status=v.status==='draft'?'draft':'published';
     const r=await env.DB.prepare("UPDATE posts SET title=?,content=?,excerpt=?,author_name=?,status=?,is_pinned=?,published_at=CASE WHEN ?='published' THEN COALESCE(published_at,datetime('now')) ELSE NULL END,updated_at=datetime('now') WHERE id=?").bind(title,content,clamp(content,160),author,status,v.is_pinned?1:0,status,+adminPost[1]).run();
     return r.meta.changes?reply({ok:true}):reply({error:'게시글 없음'},404);
   }
   if(adminPost&&method==='DELETE'){
     if(!(await allowedPost(actor,+adminPost[1],env)))return reply({error:'게시글 권한 없음'},403);
     const xs=await env.DB.prepare('SELECT r2_key FROM post_files WHERE post_id=?').bind(+adminPost[1]).all();
     const d=await env.DB.prepare('DELETE FROM posts WHERE id=?').bind(+adminPost[1]).run();
     if(env.UPLOADS)for(const f of xs.results||[])await env.UPLOADS.delete(f.r2_key);
     return d.meta.changes?reply({ok:true}):reply({error:'게시글 없음'},404);
   }
   const up=path.match(/^\/api\/admin\/posts\/(\d+)\/files$/);
   if(up&&method==='POST'){
     if(!(await allowedPost(actor,+up[1],env)))return reply({error:'첨부파일 권한 없음'},403);
     if(!env.UPLOADS)return reply({error:'R2 UPLOADS 바인딩 필요'},503);
     const post=await env.DB.prepare('SELECT id FROM posts WHERE id=?').bind(+up[1]).first();if(!post)return reply({error:'게시글 없음'},404);
     const bytes=Number(request.headers.get('content-length')||0);if(bytes>15*1024*1024)return reply({error:'15MB 이하 파일만 가능'},413);
     const fd=await request.formData(),f=fd.get('file');
     if(!f||typeof f.arrayBuffer!=='function')return reply({error:'파일 선택 필요'},400);
     if(f.size>15*1024*1024||f.size===0)return reply({error:'파일 크기는 1B~15MB'},413);
     const name=clamp(f.name||'file',180).replace(/[\/\\\r\n]/g,'_');
     const type=fileType(name,f.type);if(!type)return reply({error:'허용되지 않는 파일 형식'},415);
     const key='posts/'+post.id+'/'+crypto.randomUUID()+'/'+name;
     await env.UPLOADS.put(key,f.stream(),{httpMetadata:{contentType:type.mime}});
     try{
       const v=await env.DB.prepare('INSERT INTO post_files(post_id,r2_key,original_name,mime_type,byte_size,kind) VALUES(?,?,?,?,?,?)').bind(post.id,key,name,type.mime,f.size,type.kind).run();
       return reply({ok:true,id:v.meta.last_row_id,name},201);
     }catch(e){await env.UPLOADS.delete(key);throw e}
   }
   const del=path.match(/^\/api\/admin\/files\/(\d+)$/);
   if(del&&method==='DELETE'){
     if(actor.role!=='super'){const p=await env.DB.prepare('SELECT f.post_id FROM post_files f WHERE f.id=?').bind(+del[1]).first();if(!p||!(await allowedPost(actor,p.post_id,env)))return reply({error:'파일 권한 없음'},403)}
     const f=await env.DB.prepare('SELECT r2_key FROM post_files WHERE id=?').bind(+del[1]).first();if(!f)return reply({error:'파일 없음'},404);
     await env.DB.prepare('DELETE FROM post_files WHERE id=?').bind(+del[1]).run();
     if(env.UPLOADS)await env.UPLOADS.delete(f.r2_key);
     return reply({ok:true});
   }
 }
 if(path.startsWith('/api/'))return reply({error:'API 없음'},404);
 if(!env.ASSETS)return new Response('ASSETS 바인딩 필요',{status:503});
 return env.ASSETS.fetch(request);
 }catch(e){return reply({error:'처리 실패: 데이터베이스·저장소 연결을 확인하세요'},500)}
}};
