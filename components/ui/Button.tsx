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
        "bg-primary text-white hover:bg-primary-dark active:bg-[#1F5341] disabled:bg-text-tertiary disabled:text-white",
      secondary:
        "bg-transparent text-secondary border border-border hover:bg-secondary-light active:bg-secondary-light/70",
      ghost:
        "bg-transparent text-secondary hover:bg-bg-subtle active:bg-border",
      danger:
        "bg-transparent text-error border border-error/30 hover:bg-error/5 active:bg-error/10",
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
