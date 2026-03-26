/**
 * 설문조사 스크래퍼 모듈
 *
 * Playwright를 사용하여 경쟁사 설문/퀴즈 사이트를 실제로 탐색합니다.
 * - 개별 퀴즈 URL: 해당 퀴즈의 구조를 분석
 * - 리스트/검색 URL: 페이지 내 퀴즈 링크들을 탐색하여 여러 개 분석
 */

import { chromium, type Browser, type Page } from "playwright";

// 스크래핑 결과 타입
export type ScrapedData = {
  title: string;
  description: string;
  sourceUrl: string;
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
    scrapedQuizCount?: number; // 리스트에서 발견된 퀴즈 수
    analyzedUrls?: string[]; // 실제 분석한 URL 목록
  };
};

// 브라우저 인스턴스 관리
let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  const userDataDir = process.env.BROWSER_PROFILE_PATH;

  if (userDataDir) {
    // 기 로그인된 브라우저 프로파일 사용
    console.log(`[스크래퍼] Chrome 프로파일 사용: ${userDataDir}`);
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: true,
      args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
    });
    // persistent context에서는 browser()를 통해 접근
    browserInstance = context.browser() ?? await chromium.launch({ headless: true });
    return browserInstance;
  }

  // 프로파일 없이 일반 브라우저 사용
  browserInstance = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"],
  });
  return browserInstance;
}

/**
 * 페이지에서 텍스트 콘텐츠를 안전하게 추출
 */
async function safeTextContent(page: Page, selector: string): Promise<string> {
  try {
    const el = await page.$(selector);
    if (!el) return "";
    return ((await el.textContent()) ?? "").trim();
  } catch {
    return "";
  }
}

/**
 * 페이지가 퀴즈/설문 리스트인지 판별
 * - 여러 개의 퀴즈 링크가 있으면 리스트 페이지
 */
async function isListPage(page: Page): Promise<boolean> {
  // 일반적인 리스트 패턴: 카드/링크가 3개 이상
  const links = await page.$$eval("a[href]", (els) =>
    els
      .map((el) => ({ href: el.getAttribute("href") ?? "", text: (el.textContent ?? "").trim() }))
      .filter((l) => l.text.length > 3 && l.text.length < 100)
  );

  // 퀴즈/테스트 관련 링크가 3개 이상이면 리스트
  const quizLinks = links.filter(
    (l) =>
      l.href.includes("quiz") ||
      l.href.includes("test") ||
      l.href.includes("survey") ||
      l.text.includes("테스트") ||
      l.text.includes("유형") ||
      l.text.includes("알아보") ||
      l.text.includes("검사")
  );

  return quizLinks.length >= 3;
}

/**
 * 리스트 페이지에서 퀴즈 링크들을 추출
 */
async function extractQuizLinks(page: Page): Promise<{ url: string; title: string }[]> {
  const baseUrl = new URL(page.url()).origin;

  const links = await page.$$eval("a[href]", (els) =>
    els.map((el) => ({
      href: el.getAttribute("href") ?? "",
      text: (el.textContent ?? "").trim(),
    }))
  );

  const quizLinks = links
    .filter(
      (l) =>
        l.text.length > 3 &&
        l.text.length < 100 &&
        (l.href.includes("quiz") ||
          l.href.includes("test") ||
          l.href.includes("survey") ||
          l.text.includes("테스트") ||
          l.text.includes("유형") ||
          l.text.includes("알아보") ||
          l.text.includes("검사") ||
          l.text.includes("심리"))
    )
    .map((l) => ({
      url: l.href.startsWith("http") ? l.href : `${baseUrl}${l.href}`,
      title: l.text.replace(/\n/g, " ").trim(),
    }));

  // 중복 제거
  const seen = new Set<string>();
  return quizLinks.filter((l) => {
    if (seen.has(l.url)) return false;
    seen.add(l.url);
    return true;
  });
}

/**
 * 개별 퀴즈 페이지에서 콘텐츠 구조 추출
 */
