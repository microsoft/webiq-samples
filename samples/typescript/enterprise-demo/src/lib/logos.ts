// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { useEffect, useState } from 'react';
import type { BrandId } from '../data/types';

const EXTENSIONS = ['svg', 'png', 'webp', 'jpg', 'jpeg'];
const cache = new Map<string, Promise<string | null>>();

function tryLoad(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth > 0);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

/** Busca un logo en public/logos/<id>.<ext>. */
export function probeLogoFile(id: BrandId): Promise<string | null> {
  const hit = cache.get(id);
  if (hit) return hit;
  const p = (async () => {
    for (const ext of EXTENSIONS) {
      const url = `${import.meta.env.BASE_URL}logos/${id}.${ext}`;
      if (await tryLoad(url)) return url;
    }
    return null;
  })();
  cache.set(id, p);
  return p;
}

export function useLogoSrc(id: BrandId, uploaded?: string): { src: string | null; source: 'upload' | 'file' | 'none' } {
  const [fileSrc, setFileSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!uploaded) {
      probeLogoFile(id).then((src) => {
        if (alive) setFileSrc(src);
      });
    }
    return () => {
      alive = false;
    };
  }, [id, uploaded]);
  if (uploaded) return { src: uploaded, source: 'upload' };
  if (fileSrc) return { src: fileSrc, source: 'file' };
  return { src: null, source: 'none' };
}

/** Lee un fichero de imagen y lo reduce (máx. 560×280) para guardarlo en localStorage. */
export function readLogoFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
      return;
    }
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 560 / img.width, 280 / img.height);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(String(reader.result));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('invalid image'));
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
