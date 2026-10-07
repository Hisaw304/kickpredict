const COMMON_REPLACEMENTS = [
  // Time
  [/\btonite\b/gi, "tonight"],
  [/\btonightt\b/gi, "tonight"],
  [/\btomorow\b/gi, "tomorrow"],
  [/\btommorow\b/gi, "tomorrow"],
  [/\btomorroww\b/gi, "tomorrow"],
  [/\btmrw\b/gi, "tomorrow"],
  [/\b2moro\b/gi, "tomorrow"],
  [/\b2morrow\b/gi, "tomorrow"],
  [/\bwknd\b/gi, "weekend"],

  // Confidence
  [/\bsaf\b/gi, "safe"],
  [/\bsafestt\b/gi, "safest"],
  [/\bstron\b/gi, "strong"],
  [/\bstrng\b/gi, "strong"],

  // Picks
  [/\bpiks\b/gi, "picks"],
  [/\bpickss\b/gi, "picks"],
  [/\bpredictons\b/gi, "predictions"],
  [/\btipsy\b/gi, "tips"],

  // Double chance
  [/\bdouble\s+chan[cs]e\b/gi, "double chance"],
  [/\bdouble\s+chances\b/gi, "double chance"],
  [/\bduble\s+chance\b/gi, "double chance"],
  [/\bdc\b/gi, "double chance"],

  // BTTS
  [/\bbtss\b/gi, "btts"],
  [/\bbts\b/gi, "btts"],
  [/\bbth\s+teams\s+to\s+score\b/gi, "both teams to score"],
  [/\bboth\s+team\s+to\s+score\b/gi, "both teams to score"],

  // Common football wording
  [/\bhome\s+team\s+win\b/gi, "home win"],
  [/\bhome\s+team\s+to\s+win\b/gi, "home win"],
  [/\baway\s+team\s+win\b/gi, "away win"],
  [/\baway\s+team\s+to\s+win\b/gi, "away win"],

  // League typos
  [/\bpremier\s+leauge\b/gi, "premier league"],
  [/\bprem\s+league\b/gi, "premier league"],
  [/\bpremeir\s+league\b/gi, "premier league"],

  [/\bla\s+leauge\b/gi, "la liga"],
  [/\bla\s+liga\s+liga\b/gi, "la liga"],

  [/\bbundesligaa\b/gi, "bundesliga"],
  [/\bserie\s+a+\b/gi, "serie a"],
  [/\bligue\s+1+\b/gi, "ligue 1"],

  // Over / under shorthand
  [/\bo\s*1\.5\b/gi, "over 1.5"],
  [/\bo\s*2\.5\b/gi, "over 2.5"],
  [/\bo\s*3\.5\b/gi, "over 3.5"],

  [/\bu\s*1\.5\b/gi, "under 1.5"],
  [/\bu\s*2\.5\b/gi, "under 2.5"],
  [/\bu\s*3\.5\b/gi, "under 3.5"],
];

export function normalizeQuery(query) {
  let text = String(query || "")
    .trim()
    .replace(/\s+/g, " ");

  for (const [pattern, replacement] of COMMON_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }

  return text.replace(/\s+/g, " ").trim();
}