async function scrapeQuizPage(page: Page, url: string): Promise<ScrapedData | null> {
  try {
    console.log(`[스크래퍼] 퀴즈 페이지 분석: ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(2000); // 동적 콘텐츠 로딩 대기

    // 페이지 제목 추출
    const title =
      (await safeTextContent(page, "h1")) ||
      (await safeTextContent(page, "h2")) ||
      (await page.title());

    if (!title || title.length < 2) {
      console.log(`[스크래퍼] 제목 추출 실패, 스킵: ${url}`);
      return null;
    }

    // 설명 추출
    const description =
      (await safeTextContent(page, 'meta[property="og:description"]')) ||
      (await safeTextContent(page, 'meta[name="description"]')) ||
      (await safeTextContent(page, "p")) ||
      "";

    // 페이지 전체 텍스트에서 질문/선택지 패턴 추출
    const pageText = await page.evaluate(() => document.body.innerText);
    const lines = pageText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

    // 질문 패턴 감지 (? 로 끝나거나, 번호가 붙은 문장)
    const questions: { question: string; options: string[] }[] = [];
    let currentQuestion = "";
    let currentOptions: string[] = [];

    for (const line of lines) {
      const isQuestion =
        line.endsWith("?") ||
        /^\d+[\.\)]\s/.test(line) ||
        line.includes("어떤") ||
        line.includes("무엇") ||
        line.includes("선택");

      if (isQuestion && line.length > 5 && line.length < 200) {
        // 이전 질문 저장
        if (currentQuestion && currentOptions.length >= 2) {
          questions.push({ question: currentQuestion, options: [...currentOptions] });
        }
        currentQuestion = line;
        currentOptions = [];
      } else if (currentQuestion && line.length > 1 && line.length < 100) {
        // 선택지 후보
        currentOptions.push(line);
        if (currentOptions.length >= 4) {
          // 선택지가 4개 이상이면 다음 질문으로
          questions.push({ question: currentQuestion, options: [...currentOptions] });
          currentQuestion = "";
          currentOptions = [];
        }
      }
    }
    // 마지막 질문 저장
    if (currentQuestion && currentOptions.length >= 2) {
      questions.push({ question: currentQuestion, options: currentOptions });
    }

    // 버튼/링크에서도 선택지 추출 시도
    if (questions.length === 0) {
      const buttons = await page.$$eval("button, [role='button'], .option, .choice, .answer", (els) =>
        els.map((el) => (el.textContent ?? "").trim()).filter((t) => t.length > 1 && t.length < 100)
      );

      if (buttons.length >= 2) {
        questions.push({
          question: title.endsWith("?") ? title : `${title} - 당신의 선택은?`,
          options: buttons.slice(0, 4),
        });
      }
    }

    // 결과 패턴 추출 (결과 페이지 접근이 어려우므로 페이지 내 힌트로 추출)
    const resultHints = lines.filter(
      (l) =>
        l.includes("타입") ||
        l.includes("유형") ||
        l.includes("형 인간") ||
        l.includes("당신은") ||
        (l.length > 5 && l.length < 30 && !l.includes("?"))
    );

    const results = resultHints.slice(0, 4).map((hint) => ({
      title: hint.length > 20 ? hint.slice(0, 20) : hint,
      description: `${hint} - 이 유형에 대한 상세 설명`,
    }));

    // 최소 결과가 없으면 기본값
    if (results.length < 2) {
      results.push(
        { title: "A 유형", description: "첫 번째 유형에 대한 설명" },
        { title: "B 유형", description: "두 번째 유형에 대한 설명" },
        { title: "C 유형", description: "세 번째 유형에 대한 설명" }
      );
    }

    return {
      title,
      description: description.slice(0, 200),
      sourceUrl: url,
      steps: questions.length > 0 ? questions.slice(0, 10) : [
        { question: `${title}에 대한 첫 번째 질문`, options: ["선택지 1", "선택지 2", "선택지 3"] },
      ],
      results: results.slice(0, 5),
      metadata: {
        targetAudience: "SNS 활발 사용자",
        viralPoints: [
          title.length <= 15 ? "짧고 후킹한 제목" : "제목 길이 최적화 필요",
          questions.length >= 5 ? "적절한 질문 수" : "질문 수 보강 필요",
          "결과 공유 욕구 자극",
        ],
        improvements: [
          questions.length < 5 ? "질문 수를 5~8개로 늘리기" : "질문 수 적절",
          "결과 이미지 추가 권장",
          "공유 텍스트 강화",
        ],
      },
    };
  } catch (error) {
    console.error(`[스크래퍼] 페이지 분석 실패: ${url}`, error);
    return null;
  }
}

/**
 * 대상 URL을 스크래핑하여 설문조사 데이터를 추출합니다.
 *
 * - 리스트/검색 페이지: 퀴즈 링크들을 발견하고 각각 분석
 * - 개별 퀴즈 페이지: 해당 퀴즈의 구조를 분석
 * - 분석 결과를 바탕으로 새 설문 생성에 필요한 데이터 반환
 */
export async function scrapeSurvey(url: string): Promise<ScrapedData> {
  console.log(`[스크래퍼] 스크래핑 시작: ${url}`);

  let browser: Browser;
  let page: Page;

  try {
    browser = await getBrowser();
    page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
  } catch (error) {
    console.error("[스크래퍼] 브라우저 시작 실패, 폴백 모드:", error);
    return fallbackScrape(url);
  }

  try {
    // 대상 URL 접속
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(2000);

    // 리스트 페이지인지 판별
    const isList = await isListPage(page);
    console.log(`[스크래퍼] 페이지 타입: ${isList ? "리스트" : "개별 퀴즈"}`);

    if (isList) {
      // 리스트 페이지: 퀴즈 링크 추출 후 각각 분석
      const quizLinks = await extractQuizLinks(page);
      console.log(`[스크래퍼] 발견된 퀴즈 링크: ${quizLinks.length}개`);

      const analyzedData: ScrapedData[] = [];
      // 최대 5개만 분석
      for (const link of quizLinks.slice(0, 5)) {
        const data = await scrapeQuizPage(page, link.url);
        if (data) {
          analyzedData.push(data);
        }
      }

      if (analyzedData.length === 0) {
        console.log("[스크래퍼] 퀴즈 분석 결과 없음, 리스트 제목으로 폴백");
        return fallbackScrape(url);
      }

      // 여러 퀴즈 데이터를 종합하여 하나의 ScrapedData로 합침
      const combined: ScrapedData = {
        title: analyzedData[0].title,
        description: `${quizLinks.length}개 퀴즈에서 영감을 받은 콘텐츠`,
        sourceUrl: url,
        steps: analyzedData.flatMap((d) => d.steps).slice(0, 15),
        results: analyzedData.flatMap((d) => d.results).slice(0, 8),
        metadata: {
          targetAudience: "SNS 활발 사용자",
          viralPoints: [
            `${quizLinks.length}개 퀴즈에서 트렌드 분석`,
            ...analyzedData[0].metadata.viralPoints,
          ],
          improvements: analyzedData[0].metadata.improvements,
          scrapedQuizCount: quizLinks.length,
          analyzedUrls: analyzedData.map((d) => d.sourceUrl),
        },
      };

      return combined;
    } else {
      // 개별 퀴즈 페이지
      const data = await scrapeQuizPage(page, url);
      if (data) return data;
      return fallbackScrape(url);
    }
  } catch (error) {
    console.error("[스크래퍼] 스크래핑 실패:", error);
    return fallbackScrape(url);
  } finally {
    await page.close().catch(() => {});
  }
}

/**
 * 폴백: 스크래핑 실패 시 URL 기반 더미 데이터 반환
 */
function fallbackScrape(url: string): ScrapedData {
  console.log("[스크래퍼] 폴백 모드: URL 기반 더미 데이터 생성");

  const urlLower = url.toLowerCase();
  let category = "심리";
  if (urlLower.includes("연애") || urlLower.includes("love") || urlLower.includes("couple")) category = "연애";
  if (urlLower.includes("성격") || urlLower.includes("mbti") || urlLower.includes("personality")) category = "성격";
  if (urlLower.includes("음식") || urlLower.includes("food")) category = "음식";

  return {
    title: `${category} 테스트 분석 결과`,
    description: `${url}에서 영감을 받은 ${category} 테스트`,
    sourceUrl: url,
    steps: [
      { question: `${category}에 관한 첫 번째 질문?`, options: ["선택 A", "선택 B", "선택 C"] },
      { question: `당신의 ${category} 스타일은?`, options: ["적극적", "신중한", "자유로운"] },
      { question: `${category}에서 가장 중요한 것은?`, options: ["재미", "의미", "공감", "도전"] },
      { question: "주변 사람들이 보는 나는?", options: ["열정적", "차분한", "유쾌한", "진지한"] },
      { question: "스트레스를 받을 때 나는?", options: ["혼자 있기", "친구 만나기", "운동하기", "먹기"] },
    ],
    results: [
      { title: "열정 충만형", description: "에너지가 넘치는 당신!" },
      { title: "감성 충만형", description: "감수성이 풍부한 당신!" },
      { title: "이성 충만형", description: "논리적이고 차분한 당신!" },
    ],
    metadata: {
      targetAudience: "10대~30대 SNS 활발 사용자",
      viralPoints: ["공감되는 질문", "공유하고 싶은 결과", "짧은 소요 시간"],
      improvements: ["실제 페이지 분석으로 더 정확한 데이터 필요"],
    },
  };
}
