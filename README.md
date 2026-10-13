# 판소리연구소 춘향 — 반응형 홈페이지 1차 리뉴얼

기존 춘향 이미지와 색감을 유지한 **정적 홈페이지 프런트엔드 시안**입니다. 실제 게시판과 관리자 로그인은 아직 미연결입니다. Cloudflare Pages에 배포할 수 있습니다.

## GitHub → Cloudflare Pages 배포
1. GitHub에서 `chunhyang-pansori` 저장소를 새로 만듭니다.
2. 이 프로젝트의 **내용물**을 저장소 루트에 업로드하고 커밋합니다.
3. Cloudflare Dashboard → Workers & Pages → Create application → Pages → Import an existing Git repository.
4. 해당 GitHub 저장소를 연결하고 Build command는 비워 두며 Build output directory는 `/` 로 설정합니다.
5. 배포 완료 후 제공된 `*.pages.dev` 주소를 확인합니다.
6. 추후 도메인을 연결할 수 있으며, GitHub main 브랜치 변경 시 자동 재배포됩니다.

## 준비 중인 기능
- 게시판 데이터베이스 Cloudflare D1 및 API 연결
- Cloudflare R2 이미지 첨부 저장
- 관리자 로그인/게시글 관리 및 권한 검증
- 기존 게시글과 원본 이미지 이전

## 주의
- `assets` 이미지는 사용자가 제공한 기존 웹사이트 스크린샷이므로 구성 요소와 문자까지 일부 포함합니다. 원본 로고/사진을 제공받으면 스크린샷 이미지에서 교체하는 것이 좋습니다.
- 후원 계좌·주소·연락처는 제공 자료에서 옮겨온 것입니다. 실운영 전 반드시 최신 정보 확인 바랍니다.
- 게시글 수 및 목록은 미연결 상태에서 임의로 꾸며 표시하지 않습니다.
