/**
 * Иконки — вместо эмодзи.
 * Единый набор: обводка 1.75, скруглённые концы, размер по умолчанию 20px.
 * Цвет наследуется от родителя (currentColor).
 */
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: P) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

/* ---------- Навигация ---------- */

export const IconHome = (p: P) => (
  <Svg {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
    <path d="M9.5 21v-6h5v6" />
  </Svg>
);

export const IconCatalog = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="4" width="7" height="7" rx="2" />
    <rect x="14" y="4" width="7" height="7" rx="2" />
    <rect x="3" y="13" width="7" height="7" rx="2" />
    <rect x="14" y="13" width="7" height="7" rx="2" />
  </Svg>
);

export const IconCertificate = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="9" r="5.5" />
    <path d="m8.5 13.5-1 7.5 4.5-2.5 4.5 2.5-1-7.5" />
    <path d="m10 9 1.4 1.4L14 7.8" />
  </Svg>
);

export const IconUser = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="3.75" />
    <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
  </Svg>
);

export const IconBell = (p: P) => (
  <Svg {...p}>
    <path d="M18 9a6 6 0 1 0-12 0c0 4.2-1.5 5.5-2 6.2-.3.4 0 1.05.5 1.05h15c.5 0 .8-.65.5-1.05-.5-.7-2-2-2-6.2Z" />
    <path d="M10 20a2.2 2.2 0 0 0 4 0" />
  </Svg>
);

export const IconSearch = (p: P) => (
  <Svg {...p}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m20 20-4.8-4.8" />
  </Svg>
);

export const IconFilter = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 5.5h17" />
    <path d="M6.5 12h11" />
    <path d="M10 18.5h4" />
  </Svg>
);

export const IconMenu = (p: P) => (
  <Svg {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Svg>
);

export const IconClose = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

/* ---------- Стрелки ---------- */

export const IconChevronDown = (p: P) => (
  <Svg {...p}>
    <path d="m6 9.5 6 6 6-6" />
  </Svg>
);
export const IconChevronRight = (p: P) => (
  <Svg {...p}>
    <path d="m9.5 6 6 6-6 6" />
  </Svg>
);
export const IconChevronLeft = (p: P) => (
  <Svg {...p}>
    <path d="m14.5 6-6 6 6 6" />
  </Svg>
);
export const IconArrowLeft = (p: P) => (
  <Svg {...p}>
    <path d="M20 12H4" />
    <path d="m10 6-6 6 6 6" />
  </Svg>
);
export const IconArrowRight = (p: P) => (
  <Svg {...p}>
    <path d="M4 12h16" />
    <path d="m14 6 6 6-6 6" />
  </Svg>
);
export const IconArrowUp = (p: P) => (
  <Svg {...p}>
    <path d="M12 20V4" />
    <path d="m6 10 6-6 6 6" />
  </Svg>
);
export const IconDownload = (p: P) => (
  <Svg {...p}>
    <path d="M12 3v12" />
    <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
    <path d="M4 20h16" />
  </Svg>
);
export const IconExternal = (p: P) => (
  <Svg {...p}>
    <path d="M14 4h6v6" />
    <path d="M20 4 11 13" />
    <path d="M18 14.5V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 19V8a1.5 1.5 0 0 1 1.5-1.5H10" />
  </Svg>
);

/* ---------- Статусы ---------- */

export const IconCheck = (p: P) => (
  <Svg strokeWidth={2.4} {...p}>
    <path d="m4.5 12.5 5 5 10-11" />
  </Svg>
);

export const IconCheckCircle = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12.2 2.6 2.6L16 9.4" strokeWidth={2} />
  </Svg>
);

export const IconXCircle = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m9 9 6 6M15 9l-6 6" strokeWidth={2} />
  </Svg>
);

export const IconAlert = (p: P) => (
  <Svg {...p}>
    <path d="M12 4.5 21 19.5H3L12 4.5Z" />
    <path d="M12 10v4" strokeWidth={2} />
    <path d="M12 17.2h.01" strokeWidth={2.2} />
  </Svg>
);

