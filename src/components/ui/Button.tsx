import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
    loading?: boolean;
}

export function Button({
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    className,
    children,
    disabled,
    ...props
}: ButtonProps) {
    const base = 'inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-150 select-none disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
        primary: 'bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white shadow-sm',
        secondary: 'bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800',
        ghost: 'bg-transparent hover:bg-gray-100 active:bg-gray-200 text-gray-700',
        danger: 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white',
    };

    const sizes = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg',
    };

    return (
        <button
            className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    처리중...
                </span>
            ) : children}
        </button>
    );
}
