# PRD: 바이럴 설문조사(퀴즈) 플랫폼

## 1. 프로젝트 개요

### 1.1 목적
바이럴 가능성이 높은 설문조사/퀴즈 콘텐츠를 대량 생산·배포하여 불특정 다수의 트래픽을 확보하고, 해당 트래픽을 자사 광고 지면으로 연결하는 마케팅 브릿지 플랫폼.

### 1.2 핵심 가치
- **바이럴 루프**: 결과 공유 → 유입 → 콘텐츠 소비 → 결과 공유의 자기 증식 구조
- **광고 수익화**: 콘텐츠 소비 과정에서 자사 제품 광고에 자연스럽게 노출
- **콘텐츠 자동화**: Claude Code 기반 경쟁사 분석 → 콘텐츠 자동 생성 파이프라인

### 1.3 기술 스택 (권장)
- **Frontend**: Next.js 14+ (App Router) + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes + Server Actions
- **Database**: PostgreSQL (Supabase 또는 Neon)
- **ORM**: Prisma
- **Storage**: Supabase Storage 또는 AWS S3 (이미지)
- **OG Image**: @vercel/og (Satori 기반 동적 OG 이미지)
- **Auth (Admin)**: NextAuth.js (어드민 전용, 일반 사용자 인증 없음)
- **콘텐츠 자동생성**: Claude Code CLI (로컬 실행, Headless Browser 연동)
- **배포**: Vercel

---

## 2. 데이터 모델

### 2.1 ERD 개요

```
Survey (설문조사)
├── id: UUID (PK)
├── title: string                  -- 후킹 제목 ("당신의 연애 유형은?")
├── slug: string (unique)          -- URL용 slug
├── description: string            -- 짧은 설명
├── thumbnail_url: string          -- 리스트 썸네일 (3x3 그리드용)
├── cover_image_url: string        -- 상세 페이지 블라인드 이미지
├── status: enum                   -- DRAFT | PENDING_REVIEW | PUBLISHED | ARCHIVED
├── view_count: int
├── share_count: int
├── completion_count: int
├── created_at: datetime
├── updated_at: datetime
├── published_at: datetime | null
└── generation_meta: jsonb | null  -- 자동생성 시 워크플로우 로그

SurveyStep (설문 단계/질문)
├── id: UUID (PK)
├── survey_id: UUID (FK → Survey)
├── order: int                     -- 표시 순서
├── question_text: string          -- 질문 텍스트
├── question_image_url: string | null
└── created_at: datetime

StepOption (각 단계의 선택지)
├── id: UUID (PK)
├── step_id: UUID (FK → SurveyStep)
├── label: string                  -- 선택지 텍스트
├── image_url: string | null       -- 선택지 이미지 (선택)
├── order: int
└── weight_map: jsonb              -- { "result_A": 3, "result_B": 1, ... } 가중치 맵

SurveyResult (결과 유형)
├── id: UUID (PK)
├── survey_id: UUID (FK → Survey)
├── result_key: string             -- "result_A", "result_B" 등 (weight_map의 key와 매칭)
├── title: string                  -- 결과 제목 ("당신은 츤데레 연애인!")
├── description: text              -- 결과 설명
├── result_image_url: string       -- 결과 전용 이미지
├── og_image_url: string           -- 동적 OG용 사전 생성 이미지 (필수)
└── share_text: string             -- 공유 시 기본 텍스트

Advertisement (광고)
├── id: UUID (PK)
├── name: string                   -- 관리용 이름
├── slot: enum                     -- SIDEBAR(a) | ANCHOR(b) | VIGNETTE(c)
├── image_url: string              -- 광고 이미지
├── redirect_url: string           -- 클릭 시 이동 URL
├── image_width: int               -- validation용
├── image_height: int              -- validation용
├── start_date: date
├── end_date: date
├── is_active: boolean
├── click_count: int
├── impression_count: int
├── created_at: datetime
└── updated_at: datetime

-- 광고 슬롯별 이미지 사이즈 제약 (validation)
-- SIDEBAR(a):  300x600 또는 300x250
-- ANCHOR(b):   728x90  또는 320x100 (모바일)
-- VIGNETTE(c): 480x320 (3x3 리스트 썸네일 겸용)
```

