import { cn } from "@/lib/utils";
import { IconLoader } from "@/components/icons";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-[var(--shadow-glow)] hover:brightness-110 active:brightness-95",
  secondary: "border border-line bg-white/[0.05] text-mist-100 hover:bg-white/[0.09]",
  ghost: "text-mist-300 hover:bg-white/[0.06] hover:text-mist-100",
  danger: "border border-rose-400/25 bg-rose-400/10 text-rose-300 hover:bg-rose-400/20",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 gap-1.5 rounded-lg px-3.5 text-[13px]",
  md: "h-10 gap-2 rounded-xl px-4.5 text-sm",
  lg: "h-12 gap-2 rounded-xl px-6 text-[15px]",
};

export function buttonStyles(variant: Variant = "primary", size: Size = "md", className?: string): string {
  return cn(
    "inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-45",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

export function Button({ variant = "primary", size = "md", loading = false, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button className={buttonStyles(variant, size, className)} disabled={disabled || loading} {...rest}>
      {loading ? <IconLoader className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}
