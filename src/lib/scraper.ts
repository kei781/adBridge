/**
 * 설문조사 스크래퍼 모듈
 *
 * MVP 단계에서는 실제 스크래핑 없이 모의 데이터를 반환합니다.
 * TODO: Playwright 통합 — BROWSER_PROFILE_PATH 환경변수의 Chrome 프로파일을 사용하여
 *       실제 웹사이트를 DFS 탐색하고 질문-선택지-결과 구조를 추출할 것.
 */

// 스크래핑 결과 타입
export type ScrapedData = {
  title: string;
  description: string;
  steps: {
    question: string;
    options: string[];
  }[];
  results: {
    title: string;
    description: string;
  }[];
  metadata: {
    targetAudience: string;
    viralPoints: string[];
    improvements: string[];
  };
};

// URL에서 도메인/경로를 분석하여 카테고리 힌트 추출
function analyzeUrl(url: string): { domain: string; category: string } {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.replace("www.", "");
    // 경로에서 카테고리 힌트 추출
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    const category = pathParts[0] || "일반";
    return { domain, category };
  } catch {
    return { domain: "unknown", category: "일반" };
  }
}

// 카테고리별 모의 스크래핑 템플릿
const MOCK_TEMPLATES: Record<string, () => ScrapedData> = {
  성격: () => ({
    title: "나의 진짜 성격 유형 테스트",
    description: "12가지 질문으로 알아보는 나의 숨겨진 성격",
    steps: [
      { question: "주말에 가장 하고 싶은 것은?", options: ["집에서 넷플릭스", "친구들과 카페", "혼자 산책", "새로운 맛집 탐방"] },
      { question: "스트레스를 받으면 나는?", options: ["잠을 잔다", "먹는다", "운동한다", "친구에게 전화한다"] },
      { question: "여행을 간다면 선호하는 스타일은?", options: ["꼼꼼한 계획 여행", "즉흥 여행", "패키지 여행", "혼자 배낭여행"] },
      { question: "친구가 약속에 30분 늦었다. 나의 반응은?", options: ["이해한다", "살짝 짜증난다", "연락을 한다", "그냥 간다"] },
      { question: "나의 SNS 스타일은?", options: ["구경만 한다", "일상 공유", "밈/웃긴 것 공유", "거의 안 한다"] },
      { question: "단체 모임에서 나는?", options: ["분위기 메이커", "조용히 듣는 편", "한두 명과 깊은 대화", "중간 다리 역할"] },
    ],
    results: [
      { title: "감성 충만 몽상가", description: "풍부한 감성과 상상력의 소유자! 혼자만의 시간을 소중히 여기며 깊은 사고를 즐깁니다." },
      { title: "에너지 뿜뿜 인싸", description: "어디서든 분위기를 이끄는 에너지의 원천! 사람들과 함께할 때 빛이 납니다." },
      { title: "든든한 현실주의자", description: "계획적이고 체계적인 당신! 주변 사람들에게 믿음직한 존재입니다." },
      { title: "자유로운 탐험가", description: "새로운 경험을 두려워하지 않는 모험가! 호기심이 당신의 원동력입니다." },
    ],
    metadata: {
      targetAudience: "10대~30대 SNS 활발 사용자",
      viralPoints: ["공감되는 질문", "결과 공유 욕구 자극", "친구 태그 유도"],
      improvements: ["질문 수 최적화 필요", "결과 이미지 추가 권장", "공유 텍스트 강화"],
    },
  }),

  연애: () => ({
    title: "나의 연애 스타일 분석",
    description: "연애할 때 나는 어떤 유형일까?",
    steps: [
      { question: "이상형의 첫인상은?", options: ["따뜻한 미소", "지적인 눈빛", "유머 센스", "패션 감각"] },
      { question: "데이트 코스로 선호하는 것은?", options: ["영화관", "한강 산책", "맛집 투어", "집에서 요리"] },
      { question: "연인과 싸웠을 때 나는?", options: ["먼저 연락한다", "시간을 둔다", "편지를 쓴다", "직접 만나서 대화한다"] },
      { question: "연인에게 가장 중요한 것은?", options: ["신뢰", "소통", "유머", "배려"] },
      { question: "기념일에 대한 나의 태도는?", options: ["꼼꼼히 챙긴다", "깜짝 이벤트를 한다", "평소처럼 보낸다", "상대가 원하는 대로 한다"] },
    ],
    results: [
      { title: "로맨틱 무드메이커", description: "사랑을 표현하는 데 거침없는 당신! 연인에게 특별한 순간을 선물합니다." },
      { title: "듬직한 현실 연애러", description: "화려하진 않지만 든든한 당신! 꾸준한 사랑이 진짜 사랑입니다." },
      { title: "감성 폭발 사랑꾼", description: "감정 표현이 풍부한 당신! 연인과의 감정적 교감을 가장 소중히 여깁니다." },
    ],
    metadata: {
      targetAudience: "20대~30대 연애에 관심 있는 사용자",
      viralPoints: ["연인과 함께 풀어보기", "결과 비교 재미", "공유 시 커플 태그"],
      improvements: ["성별 맞춤 질문 추가", "결과별 궁합 기능", "연애 조언 추가"],
    },
  }),

  // 기본 템플릿 (카테고리 매칭 실패 시)
  기본: () => ({
    title: "나를 알아보는 심리 테스트",
    description: "간단한 질문으로 알아보는 나의 숨겨진 모습",
    steps: [
      { question: "아침에 일어나면 가장 먼저 하는 것은?", options: ["핸드폰 확인", "물 마시기", "스트레칭", "이불 정리"] },
      { question: "가장 좋아하는 계절은?", options: ["봄", "여름", "가을", "겨울"] },
      { question: "혼자 있을 때 주로 뭘 하나요?", options: ["음악 듣기", "유튜브 보기", "독서", "게임"] },
      { question: "친구에게 나는 어떤 존재?", options: ["웃음 담당", "상담사", "플랜 메이커", "조용한 관찰자"] },
      { question: "인생에서 가장 중요한 가치는?", options: ["행복", "성장", "관계", "자유"] },
      { question: "갑자기 100만원이 생기면?", options: ["저축한다", "여행 간다", "쇼핑한다", "맛있는 거 먹는다"] },
      { question: "나의 숨겨진 재능은?", options: ["공감 능력", "분석력", "창의력", "리더십"] },
    ],
    results: [
      { title: "빛나는 감성러", description: "세상을 아름답게 바라보는 당신! 주변에 따뜻한 에너지를 전파합니다." },
      { title: "냉철한 전략가", description: "논리적이고 체계적인 당신! 어떤 상황에서도 최선의 판단을 내립니다." },
      { title: "활력 넘치는 행동파", description: "생각보다 행동이 앞서는 당신! 에너지가 넘치는 도전자입니다." },
      { title: "따뜻한 힐러", description: "주변 사람들을 치유하는 당신! 공감 능력이 뛰어난 평화주의자입니다." },
    ],
    metadata: {
      targetAudience: "전 연령대 SNS 사용자",
      viralPoints: ["보편적 공감", "결과 라벨의 긍정성", "짧은 소요 시간"],
      improvements: ["타겟 구체화 필요", "이미지 추가 권장", "결과 다양성 확대"],
    },
  }),
};

