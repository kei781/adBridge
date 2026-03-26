import { z } from "zod/v4";

// ===== Zod 스키마 =====

// 선택지 스키마
export const stepOptionSchema = z.object({
  label: z.string().min(1, "선택지 텍스트를 입력하세요"),
  imageUrl: z.string().url().nullable().optional(),
  order: z.number().int().min(0),
  weightMap: z.record(z.string(), z.number()), // { "result_A": 3, "result_B": 1 }
});

// 스텝 스키마
export const surveyStepSchema = z.object({
  questionText: z.string().min(1, "질문을 입력하세요"),
  questionImageUrl: z.string().url().nullable().optional(),
  order: z.number().int().min(0),
  options: z.array(stepOptionSchema).min(2, "선택지는 최소 2개 필요합니다"),
});

// 결과 스키마
export const surveyResultSchema = z.object({
  resultKey: z.string().min(1, "결과 키를 입력하세요"),
  title: z.string().min(1, "결과 제목을 입력하세요"),
  description: z.string().min(1, "결과 설명을 입력하세요"),
  resultImageUrl: z.string().url().nullable().optional(),
  ogImageUrl: z.string().url().nullable().optional(),
  shareText: z.string().min(1, "공유 텍스트를 입력하세요"),
});

// 설문 생성 스키마
export const surveyCreateSchema = z.object({
  title: z.string().min(1, "제목을 입력하세요").max(50),
  slug: z.string().min(1).regex(/^[a-z0-9가-힣-]+$/, "slug는 소문자, 숫자, 한글, 하이픈만 허용됩니다"),
  description: z.string().min(1, "설명을 입력하세요"),
  thumbnailUrl: z.string().url().nullable().optional(),
  coverImageUrl: z.string().url().nullable().optional(),
  steps: z.array(surveyStepSchema).min(1, "최소 1개의 스텝이 필요합니다"),
  results: z.array(surveyResultSchema).min(2, "최소 2개의 결과가 필요합니다"),
});

// 설문 수정 스키마
export const surveyUpdateSchema = surveyCreateSchema.partial();

// 상태 변경 스키마
export const statusUpdateSchema = z.object({
  status: z.enum(["DRAFT", "PENDING_REVIEW", "PUBLISHED", "ARCHIVED"]),
});

// 설문 완료 요청 스키마
export const completeRequestSchema = z.object({
  answers: z.record(z.string(), z.string()), // { stepId: optionId }
});

// ===== 광고 스키마 =====

// 광고 생성 스키마
export const adCreateSchema = z.object({
  name: z.string().min(1, "광고명을 입력하세요"),
  slot: z.enum(["SIDEBAR", "ANCHOR", "VIGNETTE"]),
  imageUrl: z.string().url("올바른 이미지 URL을 입력하세요"),
  redirectUrl: z.string().url("올바른 리다이렉트 URL을 입력하세요"),
  imageWidth: z.number().int().positive(),
  imageHeight: z.number().int().positive(),
  startDate: z.string(), // ISO date string
  endDate: z.string(),
  isActive: z.boolean().optional().default(true),
});

// 광고 수정 스키마
export const adUpdateSchema = adCreateSchema.partial();

// ===== 타입 추출 =====
export type SurveyCreateInput = z.infer<typeof surveyCreateSchema>;
export type SurveyUpdateInput = z.infer<typeof surveyUpdateSchema>;
export type StatusUpdateInput = z.infer<typeof statusUpdateSchema>;
export type CompleteRequest = z.infer<typeof completeRequestSchema>;
export type StepOptionInput = z.infer<typeof stepOptionSchema>;
export type SurveyStepInput = z.infer<typeof surveyStepSchema>;
export type SurveyResultInput = z.infer<typeof surveyResultSchema>;
export type AdCreateInput = z.infer<typeof adCreateSchema>;
export type AdUpdateInput = z.infer<typeof adUpdateSchema>;