export const IconInfo = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11.5v5" strokeWidth={2} />
    <path d="M12 7.8h.01" strokeWidth={2.2} />
  </Svg>
);

export const IconClock = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.75" />
    <path d="M12 7v5.3l3.3 2" strokeWidth={2} />
  </Svg>
);

export const IconLock = (p: P) => (
  <Svg {...p}>
    <rect x="4.5" y="10" width="15" height="10.5" rx="2.5" />
    <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
  </Svg>
);

export const IconStar = ({ filled, ...p }: P & { filled?: boolean }) => (
  <Svg fill={filled ? "currentColor" : "none"} {...p}>
    <path d="m12 3.6 2.6 5.4 5.9.8-4.3 4.1 1.05 5.9L12 17l-5.25 2.8L7.8 13.9 3.5 9.8l5.9-.8L12 3.6Z" />
  </Svg>
);

/* ---------- Контент ---------- */

export const IconPlay = ({ filled = true, ...p }: P & { filled?: boolean }) => (
  <Svg fill={filled ? "currentColor" : "none"} strokeWidth={filled ? 1 : 1.75} {...p}>
    <path d="M8 5.2v13.6l11-6.8L8 5.2Z" />
  </Svg>
);

export const IconPause = (p: P) => (
  <Svg fill="currentColor" strokeWidth={1} {...p}>
    <rect x="6.5" y="5" width="4" height="14" rx="1.4" />
    <rect x="13.5" y="5" width="4" height="14" rx="1.4" />
  </Svg>
);

export const IconVideo = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="5.5" width="13" height="13" rx="3" />
    <path d="m16 11 5-2.8v7.6L16 13" />
  </Svg>
);

export const IconText = (p: P) => (
  <Svg {...p}>
    <path d="M5 6.5h14M5 11h14M5 15.5h9" />
  </Svg>
);

export const IconQuiz = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.6 9.4a2.5 2.5 0 1 1 3.2 2.7c-.5.2-.8.7-.8 1.2v.4" strokeWidth={1.9} />
    <path d="M12 17.2h.01" strokeWidth={2.2} />
  </Svg>
);

export const IconTask = (p: P) => (
  <Svg {...p}>
    <path d="M8 4.5H6.5A1.5 1.5 0 0 0 5 6v13.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H16" />
    <rect x="8" y="3" width="8" height="3.5" rx="1.2" />
    <path d="m9 12.5 2 2 4-4.5" strokeWidth={1.9} />
  </Svg>
);

export const IconFile = (p: P) => (
  <Svg {...p}>
    <path d="M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5L13.5 3Z" />
    <path d="M13.5 3v5.5H19" />
  </Svg>
);

export const IconUpload = (p: P) => (
  <Svg {...p}>
    <path d="M12 16V4" />
    <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
    <path d="M4 15v4a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-4" />
  </Svg>
);

export const IconImage = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="m4.5 17 4.6-4.3 3.4 3 2.6-2.3 4.4 3.9" />
  </Svg>
);

export const IconBook = (p: P) => (
  <Svg {...p}>
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z" />
    <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5v-13Z" />
  </Svg>
);

export const IconGraduation = (p: P) => (
  <Svg {...p}>
    <path d="M12 4 2.5 8.5 12 13l9.5-4.5L12 4Z" />
    <path d="M6.5 10.8V16c0 1.6 2.5 3 5.5 3s5.5-1.4 5.5-3v-5.2" />
    <path d="M21.5 8.5V14" />
  </Svg>
);

export const IconMessage = (p: P) => (
  <Svg {...p}>
    <path d="M20 12.5a7.5 7.5 0 0 1-10.9 6.7L4 20.5l1.4-4.6A7.5 7.5 0 1 1 20 12.5Z" />
  </Svg>
);

export const IconMail = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="m4 7.5 7.1 5.1a1.5 1.5 0 0 0 1.8 0L20 7.5" />
  </Svg>
);

