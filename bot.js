import { config } from "dotenv";
import OpenAI from "openai";
import TelegramBot from "node-telegram-bot-api";
import axios from "axios";

config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

const partners = {
  binance: "https://www.binance.com/activity/referral-entry/CPA?ref=CPA_00H6SZYNUE",
  bybit: "https://www.bybit.com/invite?ref=Z9KYNJQ",
};

async function getExchangeAmount(from, to, amount) {
  try {
    const res = await axios.get(
      `https://api.changenow.io/v1/currencies/exchange-amount/${from}_${to}/${amount}`
    );
    const estimated = res.data.estimatedAmount;
    const withCommission = estimated * 0.99;
    return withCommission;
  } catch (e) {
    console.error("Ошибка API обмена:", e);
    return null;
  }
}

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) return;

  if (text.startsWith("/start")) {
    bot.sendMessage(chatId, "Привет! Я твой криптобот. Используй команды /partners и /exchange.");
    return;
  }

  if (text.toLowerCase() === "/partners") {
    const reply = `Партнёрские ссылки:
Binance: ${partners.binance}
Bybit: ${partners.bybit}

Приглашай друзей по своей реферальной ссылке!`;
    bot.sendMessage(chatId, reply);
    return;
  }

  if (text.toLowerCase().startsWith("/exchange")) {
    const parts = text.split(" ");
    if (parts.length !== 4) {
      bot.sendMessage(chatId, "Используй команду: /exchange BTC USDT 0.01");
      return;
    }
    const [_, from, to, amountStr] = parts;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      bot.sendMessage(chatId, "Неверная сумма для обмена.");
      return;
    }

    const amountOut = await getExchangeAmount(from.toUpperCase(), to.toUpperCase(), amount);
    if (!amountOut) {
      bot.sendMessage(chatId, "Ошибка при получении курса обмена.");
      return;
    }

    bot.sendMessage(
      chatId,
      `Обмен ${amount} ${from.toUpperCase()} ≈ ${amountOut.toFixed(6)} ${to.toUpperCase()} (с комиссией).`
    );
    return;
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: text }],
    });

    const answer = response.choices[0].message.content;
    bot.sendMessage(chatId, answer);
  } catch (e) {
    bot.sendMessage(chatId, "Ошибка при работе с AI.");
    console.error(e);
  }
});

console.log("Бот запущен!");
