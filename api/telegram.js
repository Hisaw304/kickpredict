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
  "“Give me 5 over 2.5 picks”",
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
  "Here's what I can help you with.",
  "",
  "PREDICTIONS",
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
  "You can use normal language,",
  "shorthand and typos.",
].join("\n");

const GREETING_MESSAGE = [
  "KICKPREDICT AI",
  "",
  "Hey 👋",
  "",
  "I'm your football prediction assistant.",
  "",
  "Tell me what kind of picks you're looking for and I'll research the available fixtures.",
  "",
  "For example:",
  "",
  "“Give me 5 safe picks tonight”",
  "",
  "Or type /help to see what I can do.",
].join("\n");

const ABOUT_MESSAGE = [
  "KICKPREDICT AI",
  "",
  "I'm KickPredict's football prediction assistant.",
  "",
  "I can understand normal football requests and turn them into researched predictions.",
  "",
  "You can ask for:",
  "",
  "• Safe picks",
  "• Over / Under",
  "• Double Chance",
  "• BTTS",
  "• League-specific picks",
  "• Today's picks",
  "• Weekend picks",
  "• Strong or aggressive selections",
  "",
  "You don't need special commands.",
  "Just tell me what you're looking for.",
].join("\n");

function normalizeMessage(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[!?.,]+$/g, "");
}

function isGreeting(text) {
  const value = normalizeMessage(text);

  return [
    "hi",
    "hello",
    "hey",
    "hey there",
    "hiya",
    "good morning",
    "good afternoon",
    "good evening",
    "morning",
    "afternoon",
    "evening",
    "yo",
    "sup",
    "wassup",
    "what's up",
    "whats up",
    "how are you",
  ].includes(value);
}

function isAboutQuestion(text) {
  const value = normalizeMessage(text);

  const patterns = [
    "what can you do",
    "what do you do",
    "what can you help with",
    "how can you help",
    "who are you",
    "what are you",
    "tell me about yourself",
    "tell me what you can do",
    "what is kickpredict",
    "what's kickpredict",
    "whats kickpredict",
    "what is this bot",
    "what does this bot do",
    "what can this bot do",
  ];

  return patterns.some((pattern) => value.includes(pattern));
}

function isHelpRequest(text) {
  const value = normalizeMessage(text);

  return [
    "help",
    "help me",
    "i need help",
    "how does this work",
    "how do i use this",
    "how do i use you",
    "commands",
    "show commands",
    "show me commands",
  ].includes(value);
}

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
     * HELP COMMAND
     */
    if (text === "/help") {
      await sendTelegramMessage(chatId, HELP_MESSAGE);

      return res.status(200).json({
        ok: true,
      });
    }

    /*
     * NORMAL HELP
     */
    if (isHelpRequest(text)) {
      await sendTelegramMessage(chatId, HELP_MESSAGE);

      return res.status(200).json({
        ok: true,
      });
    }

    /*
     * GREETINGS
     */
    if (isGreeting(text)) {
      await sendTelegramMessage(chatId, GREETING_MESSAGE);

      return res.status(200).json({
        ok: true,
      });
    }

    /*
     * ABOUT / CAPABILITY QUESTIONS
     */
    if (isAboutQuestion(text)) {
      await sendTelegramMessage(chatId, ABOUT_MESSAGE);

      return res.status(200).json({
        ok: true,
      });
    }

    /*
     * EVERYTHING BELOW THIS POINT
     * IS TREATED AS A REAL PREDICTION REQUEST.
     */

    try {
      await sendTelegramMessage(chatId, "Researching fixtures...");
    } catch (statusError) {
      console.warn("Telegram status message failed:", statusError);
    }

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