### 2.2 광고 노출 로직 상태

```
AdExposureSession (클라이언트 사이드 — localStorage + 서버 검증)
├── user_fingerprint: string       -- 익명 식별자 (cookie 기반)
├── exposed_slot: enum | null      -- 현재 노출 중인 광고 슬롯 (a/b/c 중 하나)
├── exposed_at: datetime           -- 최초 노출 시각
└── expires_at: datetime           -- 노출 만료 시각 (기본 1시간)
```

---

## 3. 페이지 구조 및 상세 기능

### 3.1 일반 사용자 (Public)

#### 3.1.1 리스트 페이지 (`/`)
- **레이아웃**: 3열 그리드, 각 카드에 썸네일 이미지 + 후킹 제목
- **정렬**: 최신순 기본, 인기순(view_count) 탭 제공
- **Infinite Scroll** 또는 페이지네이션
- **광고 카드 삽입**: 그리드 중간에 자연스럽게 자사 광고 카드(VIGNETTE 슬롯의 이미지c) 삽입 가능

#### 3.1.2 콘텐츠 상세 페이지 (`/survey/[slug]`)
**진입 화면 (시작 전)**
- 상단: 후킹 제목 (큰 폰트, 볼드)
- 중앙: 블라인드 처리된 커버 이미지 (CSS blur + overlay)
- CTA 버튼: "지금 시작하기" (큰 사이즈, 펄스 애니메이션)
- 참여자 수 표시: "12,345명이 참여했어요"

**설문 진행 (스텝별)**
- 프로그레스 바 (현재 스텝 / 전체 스텝)
- 질문 텍스트 (중앙 정렬, 강조)
- 선택지: 카드형 버튼 (이미지 있을 경우 이미지+텍스트, 없을 경우 텍스트만)
- 선택 시 자연스러운 전환 애니메이션 (slide/fade)
- 중간 이탈 방지: 뒤로가기 시 "정말 나가시겠어요?" 확인

**결과 페이지 (`/survey/[slug]/result/[resultKey]`)**
- 결과 이미지 (og_image_url 활용, 풀 사이즈)
- 결과 제목 + 상세 설명
- **공유 버튼 영역** (핵심)
  - 카카오톡 공유 (Kakao SDK)
  - 트위터/X 공유
  - 페이스북 공유
  - 링크 복사 (클립보드)
  - 인스타그램 스토리용 이미지 다운로드
- "다시 하기" CTA 버튼
- **Vignette 전면 광고**: 결과 확인 직후 0.5초 딜레이로 전면 모달 표시 (닫기 버튼 3초 후 활성화)
- **추천 콘텐츠 섹션**: "이런 테스트는 어때요?" — 인기/관련 설문 2~4개 썸네일 노출 (리텐션 장치)

#### 3.1.3 광고 노출 시스템
**슬롯 정의**
| 슬롯 | 위치 | 타입 | 트리거 |
|------|------|------|--------|
| a (SIDEBAR) | 우측 사이드바 | 고정 배너 | 페이지 로드 시 |
| b (ANCHOR) | 하단 앵커 | 스티키 바 | 페이지 로드 시 |
| c (VIGNETTE) | 전체 화면 모달 | 인터스티셜 | 설문 완료 시 |

**Frequency Capping 로직**
```
1. 페이지 로드 시 쿠키/localStorage에서 exposed_slot 확인
2. IF exposed_slot이 존재하고 expires_at이 미래:
   → 해당 슬롯의 광고만 노출, 나머지 슬롯은 빈 상태
3. IF exposed_slot이 없거나 만료됨:
   → 활성 광고 중 랜덤으로 1개 슬롯 선택
   → 해당 슬롯을 exposed_slot에 기록 (TTL: 1시간)
   → 선택된 슬롯의 광고만 노출
4. 한 세션 내에서는 a, b, c 중 하나만 노출됨
```

**광고 이미지 사이즈 Validation (업로드 시)**
```
SIDEBAR(a):  width=300, height in [250, 600]
ANCHOR(b):   (width=728, height=90) OR (width=320, height=100)
VIGNETTE(c): width=480, height=320
```

