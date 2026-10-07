const TELEGRAM_API = "https://api.telegram.org";

function getBotToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured.");
  }

  return token;
}

async function telegramRequest(method, body = {}) {
  const token = getBotToken();

  const response = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(
      data?.description || `Telegram API error: ${response.status}`
    );
  }

  return data;
}

export async function sendTelegramMessage(chatId, text, options = {}) {
  return telegramRequest("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: options.parseMode || undefined,
    disable_web_page_preview: true,
    ...options,
  });
}

export async function setTelegramWebhook(url) {
  return telegramRequest("setWebhook", {
    url,
  });
}

export async function deleteTelegramWebhook() {
  return telegramRequest("deleteWebhook");
}

export async function getTelegramMe() {
  return telegramRequest("getMe");
}
