# CLAUDE.md — 프로젝트 작업 지시서

이 파일은 Claude Code가 프로젝트를 이해하고 자율적으로 작업하기 위한 컨텍스트 문서입니다.

## 프로젝트 개요
바이럴 설문조사/퀴즈 플랫폼입니다. 상세 기능 명세는 `PRD.md`를 참조하세요.

## 기술 스택
- Next.js 14+ (App Router, TypeScript)
- Tailwind CSS
- Prisma + PostgreSQL (Supabase/Neon)
- @vercel/og (동적 OG 이미지)
- NextAuth.js (어드민 인증)
- Playwright (콘텐츠 스크래핑)

## 작업 원칙

### 코드 스타일
- TypeScript strict mode 사용
- 컴포넌트는 함수형 + React Server Components 우선
- 클라이언트 컴포넌트는 `'use client'` 명시, 최소 범위로 분리
- API 라우트는 Zod로 입력 검증
- 에러 핸들링은 try-catch + 사용자 친화적 에러 메시지
- 한글 주석 사용 (사용자가 한국어 사용)

### 파일 구조
- `PRD.md`의 Section 9 디렉토리 구조를 따를 것
- 컴포넌트는 기능 단위로 그룹핑 (`components/survey/`, `components/ads/` 등)
- 유틸 함수는 `lib/`에 단일 책임 원칙으로 분리

### DB 작업
- Prisma schema 변경 후 반드시 `npx prisma generate` 실행
- migration은 `npx prisma migrate dev --name <설명>` 으로 생성
- seed 데이터는 `prisma/seed.ts`에 작성

### 콘텐츠 자동 생성 파이프라인
이 프로젝트의 핵심 기능 중 하나는 Claude Code 자신이 경쟁사 설문조사 사이트를 분석하여 새로운 콘텐츠를 생성하는 것입니다.

**브라우저 프로파일 사용 규칙:**
- `BROWSER_PROFILE_PATH` 환경 변수에 지정된 Chrome 프로파일을 Playwright의 `userDataDir` 옵션으로 사용
- 이 프로파일에는 사람이 미리 로그인해둔 세션이 있으므로 별도 로그인 로직 불필요
- 쿠키/세션 만료 시 사람에게 재로그인을 요청하는 에러를 반환할 것

**스크래핑 워크플로우:**
1. 대상 URL 접속
2. 페이지가 설문조사/퀴즈인지 판별 (질문-선택지-결과 구조 확인)
3. 모든 경로를 DFS로 탐색하며 데이터 수집
4. 각 단계에서 스크린샷 저장 + 로그 기록
5. 수집 데이터를 `generation_meta` JSON에 구조화하여 저장

**콘텐츠 생성 규칙:**
- 원본을 그대로 복사하지 않고, 구조와 컨셉만 참고하여 새롭게 생성
- 제목은 15자 이내, 호기심 유발형
- 질문은 5~8개, 선택지는 2~4개
- 결과는 긍정적/유쾌한 톤, 공유 욕구를 자극하는 라벨링
- 모든 생성 근거(왜 이런 제목? 왜 이런 선택지?)를 `generation_meta`에 기록

## 구현 순서
PRD.md Section 8의 Phase 순서를 따릅니다:
1. Phase 1: MVP (DB + 유저 플로우 + 어드민 CRUD + OG + 공유)
2. Phase 2: 광고 시스템
3. Phase 3: 자동화 파이프라인
4. Phase 4: 최적화

각 Phase 시작 전 사람에게 확인을 요청하세요.

## 자주 사용하는 명령어

```bash
# 개발 서버
npm run dev

# Prisma
npx prisma generate
npx prisma migrate dev --name <name>
npx prisma db seed
npx prisma studio  # DB GUI

# 빌드 & 타입 체크
npm run build
npx tsc --noEmit

# 콘텐츠 자동 생성 (수동 실행 시)
bash scripts/generate-survey.sh <target_url>
```

## 중요 참고 사항
- 모바일 퍼스트로 개발 (트래픽 80%+ 모바일 예상)
- OG 이미지는 1200x630px 표준 준수
- 광고 이미지 사이즈 validation은 PRD의 규격 엄격히 적용
- Frequency Capping: 1시간 내 광고 슬롯 a/b/c 중 하나만 노출
- 결과 페이지 URL이 공유의 진입점이므로 SSR 필수 (동적 메타태그)