// 카테고리 키워드 매핑
function detectCategory(url: string): string {
  const urlLower = url.toLowerCase();
  if (urlLower.includes("연애") || urlLower.includes("love") || urlLower.includes("couple") || urlLower.includes("mbti")) {
    return "연애";
  }
  if (urlLower.includes("성격") || urlLower.includes("personality") || urlLower.includes("character")) {
    return "성격";
  }
  return "기본";
}

/**
 * 대상 URL을 스크래핑하여 설문조사 데이터를 추출합니다.
 *
 * MVP: 실제 스크래핑 없이 URL 분석 기반 모의 데이터 반환
 * TODO: Playwright 통합 시 아래 단계로 구현
 *   1. BROWSER_PROFILE_PATH의 Chrome 프로파일로 브라우저 실행
 *   2. 대상 URL 접속 및 설문/퀴즈 구조 판별
 *   3. DFS로 모든 질문-선택지-결과 경로 탐색
 *   4. 각 단계별 스크린샷 저장 + 로그 기록
 *   5. 수집 데이터 구조화하여 반환
 */
export async function scrapeSurvey(url: string): Promise<ScrapedData> {
  console.log(`[스크래퍼] 스크래핑 시작: ${url}`);

  // URL 분석
  const { domain, category: urlCategory } = analyzeUrl(url);
  console.log(`[스크래퍼] 도메인: ${domain}, URL 카테고리: ${urlCategory}`);

  // MVP: 스크래핑 시뮬레이션 (2초 딜레이)
  console.log("[스크래퍼] MVP 모드: 모의 스크래핑 실행 중...");
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // URL 기반 카테고리 감지
  const category = detectCategory(url);
  console.log(`[스크래퍼] 감지된 카테고리: ${category}`);

  // 카테고리에 맞는 템플릿으로 모의 데이터 생성
  const templateFn = MOCK_TEMPLATES[category] || MOCK_TEMPLATES["기본"];
  const data = templateFn();

  console.log(`[스크래퍼] 스크래핑 완료: ${data.steps.length}개 질문, ${data.results.length}개 결과 추출`);

  return data;
}
