/**
 * 트위터 공유 URL 생성
 */
export function getTwitterShareUrl(text: string, url: string): string {
  const params = new URLSearchParams({ text, url });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

/**
 * 페이스북 공유 URL 생성
 */
export function getFacebookShareUrl(url: string): string {
  const params = new URLSearchParams({ u: url });
  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
}

/**
 * 클립보드에 텍스트 복사
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 폴백: textarea를 이용한 복사
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand("copy");
    document.body.removeChild(textarea);
    return success;
  }
}

/**
 * OG 이미지 URL 생성
 */
export function getOgImageUrl(
  baseUrl: string,
  slug: string,
  resultKey: string
): string {
  return `${baseUrl}/api/og/${slug}/${resultKey}`;
}

/**
 * 결과 페이지 URL 생성
 */
export function getResultPageUrl(
  baseUrl: string,
  slug: string,
  resultKey: string
): string {
  return `${baseUrl}/survey/${slug}/result/${resultKey}`;
}
