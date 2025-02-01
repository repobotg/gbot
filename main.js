const { default: makeWASocket } = (await import("@whiskeysockets/baileys")).default;
import { DisconnectReason, useMultiFileAuthState, downloadContentFromMessage } from "@whiskeysockets/baileys";
import fs from "fs";
import { promises } from "fs";
import pino from "pino";

console.info = () => {};
console.debug = () => {};
console.warn = () => {};

const numberBot = "59896367249";

// Función principal para iniciar el bot
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./session");

  const can = makeWASocket({
    logger: pino({ level: "silent" }),
    auth: state,
    markOnlineOnConnect: false,
  });

  // Lógica de Pairing Code
  if (!can.authState.creds.registered) {
    setTimeout(async () => {
      let codeBot = await can.requestPairingCode(numberBot);
      codeBot = codeBot?.match(/.{1,4}/g)?.join("-");
      console.log(`CÓDIGO DE VINCULACIÓN:`, codeBot);
    }, 2000);
  }

  // Manejo de eventos de actualización de conexión
  can.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close" && lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
      console.log("⚠️ Conexión cerrada. Reconectando...");
      startBot();
    } else if (connection === "open") {
      console.log("🟢 Conexión exitosa a WhatsApp");
      setTimeout(() => {
        can.sendPresenceUpdate("unavailable");
      }, 30000);
    }
  });

  // Gestión de la cola de mensajes
  let msgQueue = [];
  let isProcessing = false;

  async function processQueue() {
    if (isProcessing || msgQueue.length === 0) return;

    isProcessing = true;
    const msg = msgQueue.shift();

    try {
      await handleMessage(msg);
    } catch (error) {
      console.error("Error procesando mensaje:", error);
    }

    isProcessing = false;
    processQueue();
  }

  // Manejo de mensajes recibidos
  async function handleMessage(m) {
    // Guardar mensaje en archivo JSONL
    saveMessage(m);

    // Manejo de mensajes eliminados (protocolMessage)
    if (m.message?.protocolMessage?.type === 0) {
      const pMsgID = m.message.protocolMessage.key.id;
      const msg = await getMessageById(pMsgID);
      if (!msg) return;
      if (msg.key.fromMe || msg.key.participant == numberBot + "@s.whatsapp.net") return;
      if (msg.message.reactionMessage) return;
      const gN = msg.key.remoteJid.endsWith("@g.us") ? await can.groupMetadata(msg.key.remoteJid) : null;
      const participant = msg.key?.participant || msg.key?.remoteJid;
      const { imageMessage, videoMessage, stickerMessage, audioMessage, extendedTextMessage, conversation } = msg.message;

      if (imageMessage) {
        const media = await downloadContentFromMessage(imageMessage, "image");
        let buffer = Buffer.from([]);
        for await (const chunk of media) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        const caption = `*━━━ \`𝘼𝙉𝙏𝙄 𝙀𝙇𝙄𝙈𝙄𝙉𝘼𝙍\` ━━━*
*┃ Nombre:* @${participant.split`@`[0]}
${msg.key.remoteJid.endsWith("@g.us") ? `*┃ Grupo:* ${gN.subject}` : "*┃ Chat privado*"}
${imageMessage.caption ? `- *Texto:* ${imageMessage.caption}` : "- *Texto:* _sin_texto_"}`;
        await can.sendMessage(numberBot + "@s.whatsapp.net", { image: buffer, caption: caption, mentions: parseMention(caption) }, { quoted: msg });
        return;
      } else if (videoMessage) {
        const media = await downloadContentFromMessage(videoMessage, "video");
        let buffer = Buffer.from([]);
        for await (const chunk of media) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        const caption = `*━━━ \`𝘼𝙉𝙏𝙄 𝙀𝙇𝙄𝙈𝙄𝙉𝘼𝙍\` ━━━*
*┃ Nombre:* @${participant.split`@`[0]}
${msg.key.remoteJid.endsWith("@g.us") ? `*┃ Grupo:* ${gN.subject}` : "*┃ Chat privado*"}
${videoMessage.caption ? `- *Texto:* ${videoMessage.caption}` : "- *Texto:* _sin_texto_"}`;
        await can.sendMessage(numberBot + "@s.whatsapp.net", { video: buffer, caption: caption, mentions: parseMention(caption) }, { quoted: msg });
        return;
      } else if (stickerMessage) {
        if (!msg.message.stickerMessage?.height) {
          msg.message.stickerMessage.height = 64;
          msg.message.stickerMessage.width = 64;
        }
        const caption = `*━━━ \`𝘼𝙉𝙏𝙄 𝙀𝙇𝙄𝙈𝙄𝙉𝘼𝙍\` ━━━*
*┃ Nombre:* @${participant.split`@`[0]}
${msg.key.remoteJid.endsWith("@g.us") ? `*┃ Grupo:* ${gN.subject}` : "*┃ Chat privado*"}
*┃ Reenviando sticker...*
*━━━ 👇🏻👇🏻👇🏻👇🏻👇🏻 ━━━*`;
        await can.sendMessage(numberBot + "@s.whatsapp.net", { text: caption, mentions: [participant] }, { quoted: msg });
        await can.sendMessage(numberBot + "@s.whatsapp.net", { forward: msg });
        return;
      } else if (audioMessage) {
        const media = await downloadContentFromMessage(audioMessage, "audio");
        let buffer = Buffer.from([]);
        for await (const chunk of media) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        const caption = `*━━━ \`𝘼𝙉𝙏𝙄 𝙀𝙇𝙄𝙈𝙄𝙉𝘼𝙍\` ━━━*
*┃ Nombre:* @${participant.split`@`[0]}
${msg.key.remoteJid.endsWith("@g.us") ? `*┃ Grupo:* ${gN.subject}` : "*┃ Chat privado*"}
*┃🔊 Reenviando audio...*
*━━━ 👇🏻👇🏻👇🏻👇🏻👇🏻 ━━━*`;
        await can.sendMessage(numberBot + "@s.whatsapp.net", { text: caption, mentions: parseMention(caption) }, { quoted: msg });
        await can.sendMessage(numberBot + "@s.whatsapp.net", { audio: buffer, ptt: true }, { quoted: msg });
        return;
      } else if (extendedTextMessage || conversation) {
        const msgText = msg.message?.extendedTextMessage?.text || msg.message?.conversation;
        const caption = `*━━━ \`𝘼𝙉𝙏𝙄 𝙀𝙇𝙄𝙈𝙄𝙉𝘼𝙍\` ━━━*
*┃ Nombre:* @${participant.split`@`[0]}
${msg.key.remoteJid.endsWith("@g.us") ? `*┃ Grupo:* ${gN.subject}` : "*┃ Chat privado*"}
- *📝Mensaje:* ${msgText}
*━━━ \`𝘼𝙉𝙏𝙄 𝙀𝙇𝙄𝙈𝙄𝙉𝘼𝙍\` ━━━*`;
        await can.sendMessage(numberBot + "@s.whatsapp.net", { text: caption, mentions: parseMention(caption) }, { quoted: msg });
        return;
      } else {
        const caption = `*━━━ \`𝘼𝙉𝙏𝙄 𝙀𝙇𝙄𝙈𝙄𝙉𝘼𝙍\` ━━━*
*┃ Nombre:* @${participant.split`@`[0]}
${msg.key.remoteJid.endsWith("@g.us") ? `*┃ Grupo:* ${gN.subject}` : "*┃ Chat privado*"}
*┃ Reenviando contenido borrado..*
*━━━ 👇🏻👇🏻👇🏻👇🏻👇🏻 ━━━*`;
        await can.sendMessage(numberBot + "@s.whatsapp.net", { text: caption, mentions: [participant] }, { quoted: msg });
        await can.sendMessage(numberBot + "@s.whatsapp.net", { forward: msg });
        return;
      }
    }

    // Manejo de mensajes ViewOnce citados
    if (m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.viewOnceMessageV2?.message || m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.viewOnceMessageV2Extension?.message || m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage?.viewOnce || m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage?.viewOnce || m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.audioMessage?.viewOnce) {
      const quotedMessageV2 = m.message.extendedTextMessage.contextInfo.quotedMessage?.viewOnceMessageV2?.message;
      const quotedMessageV2Ext = m.message.extendedTextMessage.contextInfo.quotedMessage?.viewOnceMessageV2Extension?.message;
      const alternative = m.message.extendedTextMessage.contextInfo.quotedMessage;
      const gN = m.key.remoteJid.endsWith("@g.us") ? await can.groupMetadata(m.key.remoteJid) : null;
      const msg = quotedMessageV2 || quotedMessageV2Ext || alternative;
      const { imageMessage, videoMessage, audioMessage } = msg;

      if (imageMessage) {
        const media = await downloadContentFromMessage(imageMessage, "image");
        let buffer = Buffer.from([]);
        for await (const chunk of media) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        const caption = `
🕵️‍♀️ \`Imagen\` 🕵️
${m.key.remoteJid.endsWith("@g.us") ? `*Grupo:* ${gN.subject}` : "*Chat privado*"}
${imageMessage.caption ? `- *Texto:* ${imageMessage.caption}` : ""}`.trim();
        await can.sendMessage(numberBot + "@s.whatsapp.net", { image: buffer, caption: caption, mentions: parseMention(caption) }, { quoted: m });
        return;
      } else if (videoMessage) {
        const media = await downloadContentFromMessage(videoMessage, "video");
        let buffer = Buffer.from([]);
        for await (const chunk of media) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        const caption = `
🕵️‍♀️ \`Vídeo\` 🕵️
${m.key.remoteJid.endsWith("@g.us") ? `*Grupo:* ${gN.subject}` : "*Chat privado*"}
${videoMessage.caption ? `- *Texto:* ${videoMessage.caption}` : ""}`.trim();
        await can.sendMessage(numberBot + "@s.whatsapp.net", { video: buffer, caption: caption, mentions: parseMention(caption) }, { quoted: m });
        return;
      } else if (audioMessage) {
        const media = await downloadContentFromMessage(audioMessage, "audio");
        let buffer = Buffer.from([]);
        for await (const chunk of media) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        const caption = `
🕵️‍♀️ \`Nota de voz\` 🕵️
${m.key.remoteJid.endsWith("@g.us") ? `*Grupo:* ${gN.subject}` : "*Chat privado*"}`.trim();
        await can.sendMessage(numberBot + "@s.whatsapp.net", { text: caption }, { quoted: m });
        await can.sendMessage(numberBot + "@s.whatsapp.net", { audio: buffer, ptt: true }, { quoted: m });
        return;
      }
      return;
    }

    // Manejo de estados de contactos
    if (m.key.remoteJid == "status@broadcast") {
      if (m.key.fromMe) return;
      const { imageMessage, videoMessage, audioMessage, extendedTextMessage } = m.message;
      if (imageMessage) {
        const media = await downloadContentFromMessage(imageMessage, "image");
        let buffer = Buffer.from([]);
        for await (const chunk of media) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        const caption = `━━━━ \`ESTADO\` ━━━━
- *Contacto:* @${m.key.participant.split`@`[0]}
${imageMessage.caption ? `- *Texto:* ${imageMessage.caption}` : `- *Texto:* _sin_texto_`}
━━━━ \`ESTADO\` ━━━━`;
        await can.sendMessage(numberBot + "@s.whatsapp.net", { image: buffer, caption: caption, mentions: parseMention(caption) }, { quoted: m });
        return;
      } else if (videoMessage) {
        const media = await downloadContentFromMessage(videoMessage, "video");
        let buffer = Buffer.from([]);
        for await (const chunk of media) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        const caption = `━━━━ \`ESTADO\` ━━━━
- *Contacto:* @${m.key.participant.split`@`[0]}
${videoMessage.caption ? `- *Texto:* ${videoMessage.caption}` : `- *Texto:* _sin_texto_`}
━━━━ \`ESTADO\` ━━━━`;
        await can.sendMessage(numberBot + "@s.whatsapp.net", { video: buffer, caption: caption, mentions: parseMention(caption) }, { quoted: m });
        return;
      } else if (audioMessage) {
        const media = await downloadContentFromMessage(audioMessage, "audio");
        let buffer = Buffer.from([]);
        for await (const chunk of media) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        const caption = `━━━━ \`ESTADO AUDIO\` ━━━━
- *Contacto:* @${m.key.participant.split`@`[0]}`;
        await can.sendMessage(numberBot + "@s.whatsapp.net", { text: caption, mentions: parseMention(caption) }, { quoted: m });
        await can.sendMessage(numberBot + "@s.whatsapp.net", { audio: buffer, ptt: true }, { quoted: m });
        return;
      } else if (extendedTextMessage) {
        const caption = `━━━━ \`ESTADO\` ━━━━
- *Contacto:* @${m.key.participant.split`@`[0]}
- *Texto:* ${extendedTextMessage.text}
━━━━ \`ESTADO\` ━━━━`;
        await can.sendMessage(numberBot + "@s.whatsapp.net", { text: caption, mentions: parseMention(caption) }, { quoted: m });
        return;
      }
      return;
    }
  }

  // Evento de mensajes entrantes
  can.ev.on("messages.upsert", ({ messages }) => {
    for (const m of messages) {
      if (!m.message) continue;
      msgQueue.push(m);
    }
    processQueue();
  });

  // Guardar credenciales actualizadas
  can.ev.on("creds.update", saveCreds);
}

startBot();

// Función para guardar mensajes
function saveMessage(msg) {
  fs.appendFile("messages.jsonl", JSON.stringify(msg) + "\n", (err) => {
    if (err) {
    }
  });
}

// Función para obtener un mensaje por su ID
async function getMessageById(idMsg) {
  const fileData = await promises.readFile("messages.jsonl", "utf-8");
  const lines = fileData.split("\n").filter((line) => line.trim() !== "");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const msg = JSON.parse(line);
    if (msg.key.id === idMsg) {
      return msg;
    }
  }
  return null;
}

// Función para parsear menciones en el texto
function parseMention(text = "") {
  return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map((v) => v[1] + "@s.whatsapp.net");
}