#### 3.1.4 동적 OG 이미지 (바이럴 핵심)
**생성 방식: 하이브리드**
- **사전 생성 (권장)**: 설문조사 생성/수정 시 모든 결과별 OG 이미지를 사전 렌더링하여 저장
- **실시간 폴백**: `/api/og/[slug]/[resultKey]` 엔드포인트 — `@vercel/og`(Satori) 사용

**OG 이미지 스펙**
- 사이즈: 1200x630px (Open Graph 표준)
- 포함 요소:
  - 설문 제목
  - 결과 타이틀 ("당신은 츤데레 연애인!")
  - 결과 이미지 (리사이즈)
  - 브랜드 로고/워터마크
  - "나도 해보기 →" 텍스트 (클릭 유도)

**메타 태그 설정**
```html
<!-- /survey/[slug]/result/[resultKey] 페이지 -->
<meta property="og:title" content="나는 '츤데레 연애인'이래! 너는?" />
<meta property="og:description" content="5만명이 참여한 연애 유형 테스트" />
<meta property="og:image" content="https://domain.com/og/[slug]/[resultKey].png" />
<meta property="og:url" content="https://domain.com/survey/[slug]/result/[resultKey]" />
<meta name="twitter:card" content="summary_large_image" />
```

---

### 3.2 어드민 (`/admin/*`)

#### 3.2.1 대시보드 (`/admin`)
- 오늘의 총 PV / UV / 설문 완료 수 / 공유 수
- 인기 설문 TOP 5 (차트)
- 승인 대기 콘텐츠 수 (배지)

#### 3.2.2 콘텐츠 관리 (`/admin/surveys`)
**리스트 페이지**
- 테이블: 썸네일, 제목, 상태(배지), 조회수, 완료수, 공유수, 생성일
- 필터: 상태별 (DRAFT / PENDING_REVIEW / PUBLISHED / ARCHIVED)
- 검색: 제목 기준
- 일괄 작업: 선택 후 상태 변경, 삭제

**상세/수정 페이지 (`/admin/surveys/[id]`)**
- **한눈에 보기 레이아웃** (핵심 요구사항):
  ```
  ┌─────────────────────────────────────────────────┐
  │  [설문 기본 정보]  제목 | 슬러그 | 상태 | 썸네일 │
  ├─────────────────────────────────────────────────┤
  │  Step 1: "어떤 색을 좋아하나요?"                  │
  │  ┌──────────┬──────────┬──────────┐              │
  │  │ 빨강     │ 파랑     │ 초록     │  ← 선택지     │
  │  │ A:+3 B:0 │ A:0 B:+3 │ A:+1 B:+2│ ← 가중치     │
  │  └──────────┴──────────┴──────────┘              │
  ├─────────────────────────────────────────────────┤
  │  Step 2: "주말에 주로?"                           │
  │  ┌──────────┬──────────┐                         │
  │  │ 집       │ 밖       │                         │
  │  │ A:+2 B:+1│ A:+1 B:+3│                        │
  │  └──────────┴──────────┘                         │
  ├─────────────────────────────────────────────────┤
  │  [결과 목록]                                      │
  │  Result A: "집순이 타입" — 이미지, OG 이미지       │
  │  Result B: "인싸 타입"   — 이미지, OG 이미지       │
  └─────────────────────────────────────────────────┘
  ```
- 각 스텝/선택지/결과를 인라인 편집 가능
- 가중치 수정 시 실시간 결과 미리보기 (어떤 선택지 조합이 어떤 결과로 이어지는지)
- 드래그 앤 드롭으로 스텝 순서 변경

**수동 생성 (`/admin/surveys/new`)**
- 스텝별 위자드 형태 또는 전체 한 페이지 폼
- 각 스텝에 질문 + 선택지 + 가중치 입력
- 결과 유형 추가/삭제
- 이미지 업로드 (썸네일, 커버, 결과별 이미지)
- 저장 시 OG 이미지 자동 생성 트리거

#### 3.2.3 콘텐츠 자동 생성 (`/admin/generator`)

**Phase 1: URL 입력 및 분석 요청**
```
┌──────────────────────────────────────────┐
│  [경쟁사 URL 입력]                        │
│  https://example.com/quiz/love-type       │
│                                          │
│  [분석 시작] 버튼                          │
└──────────────────────────────────────────┘
```

