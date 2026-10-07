import { sendTelegramMessage } from "../src/lib/telegram/bot.js";
import {
  formatPredictionResponse,
  formatTelegramError,
} from "../src/lib/telegram/format.js";

const WELCOME_MESSAGE = [
  "KICKPREDICT AI",
  "",
  "Your football prediction assistant.",
  "",
  "Ask naturally. Get researched football picks in seconds.",
  "",
  "WHAT CAN I DO?",
  "",
  "• Find high-confidence picks",
  "• Analyze today's and upcoming fixtures",
  "• Find Over / Under markets",
  "• Find 1X, X2 and Double Chance picks",
  "• Find BTTS picks",
  "• Filter by league",
  "• Adjust how safe or aggressive your picks are",
  "• Understand normal language, shorthand and typos",
  "",
  "You don't need complicated commands.",
  "Just tell me what you want.",
  "",
  "TRY ONE OF THESE",
  "",
  "“Give me 5 safe picks tonight”",
  "",
  "“abeg give me 5 sure o2.5 picks tonite”",
  "",
  "“Give me 5 1X picks tomorrow”",
  "",
  "Or ask me anything about football predictions.",
  "",
  "Let's find your picks.",
].join("\n");

const HELP_MESSAGE = [
  "KICKPREDICT AI",
  "",
  "Here's what you can ask me for.",
  "",
  "PREDICTION TYPES",
  "",
  "• Safe picks",
  "• Over / Under",
  "• Double Chance",
  "• BTTS",
  "• Home / Away goals",
  "• League-specific picks",
  "• Weekend picks",
  "• Strong or aggressive selections",
  "",
  "USEFUL COMMANDS",
  "",
  "/start — Start KickPredict",
  "/help — Show this guide",
  "",
  "TRY ONE OF THESE",
  "",
  "“Give me 5 safe picks tonight”",
  "",
  "“Give me 5 over 2.5 picks”",
  "",
  "“Give me 5 1X picks tomorrow”",
  "",
  "“Give me 10 picks this weekend”",
  "",
  "“Give me 5 strong BTTS picks”",
  "",
  "“Give me 5 safe Premier League picks”",
  "",
  "You can also use normal language,",
  "shorthand and typos.",
  "",
  "Just tell me what you want.",
].join("\n");

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      service: "KickPredict Telegram Bot",
      webhook: "active",
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed.",
    });
  }

  try {
    const update = req.body;
    const message = update?.message;

    if (!message) {
      return res.status(200).json({
        ok: true,
        ignored: true,
      });
    }

    const chatId = message?.chat?.id;

    const text = typeof message?.text === "string" ? message.text.trim() : "";

    if (!chatId || !text) {
      return res.status(200).json({
        ok: true,
        ignored: true,
      });
    }

    /*
     * START
     */
    if (text === "/start") {
      await sendTelegramMessage(chatId, WELCOME_MESSAGE);

      return res.status(200).json({
        ok: true,
      });
    }

    /*
     * HELP
     */
    if (text === "/help") {
      await sendTelegramMessage(chatId, HELP_MESSAGE);

      return res.status(200).json({
        ok: true,
      });
    }

    /*
     * RESEARCH STATUS
     */
    try {
      await sendTelegramMessage(chatId, "Researching fixtures...");
    } catch (statusError) {
      console.warn("Telegram status message failed:", statusError);
    }

    /*
     * CALL KICKPREDICT AGENT
     */
    const host = req.headers.host;

    if (!host) {
      throw new Error("Unable to determine KickPredict host.");
    }

    const protocol = req.headers["x-forwarded-proto"] || "https";

    const agentUrl =
      process.env.KICKPREDICT_AGENT_URL || `${protocol}://${host}/api/agent`;

    const agentResponse = await fetch(
      `${agentUrl}?q=${encodeURIComponent(text)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    let agentData;

    try {
      agentData = await agentResponse.json();
    } catch {
      throw new Error(
        `Agent returned an invalid response (${agentResponse.status}).`
      );
    }

    if (!agentResponse.ok) {
      throw new Error(
        agentData?.error ||
          `Prediction agent failed with status ${agentResponse.status}.`
      );
    }

    const formatted = formatPredictionResponse(agentData);

    await sendTelegramMessage(chatId, formatted);

    return res.status(200).json({
      ok: true,
    });
  } catch (error) {
    console.error("Telegram webhook error:", error);

    try {
      const chatId = req.body?.message?.chat?.id;

      if (chatId) {
        await sendTelegramMessage(chatId, formatTelegramError());
      }
    } catch (telegramError) {
      console.error("Failed to send Telegram error:", telegramError);
    }

    return res.status(200).json({
      ok: false,
      error: "Telegram update could not be processed.",
    });
  }
}
