/**
 * 설문조사 콘텐츠 생성 모듈
 *
 * 스크래핑된 데이터를 기반으로 새로운 설문조사 콘텐츠를 생성합니다.
 * PRD 가이드라인: 제목 15자 이내, 5~8개 질문, 2~4개 선택지, 긍정/유쾌한 결과
 *
 * MVP: 하드코딩 템플릿 + 변형으로 현실적인 한국어 콘텐츠 생성
 * TODO: LLM API 연동하여 동적 콘텐츠 생성
 */

import type { ScrapedData } from "./scraper";

// Prisma nested create에 사용할 설문 데이터 타입
export type GeneratedSurveyData = {
  title: string;
  slug: string;
  description: string;
  steps: {
    questionText: string;
    order: number;
    options: {
      label: string;
      order: number;
      weightMap: Record<string, number>;
    }[];
  }[];
  results: {
    resultKey: string;
    title: string;
    description: string;
    shareText: string;
  }[];
  generationMeta: {
    sourceUrl?: string;
    reasoning: {
      titleReason: string;
      stepCount: string;
      resultDesign: string;
      viralStrategy: string;
    };
    scrapedInsights: {
      originalTitle: string;
      targetAudience: string;
      viralPoints: string[];
      appliedImprovements: string[];
    };
  };
};

// slug 생성: 한글을 로마자로 간단 변환 + 랜덤 접미사
function generateSlug(title: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  // 한글 제목에서 영문/숫자만 추출하고, 없으면 'quiz' 기본값 사용
  const base = title
    .replace(/[^a-zA-Z0-9가-힣]/g, "")
    .substring(0, 10)
    .toLowerCase();
  const slugBase = base || "quiz";
  return `${slugBase}-${timestamp}-${random}`;
}

// 결과 키 목록 생성
function generateResultKeys(count: number): string[] {
  const labels = ["A", "B", "C", "D", "E", "F"];
  return labels.slice(0, count).map((l) => `result_${l}`);
}

// 선택지에 대한 가중치 맵 생성 (각 결과에 랜덤 가중치 할당)
function generateWeightMap(
  resultKeys: string[],
  primaryIndex: number
): Record<string, number> {
  const map: Record<string, number> = {};
  resultKeys.forEach((key, i) => {
    // 주요 결과에 높은 가중치, 나머지는 낮은 가중치
    map[key] = i === primaryIndex ? 3 : Math.floor(Math.random() * 2) + 1;
  });
  return map;
}

// 콘텐츠 변형 템플릿 풀
const TITLE_TEMPLATES = [
  (theme: string) => `${theme} 테스트`,
  (theme: string) => `내 ${theme} 유형은?`,
  (theme: string) => `${theme} 감별기`,
  (theme: string) => `진짜 내 ${theme}`,
  (theme: string) => `${theme} 밸런스 게임`,
];

const THEME_POOLS: Record<string, string[]> = {
  성격: ["숨은 성격", "내면 캐릭터", "진짜 MBTI", "감정 패턴", "행동 스타일"],
  연애: ["연애 감성", "사랑 유형", "이상형 코드", "연애 DNA", "플러팅 스타일"],
  일반: ["취향 저격", "일상 패턴", "숨은 재능", "감성 코드", "라이프 스타일"],
};

