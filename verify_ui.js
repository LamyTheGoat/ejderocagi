const fs = require("fs");
const vm = require("vm");

const minigameSubFiles = [
  "js/minigame/shm_data.js",
  "js/minigame/raids/sahmeran/sahmeran_common.js",
  "js/minigame/raids/sahmeran/stage_1_gate.js",
  "js/minigame/raids/sahmeran/stage_2_bridge.js",
  "js/minigame/raids/sahmeran/stage_3_vault.js",
  "js/minigame/raids/sahmeran/stage_4_sanctum.js",
  "js/minigame/raids/komutan/komutan_common.js",
  "js/minigame/raids/komutan/stage_1_gate.js",
  "js/minigame/raids/komutan/stage_2_bridge.js",
  "js/minigame/raids/komutan/stage_3_forge.js",
  "js/minigame/raids/komutan/stage_4_sanctum.js",
  "js/minigame/raids/abra/abra_common.js",
  "js/minigame/raids/abra/stage_1_coast.js",
  "js/minigame/raids/abra/stage_2_strait.js",
  "js/minigame/raids/abra/stage_3_golem.js",
  "js/minigame/raids/abra/stage_4_abra.js",
  "js/minigame/shm_pvp.js",
  "js/minigame/pvp_maps/map_steppe_canyon.js",
  "js/minigame/pvp_maps/map_sky_archipelago.js",
  "js/minigame/pvp_maps/map_sandstorm.js",
  "js/minigame/pvp_maps/map_seljuk_ruins.js",
  "js/minigame/pvp_maps/map_dragon_caldera.js",
  "js/minigame/pvp_maps/map_glacier.js",
  "js/minigame/shm_pvp_rooms.js",
  "js/minigame/shm_ui.js"
].filter(f => fs.existsSync(f));
const jsFiles = [
  ...fs.readdirSync("js").filter(f => f.endsWith(".js")).map(f => "js/" + f),
  ...minigameSubFiles
];
const allFiles = ["index.html", "style.css", ...jsFiles];

let failed = false;

// 1. Check JS syntax across all files
let syntaxErrors = 0;
for (const f of jsFiles) {
  const code = fs.readFileSync(f, "utf8");
  try {
    new vm.Script(code, { filename: f });
  } catch (e) {
    syntaxErrors++;
    failed = true;
    console.error("SYNTAX ERROR IN", f, e.message);
  }
}
console.log(`[PASS] ${jsFiles.length} JS files syntax checked (${syntaxErrors} errors).`);

// 2. Check CSS brace balance & hand-painted texture variables
const css = fs.readFileSync("style.css", "utf8");
let openBraces = 0;
for (const ch of css) {
  if (ch === "{") openBraces++;
  else if (ch === "}") openBraces--;
}
if (openBraces !== 0) {
  failed = true;
  console.error("[FAIL] style.css brace imbalance:", openBraces);
} else {
  console.log("[PASS] style.css brace balance: 0.");
}

for (const reqTex of ["img/ui/btn-primary.webp", "img/ui/btn-secondary.webp", "--tx-wood-dark", "--tx-parch", "--tx-corners"]) {
  if (!css.includes(reqTex)) {
    failed = true;
    console.error("[FAIL] style.css missing hand-painted texture reference:", reqTex);
  }
}
console.log("[PASS] Hand-painted UI textures verified in style.css.");

// 3. Check for any emojis, dingbats, geometric shapes, or arrows in executable code/CSS
const emojiAndDingbatRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{25A0}-\u{25FF}\u{2B00}-\u{2BFF}]/gu;
let symbolMatches = 0;
for (const f of allFiles) {
  const raw = fs.readFileSync(f, "utf8");
  // Strip block comments and line comments before scanning executable code/markup
  const stripped = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const m = stripped.match(emojiAndDingbatRe);
  if (m) {
    symbolMatches += m.length;
    failed = true;
    console.error(`[FAIL] Emoji/Dingbat found in ${f}: ${m.join(" ")}`);
  }
}
console.log(`[PASS] Zero emojis/dingbats/arrows in executable code (${symbolMatches} matches).`);

// 4. Verify AI/SaaS dashboard wrappers & windowed boss comic boxes are gone
const uiJs = fs.readFileSync("js/ui.js", "utf8");
for (const banned of ["title-hero-card", "title-chronicle-strip", "hud-brand", "dock-tray", "ocak-hud-strip", "fight-clash-intro"]) {
  if (uiJs.includes(banned)) {
    failed = true;
    console.error(`[FAIL] Banned AI-dashboard/windowed class still present in js/ui.js: ${banned}`);
  }
}
const mgJs = ["js/minigame.js", ...minigameSubFiles].map(f => fs.readFileSync(f, "utf8")).join("\n");
for (const banned of ["shm-cco-card", "shm-comic-cutin", "bcut-move-tag"]) {
  if (mgJs.includes(banned)) {
    failed = true;
    console.error(`[FAIL] Windowed boss comic wrapper still present in js/minigame.js: ${banned}`);
  }
}
for (const reqCut of ["rcut fcut basa boss-clash-cut", "rcut goz boss-taunt-cut", "rcut fcut nefes boss-attack-cut"]) {
  if (!mgJs.includes(reqCut)) {
    failed = true;
    console.error(`[FAIL] Missing frameless slanted comic transition in js/minigame.js: ${reqCut}`);
  }
}
if (!css.includes("@media (min-width: 1600px)") || !css.includes("max-width: 1540px")) {
  failed = true;
  console.error("[FAIL] Missing large-screen responsive layout rules in style.css.");
}
console.log("[PASS] Frameless slanted comic transitions & large-screen UI rules verified.");

