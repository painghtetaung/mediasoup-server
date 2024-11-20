import "dotenv/config";
import express from "express";
// import fs from "fs";
// import path from "path";
import http from "http";
import mediasoup from "mediasoup";
import { Server } from "socket.io";
// const __dirname = path.resolve();
const app = express();

// const options = {
//   key: fs.readFileSync(path.join(__dirname, "cert.key")),
//   cert: fs.readFileSync(path.join(__dirname, "cert.crt")),
// };

const server = http.createServer(app);

app.get("/", (req, res) => {
  res.send("Hello World");
});

server.listen(process.env.PORT || 8000, () =>
  console.log("server is running on port 8000"),
);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const peers = io.of("/mediasoup");

let worker;
let router;
let producerTransport;
let consumerTransport;
let producer;
let consumer;
// create worker
const createWorker = async () => {
  worker = await mediasoup.createWorker({
    // logLevel: "warn",
    rtcMinPort: 2000,
    rtcMaxPort: 2020,
  });
  console.log("worker created", worker.pid);
  worker.on("died", (error) => {
    console.error("mediasoup worker died, exiting in 2 seconds...");
    setTimeout(() => process.exit(1), 2000);
  });
  return worker;
};

worker = createWorker();

const mediaCodecs = [
  {
    kind: "audio",
    mimeType: "audio/opus",
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: "video",
    mimeType: "video/VP8",
    clockRate: 90000,
    parameters: {
      "x-google-start-bitrate": 1000,
    },
  },
];

peers.on("connection", async (socket) => {
  console.log("connection-success", socket.id);
  socket.emit("connection-success", {
    socketId: socket.id,
    exitsProducer: producer ? true : false,
  });

  socket.on("disconnect", () => {
    console.log("peer disconnected");
  });

  socket.on("createRoom", async (callback) => {
    if (router === undefined) {
      router = await worker.createRouter({ mediaCodecs });
      console.log("router created ID:", router.id);
    }
    getRtpCapabilities(callback);
  });

  const getRtpCapabilities = async (callback) => {
    const rtpCapabilities = router.rtpCapabilities;
    console.log("rtpCapabilities", rtpCapabilities);
    callback({ rtpCapabilities });
  };

  // router = await worker.createRouter({ mediaCodecs });

  socket.on("getRtpCapabilities", (callback) => {
    const rtpCapabilities = router.rtpCapabilities;
    console.log("rtpCapabilities", rtpCapabilities);
    callback({ rtpCapabilities });
  });

  socket.on("createWebRtcTransport", async ({ sender }, callback) => {
    console.log("Is this a sender request?", sender);
    if (sender) {
      producerTransport = await createWebRtcTransport(callback);
    } else {
      consumerTransport = await createWebRtcTransport(callback);
    }
  });

  socket.on("transport-connect", async ({ dtlsParameters }) => {
    console.log("transport-connect", dtlsParameters);

    await producerTransport.connect({
      dtlsParameters,
    });
  });

  socket.on(
    "transport-produce",
    async ({ kind, rtpParameters, appData }, callback) => {
      console.log("transport-produce", kind, rtpParameters, appData);
      producer = await producerTransport.produce({
        kind,
        rtpParameters,
      });

      console.log("producer created", producer);

      producer.on("transportclose", () => {
        console.log("transport for this producer closed");
        producer.close();
      });

      callback({ id: producer.id });
    },
  );

  socket.on("transport-recv-connect", async ({ dtlsParameters }) => {
    console.log("DTLS PRAMS: ", dtlsParameters);
    await consumerTransport.connect({ dtlsParameters });
  });

  socket.on("consume", async ({ rtpCapabilities }, callback) => {
    console.log("consume", rtpCapabilities);
    try {
      if (router.canConsume({ producerId: producer.id, rtpCapabilities })) {
        consumer = await consumerTransport.consume({
          producerId: producer.id,
          rtpCapabilities,
          paused: true,
        });
        consumer.on("transportclose", () => {
          console.log("transport close from consumer");
          //   consumer.close();
        });
        consumer.on("producerclose", () => {
          console.log("producer of consumer closed");
        });

        const params = {
          id: consumer.id,
          producerId: consumer.producerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
        };

        callback({ params });
      }
    } catch (error) {
      callback({
        params: {
          error: error,
        },
      });
    }
  });

  socket.on("consumer-resume", async () => {
    console.log("consumer resume");
    await consumer.resume();
  });
});

const createWebRtcTransport = async (callback) => {
  try {
    const webRtcTransport_options = {
      listenIps: [{ ip: "127.0.0.1" }],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    };
    let transport = await router.createWebRtcTransport(webRtcTransport_options);
    console.log("transport id:", transport.id);
    transport.on("dtlsstatechange", async (dtlsState) => {
      if (dtlsState === "closed") {
        await transport.close();
      }
    });
    transport.on("close", async (connectionState) => {
      console.log("transport closed");
    });
    callback({
      params: {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      },
    });
    return transport;
  } catch (error) {
    console.log("error in createWebRtcTransport", error);
    callback({ params: { error: error } });
  }
};

console.log("worker", worker);

// const users = {};

// const socketToRoom = {};

// io.on("connection", (socket) => {
//   console.log("new connection", socket.id);
//   socket.on("join room", (roomID) => {
//     if (users[roomID]) {
//       const length = users[roomID].length;
//       if (length === 4) {
//         socket.emit("room full");
//         return;
//       }
//       //   if (!users[roomID].includes(socket.id)) {
//       users[roomID].push(socket.id);
//       //   }
//     } else {
//       users[roomID] = [socket.id];
//     }
//     socketToRoom[socket.id] = roomID;
//     const usersInThisRoom = users[roomID].filter((id) => id !== socket.id);

//     socket.emit("all users", usersInThisRoom);
//   });

//   socket.on("sending signal", (payload) => {
//     io.to(payload.userToSignal).emit("user joined", {
//       signal: payload.signal,
//       callerID: payload.callerID,
//     });
//   });

//   socket.on("returning signal", (payload) => {
//     io.to(payload.callerID).emit("receiving returned signal", {
//       signal: payload.signal,
//       id: socket.id,
//     });
//   });

//   socket.on("disconnect", () => {
//     const roomID = socketToRoom[socket.id];
//     let room = users[roomID];
//     if (room) {
//       room = room.filter((id) => id !== socket.id);
//       users[roomID] = room;
//     }
//   });
// });

// server.listen(process.env.PORT || 8000, () =>
//   console.log("server is running on port 8000"),
// );
