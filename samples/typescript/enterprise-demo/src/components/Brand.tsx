// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { clientById } from '../data/clients';
import type { BrandId } from '../data/types';
import { contrastText } from '../lib/color';
import { useLogoSrc } from '../lib/logos';
import { clientAccent, clientName, type Settings } from '../lib/settings';

/** Marca de la demo: un globo con un destello, sobre el color de acento. */
export function WebIQMark({ size = 30 }: { size?: number }) {
  return (
    <span className="webiq-mark" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 32 32" width={size * 0.74} height={size * 0.74} fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round">
        <circle cx="13.5" cy="18" r="9.5" />
        <path d="M4 18h19" />
        <path d="M13.5 8.5c-2.9 2.6-4.3 5.8-4.3 9.5s1.4 6.9 4.3 9.5" />
        <path d="M13.5 8.5c2.9 2.6 4.3 5.8 4.3 9.5s-1.4 6.9-4.3 9.5" />
        <path d="M25.5 2l1.3 3.2 3.2 1.3-3.2 1.3-1.3 3.2-1.3-3.2-3.2-1.3 3.2-1.3z" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}

interface LogoProps {
  id: BrandId;
  settings: Settings;
  height?: number;
  withName?: boolean;
  className?: string;
}

/** Logo del cliente: subido → public/logos → monograma con el color de marca. */
export function ClientLogo({ id, settings, height = 24, withName = false, className = '' }: LogoProps) {
  const { src } = useLogoSrc(id, settings.logos[id]);
  const name = clientName(settings, id);
  const accent = clientAccent(settings, id);
  if (src) {
    return (
      <span className={`client-logo ${className}`}>
        <img src={src} alt={name} style={{ height, maxWidth: height * 5 }} />
        {withName && <span className="client-logo-name">{name}</span>}
      </span>
    );
  }
  const mono = id === 'custom' ? name.slice(0, 3).toUpperCase() : clientById(id).monogram;
  return (
    <span className={`client-logo ${className}`} title={name}>
      <span
        className="monogram"
        style={{ height, minWidth: height, background: accent, color: contrastText(accent), fontSize: Math.max(9, height * 0.4) }}
      >
        {mono}
      </span>
      {withName && <span className="client-logo-name">{name}</span>}
    </span>
  );
}
