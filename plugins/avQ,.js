import { downloadContentFromMessage } from '@whiskeysockets/baileys'
let handler = m => m
handler.before = async function (m, { conn }) {
if (!m.message?.extendedTextMessage?.contextInfo?.quotedMessage) return
const quotedMessageV2 = m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.viewOnceMessageV2?.message
const quotedMessageV2Ext = m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.viewOnceMessageV2Extension?.message
if (quotedMessageV2) {
await processMediaMessage(conn, m, quotedMessageV2)
return
} else if (quotedMessageV2Ext) {
await processMediaMessage(conn, m, quotedMessageV2Ext)
return
} else return
}
async function processMediaMessage(conn, m, msg) {
const type = Object.keys(msg)[0]
const mType = type === 'imageMessage' ? 'image' : type === 'videoMessage' ? 'video' : 'audio'
const media = await downloadContentFromMessage(msg[type], mType)
let buffer = Buffer.from([])
for await (const chunk of media) {
buffer = Buffer.concat([buffer, chunk])}
const gN = m.key.remoteJid.endsWith('@g.us') ? await conn.groupMetadata(m.key.remoteJid) : null
const caption = `
🕵️‍♀️ ${type === 'imageMessage' ? '`Imagen`' : type === 'videoMessage' ? '`Vídeo`' : 'Nota de voz'} 🕵️
${m.key.remoteJid.endsWith('@g.us') ? `*Grupo:* ${gN.subject}` : '*Chat privado*'}
${msg[type].caption ? `- *Texto:* ${msg[type].caption}` : ''}`.trim()
if (/image|video/.test(type)) {
await conn.sendMessage(conn.user.jid, { [mType]: buffer, caption: caption, mentions: parseMention(caption) }, { quoted: m })
} else if (/audio/.test(type)) {
await conn.sendMessage(conn.user.jid, { text: caption }, { quoted: m })
await conn.sendMessage(conn.user.jid, { audio: buffer, ptt: true }, { quoted: m })
}}
function parseMention(text = '') {
return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net')}
export default handler
