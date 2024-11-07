import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { setupMaster, fork } from 'cluster'
const __dirname = dirname(fileURLToPath(import.meta.url))
var isRunning = false
async function start(file) {
if (isRunning) return
isRunning = true
let args = [join(__dirname, file), ...process.argv.slice(2)]
setupMaster({exec: args[0], args: args.slice(1)
})
let p = fork()
p.on('exit', (_, code) => {
isRunning = false
console.error('⚠️ ERROR ⚠️ >> ', code)
start('main.js')
if (code === 0) return
})
}
start('main.js')