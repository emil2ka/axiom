import { cn } from "@/lib/utils";
import { IconLoader } from "@/components/icons";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-mist-50 text-ink-950 hover:bg-white active:bg-mist-100",
  secondary: "border border-line bg-white/[0.04] text-mist-100 hover:bg-white/[0.08] hover:border-mist-500/50",
  ghost: "text-mist-300 hover:bg-white/[0.05] hover:text-mist-50",
  danger: "border border-rose-400/30 bg-transparent text-rose-300 hover:bg-rose-400/10",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 gap-1.5 rounded-full px-4 text-[13px]",
  md: "h-10 gap-2 rounded-full px-4.5 text-sm",
  lg: "h-12 gap-2 rounded-full px-6 text-[15px]",
};

export function buttonStyles(variant: Variant = "primary", size: Size = "md", className?: string): string {
  return cn(
    "inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-colors duration-200 disabled:pointer-events-none disabled:opacity-45",
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
