let { downloadContentFromMessage } = (await import('@whiskeysockets/baileys'))
import { smsg } from './lib/simple.js'
import fs from 'fs'
export async function handler(chatUpdate) {
if (!chatUpdate) {
return
}
if (!chatUpdate || !chatUpdate.messages) {
return
} else {
this.pushMessage(chatUpdate.messages).catch(console.error)
}
let m = chatUpdate.messages[chatUpdate.messages.length - 1]
if (!m) {
return
}
try {
m = smsg(this, m) || m
if (!m)
return
if (typeof m.text !== 'string') m.text = ''
let usedPrefix = '.'
for (let name in global.plugins) {
let plugin = global.plugins[name]
if (!plugin) continue
if (typeof plugin.before === 'function' && await plugin.before.call(this, m, { conn: this })) continue
let match = m.text.startsWith(usedPrefix) ? m.text.slice(1).trim() : null
if (!match) continue
let [command, ...args] = match.split(' ').filter(v => v)
command = command.toLowerCase()
let isAccept = plugin.command instanceof RegExp ? plugin.command.test(command) : Array.isArray(plugin.command) ? plugin.command.some(cmd => cmd instanceof RegExp ? cmd.test(command) : cmd === command) : plugin.command === command
if (!isAccept) continue
await plugin.call(this, m, { conn: this, text: args.join(' '), args })
}} catch (e) {
console.error(e)
}}
export async function deleteUpdate(message) {
const { m, fromMe, id, participant } = message
if (fromMe) return
let msg = this.serializeM(this.loadMessage(id))
if (!msg) return
let isOnce = msg.mtype == 'viewOnceMessageV2' || msg.mtype == 'viewOnceMessageV2Extension'
if (isOnce) {
let media
let msgg = msg.mtype == 'viewOnceMessageV2' ? msg.message.viewOnceMessageV2.message : msg.message.viewOnceMessageV2Extension.message
const type = Object.keys(msgg)[0]
if (msg.mtype == 'viewOnceMessageV2') {
media = await downloadContentFromMessage(msgg[type], type == 'imageMessage' ? 'image' : 'videoMessage' ? 'video' : 'audio')
} else {
media = await downloadContentFromMessage(msgg[type], 'audio')
}
let buffer = Buffer.from([])
for await (const chunk of media) {
buffer = Buffer.concat([buffer, chunk])
}
if (/image|video/.test(type)) {
const caption = `*━━━ \`𝘼𝙉𝙏𝙄 𝙀𝙇𝙄𝙈𝙄𝙉𝘼𝙍\` ━━━*
*┃ ViewOnce (eliminado)*
- *Nombre:* @${participant.split`@`[0]}
${msg.chat.endsWith('@g.us') ? `- *Grupo:* ${await conn.getName(msg.chat)}` : '- *Chat privado*'}
${msgg[type].caption ? `- *Texto:* ${msgg[type].caption}` : '- *Texto:* _sin_texto_'}`
return await conn.sendFile(conn.user.jid, buffer, null, caption, null, null, { mentions: conn.parseMention(caption), quoted: msg })
} else if (/audio/.test(type)) {
await conn.reply(conn.user.jid, `*━━━ \`𝘼𝙉𝙏𝙄 𝙀𝙇𝙄𝙈𝙄𝙉𝘼𝙍\` ━━━*
*┃ ViewOnce (eliminado)*
- *Nombre:* @${participant.split`@`[0]}
${msg.chat.endsWith('@g.us') ? `- *Grupo:* ${await conn.getName(msg.chat)}` : '- *Chat privado*'}
- *Tipo:* Nota de voz🔊`, m, { mentions: [participant], quoted: msg })
await conn.sendMessage(conn.user.jid, { audio: buffer, ptt: true }, { quoted: msg })
}}
let isImageOrVideo = msg.mtype === 'imageMessage' || msg.mtype === 'videoMessage'
if (msg.text && !isImageOrVideo) {
const deleteMsg = `*━━━ \`𝘼𝙉𝙏𝙄 𝙀𝙇𝙄𝙈𝙄𝙉𝘼𝙍\` ━━━*
*┃ Nombre:* @${participant.split`@`[0]}
${msg.chat.endsWith('@g.us') ? `*┃ Grupo:* ${await conn.getName(msg.chat)}` : '*┃ Chat privado*'}
- *📝Mensaje:* ${msg.text}
*━━━ \`𝘼𝙉𝙏𝙄 𝙀𝙇𝙄𝙈𝙄𝙉𝘼𝙍\` ━━━*`
await this.sendMessage(conn.user.jid, { text: deleteMsg, mentions: conn.parseMention(deleteMsg) }, { quoted: msg })
} else if (isImageOrVideo) {
const iOV = `*━━━ \`𝘼𝙉𝙏𝙄 𝙀𝙇𝙄𝙈𝙄𝙉𝘼𝙍\` ━━━*
*┃ Nombre:* @${participant.split`@`[0]}
${msg.chat.endsWith('@g.us') ? `*┃ Grupo:* ${await conn.getName(msg.chat)}` : '*┃ Chat privado*'}
${msg.text ? `- *Texto:* ${msg.text}` : '- *Texto:* _sin_texto_'}`
let img = await msg.download?.()
await conn.sendFile(conn.user.jid, img, null, iOV, null, null, { mentions: conn.parseMention(iOV), quoted: msg })
} else if (msg.mtype === 'stickerMessage') {
await conn.sendMessage(conn.user.jid, { text: `*━━━ \`𝘼𝙉𝙏𝙄 𝙀𝙇𝙄𝙈𝙄𝙉𝘼𝙍\` ━━━*
*┃ Nombre:* @${participant.split`@`[0]}
${msg.chat.endsWith('@g.us') ? `*┃ Grupo:* ${await conn.getName(msg.chat)}` : '*┃ Chat privado*'}
*┃ Reenviando sticker..*
*━━━ 👇🏻👇🏻👇🏻👇🏻👇🏻 ━━━*`, mentions: [participant] }, { quoted: msg })
this.copyNForward(conn.user.jid, msg)
} else if (!isOnce) {
await conn.sendMessage(conn.user.jid, { text: `*━━━ \`𝘼𝙉𝙏𝙄 𝙀𝙇𝙄𝙈𝙄𝙉𝘼𝙍\` ━━━*
*┃ Nombre:* @${participant.split`@`[0]}
${msg.chat.endsWith('@g.us') ? `*┃ Grupo:* ${await conn.getName(msg.chat)}` : '*┃ Chat privado*'}
*┃ Reenviando contenido borrado..*
*━━━ 👇🏻👇🏻👇🏻👇🏻👇🏻 ━━━*`, mentions: [participant] }, { quoted: msg })
this.copyNForward(conn.user.jid, msg)
}}
