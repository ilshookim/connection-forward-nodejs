`use strict`

const Addon = require('bindings')('addon.node')
const Cluster = require(`cluster`);
const Express = require(`express`);
const Https = require(`https`);
const Http = require(`http`);
const Net = require(`net`);
const Fs = require(`fs`);
const Os = require(`os`);
const Ws = require(`ws`);

// declared options
const opts = {
  httpPort: 8080,
  httpsPort: 8081,
  secureKeyCert: {
    key: Fs.readFileSync('secure.key'),
    cert: Fs.readFileSync('secure.pem')
  },
  loadBalance: `round-robin`,
  workers: Os.cpus().length,
};

// ready to server or worker on node-clustering
if (Cluster.isMaster) onServerProcess(opts);
if (Cluster.isWorker) onWorkerProcess(opts);


// -------------------- functions

// launched server process on node-clustering
function onServerProcess(opts) {
  // http server listen to port 8080
  const http = Net.createServer({ pauseOnConnect: true });
  http.listen(opts.httpPort, function onHttpListen() {
    console.log(`${process.pid}| http listen=${opts.httpPort}`);
  });
  http.on(`connection`, function onTcpConnect(socket) {
    const workerIndex = loadBalance(socket, opts.workers, opts.loadBalance);
    forwardSocket(workerIndex, `${opts.httpPort}`, socket);
  });

  // https server listen to port 8081
  const https = Net.createServer({ pauseOnConnect: true, ...opts.secureOptions });
  https.listen(opts.httpsPort, function onTlsListen() {
    console.log(`${process.pid}| https listen=${opts.httpsPort}`);
  });
  https.on(`connection`, function onTlsConnect(socket) {
    const workerIndex = loadBalance(socket, opts.workers, opts.loadBalance);
    forwardSocket(workerIndex, `${opts.httpsPort}`, socket);
  });

  // worker processes are spawned
  const workers = [];
  for (let index = 0; index < opts.workers; index++) {
    spawn(index);
  }

  // -------------------- functions

  // spawn worker process
  function spawn(index) {
    workers[index] = Cluster.fork();
    workers[index].on(`exit`, function onExit(exitCode, signal) {
      if (0 !== exitCode) spawn(index);
    });
  }

  // load balancing incoming client connections to worker processes
  function loadBalance(socket, total = Os.cpus().length, algorithm = `round-robin`) {
    if (undefined === loadBalance.index) {
      loadBalance.index = -1;
    }
    if (`ip-hash` === algorithm) {
      loadBalance.index = Number(socket.remoteAddress.replace(/\D/g,'')) % total;
    } else if (`round-robin` === algorithm) {
      loadBalance.index = (loadBalance.index + 1) % total;
    } else {
      loadBalance.index = (loadBalance.index + 1) % total;
    }
    return loadBalance.index;
  }

  // forward client connection to worker process
  function forwardSocket(workerIndex, message, socket) {
    const worker = workers[workerIndex];
    if (worker) worker.send(message, socket);

    const fd = socket.server._handle.fd;
    // const add = Addon.add(process.pid, fd);
    console.log(`${process.pid}| message=${message}, workerIndex=${workerIndex}, fd=${fd}`);
  }
}

// launched worker process on node-clustering
function onWorkerProcess(opts) {
  // prepared worker application supported http, https, ws, wss procotols
  const app = Express();
  const http = Http.createServer(app).listen(0, `localhost`);
  const https = Https.createServer(opts.secureOptions, app).listen(0, `localhost`);
  const ws = new Ws.Server({server: http});
  const wss = new Ws.Server({server: https});

  // worker process received incoming port and socket from server process
  process.on(`message`, function onMessage(message, socket) {
    if (message === `${opts.httpPort}`) http.emit(`connection`, socket);
    if (message === `${opts.httpsPort}`) https.emit(`connection`, socket);

    const fd = socket._handle.fd;
    // const add = Addon.add(process.pid, fd);
    console.log(`${process.pid}| message=${message}, fd=${fd}`);

    socket.on(`close`, function onClose() {
      console.log(`${process.pid}| closed message=${message}, fd=${fd}`);
    });
  });

  // settings to worker application
  app.disable(`x-powered-by`);
  app.use(Express.urlencoded({extended: false}));
  app.use(Express.json());

  app.get(`/`, function onGet(req, res) {
    res.send(`${process.pid}| ${req.secure ? `https` : `http`} uptime=${process.uptime()} seconds`);
    console.log(`${process.pid}| ${req.secure ? `https` : `http`} uptime=${process.uptime()} seconds`);
  });

  ws.on('connection', function onWebSocket(ws) {
    ws.on('message', function onWsEchoMessage(data, isBinary) {
      console.log(`${process.pid}| ws echo=${data}`);
      ws.send(data);
    });
  });

  wss.on('connection', function onWebSocketSecure(wss) {
    wss.on('message', function onWssEchoMessage(data, isBinary) {
      console.log(`${process.pid}| wss echo=${data}`);
      wss.send(data);
    });
  });
}
