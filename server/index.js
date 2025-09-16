const http = require("http");
const packs = require("../src/data/packs.json");

const PORT = process.env.PORT || 4000;

function sendJson(res, statusCode, data) {
  const payload = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(payload);
}

function handleRequest(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Método no permitido" });
    return;
  }

  const requestUrl = new URL(req.url, "http://localhost");
  const segments = requestUrl.pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    sendJson(res, 200, {
      message: "API de paquetes Lingua Avventura",
      routes: ["GET /packs", "GET /packs/:lang"],
    });
    return;
  }

  if (segments[0] !== "packs") {
    sendJson(res, 404, { error: "Ruta no encontrada" });
    return;
  }

  if (segments.length === 1) {
    sendJson(res, 200, { languages: Object.keys(packs) });
    return;
  }

  const lang = segments[1];
  const pack = packs[lang];

  if (!pack) {
    sendJson(res, 404, { error: `No existe un paquete para "${lang}"` });
    return;
  }

  sendJson(res, 200, { lang, words: pack });
}

const server = http.createServer(handleRequest);

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`API de packs activa en http://localhost:${PORT}`);
  });
}

module.exports = server;