**Phase 2: 백그라운드 처리 (비동기)**
- 서버에서 작업 큐에 등록 (Bull/BullMQ 또는 간단한 DB 기반 큐)
- 작업 상태: `QUEUED → SCRAPING → ANALYZING → GENERATING → REVIEW_READY`
- 각 단계별 로그가 실시간으로 스트리밍됨 (SSE 또는 WebSocket)

**Phase 3: 워크플로우 투명 노출**
```
┌──────────────────────────────────────────────┐
│  [작업 ID: gen-20240115-001]                  │
│                                              │
│  ✅ Step 1: 페이지 스크래핑 완료               │
│     └ 수집된 질문 8개, 선택지 32개, 결과 4개    │
│                                              │
│  ✅ Step 2: 콘텐츠 구조 분석                   │
│     └ 분석 요약: 연애 유형 테스트, 8단계,       │
│       감정 기반 선택지, MZ세대 타겟             │
│                                              │
│  ✅ Step 3: 바이럴 요소 판단                   │
│     └ 판단 근거:                              │
│       - "연애" 키워드 → SNS 공유율 높음         │
│       - 결과가 자기 자랑형 → 공유 동기 강함     │
│       - 이미지 기반 선택지 → 참여율 높음        │
│                                              │
│  ✅ Step 4: 설문조사 3종 생성 완료              │
│     └ 생성 근거:                              │
│       [설문 1] "찐 연애 감성 테스트"            │
│         - 원본 대비 차별점: 더 과격한 표현,      │
│           밈 이미지 활용, 결과 문구 자극적       │
│       [설문 2] "썸 단계 진단기"                 │
│         - 원본 대비 차별점: 상황극 기반,         │
│           스토리텔링형 질문                     │
│       [설문 3] ...                            │
│                                              │
│  [설문 1 미리보기] [설문 2 미리보기] [설문 3 ...] │
│  [선택하여 등록] 체크박스                       │
└──────────────────────────────────────────────┘
```

**Phase 4: 승인 대기열 (`/admin/generator/queue`)**
- 자동 생성된 설문 목록 (PENDING_REVIEW 상태)
- 미리보기 → 수정 → 승인(PUBLISHED) 또는 반려(ARCHIVED) 워크플로우

#### 3.2.4 광고 관리 (`/admin/ads`)
**리스트 페이지**
- 3x3 그리드: 각 광고의 VIGNETTE(c) 이미지 썸네일
- 카드 하단: 광고명, 슬롯 타입 배지, 게시 기간, 활성 상태 토글

**상세/수정 (`/admin/ads/[id]`)**
- 광고명, redirect_url 입력
- 3종 이미지 업로드 (a: 사이드바, b: 앵커, c: 비네트)
  - 업로드 시 이미지 사이즈 자동 검증
  - 규격 미달 시 에러 메시지 + 가이드 표시
- 게시 기간 (start_date ~ end_date) 날짜 피커
- 노출 통계: 임프레션 수, 클릭 수, CTR

**생성 (`/admin/ads/new`)**
- 위와 동일한 폼
- 이미지 사이즈 가이드를 폼 상단에 명시

---

## 4. Claude Code 자동화 파이프라인 상세

### 4.1 아키텍처

```
[Admin UI] → POST /api/generator/start { url }
     ↓
[API Route] → DB에 GenerationJob 레코드 생성 (status: QUEUED)
     ↓
[Background Worker] → Claude Code CLI 실행
     ↓
┌─────────────────────────────────────────────┐
│  Claude Code (로컬 실행)                     │
│                                             │
│  1. Headless Browser 실행                    │
│     - 기 로그인된 브라우저 프로파일 사용        │
│     - Puppeteer/Playwright의 userDataDir     │
│       옵션으로 로그인 세션 유지               │
│                                             │
│  2. 대상 URL 접속 및 재귀 탐색                │
│     - 설문 시작 → 모든 분기 탐색              │
│     - 질문, 선택지, 결과 페이지 수집           │
│     - 이미지, 스타일, 톤앤매너 분석            │
│                                             │
│  3. Claude API 호출                          │
│     - 수집 데이터 기반 설문조사 생성 프롬프트    │
│     - 바이럴 최적화 지시                      │
│     - 결과별 OG 이미지 텍스트 생성             │
│                                             │
│  4. 결과물 DB 저장                            │
│     - Survey + Steps + Options + Results     │
│     - status: PENDING_REVIEW                 │
│     - generation_meta: 전체 워크플로우 로그     │
│                                             │
│  5. OG 이미지 사전 생성                       │
│     - 각 결과별 OG 이미지 렌더링 → Storage 저장 │
└─────────────────────────────────────────────┘
     ↓
[Admin UI] ← SSE/Polling으로 진행상황 실시간 표시
```