export const IconPhone = (p: P) => (
  <Svg {...p}>
    <rect x="6" y="2.5" width="12" height="19" rx="3" />
    <path d="M10.5 18.5h3" />
  </Svg>
);

export const IconCamera = (p: P) => (
  <Svg {...p}>
    <path d="M4 8.5h3l1.4-2.2h7.2L17 8.5h3a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 18v-8A1.5 1.5 0 0 1 4 8.5Z" />
    <circle cx="12" cy="13.6" r="3.4" />
  </Svg>
);

export const IconEdit = (p: P) => (
  <Svg {...p}>
    <path d="M4 20h4l10.5-10.5a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5 4 20Z" />
    <path d="m14.5 7 2.5 2.5" />
  </Svg>
);

export const IconTrash = (p: P) => (
  <Svg {...p}>
    <path d="M4.5 6.5h15" />
    <path d="M9 6.5V4.8A1.3 1.3 0 0 1 10.3 3.5h3.4A1.3 1.3 0 0 1 15 4.8v1.7" />
    <path d="M6.5 6.5 7.4 20a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-13.5" />
  </Svg>
);

export const IconCopy = (p: P) => (
  <Svg {...p}>
    <rect x="8.5" y="8.5" width="12" height="12" rx="2.5" />
    <path d="M15.5 5.5A2 2 0 0 0 13.5 3.5h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2" />
  </Svg>
);

export const IconLink = (p: P) => (
  <Svg {...p}>
    <path d="M10 13.8a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.6 1.6" />
    <path d="M14 10.2a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.6-1.6" />
  </Svg>
);

export const IconShare = (p: P) => (
  <Svg {...p}>
    <circle cx="17.5" cy="6" r="2.75" />
    <circle cx="6.5" cy="12" r="2.75" />
    <circle cx="17.5" cy="18" r="2.75" />
    <path d="m9 10.7 6-3.4M9 13.3l6 3.4" />
  </Svg>
);

export const IconMore = (p: P) => (
  <Svg strokeWidth={2.4} {...p}>
    <path d="M12 5.5h.01M12 12h.01M12 18.5h.01" />
  </Svg>
);

export const IconDrag = (p: P) => (
  <Svg strokeWidth={2.2} {...p}>
    <path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" />
  </Svg>
);

export const IconPlus = (p: P) => (
  <Svg strokeWidth={2.1} {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const IconLogout = (p: P) => (
  <Svg {...p}>
    <path d="M14 4.5h4A1.5 1.5 0 0 1 19.5 6v12a1.5 1.5 0 0 1-1.5 1.5h-4" />
    <path d="M4.5 12h10" />
    <path d="m10.5 7.5 4.5 4.5-4.5 4.5" />
  </Svg>
);

export const IconSettings = (p: P) => (
  <Svg {...p}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);

export const IconChart = (p: P) => (
  <Svg {...p}>
    <path d="M4 20V4" />
    <path d="M4 20h16" />
    <path d="M8.5 16.5v-5M13 16.5v-9M17.5 16.5v-3" strokeWidth={2.1} />
  </Svg>
);

export const IconUsers = (p: P) => (
  <Svg {...p}>
    <circle cx="9.5" cy="8.5" r="3.2" />
    <path d="M3.5 19.5a6 6 0 0 1 12 0" />
    <path d="M16.5 6.2a3 3 0 0 1 0 5.8" />
    <path d="M17.5 14.4a5.5 5.5 0 0 1 3.5 5.1" />
  </Svg>
);

export const IconInbox = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 13.5h4l1.2 2.6h6.6l1.2-2.6h4" />
    <path d="M5.6 4.5h12.8a1.5 1.5 0 0 1 1.42 1.02l1.68 7.98v4.5a1.5 1.5 0 0 1-1.5 1.5h-15a1.5 1.5 0 0 1-1.5-1.5v-4.5l1.68-7.98A1.5 1.5 0 0 1 5.6 4.5Z" />
  </Svg>
);

export const IconLayers = (p: P) => (
  <Svg {...p}>
    <path d="m12 3 8.5 4.5L12 12 3.5 7.5 12 3Z" />
    <path d="m3.5 12.5 8.5 4.5 8.5-4.5" />
    <path d="m3.5 17 8.5 4.5 8.5-4.5" />
  </Svg>
);

export const IconGlobe = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3.2 9.5h17.6M3.2 14.5h17.6" />
    <path d="M12 3c-4.5 5.2-4.5 12.8 0 18 4.5-5.2 4.5-12.8 0-18Z" />
  </Svg>
);

