"use client";

import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-text"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full px-4 py-3 border border-transparent rounded-lg font-sans text-base text-text placeholder:text-text-tertiary bg-bg-subtle transition-all duration-200 focus:outline-none focus:bg-bg-card focus:border-border focus:ring-2 focus:ring-primary-light focus:shadow-sm ${
            error ? "border-accent focus:border-accent focus:ring-accent/20" : ""
          } ${className}`}
          {...props}
        />
        {error && <p className="text-sm text-warm-text">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-text"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={`w-full px-5 py-4 border border-border/30 rounded-2xl font-sans text-base leading-relaxed text-text placeholder:text-text-tertiary/60 placeholder:leading-relaxed bg-white shadow-md ring-1 ring-black/[0.03] transition-all duration-300 resize-none focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary-light focus:shadow-lg focus:-translate-y-0.5 min-h-[200px] ${
            error ? "border-accent focus:border-accent focus:ring-accent/20" : ""
          } ${className}`}
          {...props}
        />
        {error && <p className="text-sm text-warm-text">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