const QUESTION_POOLS: Record<string, string[][]> = {
  성격: [
    ["가장 편안한 주말 오후는?", "혼자 넷플릭스 정주행", "카페에서 책 읽기", "친구들과 브런치", "새로운 취미 도전"],
    ["모르는 사람이 말을 걸면?", "반갑게 대답한다", "당황하지만 대화한다", "짧게 대답한다", "이어폰을 낀 척한다"],
    ["나에게 에너지를 주는 것은?", "혼자만의 시간", "좋은 음악", "친한 친구와의 수다", "새로운 경험"],
    ["팀 프로젝트에서 나의 역할은?", "아이디어 뱅크", "일정 관리자", "분위기 메이커", "꼼꼼한 마무리"],
    ["갈등 상황에서 나는?", "바로 해결하려 한다", "시간을 두고 생각한다", "제3자에게 조언을 구한다", "상대 입장을 먼저 이해한다"],
    ["SNS에서 좋아요를 가장 많이 누르는 콘텐츠는?", "귀여운 동물", "맛집 리뷰", "여행 사진", "공감 글"],
    ["스트레스 해소법은?", "폭식", "운동", "쇼핑", "수면"],
    ["나를 동물에 비유하면?", "고양이 (독립적)", "강아지 (사교적)", "부엉이 (지적)", "돌고래 (자유로운)"],
  ],
  연애: [
    ["첫 데이트 장소로 어디가 좋을까?", "분위기 좋은 레스토랑", "놀이공원", "한강 피크닉", "영화관"],
    ["연인이 서운하게 했을 때 나는?", "바로 말한다", "삐진다", "일단 참는다", "편지로 전한다"],
    ["가장 설레는 순간은?", "눈이 마주칠 때", "손을 잡을 때", "웃음 코드가 맞을 때", "생각지 못한 연락이 올 때"],
    ["연인에게 바라는 것은?", "함께하는 시간", "응원과 지지", "솔직한 대화", "깜짝 이벤트"],
    ["이별 후 나는?", "바로 정리한다", "한동안 힘들어한다", "자기개발에 몰두한다", "여행을 떠난다"],
    ["커플 아이템에 대한 생각은?", "좋다! 하고 싶다", "은근한 것은 OK", "별로다", "상대가 원하면"],
  ],
  일반: [
    ["하루 중 가장 좋아하는 시간대는?", "이른 아침", "점심시간", "오후 티타임", "늦은 밤"],
    ["여행지에서 가장 먼저 하는 것은?", "맛집 탐방", "사진 찍기", "숙소에서 쉬기", "현지 시장 구경"],
    ["택배가 왔을 때 나는?", "바로 뜯는다", "일단 놔두고 나중에", "사진 찍고 언박싱", "뭘 시켰는지 기억 못 한다"],
    ["가장 자신 있는 요리는?", "라면", "볶음밥", "파스타", "배달 앱이 내 요리사"],
    ["잠들기 전 마지막으로 하는 것은?", "유튜브", "SNS", "독서", "내일 계획 세우기"],
    ["공포영화를 볼 때 나는?", "무서워도 눈을 못 뗀다", "손으로 눈을 가린다", "소리 지른다", "안 본다"],
    ["로또에 당첨되면 제일 먼저?", "부모님 효도", "세계 여행", "집 산다", "일단 은행부터"],
  ],
};

