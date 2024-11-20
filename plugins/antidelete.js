import { downloadContentFromMessage } from '@whiskeysockets/baileys'
import { promises } from 'fs'
let handler = m => m
handler.before = async function (m, { conn }) {
if (!m.message?.protocolMessage?.key?.id) return
const pMsgID = m.message.protocolMessage.key.id
const msg = await getMessageById(pMsgID)
if (!msg) return
const gN = msg.key.remoteJid.endsWith('@g.us') ? await conn.groupMetadata(msg.key.remoteJid) : null
const isOnce = msg.message?.viewOnceMessageV2 || msg.message?.viewOnceMessageV2Extension || null
const participant = msg.key?.participant || msg.key?.remoteJid || null
if (isOnce) {
const msgg = msg.message.viewOnceMessageV2?.message || msg.message.viewOnceMessageV2Extension?.message
const type = Object.keys(msgg)[0]
const mediaType = type === 'imageMessage' ? 'image' : type === 'videoMessage' ? 'video' : 'audio'
const media = await downloadContentFromMessage(msgg[type], mediaType)
let buffer = Buffer.from([])
for await (const chunk of media) {
buffer = Buffer.concat([buffer, chunk])}
if (/image|video/.test(type)) {
const caption = `*━━━ \`𝘼𝙉𝙏𝙄 𝙀𝙇𝙄𝙈𝙄𝙉𝘼𝙍\` ━━━*
*┃ ViewOnce (eliminado)*
- *Nombre:* @${participant.split`@`[0]}
${msg.key.remoteJid.endsWith('@g.us') ? `- *Grupo:* ${gN.subject}` : '- *Chat privado*'}
${msgg[type].caption ? `- *Texto:* ${msgg[type].caption}` : '- *Texto:* _sin_texto_'}
ID: ${msg.key.id}`
return await conn.sendMessage('59896026646@s.whatsapp.net', { [mediaType]: buffer, caption: caption, mentions: parseMention(caption) }, { quoted: msg })
} else if (/audio/.test(type)) {
await conn.sendMessage('59896026646@s.whatsapp.net', { text: `*━━━ \`𝘼𝙉𝙏𝙄 𝙀𝙇𝙄𝙈𝙄𝙉𝘼𝙍\` ━━━*
*┃ ViewOnce (eliminado)*
- *Nombre:* @${participant.split`@`[0]}
${msg.key.remoteJid.endsWith('@g.us') ? `- *Grupo:* ${gN.subject}` : '- *Chat privado*'}
- *Tipo:* Nota de voz🔊
ID: ${msg.key.id}`, mentions: [participant] }, { quoted: msg })
return await conn.sendMessage('59896026646@s.whatsapp.net', { audio: buffer, ptt: true }, { quoted: msg })
}}
const isImageOrVideo = msg.message.imageMessage || msg.message.videoMessage || null
const test = msg.message?.extendedTextMessage?.text || msg.message?.conversation || null
if (test && !isImageOrVideo) {
const deleteMsg = `*━━━ \`𝘼𝙉𝙏𝙄 𝙀𝙇𝙄𝙈𝙄𝙉𝘼𝙍\` ━━━*
*┃ Nombre:* @${participant.split`@`[0]}
${msg.key.remoteJid.endsWith('@g.us') ? `*┃ Grupo:* ${gN.subject}` : '*┃ Chat privado*'}
- *📝Mensaje:* ${test}
*━━━ \`𝘼𝙉𝙏𝙄 𝙀𝙇𝙄𝙈𝙄𝙉𝘼𝙍\` ━━━*
ID: ${msg.key.id}`
return await conn.sendMessage('59896026646@s.whatsapp.net', { text: deleteMsg, mentions: parseMention(deleteMsg) }, { quoted: msg });
} else if (isImageOrVideo) {
const iOV = `*━━━ \`𝘼𝙉𝙏𝙄 𝙀𝙇𝙄𝙈𝙄𝙉𝘼𝙍\` ━━━*
*┃ Nombre:* @${participant.split`@`[0]}
${msg.key.remoteJid.endsWith('@g.us') ? `*┃ Grupo:* ${gN.subject}` : '*┃ Chat privado*'}
${isImageOrVideo.caption ? `- *Texto:* ${isImageOrVideo.caption}` : '- *Texto:* _sin_texto_'}
ID: ${msg.key.id}`
const type = Object.keys(msg.message)[0]
const mediaType = type === 'imageMessage' ? 'image' : 'video'
const media = await downloadContentFromMessage(msg.message[type], mediaType)
let buffer = Buffer.from([])
for await (const chunk of media) {
buffer = Buffer.concat([buffer, chunk]);
}
return await conn.sendMessage('59896026646@s.whatsapp.net', { [mediaType]: buffer, caption: iOV, mentions: parseMention(iOV) }, { quoted: msg })
} else if (msg.message?.stickerMessage) {
await conn.sendMessage('59896026646@s.whatsapp.net', { text: `*━━━ \`𝘼𝙉𝙏𝙄 𝙀𝙇𝙄𝙈𝙄𝙉𝘼𝙍\` ━━━*
*┃ Nombre:* @${participant.split`@`[0]}
${msg.key.remoteJid.endsWith('@g.us') ? `*┃ Grupo:* ${gN.subject}` : '*┃ Chat privado*'}
*┃ Reenviando sticker..*
*━━━ 👇🏻👇🏻👇🏻👇🏻👇🏻 ━━━*
ID: ${msg.key.id}`, mentions: [participant] }, { quoted: msg })
return await conn.sendMessage('59896026646@s.whatsapp.net', { forward: msg });
} else if (!isOnce) {
await conn.sendMessage('59896026646@s.whatsapp.net', { text: `*━━━ \`𝘼𝙉𝙏𝙄 𝙀𝙇𝙄𝙈𝙄𝙉𝘼𝙍\` ━━━*
*┃ Nombre:* @${participant.split`@`[0]}
${msg.key.remoteJid.endsWith('@g.us') ? `*┃ Grupo:* ${gN.subject}` : '*┃ Chat privado*'}
*┃ Reenviando contenido borrado..*
*━━━ 👇🏻👇🏻👇🏻👇🏻👇🏻 ━━━*
ID: ${msg.key.id}`, mentions: [participant] }, { quoted: msg })
return await conn.sendMessage('59896026646@s.whatsapp.net', { forward: msg })
}}
export default handler
async function getMessageById(idMsg) {
const fileData = await promises.readFile('messages.jsonl', 'utf-8')
const lines = fileData.split('\n').filter(line => line.trim() !== '')
for (let i = lines.length - 1; i >= 0; i--) {
const line = lines[i]
const msg = JSON.parse(line)
if (msg.key.id === idMsg) {
return msg
}}
return null
}
function parseMention(text = '') {
return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net')}