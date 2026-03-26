import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ jobId: string }> };

// GET /api/admin/generator/[jobId]/stream — SSE 스트림으로 작업 상태 실시간 전송
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  // 인증 확인
  const session = await auth();
  if (!session) {
    return new Response("인증이 필요합니다", { status: 401 });
  }

  const { jobId } = await context.params;

  // SSE 스트림 생성
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // SSE 이벤트 전송 헬퍼
      const sendEvent = (data: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        // 초기 작업 확인
        const job = await prisma.generationJob.findUnique({
          where: { id: jobId },
        });

        if (!job) {
          sendEvent({ error: "작업을 찾을 수 없습니다" });
          controller.close();
          return;
        }

        // 초기 상태 전송
        sendEvent({
          status: job.status,
          logs: job.logs,
          generatedSurveyIds: job.generatedSurveyIds,
        });

        // 이미 완료/실패 상태이면 즉시 종료
        if (job.status === "REVIEW_READY" || job.status === "FAILED") {
          controller.close();
          return;
        }

        // 1초 간격으로 DB 폴링하여 변경사항 전송
        let lastLogCount = Array.isArray(job.logs) ? job.logs.length : 0;
        let lastStatus: string = job.status;
        let consecutiveErrors = 0;

        const interval = setInterval(async () => {
          try {
            const updated = await prisma.generationJob.findUnique({
              where: { id: jobId },
            });

            if (!updated) {
              clearInterval(interval);
              controller.close();
              return;
            }

            const currentLogCount = Array.isArray(updated.logs)
              ? updated.logs.length
              : 0;

            // 상태 또는 로그 변경 시에만 이벤트 전송
            if (
              currentLogCount !== lastLogCount ||
              updated.status !== lastStatus
            ) {
              sendEvent({
                status: updated.status,
                logs: updated.logs,
                generatedSurveyIds: updated.generatedSurveyIds,
              });
              lastLogCount = currentLogCount;
              lastStatus = updated.status;
            }

            // 완료/실패 상태이면 스트림 종료
            if (
              updated.status === "REVIEW_READY" ||
              updated.status === "FAILED"
            ) {
              clearInterval(interval);
              controller.close();
            }

            consecutiveErrors = 0;
          } catch {
            consecutiveErrors++;
            // 3회 연속 에러 시 스트림 종료
            if (consecutiveErrors >= 3) {
              sendEvent({ error: "서버 오류가 발생했습니다" });
              clearInterval(interval);
              controller.close();
            }
          }
        }, 1000); // 1초 간격 폴링

        // 클라이언트 연결 해제 시 인터벌 정리
        request.signal.addEventListener("abort", () => {
          clearInterval(interval);
          try {
            controller.close();
          } catch {
            // 이미 닫힌 경우 무시
          }
        });
      } catch {
        sendEvent({ error: "서버 오류가 발생했습니다" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