const RESULT_TEMPLATES: Record<string, { title: string; description: string; shareText: string }[][]> = {
  성격: [
    [
      { title: "순수 감성 몽상가", description: "당신은 풍부한 감수성의 소유자! 작은 것에서도 아름다움을 찾는 특별한 능력이 있어요.", shareText: "나는 '순수 감성 몽상가' 유형이래! 너도 해봐 👀" },
      { title: "핵인싸 에너자이저", description: "어디서든 분위기를 밝히는 당신! 사람들이 당신 곁에 모이는 이유가 있답니다.", shareText: "나는 '핵인싸 에너자이저' 유형이래! 너도 해봐 👀" },
      { title: "차분한 분석가", description: "냉철한 판단력으로 신뢰를 주는 당신! 주변에서 조언을 구하는 든든한 존재예요.", shareText: "나는 '차분한 분석가' 유형이래! 너도 해봐 👀" },
      { title: "호기심 탐험가", description: "새로운 것에 대한 끝없는 호기심! 세상 모든 것이 당신의 놀이터예요.", shareText: "나는 '호기심 탐험가' 유형이래! 너도 해봐 👀" },
    ],
    [
      { title: "숨은 리더 타입", description: "평소엔 조용하지만 중요한 순간에 빛나는 당신! 진정한 리더십은 이런 거예요.", shareText: "나는 '숨은 리더 타입'이래! 너의 유형도 궁금하지 않아? 🤔" },
      { title: "힐링 요정", description: "당신의 존재만으로 주변이 편안해져요. 타고난 공감 능력의 소유자!", shareText: "나는 '힐링 요정' 타입이래! 너의 유형도 궁금하지 않아? 🤔" },
      { title: "열정 불꽃", description: "하고 싶은 건 꼭 해내는 당신! 뜨거운 열정이 당신의 최고 무기예요.", shareText: "나는 '열정 불꽃' 타입이래! 너의 유형도 궁금하지 않아? 🤔" },
    ],
  ],
  연애: [
    [
      { title: "츤데레 연인", description: "겉으론 쿨한 척하지만 속은 따뜻한 당신! 표현이 서투를 뿐 마음은 누구보다 깊어요.", shareText: "연애 유형 테스트 결과 나는 '츤데레 연인'! 😏" },
      { title: "낭만 충전 로맨티스트", description: "사랑에 진심인 당신! 작은 이벤트도 특별하게 만드는 로맨스 장인이에요.", shareText: "연애 유형 테스트 결과 나는 '낭만 충전 로맨티스트'! 😏" },
      { title: "믿음직한 동반자", description: "한결같은 사랑을 주는 당신! 함께 있으면 세상 든든한 베스트 파트너예요.", shareText: "연애 유형 테스트 결과 나는 '믿음직한 동반자'! 😏" },
    ],
  ],
  일반: [
    [
      { title: "트렌드 세터", description: "유행을 만드는 사람! 당신의 취향이 곧 트렌드가 됩니다.", shareText: "취향 테스트 결과 나는 '트렌드 세터'! 너는 뭐 나왔어?" },
      { title: "아늑한 집순이/집돌이", description: "집이 곧 천국인 당신! 나만의 공간에서 최고의 행복을 느끼는 타입이에요.", shareText: "취향 테스트 결과 나는 '아늑한 집순이/집돌이'! 너는 뭐 나왔어?" },
      { title: "모험 러버", description: "일상에 자극이 필요한 당신! 매일이 새로운 모험인 삶을 꿈꿔요.", shareText: "취향 테스트 결과 나는 '모험 러버'! 너는 뭐 나왔어?" },
      { title: "감성 미식가", description: "맛있는 음식과 좋은 분위기를 사랑하는 당신! 오감을 즐기는 삶의 달인이에요.", shareText: "취향 테스트 결과 나는 '감성 미식가'! 너는 뭐 나왔어?" },
    ],
  ],
};

// 카테고리 감지 (스크래핑 데이터 기반)
function detectCategory(data: ScrapedData): string {
  const text = `${data.title} ${data.description}`.toLowerCase();
  if (text.includes("연애") || text.includes("사랑") || text.includes("이상형") || text.includes("데이트")) {
    return "연애";
  }
  if (text.includes("성격") || text.includes("유형") || text.includes("심리") || text.includes("mbti")) {
    return "성격";
  }
  return "일반";
}

