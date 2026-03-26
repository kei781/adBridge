import { ButtonHTMLAttributes, ReactNode } from 'react';

// 버튼 스타일 변형
type ButtonVariant = 'primary' | 'secondary' | 'outline';
// 버튼 크기
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** CTA 강조용 펄스 애니메이션 */
  pulse?: boolean;
  children: ReactNode;
}

// 변형별 스타일
const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-hover active:bg-indigo-700 shadow-sm',
  secondary:
    'bg-gray-100 text-gray-800 hover:bg-gray-200 active:bg-gray-300',
  outline:
    'border border-border text-foreground hover:bg-gray-50 active:bg-gray-100',
};

// 크기별 스타일
const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-md',
  md: 'px-4 py-2 text-base rounded-lg',
  lg: 'px-6 py-3 text-lg rounded-xl',
};

/**
 * 재사용 가능한 버튼 컴포넌트
 * - variant: primary(인디고), secondary(그레이), outline(테두리)
 * - size: sm, md, lg
 * - pulse: CTA 강조 애니메이션
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  pulse = false,
  children,
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <button
      className={`${base} ${variantStyles[variant]} ${sizeStyles[size]} ${pulse && !disabled ? 'animate-pulse' : ''} ${className}`}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