### 4.2 브라우저 프로파일 설정 (기 로그인 세션 활용)

```bash
# 사전 준비: 브라우저 프로파일 디렉토리 설정
# Chrome 기 로그인 프로파일 경로 예시
BROWSER_PROFILE_PATH="$HOME/.config/google-chrome/Default"
# 또는 전용 프로파일 생성
BROWSER_PROFILE_PATH="$HOME/.scraper-profile"

# 최초 1회: 해당 프로파일로 브라우저를 수동 열어 필요한 사이트에 로그인
# google-chrome --user-data-dir=$BROWSER_PROFILE_PATH
# → 경쟁사 사이트들에 로그인, 쿠키 동의 등 완료

# 이후 Claude Code가 이 프로파일을 자동으로 사용
```

**Playwright 설정 (scraper.config.ts)**
```typescript
export const browserConfig = {
  headless: true,
  userDataDir: process.env.BROWSER_PROFILE_PATH,
  args: [
    '--no-sandbox',
    '--disable-blink-features=AutomationControlled',
  ],
  // 로그인 세션이 만료될 경우를 위한 쿠키 백업/복원 로직
  cookieBackupPath: './cookies-backup.json',
};
```

### 4.3 Claude Code 실행 명령 템플릿

```bash
# /scripts/generate-survey.sh
claude-code run \
  --task "
    1. Playwright를 사용하여 '$TARGET_URL'에 접속하라.
       browserConfig의 userDataDir를 사용하여 기 로그인된 세션을 활용하라.
    
    2. 해당 페이지가 설문조사/퀴즈 콘텐츠인지 판별하라.
       설문이 아니면 에러를 반환하라.
    
    3. 설문의 모든 경로를 재귀적으로 탐색하라:
       - 각 질문의 텍스트, 이미지
       - 모든 선택지의 텍스트, 이미지
       - 모든 가능한 결과 페이지
       - 탐색 과정의 스크린샷을 단계별로 저장하라
    
    4. 수집된 데이터를 분석하여 다음을 판단하라:
       - 타겟 오디언스 (연령대, 관심사)
       - 바이럴 포인트 (어떤 요소가 공유를 유발하는지)
       - 개선 가능한 지점
       ※ 모든 판단 근거를 generation_meta에 기록하라
    
    5. 분석을 바탕으로 설문조사 2~3종을 새로 생성하라:
       - 원본보다 더 후킹하는 제목
       - 더 재미있고 공감되는 선택지
       - 공유하고 싶은 결과 문구
       - 각 설문이 원본 대비 어떤 차별점이 있는지 기록하라
    
    6. 생성된 설문을 DB에 저장하라:
       - status: PENDING_REVIEW
       - generation_meta에 전체 워크플로우 로그 포함
    
    7. 각 결과별 OG 이미지를 생성하여 Storage에 업로드하라.
  " \
  --output-format json \
  --log-file "./logs/gen-$(date +%Y%m%d-%H%M%S).log"
```

### 4.4 콘텐츠 생성 프롬프트 가이드라인

Claude Code가 설문을 생성할 때 따라야 할 원칙:

```markdown
## 바이럴 설문조사 생성 원칙

### 제목
- 호기심 유발: "당신의 진짜 ___은?" / "___으로 알아보는 ___"
- 자기 탐색 욕구 자극: 나에 대해 알고 싶은 심리
- 15자 이내 권장

### 질문
- 5~8개 스텝이 최적 (너무 길면 이탈, 너무 짧으면 결과 신뢰도 저하)
- 상황극/스토리텔링 기반 질문 선호
- "당신은 ___할 때 어떻게 하나요?" 형식

### 선택지
- 2~4개 (3개 권장)
- 너무 뻔한 선택지 금지 (다 맞는 말이면 재미없음)
- 밈/유행어 적절히 활용

### 결과
- 자랑하고 싶은 결과여야 함 (부정적 결과도 유쾌하게)
- "___형 인간" / "___타입" 등 라벨링
- 결과 설명은 100~200자
- 공유 텍스트: "나는 ___래! 너도 해볼래?" 형식
```

---

## 5. API 엔드포인트

### 5.1 Public API

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/surveys` | 설문 리스트 (published, 페이지네이션) |
| GET | `/api/surveys/[slug]` | 설문 상세 (스텝, 선택지 포함) |
| POST | `/api/surveys/[slug]/complete` | 설문 완료 처리 (가중치 계산 → 결과 반환) |
| POST | `/api/surveys/[slug]/share` | 공유 카운트 증가 |
| GET | `/api/og/[slug]/[resultKey]` | 동적 OG 이미지 생성 (Satori) |
| GET | `/api/ads/active` | 현재 활성 광고 조회 (Frequency Capping 적용) |
| POST | `/api/ads/[id]/click` | 광고 클릭 기록 |
| POST | `/api/ads/[id]/impression` | 광고 노출 기록 |

### 5.2 Admin API

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/admin/surveys` | 전체 설문 리스트 (모든 상태) |
| POST | `/api/admin/surveys` | 설문 수동 생성 |
| PUT | `/api/admin/surveys/[id]` | 설문 수정 |
| DELETE | `/api/admin/surveys/[id]` | 설문 삭제 |
| PATCH | `/api/admin/surveys/[id]/status` | 상태 변경 |
| GET | `/api/admin/ads` | 광고 리스트 |
| POST | `/api/admin/ads` | 광고 생성 |
| PUT | `/api/admin/ads/[id]` | 광고 수정 |
| DELETE | `/api/admin/ads/[id]` | 광고 삭제 |
| POST | `/api/admin/generator/start` | 자동 생성 작업 시작 |
| GET | `/api/admin/generator/[jobId]` | 작업 상태 조회 |
| GET | `/api/admin/generator/[jobId]/stream` | 작업 진행 SSE 스트림 |
| GET | `/api/admin/generator/queue` | 승인 대기열 |
| POST | `/api/admin/generator/[jobId]/approve` | 생성물 승인 |

---

## 6. 결과 계산 로직

```typescript
// 설문 완료 시 결과 계산
function calculateResult(
  steps: SurveyStep[],
  answers: Record<string, string> // { stepId: optionId }
): SurveyResult {
  // 1. 모든 선택에서 가중치 합산
  const scores: Record<string, number> = {};
  
  for (const [stepId, optionId] of Object.entries(answers)) {
    const step = steps.find(s => s.id === stepId);
    const option = step?.options.find(o => o.id === optionId);
    
    if (option?.weight_map) {
      for (const [resultKey, weight] of Object.entries(option.weight_map)) {
        scores[resultKey] = (scores[resultKey] || 0) + weight;
      }
    }
  }
  
  // 2. 최고 점수 결과 반환 (동점 시 먼저 정의된 결과 우선)
  const topResultKey = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)[0][0];
  
  return results.find(r => r.result_key === topResultKey)!;
}
```

---

## 7. 비기능 요구사항

### 7.1 성능
- 리스트 페이지 LCP < 1.5s
- 설문 진행 시 스텝 전환 < 200ms
- OG 이미지 생성 < 3s (사전 생성 시 즉시)

### 7.2 SEO
- 모든 퍼블릭 페이지 SSR/SSG
- 결과 페이지별 고유 URL + 동적 메타 태그
- sitemap.xml 자동 생성

### 7.3 모바일 최적화
- 모바일 퍼스트 디자인 (트래픽 80%+ 모바일 예상)
- 선택지 터치 영역 최소 44px
- 앵커 광고(b) 모바일 사이즈 자동 전환

