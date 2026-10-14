# 춘향 게시판 D1 연결
1. Cloudflare에서 D1 데이터베이스 chunhyang-db를 생성합니다.
2. D1 Console에서 db/migrations/0001_initial.sql 실행 (기존 DB면 스키마 확인 후 적용).
3. Cloudflare Worker chunhyang-pansori-web3의 Settings → Bindings에서 D1 binding 변수명을 **DB**로 지정하고 chunhyang-db를 연결합니다.
4. API를 사용하도록 Worker 진입점을 src/worker.js로 구성하고, 정적 에셋을 **ASSETS**로 연결합니다. 기존 Cloudflare Git 배포 설정을 확인한 후 빌드/배포 방식에 맞춰 Wrangler 설정을 추가해야 합니다.
5. /api/health 및 /api/posts?category=공지사항 으로 확인합니다.
6. 글쓰기/관리자 API는 아직 없습니다. 실서비스에서는 인증 없는 POST/PUT/DELETE API를 절대 활성화하지 마세요.
7. 초기 데이터는 비어 있으며 이전 게시글은 검증 후 별도 등록해야 합니다.