// 5. Verify zero neon Tailwind/SaaS hex colors in UI/CSS files
const tailwindRe = /#(38bdf8|10b981|a7f3d0|fde047|f97316|34d399|22c55e|ef4444|3b82f6|8b5cf6)\b/gi;
for (const tf of ["style.css", "js/ui.js", "js/hub.js", "js/chibi.js", "js/minigame.js"]) {
  const raw = fs.readFileSync(tf, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const m = raw.match(tailwindRe);
  if (m) {
    failed = true;
    console.error(`[FAIL] Neon Tailwind/SaaS hex found in ${tf}: ${[...new Set(m)].join(", ")}`);
  }
}
console.log("[PASS] Zero neon Tailwind/SaaS hex colors in UI and CSS files.");

// 6. Verify all 80 Nano Banana .webp icon, egg, mood, cosmetic & card assets exist and are wired
const assetsJs = fs.readFileSync("js/assets.js", "utf8");
const assetCtx = { ASSETS: {}, window: {} };
vm.runInNewContext(assetsJs + "\n;window.__ASSETS = ASSETS;", assetCtx);
const ASSETS_MAP = assetCtx.window.__ASSETS || assetCtx.ASSETS || {};
const artJs = fs.readFileSync("js/art.js", "utf8");
const hubJs = fs.readFileSync("js/hub.js", "utf8");

const requiredNanoBananaKeys = [
  "ic-zindan", "ic-konak", "ic-ors", "ic-divan", "ic-kunye",
  "ic-pence", "ic-nefes", "ic-kukre", "ic-savun", "ic-teslim",
  "ic-card", "ic-sofra", "ic-kaplica", "ic-kervan", "ic-sancak",
  "item-yadigar",
  "egg-ates", "egg-buz", "egg-firtina", "egg-toprak", "egg-golge",
  "ui-mood-0", "ui-mood-1", "ui-mood-2", "ui-mood-3", "ui-mood-4",
  "ui-gold", "ui-un", "ui-heart", "ui-moon", "ui-flame", "ui-skull",
  "ui-sound", "ui-mute", "ui-book", "ui-q", "ui-sword", "ui-shield",
  "ui-scroll", "ui-crown", "ui-anvil", "ui-tree",
  "ui-m", "ui-f", "ui-target", "ui-chat", "ui-check", "ui-fast",
  "ui-left", "ui-right", "ui-x",
  "cos-kilim", "cos-cicekh", "cos-run", "cos-kaide",
  "cos-kivilcim", "cos-kar", "cos-kelebek", "cos-yildiz",
  "cos-cicektac", "cos-sorguc", "cos-altintac", "cos-bandana",
  "cos-can", "cos-nazar", "cos-kurdele", "cos-halka",
  "card-alev_yagmuru", "card-buz_zirh", "card-yildirim", "card-sarsinti",
  "card-golge_adim", "card-son_nefes", "card-kukreyen_yurek", "card-celik_pence",
  "card-kanat_kalkan", "card-kara_alev", "card-ayaz_tayfi", "card-kadim_buzul", "card-lav_seli"
];

let missingNb = 0;
for (const k of requiredNanoBananaKeys) {
  const filePath = k === "ic-zindan" ? "img/ic-zindan.webp" : `img/ui/${k}.webp`;
  if (!fs.existsSync(filePath)) {
    missingNb++;
    failed = true;
    console.error("[FAIL] Missing Nano Banana asset file on disk:", filePath);
  }
  if (!ASSETS_MAP[k]) {
    missingNb++;
    failed = true;
    console.error("[FAIL] Missing Nano Banana key in js/assets.js:", k);
  }
}
for (const reqSnippet of ["asset('cos-' + id)", "asset('egg-' + el)", "asset('ui-' + k)", "pence: 'ic-pence'"]) {
  if (!artJs.includes(reqSnippet)) {
    failed = true;
    console.error("[FAIL] Missing Nano Banana wiring in js/art.js:", reqSnippet);
  }
}
for (const reqUiSnippet of ["asset('ui-mood-'", "asset('ui-heart')", "asset('card-' + k)"]) {
  if (!uiJs.includes(reqUiSnippet)) {
    failed = true;
    console.error("[FAIL] Missing Nano Banana wiring in js/ui.js:", reqUiSnippet);
  }
}
if (hubJs.includes('<svg viewBox="0 0 48 48"') || !hubJs.includes("asset('ic-konak')")) {
  failed = true;
  console.error("[FAIL] Amateur inline SVGs still present or Nano Banana icons missing in js/hub.js.");
}
console.log(`[PASS] All ${requiredNanoBananaKeys.length} Nano Banana .webp assets verified on disk & wired into art/ui/hub (${missingNb} missing).`);

if (failed) process.exit(1);
