const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')

const port = Number(process.env.PORT || 3000)
const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'))

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(html)
    return
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end('Not found')
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Preview server listening on port ${port}`)
})
