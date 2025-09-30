const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} = require('@whiskeysockets/baileys')

const P = require('pino')
const qrcode = require('qrcode-terminal') // <== Tambahkan ini

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth')
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    logger: P({ level: 'silent' }),
    auth: state
  })

  // Tampilkan QR code dengan qrcode-terminal
  sock.ev.on('connection.update', (update) => {
    const { qr, connection, lastDisconnect } = update

    if (qr) {
      console.log('🔐 Scan QR ini untuk login WhatsApp:')
      qrcode.generate(qr, { small: true }) // <== Menampilkan QR visual di terminal
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      console.log('❌ Koneksi terputus. Reconnect?', shouldReconnect)
      if (shouldReconnect) startBot()
    }

    if (connection === 'open') {
      console.log('✅ Bot berhasil terhubung ke WhatsApp!')
    }
  })

  // Simpan perubahan sesi login
  sock.ev.on('creds.update', saveCreds)

  // Event: Respon pesan masuk
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    const sender = msg.key.remoteJid
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ''

    console.log(`📩 Pesan dari ${sender}: ${text}`)

    if (text.toLowerCase() === 'halo') {
      await sock.sendMessage(sender, { text: 'Halo juga! Ada yang bisa saya bantu?' })
    }
  })
}

startBot()
