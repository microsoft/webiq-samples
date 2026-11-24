// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/** localStorage puede no existir o lanzar SecurityError (cookies bloqueadas): la demo funciona igual sin recordar nada. */
export function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
