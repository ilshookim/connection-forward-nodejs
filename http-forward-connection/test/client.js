const Http = require(`http`);
const WS = require(`ws`);

// options
const ip = `localhost`;
const port = 8080;
const httpUrl = `http://${ip}:${port}/`;
const wsUrl = `ws://${ip}:${port}/`;

// http get
Http.get(httpUrl, res => {
  const data = [];
  const headerDate = res.headers && res.headers.date ? res.headers.date : `no response date`;
  console.log(`Status Code:`, res.statusCode);
  console.log(`Date in Response header:`, headerDate);

  res.on(`data`, chunk => {
    data.push(chunk);
  });

  res.on(`end`, () => {
    console.log(`Response ended: ${Buffer.concat(data).toString()}`);
  });
}).on(`error`, err => {
  console.log(`Error: `, err.message);
});

// websocket connect
const ws = new WS.WebSocket(wsUrl);

ws.on(`open`, function open() {
  console.log(`connected`);
  ws.send(Date.now());
});

ws.on(`close`, function close() {
  console.log(`disconnected`);
});

ws.on(`message`, function message(data) {
  console.log(`Round-trip time: ${Date.now() - data} ms`);
});