export const IconVolume = (p: P) => (
  <Svg {...p}>
    <path d="M11 5.5 6.5 9H3.5v6h3l4.5 3.5v-13Z" />
    <path d="M15 9.5a3.5 3.5 0 0 1 0 5M17.8 7a7 7 0 0 1 0 10" />
  </Svg>
);

export const IconSubtitles = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="M7 14h4M14 14h3" strokeWidth={2} />
  </Svg>
);

export const IconFullscreen = (p: P) => (
  <Svg {...p}>
    <path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9" />
    <path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9" />
    <path d="M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15" />
    <path d="M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15" />
  </Svg>
);

export const IconMinimize = (p: P) => (
  <Svg {...p}>
    <path d="M9 4v3.5A1.5 1.5 0 0 1 7.5 9H4" />
    <path d="M20 9h-3.5A1.5 1.5 0 0 1 15 7.5V4" />
    <path d="M15 20v-3.5a1.5 1.5 0 0 1 1.5-1.5H20" />
    <path d="M4 15h3.5A1.5 1.5 0 0 1 9 16.5V20" />
  </Svg>
);

export const IconRewind = (p: P) => (
  <Svg {...p}>
    <path d="M4 5.5v5h5" />
    <path d="M4.6 10.5a8 8 0 1 1 .6 5.5" />
  </Svg>
);

export const IconForward = (p: P) => (
  <Svg {...p}>
    <path d="M20 5.5v5h-5" />
    <path d="M19.4 10.5a8 8 0 1 0-.6 5.5" />
  </Svg>
);

export const IconShield = (p: P) => (
  <Svg {...p}>
    <path d="M12 3 5 6v6c0 4.4 3 8.1 7 9 4-.9 7-4.6 7-9V6l-7-3Z" />
    <path d="m9.2 12 2 2 3.6-3.8" strokeWidth={1.9} />
  </Svg>
);

export const IconQr = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <path d="M13.5 13.5h3v3h-3zM20.5 13.5v3M17.5 20.5h3M13.5 20.5h1" strokeWidth={1.9} />
  </Svg>
);

export const IconSparkle = (p: P) => (
  <Svg {...p}>
    <path d="M12 3.5 13.8 9 19 10.8 13.8 12.6 12 18l-1.8-5.4L5 10.8 10.2 9 12 3.5Z" />
    <path d="M18.5 16.5 19.2 18.6l2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7.7-2.1Z" />
  </Svg>
);

export const IconTrendUp = (p: P) => (
  <Svg strokeWidth={2} {...p}>
    <path d="m4 16 5-5 3.5 3.5L20 7.5" />
    <path d="M15 7.5h5v5" />
  </Svg>
);

export const IconTrendDown = (p: P) => (
  <Svg strokeWidth={2} {...p}>
    <path d="m4 8 5 5 3.5-3.5L20 16.5" />
    <path d="M15 16.5h5v-5" />
  </Svg>
);

export const IconEye = (p: P) => (
  <Svg {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);

export const IconEyeOff = (p: P) => (
  <Svg {...p}>
    <path d="M4 4l16 16" />
    <path d="M9.9 5.8A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3.2 4.1" />
    <path d="M6.5 7.9A16.6 16.6 0 0 0 2.5 12S6 18.5 12 18.5c1.2 0 2.3-.2 3.3-.6" />
    <path d="M10 10.2a3 3 0 0 0 4 4.1" />
  </Svg>
);

export const IconCalendar = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Svg>
);

