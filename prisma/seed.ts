import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("시드 데이터 생성 시작...");

  // 기존 데이터 삭제
  await prisma.stepOption.deleteMany();
  await prisma.surveyStep.deleteMany();
  await prisma.surveyResult.deleteMany();
  await prisma.survey.deleteMany();

  // 설문 1: 연애 유형 테스트
  const survey1 = await prisma.survey.create({
    data: {
      title: "당신의 연애 유형은?",
      slug: "love-type-test",
      description: "5가지 상황으로 알아보는 나의 연애 스타일!",
      status: "PUBLISHED",
      publishedAt: new Date(),
      viewCount: 15234,
      completionCount: 8921,
      shareCount: 3456,
      steps: {
        create: [
          {
            order: 0,
            questionText: "주말 데이트, 연인이 '아무데나 가자'고 할 때 당신은?",
            options: {
              create: [
                { order: 0, label: "이미 3개의 플랜을 준비해뒀지 😎", weightMap: { planner: 3, tsundere: 0, sweet: 1 } },
                { order: 1, label: "그럼 집에서 넷플릭스 볼까?", weightMap: { planner: 0, tsundere: 1, sweet: 2 } },
                { order: 2, label: "뭐든 좋아~ 같이면 다 좋아", weightMap: { planner: 0, tsundere: 0, sweet: 3 } },
              ],
            },
          },
          {
            order: 1,
            questionText: "연인에게 '보고싶다'는 말을 들었을 때?",
            options: {
              create: [
                { order: 0, label: "나도!!! (바로 답장)", weightMap: { planner: 0, tsundere: 0, sweet: 3 } },
                { order: 1, label: "ㅋㅋ 뭐래 (속으로는 심쿵)", weightMap: { planner: 0, tsundere: 3, sweet: 0 } },
                { order: 2, label: "그럼 내일 만날까? (즉시 약속)", weightMap: { planner: 3, tsundere: 0, sweet: 1 } },
              ],
            },
          },
          {
            order: 2,
            questionText: "연인과 의견이 다를 때 당신의 스타일은?",
            options: {
              create: [
                { order: 0, label: "논리적으로 설득한다", weightMap: { planner: 3, tsundere: 1, sweet: 0 } },
                { order: 1, label: "일단 져주고 나중에 슬쩍 내 의견 관철", weightMap: { planner: 1, tsundere: 3, sweet: 0 } },
                { order: 2, label: "상대방 의견도 좋은데? 하고 수용", weightMap: { planner: 0, tsundere: 0, sweet: 3 } },
              ],
            },
          },
          {
            order: 3,
            questionText: "기념일에 연인이 깜짝 선물을 준비했다면?",
            options: {
              create: [
                { order: 0, label: "감동... 나도 이미 준비했는데!", weightMap: { planner: 3, tsundere: 0, sweet: 1 } },
                { order: 1, label: "어... 고마워 (얼굴 빨개짐)", weightMap: { planner: 0, tsundere: 3, sweet: 1 } },
                { order: 2, label: "대박! 이게 뭐야 너무 좋아!!", weightMap: { planner: 0, tsundere: 0, sweet: 3 } },
              ],
            },
          },
          {
            order: 4,
            questionText: "연인의 SNS에 다른 이성이 좋아요를 눌렀다면?",
            options: {
              create: [
                { order: 0, label: "체크는 하되 내색하지 않음", weightMap: { planner: 2, tsundere: 2, sweet: 0 } },
                { order: 1, label: "... (질투나지만 티 안 냄)", weightMap: { planner: 0, tsundere: 3, sweet: 0 } },
                { order: 2, label: "나도 좋아요 눌러야지~ 걱정 없음", weightMap: { planner: 0, tsundere: 0, sweet: 3 } },
              ],
            },
          },
        ],
      },
      results: {
        create: [
          {
            resultKey: "planner",
            title: "계획형 연애 장인",
            description: "당신은 연애도 전략적으로! 데이트 코스부터 기념일 선물까지 완벽하게 준비하는 타입이에요. 연인은 항상 감동받지만, 가끔은 즉흥적인 모습도 보여주면 더 좋을 거예요!",
            shareText: "나는 '계획형 연애 장인'이래! 너의 연애 유형은?",
          },
          {
            resultKey: "tsundere",
            title: "츤데레 연애인",
            description: "겉으로는 쿨한 척하지만 속으로는 심쿵 폭발! 당신의 반전 매력에 연인이 푹 빠져있을 거예요. 가끔은 솔직하게 감정을 표현해보는 건 어떨까요?",
            shareText: "나는 '츤데레 연애인'이래! 너의 연애 유형은?",
          },
          {
            resultKey: "sweet",
            title: "달달구리 사랑꾼",
            description: "사랑 앞에서는 한없이 달달해지는 당신! 연인에게 아낌없이 사랑을 표현하고, 함께하는 모든 순간을 소중히 여기는 타입이에요. 이런 사람 어디서 찾아요?",
            shareText: "나는 '달달구리 사랑꾼'이래! 너의 연애 유형은?",
          },
        ],
      },
    },
  });
  console.log(`설문 1 생성 완료: ${survey1.title}`);

  // 설문 2: MBTI 음식 테스트
  const survey2 = await prisma.survey.create({
    data: {
      title: "음식으로 보는 내 성격은?",
      slug: "food-personality",
      description: "좋아하는 음식 취향으로 알아보는 숨겨진 성격!",
      status: "PUBLISHED",
      publishedAt: new Date(),
      viewCount: 9876,
      completionCount: 5432,
      shareCount: 2100,
      steps: {
        create: [
          {
            order: 0,
            questionText: "금요일 저녁, 뭐 먹을까 고민될 때?",
            options: {
              create: [
                { order: 0, label: "맵찔이지만 매운거 도전! 🌶️", weightMap: { fire: 3, comfort: 0, fancy: 0 } },
                { order: 1, label: "역시 치킨이지~ 🍗", weightMap: { fire: 0, comfort: 3, fancy: 0 } },
                { order: 2, label: "오마카세 예약해뒀지 🍣", weightMap: { fire: 0, comfort: 0, fancy: 3 } },
              ],
            },
          },
          {
            order: 1,
            questionText: "해장 음식으로 최고는?",
            options: {
              create: [
                { order: 0, label: "얼큰한 짬뽕", weightMap: { fire: 3, comfort: 1, fancy: 0 } },
                { order: 1, label: "따뜻한 콩나물국밥", weightMap: { fire: 0, comfort: 3, fancy: 0 } },
                { order: 2, label: "브런치 카페의 에그 베네딕트", weightMap: { fire: 0, comfort: 0, fancy: 3 } },
              ],
            },
          },
          {
            order: 2,
            questionText: "여행지에서 꼭 먹어야 하는 건?",
            options: {
              create: [
                { order: 0, label: "현지인만 아는 로컬 맛집", weightMap: { fire: 2, comfort: 1, fancy: 1 } },
                { order: 1, label: "편의점에서 새로운 과자 사기", weightMap: { fire: 0, comfort: 3, fancy: 0 } },
                { order: 2, label: "미슐랭 레스토랑 예약 필수", weightMap: { fire: 0, comfort: 0, fancy: 3 } },
              ],
            },
          },
          {
            order: 3,
            questionText: "소개팅에서 가고 싶은 식당은?",
            options: {
              create: [
                { order: 0, label: "매운 닭발집 (진짜 나를 보여주기)", weightMap: { fire: 3, comfort: 0, fancy: 0 } },
                { order: 1, label: "분위기 좋은 파스타집", weightMap: { fire: 0, comfort: 2, fancy: 2 } },
                { order: 2, label: "루프탑 바에서 와인 한잔", weightMap: { fire: 0, comfort: 0, fancy: 3 } },
              ],
            },
          },
          {
            order: 4,
            questionText: "늦은 밤 출출할 때?",
            options: {
              create: [
                { order: 0, label: "불닭볶음면 + 치즈 조합", weightMap: { fire: 3, comfort: 1, fancy: 0 } },
                { order: 1, label: "시리얼 한 그릇이면 충분", weightMap: { fire: 0, comfort: 3, fancy: 0 } },
                { order: 2, label: "냉장고에 넣어둔 디저트 꺼내기", weightMap: { fire: 0, comfort: 0, fancy: 3 } },
              ],
            },
          },
        ],
      },
      results: {
        create: [
          {
            resultKey: "fire",
            title: "불꽃 미식가 🔥",
            description: "도전을 두려워하지 않는 당신! 매운맛도, 새로운 음식도 거침없이 도전하는 열정 가득한 사람이에요. 주변 사람들에게 에너지를 주는 존재!",
            shareText: "나는 '불꽃 미식가'래! 🔥 너는 어떤 음식 성격?",
          },
          {
            resultKey: "comfort",
            title: "힐링 음식 전문가 🍜",
            description: "따뜻하고 편안한 것을 사랑하는 당신! 소울푸드로 모든 것을 치유할 수 있다고 믿는 타입이에요. 함께 있으면 마음이 편해지는 사람!",
            shareText: "나는 '힐링 음식 전문가'래! 🍜 너는 어떤 음식 성격?",
          },
          {
            resultKey: "fancy",
            title: "감성 미식 탐험가 ✨",
            description: "맛뿐만 아니라 분위기, 플레이팅까지 중요하게 생각하는 당신! 먹는 것도 하나의 경험이라고 생각하는 감성 충만한 사람이에요.",
            shareText: "나는 '감성 미식 탐험가'래! ✨ 너는 어떤 음식 성격?",
          },
        ],
      },
    },
  });
  console.log(`설문 2 생성 완료: ${survey2.title}`);

  console.log("시드 데이터 생성 완료!");
}

main()
  .catch((e) => {
    console.error("시드 데이터 생성 실패:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
