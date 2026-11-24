// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import {
  BookOpen,
  Clapperboard,
  Clock,
  CloudRain,
  CloudSun,
  FileSearch,
  FileText,
  Globe,
  Handshake,
  Image as ImageIcon,
  Info,
  Landmark,
  Megaphone,
  Newspaper,
  Plane,
  ShieldCheck,
  Sparkles,
  Tags,
  TrainFront,
  TriangleAlert,
  Video,
  type LucideIcon,
} from 'lucide-react';
import type { Endpoint, SourceKind } from '../data/types';

const ICONS: Record<string, LucideIcon> = {
  Clapperboard,
  Clock,
  CloudRain,
  CloudSun,
  Globe,
  Handshake,
  Info,
  Landmark,
  Megaphone,
  Newspaper,
  Plane,
  ShieldCheck,
  Tags,
  TrainFront,
  TriangleAlert,
};

/** Nombres de icono válidos para `Scenario.icon` (los valida integrity.test.ts). */
export const ICON_NAMES: string[] = Object.keys(ICONS);

export function ScenarioIcon({ name, size = 18 }: { name: string; size?: number }) {
  const C = ICONS[name] ?? Info;
  return <C size={size} strokeWidth={1.9} aria-hidden="true" />;
}

export const ENDPOINT_ICON: Record<Endpoint, LucideIcon> = {
  web: Globe,
  news: Newspaper,
  images: ImageIcon,
  videos: Video,
  browse: FileSearch,
  auto: Sparkles,
};

export const KIND_ICON: Record<SourceKind, LucideIcon> = {
  web: Globe,
  news: Newspaper,
  image: ImageIcon,
  video: Video,
  page: FileText,
  weather: CloudSun,
  timezone: Clock,
  doc: BookOpen,
};

export function EndpointIcon({ endpoint, size = 14 }: { endpoint: Endpoint; size?: number }) {
  const C = ENDPOINT_ICON[endpoint];
  return <C size={size} strokeWidth={2} aria-hidden="true" />;
}

export function SourceKindIcon({ kind, size = 14 }: { kind: SourceKind; size?: number }) {
  const C = KIND_ICON[kind];
  return <C size={size} strokeWidth={2} aria-hidden="true" />;
}

/** Logo de GitHub (Octicons mark-github): lucide-react 1.x ya no incluye logos de marca. */
export function GitHubMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
    </svg>
  );
}

/** Etiqueta de endpoint con su color: web, news, images, videos, browse, auto. */
export function EndpointBadge({ endpoint, small = false }: { endpoint: Endpoint; small?: boolean }) {
  return (
    <span className={`ep ep-${endpoint}${small ? ' sm' : ''}`}>
      <EndpointIcon endpoint={endpoint} size={small ? 11 : 13} />
      {endpoint}
    </span>
  );
}