### 7.4 분석
- 각 설문별 퍼널: 진입 → 시작 → 각 스텝별 → 완료 → 공유
- 광고 슬롯별 CTR 트래킹
- 유입 경로별 (referrer) 분석

---

## 8. 구현 우선순위

### Phase 1 — MVP (1~2주)
1. DB 스키마 + Prisma 설정
2. 일반 사용자: 리스트 + 설문 진행 + 결과 페이지
3. 동적 OG 이미지 생성
4. 공유 버튼 (카카오, 트위터, 링크복사)
5. 어드민: 설문 수동 CRUD

### Phase 2 — 광고 시스템 (1주)
6. 광고 CRUD + 이미지 validation
7. 광고 노출 로직 (Frequency Capping)
8. Vignette 전면 광고
9. 노출/클릭 트래킹

### Phase 3 — 자동화 (1~2주)
10. Claude Code 스크래핑 파이프라인
11. 비동기 작업 큐 + 실시간 진행 표시
12. 승인 대기열 워크플로우
13. 자동 OG 이미지 생성

### Phase 4 — 최적화 (1주)
14. 추천 콘텐츠 알고리즘
15. 퍼널 분석 대시보드
16. 성능 최적화 + 캐싱
17. A/B 테스트 인프라

---

## 9. 프로젝트 디렉토리 구조

```
/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── (public)/              # 일반 사용자
│   │   │   ├── page.tsx           # 리스트
│   │   │   └── survey/
│   │   │       └── [slug]/
│   │   │           ├── page.tsx   # 설문 상세/진행
│   │   │           └── result/
│   │   │               └── [resultKey]/
│   │   │                   └── page.tsx  # 결과
│   │   ├── admin/                 # 어드민
│   │   │   ├── page.tsx           # 대시보드
│   │   │   ├── surveys/
│   │   │   │   ├── page.tsx       # 설문 리스트
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx   # 수동 생성
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx   # 상세/수정
│   │   │   ├── ads/
│   │   │   │   ├── page.tsx       # 광고 리스트
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx   # 광고 생성
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx   # 광고 상세/수정
│   │   │   └── generator/
│   │   │       ├── page.tsx       # URL 입력 + 작업 현황
│   │   │       └── queue/
│   │   │           └── page.tsx   # 승인 대기열
│   │   └── api/
│   │       ├── surveys/
│   │       ├── ads/
│   │       ├── og/
│   │       │   └── [slug]/
│   │       │       └── [resultKey]/
│   │       │           └── route.tsx  # 동적 OG 이미지
│   │       ├── admin/
│   │       └── generator/
│   ├── components/
│   │   ├── ui/                    # 공통 UI 컴포넌트
│   │   ├── survey/                # 설문 관련 컴포넌트
│   │   ├── ads/                   # 광고 관련 컴포넌트
│   │   └── admin/                 # 어드민 전용 컴포넌트
│   ├── lib/
│   │   ├── db.ts                  # Prisma client
│   │   ├── ad-manager.ts          # 광고 노출 로직
│   │   ├── result-calculator.ts   # 결과 계산
│   │   ├── og-generator.ts        # OG 이미지 생성
│   │   └── share.ts               # 공유 유틸
│   └── types/
│       └── index.ts
├── scripts/
│   ├── generate-survey.sh         # Claude Code 실행 스크립트
│   └── setup-browser-profile.sh   # 브라우저 프로파일 초기 설정
├── .env.example
├── PRD.md                         # 이 파일
└── CLAUDE.md                      # Claude Code 작업 지시서
```

---

## 10. 환경 변수

```env
# Database
DATABASE_URL="postgresql://..."

# Storage (S3 or Supabase)
STORAGE_BUCKET_URL="..."
STORAGE_ACCESS_KEY="..."
STORAGE_SECRET_KEY="..."

# Auth (Admin)
NEXTAUTH_SECRET="..."
ADMIN_EMAIL="..."
ADMIN_PASSWORD="..."

# Kakao SDK (공유)
NEXT_PUBLIC_KAKAO_JS_KEY="..."

# Claude Code (자동 생성)
BROWSER_PROFILE_PATH="..."
ANTHROPIC_API_KEY="..."

# App
NEXT_PUBLIC_BASE_URL="https://your-domain.com"
```