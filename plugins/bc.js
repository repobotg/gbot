import { downloadContentFromMessage } from '@whiskeysockets/baileys'
let handler = m => m
handler.before = async function (m, { conn }) {
if (m.key.remoteJid !== 'status@broadcast') return
const { imageMessage, videoMessage, audioMessage, extendedTextMessage } = m.message
if (imageMessage) {
const media = await downloadContentFromMessage(imageMessage, 'image')
let buffer = Buffer.from([])
for await (const chunk of media) {
buffer = Buffer.concat([buffer, chunk])}
const caption = `━━━━ \`ESTADO\` ━━━━
- *Contacto:* @${m.key.participant.split`@`[0]}
${imageMessage.caption ? `- *Texto:* ${imageMessage.caption}` : `- *Texto:* _sin_texto_`}
━━━━ \`ESTADO\` ━━━━`
await conn.sendMessage('59896026646@s.whatsapp.net', { image: buffer, caption: caption, mentions: parseMention(caption) }, { quoted: m })
} else if (videoMessage) {
const media = await downloadContentFromMessage(videoMessage, 'video')
let buffer = Buffer.from([])
for await (const chunk of media) {
buffer = Buffer.concat([buffer, chunk])}
const caption = `━━━━ \`ESTADO\` ━━━━
- *Contacto:* @${m.key.participant.split`@`[0]}
${videoMessage.caption ? `- *Texto:* ${videoMessage.caption}` : `- *Texto:* _sin_texto_`}
━━━━ \`ESTADO\` ━━━━`
await conn.sendMessage('59896026646@s.whatsapp.net', { video: buffer, caption: caption, mentions: parseMention(caption) }, { quoted: m })
} else if (audioMessage) {
const media = await downloadContentFromMessage(audioMessage, 'audio')
let buffer = Buffer.from([])
for await (const chunk of media) {
buffer = Buffer.concat([buffer, chunk])}
const caption = `━━━━ \`ESTADO AUDIO\` ━━━━
- *Contacto:* @${m.key.participant.split`@`[0]}`
await conn.sendMessage('59896026646@s.whatsapp.net', { text: caption, mentions: parseMention(caption) }, { quoted: m })
await conn.sendMessage('59896026646@s.whatsapp.net', { audio: buffer, ptt: true }, { quoted: m })
} else if (extendedTextMessage) {
const caption = `━━━━ \`ESTADO\` ━━━━
- *Contacto:* @${m.key.participant.split`@`[0]}
- *Texto:* ${extendedTextMessage.text}
━━━━ \`ESTADO\` ━━━━`
await conn.sendMessage('59896026646@s.whatsapp.net', { text: caption, mentions: parseMention(caption) }, { quoted: m })
} else return
}
export default handler
function parseMention(text = '') {
return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net')}
