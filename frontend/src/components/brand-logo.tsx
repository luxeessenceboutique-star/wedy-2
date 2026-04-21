import logo from "@/assets/yodabot-logo.png";

interface Props {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const SIZES = {
  sm: "h-7",
  md: "h-9",
  lg: "h-12",
  xl: "h-20",
};

export function BrandLogo({ className = "", size = "md" }: Props) {
  return (
    <img
      src={logo}
      alt="YODABOT"
      className={`${SIZES[size]} w-auto object-contain ${className}`}
    />
  );
}
