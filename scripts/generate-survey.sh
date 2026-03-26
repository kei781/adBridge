#!/bin/bash
# 콘텐츠 자동 생성 스크립트 (수동 실행 시)
# 사용법: bash scripts/generate-survey.sh <target_url>

set -e

TARGET_URL="${1:?URL을 입력하세요. 사용법: bash scripts/generate-survey.sh <url>}"

echo "🔍 설문조사 분석 시작: $TARGET_URL"
echo "---"

# API 호출로 생성 작업 시작
RESPONSE=$(curl -s -X POST http://localhost:3000/api/admin/generator/start \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$TARGET_URL\"}")

JOB_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$JOB_ID" ]; then
  echo "❌ 작업 생성 실패"
  echo "$RESPONSE"
  exit 1
fi

echo "✅ 작업 생성됨: $JOB_ID"
echo "📊 진행 상황 확인: http://localhost:3000/admin/generator/$JOB_ID"
echo ""

# 작업 완료까지 폴링
while true; do
  STATUS_RESPONSE=$(curl -s http://localhost:3000/api/admin/generator/$JOB_ID)
  STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)

  echo "⏳ 현재 상태: $STATUS"

  if [ "$STATUS" = "REVIEW_READY" ]; then
    echo ""
    echo "✅ 생성 완료! 어드민에서 승인해주세요."
    echo "🔗 http://localhost:3000/admin/generator/$JOB_ID"
    break
  elif [ "$STATUS" = "FAILED" ]; then
    echo ""
    echo "❌ 생성 실패"
    echo "$STATUS_RESPONSE"
    exit 1
  fi

  sleep 2
done
