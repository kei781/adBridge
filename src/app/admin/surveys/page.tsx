'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { SurveyStatus } from '@/generated/prisma';

// 상태 배지 스타일 매핑
const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: '임시저장', className: 'bg-gray-100 text-gray-700' },
  PENDING_REVIEW: { label: '검토중', className: 'bg-yellow-100 text-yellow-700' },
  PUBLISHED: { label: '발행됨', className: 'bg-green-100 text-green-700' },
  ARCHIVED: { label: '보관됨', className: 'bg-red-100 text-red-700' },
};

// 상태 필터 옵션
const statusFilters: { value: string; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'DRAFT', label: '임시저장' },
  { value: 'PENDING_REVIEW', label: '검토중' },
  { value: 'PUBLISHED', label: '발행됨' },
  { value: 'ARCHIVED', label: '보관됨' },
];

// 설문 목록 아이템 타입
interface SurveyListItem {
  id: string;
  title: string;
  slug: string;
  status: SurveyStatus;
  viewCount: number;
  completionCount: number;
  shareCount: number;
  createdAt: string;
  _count: { steps: number; results: number };
}

// 설문 관리 페이지
export default function AdminSurveysPage() {
  const [surveys, setSurveys] = useState<SurveyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // 설문 목록 조회
  const fetchSurveys = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/surveys?${params.toString()}`);
      const json = await res.json();
      setSurveys(json.data ?? []);
    } catch (error) {
      console.error('설문 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  // 검색 제출
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div>
      {/* 페이지 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-xl font-bold">설문 관리</h1>
        <Link
          href="/admin/surveys/new"
          className="inline-flex items-center justify-center px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-hover transition-colors"
        >
          + 새 설문 만들기
        </Link>
      </div>

      {/* 필터 및 검색 */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* 상태 필터 */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                statusFilter === filter.value
                  ? 'bg-primary text-white'
                  : 'bg-white text-muted border border-border hover:bg-gray-50'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* 검색 */}
        <form onSubmit={handleSearch} className="flex gap-2 sm:ml-auto">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="설문 제목 검색..."
            className="px-3 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <button
            type="submit"
            className="px-3 py-1.5 text-sm font-medium bg-white border border-border rounded-lg hover:bg-gray-50 transition-colors"
          >
            검색
          </button>
        </form>
      </div>

      {/* 설문 목록 */}
      {loading ? (
        <div className="text-center py-12 text-muted">불러오는 중...</div>
      ) : surveys.length === 0 ? (
        <div className="text-center py-12 text-muted">
          {search || statusFilter !== 'ALL'
            ? '조건에 맞는 설문이 없습니다.'
            : '아직 설문이 없습니다. 새 설문을 만들어보세요!'}
        </div>
      ) : (
        <>
          {/* 데스크톱 테이블 */}
          <div className="hidden md:block bg-white rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-gray-50">
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted">제목</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted">상태</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted">조회</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted">완료</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted">공유</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted">생성일</th>
                </tr>
              </thead>
              <tbody>
                {surveys.map((survey) => (
                  <tr key={survey.id} className="border-b border-border last:border-b-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/surveys/${survey.id}`}
                        className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                      >
                        {survey.title}
                      </Link>
                      <p className="text-xs text-muted mt-0.5">/{survey.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig[survey.status]?.className ?? ''}`}>
                        {statusConfig[survey.status]?.label ?? survey.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-muted">
                      {survey.viewCount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-muted">
                      {survey.completionCount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-muted">
                      {survey.shareCount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">
                      {formatDate(survey.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 모바일 카드 */}
          <div className="md:hidden space-y-3">
            {surveys.map((survey) => (
              <Link
                key={survey.id}
                href={`/admin/surveys/${survey.id}`}
                className="block bg-white rounded-xl border border-border p-4 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-medium text-foreground">{survey.title}</h3>
                  <span className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig[survey.status]?.className ?? ''}`}>
                    {statusConfig[survey.status]?.label ?? survey.status}
                  </span>
                </div>
                <p className="text-xs text-muted mb-3">/{survey.slug}</p>
                <div className="flex gap-4 text-xs text-muted">
                  <span>조회 {survey.viewCount.toLocaleString()}</span>
                  <span>완료 {survey.completionCount.toLocaleString()}</span>
                  <span>공유 {survey.shareCount.toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted mt-2">{formatDate(survey.createdAt)}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
