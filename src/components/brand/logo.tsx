import Image from "next/image";
import Link from "next/link";

import markOnDark from "@/assets/brand/mark-on-dark.png";
import markOnLight from "@/assets/brand/mark-on-light.png";
import logoOnDark from "@/assets/brand/logo-on-dark.png";
import logoOnLight from "@/assets/brand/logo-on-light.png";

export function BrandMark({
  className = "h-10 w-auto",
  onDark = false,
}: {
  className?: string;
  onDark?: boolean;
}) {
  return (
    <Image
      src={onDark ? markOnDark : markOnLight}
      alt="Auttus"
      className={className}
      unoptimized
      priority
    />
  );
}

export function BrandWordmark({
  className = "h-8 w-auto",
  onDark = false,
}: {
  className?: string;
  onDark?: boolean;
}) {
  return (
    <Image
      src={onDark ? logoOnDark : logoOnLight}
      alt="Auttus"
      className={className}
      unoptimized
      priority
    />
  );
}

export function BrandLink({
  href,
  variant = "default",
}: {
  href: string;
  variant?: "default" | "sidebar" | "compact";
}) {
  if (variant === "compact") {
    return (
      <Link href={href} className="flex items-center transition-opacity duration-200 hover:opacity-90">
        <BrandMark className="h-9 w-auto object-contain" />
      </Link>
    );
  }

  if (variant === "sidebar") {
    return (
      <Link href={href} className="flex items-center transition-opacity duration-200 hover:opacity-90">
        <BrandWordmark onDark className="h-8 w-auto max-w-full object-contain object-left" />
      </Link>
    );
  }

  return (
    <Link href={href} className="flex min-w-0 items-center transition-opacity duration-200 hover:opacity-90">
      <BrandWordmark className="h-9 w-auto max-w-[220px] object-contain object-left" />
    </Link>
  );
}
