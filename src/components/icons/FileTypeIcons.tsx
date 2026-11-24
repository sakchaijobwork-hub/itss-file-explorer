import { useId, type CSSProperties, type ReactNode } from "react";

interface BadgeProps {
  className?: string;
  style?: CSSProperties;
}

function SquircleBadge({
  from,
  to,
  className,
  style,
  children,
}: BadgeProps & { from: string; to: string; children: ReactNode }) {
  const gradId = useId();
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="22" height="22" rx="6" fill={`url(#${gradId})`} />
      {children}
    </svg>
  );
}

function Letter({ text, size = 11, y = 16.5 }: { text: string; size?: number; y?: number }) {
  return (
    <text x="12" y={y} fontSize={size} fontWeight="700" fill="#fff" textAnchor="middle" fontFamily="Arial, sans-serif">
      {text}
    </text>
  );
}

export function WordIcon(props: BadgeProps) {
  return (
    <SquircleBadge from="#4f7fe0" to="#1d4ed8" {...props}>
      <Letter text="W" />
    </SquircleBadge>
  );
}

export function ExcelIcon(props: BadgeProps) {
  return (
    <SquircleBadge from="#34a866" to="#15803d" {...props}>
      <Letter text="X" />
    </SquircleBadge>
  );
}

export function PowerPointIcon(props: BadgeProps) {
  return (
    <SquircleBadge from="#f0724a" to="#c2410c" {...props}>
      <Letter text="P" />
    </SquircleBadge>
  );
}

export function PdfFileIcon(props: BadgeProps) {
  return (
    <SquircleBadge from="#f1534a" to="#b91c1c" {...props}>
      <Letter text="PDF" size={7.3} y={15.5} />
    </SquircleBadge>
  );
}

export function TextFileIcon(props: BadgeProps) {
  return (
    <SquircleBadge from="#5a9ad4" to="#2f6fb0" {...props}>
      <Letter text="TXT" size={7.5} y={15.5} />
    </SquircleBadge>
  );
}

export function CodeFileIcon(props: BadgeProps) {
  return (
    <SquircleBadge from="#4b5668" to="#1f2733" {...props}>
      <path
        d="M9.2 7.5 5.4 12l3.8 4.5M14.8 7.5l3.8 4.5-3.8 4.5"
        fill="none"
        stroke="#7ee787"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SquircleBadge>
  );
}

export function ImageFileIcon(props: BadgeProps) {
  return (
    <SquircleBadge from="#c15fd6" to="#8b2fb0" {...props}>
      <rect x="5.5" y="6" width="13" height="12" rx="1.6" fill="#fff" opacity="0.92" />
      <circle cx="9" cy="9.6" r="1.4" fill="#c15fd6" />
      <path d="M5.5 15.5 9.5 12l3 2.6 2.5-2.2 3.5 3.1v1.1a1.6 1.6 0 0 1-1.6 1.6H7.1a1.6 1.6 0 0 1-1.6-1.6Z" fill="#8b2fb0" />
    </SquircleBadge>
  );
}

export function VideoFileIcon(props: BadgeProps) {
  return (
    <SquircleBadge from="#7c6bff" to="#4327c9" {...props}>
      <path d="M8.5 7.3v9.4a1 1 0 0 0 1.5.86l7.6-4.7a1 1 0 0 0 0-1.72l-7.6-4.7a1 1 0 0 0-1.5.86Z" fill="#fff" />
    </SquircleBadge>
  );
}

export function AudioFileIcon(props: BadgeProps) {
  return (
    <SquircleBadge from="#2dbfb8" to="#0f7d79" {...props}>
      <circle cx="8.5" cy="17" r="2.2" fill="#fff" />
      <circle cx="15.5" cy="15" r="2.2" fill="#fff" />
      <path d="M10.7 17V7.5L17.7 6v9" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </SquircleBadge>
  );
}

export function ArchiveFileIcon(props: BadgeProps) {
  return (
    <SquircleBadge from="#e0a93a" to="#b5780e" {...props}>
      <rect x="5.5" y="6.5" width="13" height="11" rx="1.4" fill="#fff" opacity="0.92" />
      <rect x="10.8" y="6.5" width="2.4" height="2.2" fill="#b5780e" />
      <rect x="10.8" y="10.4" width="2.4" height="2.2" fill="#b5780e" />
      <circle cx="12" cy="14.8" r="1.6" fill="none" stroke="#b5780e" strokeWidth="1.1" />
    </SquircleBadge>
  );
}

export function GenericFileIcon(props: BadgeProps) {
  return (
    <SquircleBadge from="#9aa4b4" to="#6b7585" {...props}>
      <path d="M8 5.5h5l3 3V18a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Z" fill="#fff" opacity="0.95" />
      <path d="M13 5.5v3h3Z" fill="#dde3eb" />
    </SquircleBadge>
  );
}