export const IconBold = (p: P) => (
  <Svg strokeWidth={2.1} {...p}>
    <path d="M7 4.5h6a3.75 3.75 0 0 1 0 7.5H7z" />
    <path d="M7 12h7a3.75 3.75 0 0 1 0 7.5H7z" />
  </Svg>
);
export const IconItalic = (p: P) => (
  <Svg strokeWidth={2.1} {...p}>
    <path d="M15 4.5h-5M14 19.5H9M13.5 4.5 10.5 19.5" />
  </Svg>
);
export const IconList = (p: P) => (
  <Svg {...p}>
    <path d="M9 6.5h11M9 12h11M9 17.5h11" />
    <path d="M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" strokeWidth={2.4} />
  </Svg>
);
export const IconQuote = (p: P) => (
  <Svg {...p}>
    <path d="M9.5 6.5C7 7.5 5.5 9.5 5.5 12v5.5h5V12h-3c0-2 .8-3.3 2.6-4.1l-.6-1.4Z" />
    <path d="M18 6.5c-2.5 1-4 3-4 5.5v5.5h5V12h-3c0-2 .8-3.3 2.6-4.1L18 6.5Z" />
  </Svg>
);
export const IconTable = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <path d="M3.5 9.5h17M9.5 9.5v10" />
  </Svg>
);
export const IconHeading = (p: P) => (
  <Svg strokeWidth={2.1} {...p}>
    <path d="M6 5v14M16 5v14M6 12h10" />
  </Svg>
);

/* ---------- Каналы связи с администратором ---------- */

export const IconWhatsapp = (p: P) => (
  <Svg {...p}>
    <path d="M20.5 11.7a8.5 8.5 0 0 1-12.6 7.5L3.5 20.5l1.4-4.3A8.5 8.5 0 1 1 20.5 11.7Z" />
    <path d="M9 9.2c.3-.7.6-.8 1-.8h.6c.2 0 .4 0 .6.5l.6 1.5c0 .2 0 .4-.1.5l-.5.6c-.1.2-.2.3 0 .6a6 6 0 0 0 2.7 2.3c.3.1.4 0 .6-.1l.6-.7c.2-.2.3-.2.5-.1l1.5.7c.2.1.4.2.4.4a2 2 0 0 1-1.4 1.7c-.7.2-1.7.1-3.4-.7a9.4 9.4 0 0 1-3.9-4c-.4-.9-.5-1.9-.2-2.4Z" />
  </Svg>
);

export const IconTelegram = (p: P) => (
  <Svg {...p}>
    <path d="M21 4.5 2.8 11.4c-.6.2-.6 1 0 1.2l4.6 1.4 1.7 5c.2.6 1 .7 1.4.2l2.3-2.5 4.4 3.3c.5.4 1.2.1 1.3-.5L21.9 5.3c.1-.6-.4-1-1-.8Z" />
    <path d="m7.4 14 12-8.3-8.1 9" />
  </Svg>
);

export const IconRefresh = (p: P) => (
  <Svg {...p}>
    <path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1" />
    <path d="M20.8 4.2v5h-5" />
  </Svg>
);

export const IconKey = (p: P) => (
  <Svg {...p}>
    <circle cx="8" cy="14" r="4.5" />
    <path d="m11.4 11 8.1-8.1" />
    <path d="m16.5 6 2 2" />
    <path d="m14 8.5 2 2" />
  </Svg>
);

export const IconWallet = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="6" width="18" height="14" rx="3" />
    <path d="M3 10h18" />
    <circle cx="16.5" cy="15" r="1.2" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconDevice = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="4" width="13" height="10" rx="2" />
    <path d="M1.5 18h13" />
    <rect x="17" y="9" width="5.5" height="11" rx="1.6" />
  </Svg>
);

