const { proto } = (await import('@whiskeysockets/baileys')).default
import fs from 'fs'
export async function handler(chatUpdate) {
if (!chatUpdate) {
return
}
if (!chatUpdate || !chatUpdate.messages) return
let m = chatUpdate.messages[chatUpdate.messages.length - 1]
if (!m) return
let M = proto.WebMessageInfo
m = M.fromObject(m)
m.conn = conn
if (!m) return
const { text } = extractText(m)
m.text = text
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
}}
function extractText(message) {
if (!message || !message.message) return { text: '', mtype: '' }
const type = Object.keys(message.message);
const mtype = (!['senderKeyDistributionMessage', 'messageContextInfo'].includes(type[0]) && type[0]) || (type.length >= 3 && type[1] !== 'messageContextInfo' && type[1]) || type[type.length - 1] || ''
const msg = message.message[mtype]
const text = (typeof msg === 'string' ? msg : msg?.text) || msg?.caption || msg?.contentText || '' || (msg?.selectedDisplayText || msg?.hydratedTemplate?.hydratedContentText || msg)
return {
text: typeof text === 'string' ? text : ''
}}
