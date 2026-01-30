import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            children,
            variant = 'primary',
            size = 'md',
            isLoading = false,
            leftIcon,
            rightIcon,
            disabled,
            className = '',
            ...props
        },
        ref
    ) => {
        const baseStyles = `
      inline-flex items-center justify-center gap-2
      font-semibold rounded-xl transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)]
      disabled:opacity-50 disabled:cursor-not-allowed
    `;

        const variants = {
            primary: `
        bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-primary-hover)]
        text-white hover:shadow-[var(--shadow-glow)]
        hover:translate-y-[-1px] active:translate-y-0
        focus:ring-[var(--accent-primary)]
      `,
            secondary: `
        bg-[var(--bg-tertiary)] text-[var(--text-primary)]
        border border-[var(--border-primary)]
        hover:bg-[var(--bg-card-hover)] hover:border-[var(--accent-primary)]
        focus:ring-[var(--border-primary)]
      `,
            ghost: `
        bg-transparent text-[var(--text-secondary)]
        hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]
        focus:ring-[var(--border-primary)]
      `,
            danger: `
        bg-[var(--accent-danger)] text-white
        hover:opacity-90 focus:ring-[var(--accent-danger)]
      `,
        };

        const sizes = {
            sm: 'px-3 py-1.5 text-xs',
            md: 'px-4 py-2.5 text-sm',
            lg: 'px-6 py-3 text-base',
        };

        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
                {...props}
            >
                {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    leftIcon
                )}
                {children}
                {!isLoading && rightIcon}
            </button>
        );
    }
);

Button.displayName = 'Button';

export default Button;
