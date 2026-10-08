import { sendTelegramMessage } from "../src/lib/telegram/bot.js";
import {
  formatPredictionResponse,
  formatTelegramError,
} from "../src/lib/telegram/format.js";

const BOT_USERNAME = (
  process.env.TELEGRAM_BOT_USERNAME || "KickPredictAI_bot"
).replace(/^@/, "");

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
  "/predict — Make a prediction request",
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
  "In the discussion group, mention me:",
  "",
  `@${BOT_USERNAME} give me 5 safe picks tonight`,
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

const THANKS_MESSAGE = [
  "You're welcome.",
  "",
  "Good luck with the picks. ⚽",
  "",
  "Whenever you're ready, just ask me for another prediction.",
].join("\n");

const GOODBYE_MESSAGE = [
  "You're all set.",
  "",
  "Good luck and see you next time. ⚽",
].join("\n");

function normalizeMessage(text) {
  return String(text || "")
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

function isThanks(text) {
  const value = normalizeMessage(text);

  return [
    "thanks",
    "thank you",
    "thank u",
    "thanks a lot",
    "thank you so much",
    "appreciate it",
    "much appreciated",
    "cheers",
    "perfect thanks",
    "great thanks",
    "okay thanks",
    "ok thanks",
    "thanks bro",
    "thanks mate",
  ].includes(value);
}

function isGoodbye(text) {
  const value = normalizeMessage(text);

  return [
    "bye",
    "goodbye",
    "good bye",
    "see you",
    "see ya",
    "later",
    "talk later",
    "i'm done",
    "im done",
    "that's all",
    "thats all",
    "that's it",
    "thats it",
  ].includes(value);
}

function isAcknowledgement(text) {
  const value = normalizeMessage(text);

  return [
    "ok",
    "okay",
    "alright",
    "all right",
    "got it",
    "understood",
    "nice",
    "great",
    "perfect",
    "cool",
    "sounds good",
    "good",
    "awesome",
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

function getChatType(message) {
  return message?.chat?.type || "private";
}

function isGroupChat(message) {
  const type = getChatType(message);

  return type === "group" || type === "supergroup";
}

function extractBotMention(text) {
  if (!text) {
    return {
      mentioned: false,
      cleanedText: "",
    };
  }

  const mentionPattern = new RegExp(`@${BOT_USERNAME}\\b`, "i");

  const mentioned = mentionPattern.test(text);

  if (!mentioned) {
    return {
      mentioned: false,
      cleanedText: text.trim(),
    };
  }

  return {
    mentioned: true,
    cleanedText: text.replace(mentionPattern, "").trim(),
  };
}

function extractCommand(text) {
  const match = String(text || "")
    .trim()
    .match(/^\/([a-zA-Z0-9_]+)(?:@\w+)?(?:\s+([\s\S]+))?$/);

  if (!match) {
    return null;
  }

  return {
    command: match[1].toLowerCase(),
    argument: match[2]?.trim() || "",
  };
}

function shouldProcessGroupMessage(message, text) {
  const command = extractCommand(text);

  /*
   * Commands can always be processed.
   */
  if (command) {
    return true;
  }

  /*
   * In groups, normal conversation belongs to humans.
   * The bot only responds when explicitly mentioned.
   */
  const mention = extractBotMention(text);

  return mention.mentioned;
}

function cleanGroupMessage(text) {
  const mention = extractBotMention(text);

  return mention.cleanedText;
}

async function callAgent(req, text) {
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

  return agentData;
}

export default async function handler(req, res) {
  /*
   * HEALTH CHECK
   */
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      service: "KickPredict Telegram Bot",
      webhook: "active",
      botUsername: BOT_USERNAME,
    });
  }

  /*
   * METHOD CHECK
   */
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed.",
    });
  }

  try {
    const update = req.body;

    const message = update?.message;

    /*
     * Ignore updates that aren't normal messages.
     */
    if (!message) {
      return res.status(200).json({
        ok: true,
        ignored: true,
      });
    }

    const chatId = message?.chat?.id;

    const rawText =
      typeof message?.text === "string" ? message.text.trim() : "";

    if (!chatId || !rawText) {
      return res.status(200).json({
        ok: true,
        ignored: true,
      });
    }

    const group = isGroupChat(message);

    /*
     * GROUP BEHAVIOR
     *
     * In the discussion group, don't let the bot
     * hijack normal conversations.
     *
     * It must either receive a command:
     *
     * /predict ...
     *
     * or be explicitly mentioned:
     *
     * @KickPredictBot ...
     */
    if (group && !shouldProcessGroupMessage(message, rawText)) {
      return res.status(200).json({
        ok: true,
        ignored: true,
        reason: "Group message was not directed at KickPredict.",
      });
    }

    /*
     * Remove @KickPredictBot from group requests.
     */
    const text = group ? cleanGroupMessage(rawText) : rawText;

    if (!text) {
      await sendTelegramMessage(
        chatId,
        "I'm here. Tell me what you'd like me to research."
      );

      return res.status(200).json({
        ok: true,
      });
    }

    /*
     * COMMAND PARSING
     */
    const command = extractCommand(text);

    /*
     * /start
     */
    if (command?.command === "start") {
      await sendTelegramMessage(chatId, WELCOME_MESSAGE);

      return res.status(200).json({
        ok: true,
      });
    }

    /*
     * /help
     */
    if (command?.command === "help") {
      await sendTelegramMessage(chatId, HELP_MESSAGE);

      return res.status(200).json({
        ok: true,
      });
    }

    /*
     * /predict
     */
    if (command?.command === "predict") {
      if (!command.argument) {
        await sendTelegramMessage(
          chatId,
          "Tell me what you want predicted.\n\nExample:\n\n/predict 5 safe picks tonight"
        );

        return res.status(200).json({
          ok: true,
        });
      }

      /*
       * Replace the command with the actual
       * natural-language request.
       */
      const predictionRequest = command.argument;

      try {
        await sendTelegramMessage(chatId, "Researching fixtures...");
      } catch (statusError) {
        console.warn("Telegram status message failed:", statusError);
      }

      const agentData = await callAgent(req, predictionRequest);

      const formatted = formatPredictionResponse(agentData);

      await sendTelegramMessage(chatId, formatted);

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
     * THANKS
     */
    if (isThanks(text)) {
      await sendTelegramMessage(chatId, THANKS_MESSAGE);

      return res.status(200).json({
        ok: true,
      });
    }

    /*
     * GOODBYE
     */
    if (isGoodbye(text)) {
      await sendTelegramMessage(chatId, GOODBYE_MESSAGE);

      return res.status(200).json({
        ok: true,
      });
    }

    /*
     * SIMPLE ACKNOWLEDGEMENTS
     */
    if (isAcknowledgement(text)) {
      await sendTelegramMessage(
        chatId,
        "Absolutely. Whenever you're ready, just tell me what you'd like to research. ⚽"
      );

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
     * EVERYTHING REACHING THIS POINT IS NOW
     * A POTENTIAL REAL AGENT REQUEST.
     *
     * The important difference is that group messages
     * have already been filtered above.
     *
     * Conversation messages such as:
     * "thanks"
     * "okay"
     * "nice"
     * "bye"
     *
     * have also already been handled.
     */

    try {
      await sendTelegramMessage(chatId, "Researching fixtures...");
    } catch (statusError) {
      console.warn("Telegram status message failed:", statusError);
    }

    const agentData = await callAgent(req, text);

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

    /*
     * Telegram expects a successful webhook response
     * even when we couldn't process the message.
     */
    return res.status(200).json({
      ok: false,
      error: "Telegram update could not be processed.",
    });
  }
}
