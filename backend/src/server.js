const app = require("./app");
const { port } = require("./config");
const { initWebSocketServer } = require("./services/websocket");

const server = app.listen(port, () => {
  console.log(`SARA backend listening on port ${port}`);
});

// Inicializar servidor WebSocket sobre el mismo servidor HTTP
initWebSocketServer(server);
