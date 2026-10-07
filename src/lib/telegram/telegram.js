import { sendTelegramMessage } from "../src/lib/telegram/bot.js";

import {
  formatPredictionResponse,
  formatTelegramError,
} from "../src/lib/telegram/format.js";

import { parsePredictionRequest } from "../src/lib/agent/parser.js";
import { interpretPredictionRequest } from "../src/lib/agent/interpreter.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed.",
    });
  }

  try {
    const update = req.body;

    const message = update?.message;

    if (!message) {
      return res.status(200).json({
        ok: true,
      });
    }

    const chatId = message.chat?.id;

    const text = message.text?.trim();

    if (!chatId || !text) {
      return res.status(200).json({
        ok: true,
      });
    }

    /*
     * COMMANDS
     */

    if (text === "/start") {
      await sendTelegramMessage(
        chatId,
        [
          "KICKPREDICT AI",
          "",
          "Welcome to KickPredict.",
          "",
          "Tell me what kind of football picks you're looking for.",
          "",
          "Examples:",
          "• Give me 5 safe picks tonight",
          "• Give me 5 over 2.5 picks",
          "• Give me 5 1X picks tomorrow",
          "• Give me 10 picks this weekend",
          "",
          "You can type naturally. I understand normal conversation, shorthand and typos.",
        ].join("\n")
      );

      return res.status(200).json({
        ok: true,
      });
    }

    if (text === "/help") {
      await sendTelegramMessage(
        chatId,
        [
          "KICKPREDICT AI",
          "",
          "Ask me for football predictions naturally.",
          "",
          "Examples:",
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
     * TEMPORARY TYPING INDICATOR
     */

    try {
      await sendTelegramMessage(chatId, "Researching fixtures...");
    } catch (typingError) {
      console.warn("Telegram status message failed:", typingError);
    }

    /*
     * AI INTERPRETATION
     */

    let interpreted;

    try {
      interpreted = await interpretPredictionRequest(text, new Date());
    } catch (error) {
      console.error("Telegram AI interpreter failed:", error);

      /*
       * Deterministic parser remains the fallback.
       */
      interpreted = null;
    }

    /*
     * CLARIFICATION
     */

    if (interpreted?.needsClarification) {
      await sendTelegramMessage(
        chatId,
        interpreted.clarification ||
          "Could you clarify what prediction market you want?"
      );

      return res.status(200).json({
        ok: true,
      });
    }

    /*
     * CALL EXISTING AGENT
     *
     * We intentionally keep the prediction engine untouched.
     */

    const agentUrl =
      process.env.KICKPREDICT_AGENT_URL ||
      `https://${req.headers.host}/api/agent`;

    const agentResponse = await fetch(
      `${agentUrl}?q=${encodeURIComponent(text)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    const agentData = await agentResponse.json();

    if (!agentResponse.ok) {
      throw new Error(agentData?.error || "Prediction agent request failed.");
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
      ok: true,
    });
  }
}
