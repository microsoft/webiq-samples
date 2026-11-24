// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

export type CodeLang = 'json' | 'bash' | 'python' | 'ts';
/** [texto, clase de token] → clase CSS tk-<clase>. */
export type Tok = [string, string | null];

type Rule = [RegExp, string];

const STR_D = /"(?:[^"\\\n]|\\.)*"/;
const STR_S = /'(?:[^'\\\n]|\\.)*'/;
const NUM = /-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/;

const RULES: Record<Exclude<CodeLang, 'bash'>, Rule[]> = {
  json: [
    [new RegExp(`${STR_D.source}(?=\\s*:)`), 'k'],
    [STR_D, 's'],
    [/\b(?:true|false|null)\b/, 'b'],
    [NUM, 'n'],
  ],
  python: [
    [/#[^\n]*/, 'c'],
    [new RegExp(`${STR_D.source}(?=\\s*:)`), 'k'],
    [STR_D, 's'],
    [STR_S, 's'],
    [/\b(?:import|from|with|as|for|in|if|else|def|return|print)\b/, 'k'],
    [/\b(?:True|False|None)\b/, 'b'],
    [/\b[a-z_][a-z0-9_]*(?==(?!=))/, 'p'],
    [NUM, 'n'],
  ],
  ts: [
    [/\/\/[^\n]*/, 'c'],
    [new RegExp(`(?:${STR_S.source}|${STR_D.source})(?=\\s*:)`), 'k'],
    [STR_S, 's'],
    [STR_D, 's'],
    [/`(?:[^`\\]|\\.)*`/, 's'],
    [/\b(?:import|from|const|let|await|new|for|of|async|function|return|if|else)\b/, 'k'],
    [/\b(?:true|false|null|undefined)\b/, 'b'],
    [/\b[A-Za-z_$][\w$]*(?=\s*:(?!:))/, 'p'],
    [NUM, 'n'],
  ],
};

function tokenize(code: string, rules: Rule[]): Tok[] {
  const re = new RegExp(rules.map(([r]) => `(${r.source})`).join('|'), 'g');
  const toks: Tok[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    if (m[0] === '') {
      re.lastIndex += 1;
      continue;
    }
    if (m.index > last) toks.push([code.slice(last, m.index), null]);
    const g = m.slice(1).findIndex((x) => x !== undefined);
    toks.push([m[0], rules[g][1]]);
    last = re.lastIndex;
  }
  if (last < code.length) toks.push([code.slice(last), null]);
  return toks;
}

/**
 * curl: el cuerpo entre comillas simples se resalta como JSON (también los tramos entre variables '$VAR').
 * Un apóstrofo escapado ('\'') no corta la cadena: si no, el resto del cuerpo se colorearía al revés.
 */
function tokenizeBash(code: string): Tok[] {
  const re = /(#[^\n]*)|('[^']*'(?:\\''[^']*')*)|("(?:[^"\\\n]|\\.)*")|(\$[A-Za-z_]\w*)|((?<=\s)--?[A-Za-z][\w-]*)|\b(curl|npm|az|cp|node)\b/g;
  const toks: Tok[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    if (m.index > last) toks.push([code.slice(last, m.index), null]);
    if (m[1]) toks.push([m[1], 'c']);
    else if (m[2]) {
      const inner = m[2].slice(1, -1);
      toks.push(["'", 'p'], ...(/^\s*[{["]/.test(inner) ? tokenize(inner, RULES.json) : [[inner, 's'] as Tok]), ["'", 'p']);
    } else if (m[3]) toks.push([m[3], 's']);
    else if (m[4]) toks.push([m[4], 'b']);
    else if (m[5]) toks.push([m[5], 'p']);
    else toks.push([m[0], 'k']);
    last = re.lastIndex;
  }
  if (last < code.length) toks.push([code.slice(last), null]);
  return toks;
}

/** Tokens agrupados por línea. */
export function highlight(code: string, lang: CodeLang): Tok[][] {
  const toks = lang === 'bash' ? tokenizeBash(code) : tokenize(code, RULES[lang]);
  const lines: Tok[][] = [[]];
  for (const [text, cls] of toks) {
    text.split('\n').forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part) lines[lines.length - 1].push([part, cls]);
    });
  }
  return lines;
}
