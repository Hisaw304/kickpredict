import OpenAI from "openai";
import { z } from "zod/v4";
import { zodTextFormat } from "openai/helpers/zod";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/*
 * These are the ONLY values the interpreter is allowed
 * to return for prediction markets.
 *
 * Keep these synchronized with src/lib/prediction/markets.js.
 */
const Market = z.enum([
  "home_win",
  "draw",
  "away_win",

  "double_chance_1x",
  "double_chance_x2",
  "double_chance_12",

  "over_1_5",
  "over_2_5",
  "over_3_5",

  "under_1_5",
  "under_2_5",
  "under_3_5",

  "btts_yes",
  "btts_no",

  "home_over_0_5",
  "home_over_1_5",

  "away_over_0_5",
  "away_over_1_5",
]);

const League = z.enum(["PL", "PD", "BL1", "SA", "FL1", "CL"]);

const Confidence = z.enum(["high", "medium_high", "standard", "aggressive"]);

const RequestType = z.enum(["picks", "odds"]);

const Intent = z.enum(["prediction_request", "clarification", "unknown"]);

const PredictionIntent = z.object({
  intent: Intent.describe("The user's overall intent."),

  requestType: RequestType.describe(
    "Whether the user wants prediction picks or odds/accumulator-style output."
  ),

  count: z
    .number()
    .int()
    .min(1)
    .max(20)
    .describe(
      "Number of requested picks. Default to 5 when the user does not specify a number."
    ),

  confidence: Confidence.describe(
    "Requested risk/confidence level. Safe, sure, safest, strong, or high-confidence means high."
  ),

  market: Market.nullable().describe(
    "The exact canonical prediction market. Null when the user did not specify a market or the market is ambiguous."
  ),

  league: League.nullable().describe(
    "The requested competition code. Null when no specific league was requested."
  ),

  timeWindow: z
    .string()
    .nullable()
    .describe(
      "Natural-language time window such as tonight, today, tomorrow, this weekend, or next week. Null when no time window is specified."
    ),

  dateFrom: z
    .string()
    .nullable()
    .describe(
      "Resolved start date in YYYY-MM-DD format when it can be determined from the current date."
    ),

  dateTo: z
    .string()
    .nullable()
    .describe(
      "Resolved end date in YYYY-MM-DD format when it can be determined from the current date."
    ),

  needsClarification: z
    .boolean()
    .describe(
      "True when the user's request is ambiguous enough that the prediction system should not guess."
    ),

  clarification: z
    .string()
    .nullable()
    .describe("One short clarification question when needed. Null otherwise."),
});

function buildSystemPrompt(now) {
  return `
You are the natural-language interpreter for KickPredict, a football prediction platform.

Your job is NOT to make predictions.

Your job is to understand what the user wants and convert their message into a strict structured prediction request.

CURRENT DATE AND TIME:
${now}

IMPORTANT RULES:

1. Understand natural human language.

Users may:
- make spelling mistakes
- use slang
- use abbreviations
- use shorthand
- mix informal language
- use Nigerian/West African conversational expressions
- omit words
- write things like "tonite", "tingh", "tmrw", "o2.5", "u1.5", "dc", "btts", etc.

Interpret these when the intended meaning is clear.

2. Do NOT invent missing information.

For example:

"give me sure 2.5 tonight"

is ambiguous.

"2.5" alone does NOT tell you whether the user means Over 2.5 or Under 2.5.

Return:

market: null
needsClarification: true

and ask:

"Do you mean Over 2.5 or Under 2.5?"

3. Explicit market instructions always take priority.

Examples:

"over 2.5"
=> over_2_5

"under 2.5"
=> under_2_5

"o2.5"
=> over_2_5

"u2.5"
=> under_2_5

"over two point five"
=> over_2_5

"under two point five"
=> under_2_5

4. Double chance:

"double chance"
without a specific selection means the market is ambiguous between:
- double_chance_1x
- double_chance_x2
- double_chance_12

In that situation, do NOT invent one.

Set market to null and request clarification.

"1X"
=> double_chance_1x

"X2"
=> double_chance_x2

"12"
=> double_chance_12

5. BTTS:

"BTTS"
"both teams to score"
=> btts_yes

"BTTS no"
"both teams not to score"
=> btts_no

6. Confidence:

"safe"
"sure"
"safest"
"strong"
"strongest"
"high confidence"
"confident"
=> high

"best"
"top"
"good"
"recommended"
"quality"
=> medium_high

"risky"
"riskier"
"aggressive"
"longshot"
"long shot"
=> aggressive

If no confidence language is present:
=> standard

7. Count:

If the user says:

"give me 10 picks"
=> 10

"find five safe games"
=> 5

If no count is specified:
=> 5

8. Date interpretation:

Understand phrases such as:

tonight
today
tomorrow
tomorrow morning
tomorrow afternoon
tomorrow evening
this weekend
next week

Also tolerate obvious spelling mistakes such as:

tonite
tonightt
tingh
tmrw
tomorow
tommorow
wknd

Use the current date/time supplied above to resolve dateFrom and dateTo.

9. Leagues:

Premier League / EPL => PL
La Liga => PD
Bundesliga => BL1
Serie A => SA
Ligue 1 => FL1
Champions League / UCL => CL

Tolerate obvious spelling mistakes.

10. Do not confuse football teams with leagues.

If a user names a team such as Arsenal, Liverpool, Barcelona, etc., do not put the team name into league.

Team-specific interpretation will be added separately later.

11. The prediction engine is deterministic.

Never return:
- probabilities
- expected goals
- predicted scores
- fixture names
- invented matches
- bookmaker odds
- betting recommendations

Only interpret the request.

12. If the user is clearly asking for predictions but the market is missing, that is NOT necessarily a clarification.

For example:

"give me 5 safe picks tonight"

is valid.

market:
null

needsClarification:
false

The prediction engine can select the strongest qualifying markets.

13. Only ask for clarification when the missing information materially changes what the user is asking for.

14. Keep clarification short.

Bad:
"Could you please provide additional information regarding the exact market..."

Good:
"Do you mean Over 2.5 or Under 2.5?"

15. Preserve the user's intent rather than rewriting their entire message.

The output must always follow the provided schema.
`;
}

export async function interpretPredictionRequest(query, now = new Date()) {
  if (typeof query !== "string" || !query.trim()) {
    throw new Error("Prediction request is required.");
  }

  const currentTime = now instanceof Date ? now.toISOString() : String(now);

  const response = await client.responses.parse({
    model: process.env.OPENAI_AGENT_MODEL || "gpt-5.6-luna",

    input: [
      {
        role: "system",
        content: buildSystemPrompt(currentTime),
      },
      {
        role: "user",
        content: query.trim(),
      },
    ],

    text: {
      format: zodTextFormat(PredictionIntent, "kickpredict_prediction_intent"),
    },
  });

  if (response.status !== "completed") {
    throw new Error(
      `Prediction interpreter did not complete: ${response.status}`
    );
  }

  const parsed = response.output_parsed;

  if (!parsed) {
    throw new Error("Prediction interpreter returned no structured result.");
  }

  return parsed;
}
