import path from 'path'
import fetch from 'node-fetch'
import fs from 'fs'
import { fileTypeFromBuffer } from 'file-type'
import { fileURLToPath } from 'url'
import store from './store.js'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const {
default: _makeWaSocket,
makeWALegacySocket,
proto,
downloadContentFromMessage,
jidDecode,
areJidsSameUser,
generateForwardMessageContent,
generateWAMessageFromContent,
WAMessageStubType,
extractMessageContent
} = (await import('@whiskeysockets/baileys')).default
export function makeWASocket(connectionOptions, options = {}) {
let conn = (global.opts['legacy'] ? makeWALegacySocket : _makeWaSocket)(connectionOptions)
let sock = Object.defineProperties(conn, {
chats: {
value: { ...(options.chats || {}) },
writable: true
},
decodeJid: {
value(jid) {
if (!jid || typeof jid !== 'string') return null
return jid.decodeJid()
}},
getFile: {
async value(PATH, saveToFile = false) {
let res, filename
const data = Buffer.isBuffer(PATH) ? PATH : PATH instanceof ArrayBuffer ? PATH.toBuffer() : /^data:.*?\/.*?;base64,/i.test(PATH) ? Buffer.from(PATH.split`,`[1], 'base64') : /^https?:\/\//.test(PATH) ? await (res = await fetch(PATH)).buffer() : fs.existsSync(PATH) ? (filename = PATH, fs.readFileSync(PATH)) : typeof PATH === 'string' ? PATH : Buffer.alloc(0)
if (!Buffer.isBuffer(data)) throw new TypeError('Result is not a buffer')
const type = await fileTypeFromBuffer(data) || {
mime: 'application/octet-stream',
ext: '.bin'
}
if (data && saveToFile && !filename) (filename = path.join(__dirname, '../tmp/' + new Date * 1 + '.' + type.ext), await fs.promises.writeFile(filename, data))
return {
res,
filename,
...type,
data,
deleteFile() {
return filename && fs.promises.unlink(filename)
}}},
enumerable: true
},
sendFile: {
async value(jid, path, filename = '', caption = '', quoted, ptt = false, options = {}) {
let type = await conn.getFile(path, true)
let { res, data: file, filename: pathFile } = type
if (res && res.status !== 200 || file.length <= 65536) {
try { throw { json: JSON.parse(file.toString()) } }
catch (e) { if (e.json) throw e.json }
}
let opt = {}
if (quoted) opt.quoted = quoted
if (!type) options.asDocument = true
let mtype = '', mimetype = options.mimetype || type.mime, convert
if (/image/.test(type.mime) || (/webp/.test(type.mime) && options.asImage)) mtype = 'image'
else if (/video/.test(type.mime)) mtype = 'video'
delete options.asVideo
delete options.asImage
let message = {
...options,
caption,
ptt,
[mtype]: { url: pathFile },
mimetype,
fileName: filename || pathFile.split('/').pop()
}
let m
try {
m = await conn.sendMessage(jid, message, { ...opt, ...options })
} catch (e) {
console.error(e)
m = null
} finally {
if (!m) m = await conn.sendMessage(jid, { ...message, [mtype]: file }, { ...opt, ...options })
file = null
return m
}},
enumerable: true
},
reply: {
value(jid, text = '', quoted, options) {
return Buffer.isBuffer(text) ? conn.sendFile(jid, text, 'file', '', quoted, false, options) : conn.sendMessage(jid, { ...options, text }, { quoted, ...options })
}},
copyNForward: {
async value(jid, message, forwardingScore = true, options = {}) {
let vtype
if (options.readViewOnce && message.message.viewOnceMessage?.message) {
vtype = Object.keys(message.message.viewOnceMessage.message)[0]
delete message.message.viewOnceMessage.message[vtype].viewOnce
message.message = proto.Message.fromObject(
JSON.parse(JSON.stringify(message.message.viewOnceMessage.message))
)
message.message[vtype].contextInfo = message.message.viewOnceMessage.contextInfo
}
let mtype = Object.keys(message.message)[0]
let m = generateForwardMessageContent(message, !!forwardingScore)
let ctype = Object.keys(m)[0]
if (forwardingScore && typeof forwardingScore === 'number' && forwardingScore > 1) m[ctype].contextInfo.forwardingScore += forwardingScore
m[ctype].contextInfo = {
...(message.message[mtype].contextInfo || {}),
...(m[ctype].contextInfo || {})
}
m = generateWAMessageFromContent(jid, m, {
...options,
userJid: conn.user.jid
})
await conn.relayMessage(jid, m.message, { messageId: m.key.id, additionalAttributes: { ...options } })
return m
},
enumerable: true
},
downloadM: {
async value(m, type, saveToFile) {
let filename
if (!m || !(m.url || m.directPath)) return Buffer.alloc(0)
const stream = await downloadContentFromMessage(m, type)
let buffer = Buffer.from([])
for await (const chunk of stream) {
buffer = Buffer.concat([buffer, chunk])
}
if (saveToFile) ({ filename } = await conn.getFile(buffer, true))
return saveToFile && fs.existsSync(filename) ? filename : buffer
},
enumerable: true
},
parseMention: {
value(text = '') {
return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net')
},
enumerable: true
},
getName: {
value(jid = '') {
jid = conn.decodeJid(jid)
let v
if (jid.endsWith('@g.us')) return new Promise(async (resolve) => {
v = conn.chats[jid]
resolve(v.subject)
})
return v.subject
},
enumerable: true
},
loadMessage: {
value(messageID) {
return Object.entries(conn.chats)
.filter(([_, { messages }]) => typeof messages === 'object')
.find(([_, { messages }]) => Object.entries(messages)
.find(([k, v]) => (k === messageID || v.key?.id === messageID)))
?.[1].messages?.[messageID]
},
enumerable: true
},
processMessageStubType: {
async value(m) {
if (!m.messageStubType) return
const chat = conn.decodeJid(m.key.remoteJid || m.message?.senderKeyDistributionMessage?.groupId || '')
if (!chat || chat === 'status@broadcast') return
switch (m.messageStubType) {
default: {
break
}}
const isGroup = chat.endsWith('@g.us')
if (!isGroup) return
let chats = conn.chats[chat]
if (!chats) chats = conn.chats[chat] = { id: chat }
chats.isChats = true
const metadata = await conn.groupMetadata(chat).catch(_ => null)
if (!metadata) return
chats.metadata = metadata
}},
insertAllGroup: {
async value() {
const groups = await conn.groupFetchAllParticipating().catch(_ => null) || {}
for (const group in groups) conn.chats[group] = { ...(conn.chats[group] || {}), id: group, subject: groups[group].subject, isChats: true, metadata: groups[group] }
return conn.chats
}},
pushMessage: {
async value(m) {
if (!m) return
if (!Array.isArray(m)) m = [m]
for (const message of m) {
try {
if (!message) continue
if (message.messageStubType && message.messageStubType != WAMessageStubType.CIPHERTEXT) conn.processMessageStubType(message).catch(console.error)
const _mtype = Object.keys(message.message || {})
const mtype = (!['senderKeyDistributionMessage', 'messageContextInfo'].includes(_mtype[0]) && _mtype[0]) ||
(_mtype.length >= 3 && _mtype[1] !== 'messageContextInfo' && _mtype[1]) ||
_mtype[_mtype.length - 1]
const chat = conn.decodeJid(message.key.remoteJid || message.message?.senderKeyDistributionMessage?.groupId || '')
if (message.message?.[mtype]?.contextInfo?.quotedMessage) {
let context = message.message[mtype].contextInfo
let participant = conn.decodeJid(context.participant)
const remoteJid = conn.decodeJid(context.remoteJid || participant)
let quoted = message.message[mtype].contextInfo.quotedMessage
if ((remoteJid && remoteJid !== 'status@broadcast') && quoted) {
let qMtype = Object.keys(quoted)[0]
if (qMtype == 'conversation') {
quoted.extendedTextMessage = { text: quoted[qMtype] }
delete quoted.conversation
qMtype = 'extendedTextMessage'
}
const isGroup = remoteJid.endsWith('g.us')
if (isGroup && !participant) participant = remoteJid
const qM = {
key: {
remoteJid,
fromMe: areJidsSameUser(conn.user.jid, remoteJid),
id: context.stanzaId,
participant,
},
message: JSON.parse(JSON.stringify(quoted)),
...(isGroup ? { participant } : {})
}
let qChats = conn.chats[participant]
if (!qChats) qChats = conn.chats[participant] = { id: participant, isChats: !isGroup }
if (!qChats.messages) qChats.messages = {}
if (!qChats.messages[context.stanzaId] && !qM.key.fromMe) qChats.messages[context.stanzaId] = qM
let qChatsMessages
if ((qChatsMessages = Object.entries(qChats.messages)).length > 40) qChats.messages = Object.fromEntries(qChatsMessages.slice(30, qChatsMessages.length))
}}
if (!chat || chat === 'status@broadcast') continue
const isGroup = chat.endsWith('@g.us')
let chats = conn.chats[chat]
if (!chats) {
if (isGroup) await conn.insertAllGroup().catch(console.error)
chats = conn.chats[chat] = { id: chat, isChats: true, ...(conn.chats[chat] || {}) }
}
let metadata, sender
if (isGroup) {
if (!chats.subject || !chats.metadata) {
metadata = await conn.groupMetadata(chat).catch(_ => ({})) || {}
if (!chats.subject) chats.subject = metadata.subject || ''
if (!chats.metadata) chats.metadata = metadata
}
sender = conn.decodeJid(message.key?.fromMe && conn.user.id || message.participant || message.key?.participant || chat || '')
if (sender !== chat) {
let chats = conn.chats[sender]
if (!chats) chats = conn.chats[sender] = { id: sender }
if (!chats.name) chats.name = message.pushName || chats.name || ''
}} else if (!chats.name) chats.name = message.pushName || chats.name || ''
if (['senderKeyDistributionMessage', 'messageContextInfo'].includes(mtype)) continue
chats.isChats = true
if (!chats.messages) chats.messages = {}
const fromMe = message.key.fromMe || areJidsSameUser(sender || chat, conn.user.id)
if (!['protocolMessage'].includes(mtype) && !fromMe && message.messageStubType != WAMessageStubType.CIPHERTEXT && message.message) {
delete message.message.messageContextInfo
delete message.message.senderKeyDistributionMessage
chats.messages[message.key.id] = JSON.parse(JSON.stringify(message, null, 2))
let chatsMessages
if ((chatsMessages = Object.entries(chats.messages)).length > 40) chats.messages = Object.fromEntries(chatsMessages.slice(30, chatsMessages.length))
}} catch (e) {
console.error(e)
}}}},
serializeM: {
value(m) {
return smsg(conn, m)
}}})
if (sock.user?.id) sock.user.jid = sock.decodeJid(sock.user.id)
store.bind(sock)
return sock
}
export function smsg(conn, m) {
if (!m) return m
let M = proto.WebMessageInfo
m = M.fromObject(m)
m.conn = conn
let protocolMessageKey
if (m.message) {
if (m.mtype == 'protocolMessage' && m.msg.key) {
protocolMessageKey = m.msg.key
if (protocolMessageKey == 'status@broadcast') protocolMessageKey.remoteJid = m.chat
if (!protocolMessageKey.participant || protocolMessageKey.participant == 'status_me') protocolMessageKey.participant = m.sender
protocolMessageKey.fromMe = conn.decodeJid(protocolMessageKey.participant) === conn.decodeJid(conn.user.id)
if (!protocolMessageKey.fromMe && protocolMessageKey.remoteJid === conn.decodeJid(conn.user.id)) protocolMessageKey.remoteJid = m.sender
}
if (m.quoted) if (!m.quoted.mediaMessage) delete m.quoted.download
}
if (!m.mediaMessage) delete m.download
try {
if (protocolMessageKey && m.mtype == 'protocolMessage') conn.ev.emit('message.delete', protocolMessageKey)
} catch (e) {
console.error(e)
}
return m
}
export function serialize() {
const MediaType = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage']
return Object.defineProperties(proto.WebMessageInfo.prototype, {
conn: {
value: undefined,
enumerable: false,
writable: true
},
id: {
get() {
return this.key?.id
}},
chat: {
get() {
const senderKeyDistributionMessage = this.message?.senderKeyDistributionMessage?.groupId
return (
this.key?.remoteJid ||
(senderKeyDistributionMessage &&
senderKeyDistributionMessage !== 'status@broadcast'
) || ''
).decodeJid()
}},
isGroup: {
get() {
return this.chat.endsWith('@g.us')
},
enumerable: true
},
sender: {
get() {
return this.conn?.decodeJid(this.key?.fromMe && this.conn?.user.id || this.participant || this.key.participant || this.chat || '')
},
enumerable: true
},
fromMe: {
get() {
return this.key?.fromMe || areJidsSameUser(this.conn?.user.id, this.sender) || false
}},
mtype: {
get() {
if (!this.message) return ''
const type = Object.keys(this.message)
return (!['senderKeyDistributionMessage', 'messageContextInfo'].includes(type[0]) && type[0]) ||
(type.length >= 3 && type[1] !== 'messageContextInfo' && type[1]) ||
type[type.length - 1]
},
enumerable: true
},
msg: {
get() {
if (!this.message) return null
return this.message[this.mtype]
}},
mediaMessage: {
get() {
if (!this.message) return null
const Message = ((this.msg?.url || this.msg?.directPath) ? { ...this.message } : extractMessageContent(this.message)) || null
if (!Message) return null
const mtype = Object.keys(Message)[0]
return MediaType.includes(mtype) ? Message : null
},
enumerable: true
},
mediaType: {
get() {
let message
if (!(message = this.mediaMessage)) return null
return Object.keys(message)[0]
},
enumerable: true,
},
quoted: {
get() {
const self = this
const msg = self.msg
const contextInfo = msg?.contextInfo
const quoted = contextInfo?.quotedMessage
if (!msg || !contextInfo || !quoted) return
const type = Object.keys(quoted)[0]
let q = quoted[type]
if (typeof q === 'object' && q !== null) {
return Object.defineProperties(JSON.parse(JSON.stringify(q)), {
mediaMessage: {
get() {
const Message = ((q.url || q.directPath) ? { ...quoted } : extractMessageContent(quoted)) || null
if (!Message) return null
const mtype = Object.keys(Message)[0]
return MediaType.includes(mtype) ? Message : null
},
enumerable: true
},
mediaType: {
get() {
let message
if (!(message = this.mediaMessage)) return null
return Object.keys(message)[0]
},
enumerable: true,
},
download: {
value(saveToFile = false) {
const mtype = this.mediaType
return self.conn?.downloadM(this.mediaMessage[mtype], mtype.replace(/message/i, ''), saveToFile)
},
enumerable: true,
configurable: true,
}})}
},
enumerable: true
},
_text: {
value: null,
writable: true,
},
text: {
get() {
const msg = this.msg
const text = (typeof msg === 'string' ? msg : msg?.text) || msg?.caption || msg?.contentText || ''
return typeof this._text === 'string' ? this._text : '' || (typeof text === 'string' ? text : (
text?.selectedDisplayText ||
text?.hydratedTemplate?.hydratedContentText ||
text
)) || ''
},
set(str) {
return this._text = str
},
enumerable: true
},
download: {
value(saveToFile = false) {
const mtype = this.mediaType
return this.conn?.downloadM(this.mediaMessage[mtype], mtype.replace(/message/i, ''), saveToFile)
},
enumerable: true,
configurable: true
}})
}
export function protoType() {
String.prototype.decodeJid = function decodeJid() {
if (/:\d+@/gi.test(this)) {
const decode = jidDecode(this) || {}
return (decode.user && decode.server && decode.user + '@' + decode.server || this).trim()
} else return this.trim()
}}