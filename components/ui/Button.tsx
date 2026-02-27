"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      disabled,
      children,
      className = "",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-display font-semibold rounded-lg transition-all duration-200 ease-out cursor-pointer disabled:cursor-not-allowed";

    const variants = {
      primary:
        "bg-primary text-white shadow-md hover:bg-primary-dark hover:shadow-lg hover:-translate-y-px active:bg-[#1F5341] active:shadow-sm active:translate-y-0 disabled:bg-text-tertiary disabled:text-white disabled:shadow-none disabled:translate-y-0",
      secondary:
        "bg-white text-secondary border border-border/60 shadow-sm hover:bg-secondary-light hover:shadow active:bg-secondary-light/70",
      ghost:
        "bg-transparent text-secondary hover:bg-bg-subtle active:bg-border",
      danger:
        "bg-transparent text-accent border border-accent/30 shadow-sm hover:bg-accent/5 active:bg-accent/10",
    };

    const sizes = {
      sm: "px-4 py-2 text-sm",
      md: "px-6 py-3 text-base",
      lg: "px-8 py-3.5 text-base",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${
          fullWidth ? "w-full" : ""
        } ${className}`}
        {...props}
      >
        {loading && <Loader2 size={18} className="mr-2 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
