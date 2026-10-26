const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')

const port = Number(process.env.PORT || 3000)
const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'))
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
const telegramChatId = process.env.TELEGRAM_CHAT_ID

if (!telegramBotToken || !telegramChatId) {
  console.warn('[telegram] TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID belum tersedia')
}

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 10_000) reject(new Error('Payload terlalu besar'))
    })
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')) } catch { reject(new Error('Format data tidak valid')) }
    })
    req.on('error', reject)
  })
}

async function sendTelegramMessage(text) {
  const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: telegramChatId, text, disable_web_page_preview: true }),
    signal: AbortSignal.timeout(12_000)
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || !result.ok) throw new Error(result.description || 'Telegram menolak pesan')
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(html)
    return
  }

  if (req.method === 'POST' && req.url === '/api/telegram') {
    if (!telegramBotToken || !telegramChatId) {
      sendJson(res, 503, { ok: false, error: 'Bot Telegram belum aktif di runtime server. Pastikan variabel proyek TELEGRAM_BOT_TOKEN dan TELEGRAM_CHAT_ID tersedia pada deployment.' })
      return
    }

    try {
      const data = await readJsonBody(req)
      const email = typeof data.email === 'string' ? data.email.trim().slice(0, 160) : ''
      const reference = typeof data.reference === 'string' ? data.reference.trim().slice(0, 160) : ''
      if (!reference) {
        sendJson(res, 400, { ok: false, error: 'Kode referensi wajib diisi.' })
        return
      }

      const message = [
        'Pesan baru dari Kiosplay Live Tracking',
        '',
        `Email kontak: ${email || '(tidak diisi)'}`,
        `Kode referensi: ${reference}`,
        `Waktu: ${new Date().toISOString()}`
      ].join('\\n')
      await sendTelegramMessage(message)
      sendJson(res, 200, { ok: true })
    } catch (error) {
      console.error('[telegram] gagal mengirim:', error.message)
      sendJson(res, 502, { ok: false, error: 'Pesan belum berhasil dikirim ke Telegram.' })
    }
    return
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end('Not found')
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Preview server listening on port ${port}`)
})
