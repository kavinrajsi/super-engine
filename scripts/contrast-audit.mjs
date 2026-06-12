// WCAG color-contrast audit for our own UI tokens.
//   node scripts/contrast-audit.mjs
//
// The dashboard is token-driven, so every button/text color resolves to a CSS
// variable in src/app/globals.css. This parses the :root (light) and .dark
// blocks, converts oklch/hex -> sRGB, composites the Tailwind `/NN` tints, and
// reports WCAG AA/AAA pass-fail for the real foreground/background pairs.
// Exits non-zero if any pair fails AA (so it doubles as a re-run gate).

import { readFileSync } from "node:fs";

const CSS = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

// ---- color math (all internal colors are sRGB gamma, channels 0..1) ----
const clamp01 = (x) => Math.min(1, Math.max(0, x));

function gammaEncode(c) {
  c = clamp01(c);
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}
function linearize(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

// oklch(L C H) -> sRGB gamma {r,g,b} (Björn Ottosson)
function oklchToRgb(L, C, H) {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return { r: gammaEncode(r), g: gammaEncode(g), b: gammaEncode(bl) };
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return {
    r: parseInt(n.slice(0, 2), 16) / 255,
    g: parseInt(n.slice(2, 4), 16) / 255,
    b: parseInt(n.slice(4, 6), 16) / 255,
  };
}

// Parse a CSS color value -> { r,g,b,a } (gamma sRGB). Handles oklch(...),
// optional "/ NN%" alpha, and #hex.
function parseColor(value) {
  const v = value.trim();
  if (v.startsWith("#")) return { ...hexToRgb(v), a: 1 };
  const m = /^oklch\(\s*([^)]+)\)$/i.exec(v);
  if (m) {
    let [coords, alpha] = m[1].split("/").map((s) => s.trim());
    const parts = coords.split(/\s+/).map((x) => parseFloat(x));
    const [L, C, H] = [parts[0], parts[1] || 0, parts[2] || 0];
    const a = alpha ? (alpha.endsWith("%") ? parseFloat(alpha) / 100 : parseFloat(alpha)) : 1;
    return { ...oklchToRgb(L, C, H), a };
  }
  return null;
}

// Composite a (possibly translucent) color over an opaque base (gamma space —
// matches browser compositing closely enough for audit purposes).
function over(top, base) {
  const a = top.a ?? 1;
  return {
    r: top.r * a + base.r * (1 - a),
    g: top.g * a + base.g * (1 - a),
    b: top.b * a + base.b * (1 - a),
    a: 1,
  };
}

function luminance({ r, g, b }) {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}
function contrast(fg, bg) {
  const a = luminance(fg), b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// ---- parse globals.css token blocks ----
function tokensIn(blockRe) {
  const block = blockRe.exec(CSS)?.[1] || "";
  const out = {};
  for (const m of block.matchAll(/(--[\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}
const LIGHT = tokensIn(/:root\s*\{([\s\S]*?)\}/);
// .dark only redefines some tokens; the rest cascade down from :root.
const DARK = { ...LIGHT, ...tokensIn(/\.dark\s*\{([\s\S]*?)\}/) };

// Resolve a token name (without --) to a color, following one var() hop.
function resolve(theme, name) {
  let v = theme[`--${name}`];
  if (!v) return null;
  const varMatch = /^var\(--([\w-]+)\)$/.exec(v);
  if (varMatch) v = theme[`--${varMatch[1]}`];
  return parseColor(v);
}

// Apply Tailwind `/NN` opacity to a token color.
function alpha(color, pct) {
  return { ...color, a: pct / 100 };
}

// ---- the pairs every button/text in the app reduces to ----
// kind: "text" (AA 4.5 / AAA 7) or "large" (AA 3 / AAA 4.5) or "ui" (AA 3).
function buildPairs(theme) {
  const c = (n) => resolve(theme, n);
  const bg = c("background");
  const P = [];
  const add = (label, fg, on, kind = "text") => P.push({ label, fg, bg: on, kind });

  // Body + secondary text
  add("foreground / background", c("foreground"), bg);
  add("muted-foreground / background", c("muted-foreground"), bg);
  add("muted-foreground / card", c("muted-foreground"), c("card"));
  add("muted-foreground / muted", c("muted-foreground"), c("muted"));
  add("card-foreground / card", c("card-foreground"), c("card"));
  add("popover-foreground / popover", c("popover-foreground"), c("popover"));
  add("secondary-foreground / secondary", c("secondary-foreground"), c("secondary"));
  add("accent-foreground / accent", c("accent-foreground"), c("accent"));
  add("sidebar-foreground / sidebar", c("sidebar-foreground"), c("sidebar"));
  add("sidebar-accent-foreground / sidebar-accent", c("sidebar-accent-foreground"), c("sidebar-accent"));

  // Inline accent / links (text-primary-link + base `a`)
  add("primary-link / background", c("primary-link"), bg);
  add("primary-link / card", c("primary-link"), c("card"));

  // Status text, on background and on the /10 tint it sits on
  for (const s of ["warning", "error", "pass", "info"]) {
    const col = c(s);
    if (!col) continue;
    add(`${s} text / background`, col, bg);
    add(`${s} text / ${s}-10 tint`, col, over(alpha(col, 10), bg));
  }

  // Buttons
  add("button default: primary-fg / primary", c("primary-foreground"), c("primary"), "text"); // small/medium label = normal text
  add("button secondary: secondary-fg / secondary", c("secondary-foreground"), c("secondary"), "text"); // small/medium label = normal text
  add("button outline/ghost: foreground / background", c("foreground"), bg, "text"); // small/medium label = normal text
  add("button ghost hover: foreground / muted", c("foreground"), c("muted"), "text"); // small/medium label = normal text
  add("button destructive: destructive / destructive-10", c("destructive"), over(alpha(c("destructive"), 10), bg));
  add("button link: primary-link / background", c("primary-link"), bg);

  // Badges
  add("badge default: primary-fg / primary", c("primary-foreground"), c("primary"), "text"); // small/medium label = normal text
  add("badge destructive: destructive / destructive-10", c("destructive"), over(alpha(c("destructive"), 10), bg));
  add("badge outline: foreground / background", c("foreground"), bg, "text"); // small/medium label = normal text

  return P;
}

const AA = { text: 4.5, large: 3, ui: 3 };
const AAA = { text: 7, large: 4.5, ui: 3 };

let failures = 0;
for (const [name, theme] of [["LIGHT", LIGHT], ["DARK", DARK]]) {
  console.log(`\n=== ${name} THEME ===`);
  console.log("ratio   AA   AAA  pair");
  for (const p of buildPairs(theme)) {
    if (!p.fg || !p.bg) {
      console.log(`  ??         missing token: ${p.label}`);
      continue;
    }
    const r = contrast(p.fg, p.bg);
    const aa = r >= AA[p.kind];
    const aaa = r >= AAA[p.kind];
    if (!aa) failures++;
    const flag = aa ? "PASS" : "FAIL";
    console.log(
      `${r.toFixed(2).padStart(5)}  ${flag.padEnd(4)} ${(aaa ? "AAA" : "—").padEnd(3)}  ${p.label} [${p.kind}]`
    );
  }
}

console.log(`\n${failures === 0 ? "✓ All pairs pass WCAG AA." : `✗ ${failures} pair(s) fail WCAG AA.`}`);
process.exit(failures === 0 ? 0 : 1);
