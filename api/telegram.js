import { sendTelegramMessage } from "../src/lib/telegram/bot.js";
import {
  formatPredictionResponse,
  formatTelegramError,
} from "../src/lib/telegram/format.js";

export default async function handler(req, res) {
  /*
   * GET
   *
   * Useful for checking that the Vercel function exists.
   */

  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      service: "KickPredict Telegram Bot",
      webhook: "active",
    });
  }

  /*
   * Telegram sends webhook updates using POST.
   */

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed.",
    });
  }

  try {
    const update = req.body;

    /*
     * Telegram can send different types of updates.
     *
     * For now we only care about normal messages.
     */

    const message = update?.message;

    if (!message) {
      return res.status(200).json({
        ok: true,
        ignored: true,
      });
    }

    const chatId = message?.chat?.id;

    const text = typeof message?.text === "string" ? message.text.trim() : "";

    /*
     * Ignore messages without usable text.
     */

    if (!chatId || !text) {
      return res.status(200).json({
        ok: true,
        ignored: true,
      });
    }

    /*
     * ============================
     * /start
     * ============================
     */

    if (text === "/start") {
      await sendTelegramMessage(
        chatId,
        [
          "KICKPREDICT AI",
          "",
          "Welcome to KickPredict.",
          "",
          "Ask me for football predictions naturally.",
          "",
          "Examples:",
          "",
          "Give me 5 safe picks tonight",
          "Give me 5 over 2.5 picks",
          "Give me 5 1X picks tomorrow",
          "Give me 10 picks this weekend",
          "",
          "You can use normal language, shorthand and typos.",
        ].join("\n")
      );

      return res.status(200).json({
        ok: true,
      });
    }

    /*
     * ============================
     * /help
     * ============================
     */

    if (text === "/help") {
      await sendTelegramMessage(
        chatId,
        [
          "KICKPREDICT AI",
          "",
          "Ask me for football predictions naturally.",
          "",
          "Examples:",
          "",
          "Give me 5 safe picks tonight",
          "Give me 5 safe over 2.5 picks",
          "Give me 7 strong 1X picks",
          "Give me 5 under 1.5 tomorrow",
          "Give me 10 picks this weekend",
        ].join("\n")
      );

      return res.status(200).json({
        ok: true,
      });
    }

    /*
     * ============================
     * STATUS MESSAGE
     * ============================
     *
     * This is intentionally just a
     * normal message for now.
     */

    try {
      await sendTelegramMessage(chatId, "Researching fixtures...");
    } catch (statusError) {
      console.warn("Telegram status message failed:", statusError);
    }

    /*
     * ============================
     * CALL KICKPREDICT AGENT
     * ============================
     *
     * The Telegram bot does not create
     * its own prediction logic.
     *
     * It sends the exact natural-language
     * request to the existing agent.
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

    /*
     * ============================
     * SEND RESULT TO TELEGRAM
     * ============================
     */

    const formatted = formatPredictionResponse(agentData);

    await sendTelegramMessage(chatId, formatted);

    return res.status(200).json({
      ok: true,
    });
  } catch (error) {
    console.error("Telegram webhook error:", error);

    /*
     * Try to tell the Telegram user that
     * something went wrong.
     */

    try {
      const chatId = req.body?.message?.chat?.id;

      if (chatId) {
        await sendTelegramMessage(chatId, formatTelegramError());
      }
    } catch (telegramError) {
      console.error("Failed to send Telegram error:", telegramError);
    }

    /*
     * Always return 200 to Telegram so it
     * doesn't continuously retry the update.
     */

    return res.status(200).json({
      ok: false,
      error: "Telegram update could not be processed.",
    });
  }
}