// 배열에서 랜덤하게 n개 선택
function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// 단일 설문 데이터 생성
function generateSingleSurvey(
  scrapedData: ScrapedData,
  category: string,
  variationIndex: number
): GeneratedSurveyData {
  // 테마 선택
  const themes = THEME_POOLS[category] || THEME_POOLS["일반"];
  const theme = themes[variationIndex % themes.length];

  // 제목 생성 (15자 이내)
  const titleTemplate = TITLE_TEMPLATES[variationIndex % TITLE_TEMPLATES.length];
  let title = titleTemplate(theme);
  if (title.length > 15) {
    title = title.substring(0, 15);
  }

  const slug = generateSlug(title);

  // 질문 선택 (5~8개)
  const questionPool = QUESTION_POOLS[category] || QUESTION_POOLS["일반"];
  const stepCount = Math.min(Math.max(5, scrapedData.steps.length), 8);
  const selectedQuestions = pickRandom(questionPool, stepCount);

  // 결과 선택 (3~4개)
  const resultPool = RESULT_TEMPLATES[category] || RESULT_TEMPLATES["일반"];
  const resultSet = resultPool[variationIndex % resultPool.length];
  const resultKeys = generateResultKeys(resultSet.length);

  // 스텝 데이터 구성
  const steps = selectedQuestions.map((q, stepIdx) => {
    const [question, ...optionLabels] = q;
    // 2~4개 선택지
    const optionCount = Math.min(optionLabels.length, Math.floor(Math.random() * 3) + 2);
    const selectedOptions = optionLabels.slice(0, optionCount);

    return {
      questionText: question,
      order: stepIdx + 1,
      options: selectedOptions.map((label, optIdx) => ({
        label,
        order: optIdx + 1,
        weightMap: generateWeightMap(resultKeys, optIdx % resultKeys.length),
      })),
    };
  });

  // 결과 데이터 구성
  const results = resultSet.map((r, idx) => ({
    resultKey: resultKeys[idx],
    title: r.title,
    description: r.description,
    shareText: r.shareText,
  }));

  // 생성 메타데이터 (의사결정 근거 기록)
  const generationMeta = {
    sourceUrl: undefined as string | undefined,
    reasoning: {
      titleReason: `'${theme}' 테마를 활용하여 호기심 유발형 제목 생성. 15자 이내 준수.`,
      stepCount: `원본 ${scrapedData.steps.length}개 질문 참고, ${stepCount}개로 최적화. 이탈률 방지를 위해 5~8개 범위 유지.`,
      resultDesign: `${resultSet.length}개 결과 유형 — 모두 긍정적 톤으로 공유 욕구 자극. 각 결과가 명확하게 구분되도록 설계.`,
      viralStrategy: `공유 텍스트에 친구 태그 유도 문구 포함. 결과 라벨은 재미있고 기억하기 쉬운 네이밍 사용.`,
    },
    scrapedInsights: {
      originalTitle: scrapedData.title,
      targetAudience: scrapedData.metadata.targetAudience,
      viralPoints: scrapedData.metadata.viralPoints,
      appliedImprovements: scrapedData.metadata.improvements,
    },
  };

  return {
    title,
    slug,
    description: `${theme}로 알아보는 나의 숨겨진 모습! 지금 바로 테스트해보세요.`,
    steps,
    results,
    generationMeta,
  };
}

/**
 * 스크래핑된 데이터를 기반으로 2~3개의 새로운 설문 콘텐츠를 생성합니다.
 *
 * - 원본을 그대로 복사하지 않고 구조와 컨셉만 참고
 * - PRD 가이드라인 준수: 제목 15자, 5~8개 질문, 2~4개 선택지
 * - 결과는 긍정적/유쾌한 톤, 공유 욕구 자극
 */
export async function generateSurveys(
  scrapedData: ScrapedData
): Promise<GeneratedSurveyData[]> {
  console.log("[생성기] 콘텐츠 생성 시작...");

  const category = detectCategory(scrapedData);
  console.log(`[생성기] 감지된 카테고리: ${category}`);

  // 2~3개 변형 생성
  const surveyCount = Math.floor(Math.random() * 2) + 2; // 2 또는 3
  console.log(`[생성기] ${surveyCount}개 설문 생성 예정`);

  // 생성 시뮬레이션 딜레이 (각 설문당 1초)
  const surveys: GeneratedSurveyData[] = [];
  for (let i = 0; i < surveyCount; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const survey = generateSingleSurvey(scrapedData, category, i);
    surveys.push(survey);
    console.log(`[생성기] ${i + 1}/${surveyCount} 완료: "${survey.title}" (${survey.steps.length}개 질문, ${survey.results.length}개 결과)`);
  }

  console.log("[생성기] 콘텐츠 생성 완료");
  return surveys;
}
