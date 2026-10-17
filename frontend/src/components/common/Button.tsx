import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "text" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({
  variant = "secondary",
  className,
  ...buttonProps
}: ButtonProps) {
  const classNames = ["button", `button--${variant}`, className]
    .filter(Boolean)
    .join(" ");

  return <button className={classNames} {...buttonProps} />;
}
