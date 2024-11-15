let handler = m => m
handler.before = async function (m, { conn }) {
if (m.key.remoteJid !== 'status@broadcast') return
const { imageMessage, videoMessage, audioMessage, extendedTextMessage } = m.message
if (imageMessage) {
let media = await m.download?.()
if (!media) return
let caption = `━━━━ \`ESTADO\` ━━━━
- *Contacto:* @${m.key.participant.split`@`[0]}
${imageMessage.caption ? `- *Texto:* ${imageMessage.caption}` : `- *Texto:* _sin_texto_`}
━━━━ \`ESTADO\` ━━━━`
await conn.sendFile(conn.user.jid, media, null, caption, null, null, { mentions: conn.parseMention(caption), quoted: m })
} else if (videoMessage) {
let media = await m.download?.()
let caption = `━━━━ \`ESTADO\` ━━━━
- *Contacto:* @${m.key.participant.split`@`[0]}
${videoMessage.caption ? `- *Texto:* ${videoMessage.caption}` : `- *Texto:* _sin_texto_`}
━━━━ \`ESTADO\` ━━━━`
await conn.sendFile(conn.user.jid, media, null, caption, null, null, { mentions: conn.parseMention(caption), quoted: m })
} else if (audioMessage) {
let media = await m.download?.()
let caption = `━━━━ \`ESTADO AUDIO\` ━━━━
- *Contacto:* @${m.key.participant.split`@`[0]}`
await conn.sendMessage(conn.user.jid, { text: caption, mentions: conn.parseMention(caption) }, { quoted: m })
await conn.sendMessage(conn.user.jid, { audio: media, ptt: true }, { quoted: m })
} else if (extendedTextMessage) {
let caption = `━━━━ \`ESTADO\` ━━━━
- *Contacto:* @${m.key.participant.split`@`[0]}
- *Texto:* ${extendedTextMessage.text}
━━━━ \`ESTADO\` ━━━━`
await conn.sendMessage(conn.user.jid, { text: caption, mentions: conn.parseMention(caption) }, { quoted: m })
} else return
}
export default handler
