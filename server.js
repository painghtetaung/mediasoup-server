import "dotenv/config";
import express from "express";
// import fs from "fs";
// import path from "path";
import { createServer } from "http";
import mediasoup from "mediasoup";
import { Server } from "socket.io";
// const __dirname = path.resolve();
const app = express();

// const options = {
//   key: fs.readFileSync(path.join(__dirname, "cert.key")),
//   cert: fs.readFileSync(path.join(__dirname, "cert.crt")),
// };

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
    transports: ['websocket', 'polling']
  },
  allowEIO3: true,
  path: "/socket.io/"
});

app.get("/", (req, res) => {
  res.send("Hello World");
});

// const connections = io.of("/");

let worker;
let rooms = {}; // { roomName1: { Router, rooms: [ sicketId1, ... ] }, ...}
let peers = {}; // { socketId1: { roomName1, socket, transports = [id1, id2,] }, producers = [id1, id2,] }, consumers = [id1, id2,], peerDetails }, ...}
let transports = []; // [ { socketId1, roomName1, transport, consumer }, ... ]
let producers = []; // [ { socketId1, roomName1, producer, }, ... ]
let consumers = []; // [ { socketId1, roomName1, consumer, }, ... ]
let connectedTransports = new Set(); // To track connected transport IDs

// create worker
const createWorker = async () => {
  worker = await mediasoup.createWorker({
    // logLevel: "warn",
    rtcMinPort: 2000,
    rtcMaxPort: 3000,
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

io.on("connection", async (socket) => {
  console.log("connection-success", socket.id);
  socket.emit("connection-success", {
    socketId: socket.id,
  });

  const removeItems = (items, socketId, itemType) => {
    items.forEach((item) => {
      if (item.socketId === socketId) {
        if (itemType === "transport") {
          connectedTransports.delete(item[itemType].id);
        }
        item[itemType]?.close();
      }
    });
    items = items.filter((item) => item.socketId !== socketId);
    return items;
  };

  socket.on("disconnect", () => {
    console.log("peer disconnected");
    consumers = removeItems(consumers, socket.id, "consumer");
    producers = removeItems(producers, socket.id, "producer");
    transports = removeItems(transports, socket.id, "transport");

    if (peers[socket.id]) {
      const { roomId } = peers[socket.id];
      if (roomId) {
        delete peers[socket.id];
        rooms[roomId] = {
          router: rooms[roomId].router,
          peers: rooms[roomId].peers.filter(
            (socketId) => socketId !== socket.id
          ),
        };
      }
    }
  });

  socket.on("joinRoom", async ({ roomId }, callback) => {
    const router1 = await createRoom(roomId, socket.id);
    peers[socket.id] = {
      socket,
      roomId,
      transports: [],
      producers: [],
      consumers: [],
      peerDetails: {
        name: "",
        isAdmin: false,
      },
    };

    const rtpCapabilities = router1.rtpCapabilities;
    callback({ rtpCapabilities });
  });

  const createRoom = async (roomId, socketId) => {
    let router1;
    let peers = [];
    if (rooms[roomId]) {
      router1 = rooms[roomId].router;
      peers = rooms[roomId].peers || [];
    } else {
      router1 = await worker.createRouter({ mediaCodecs });
    }

    console.log("Router ID:", router1.id, "Peers:", peers);
    rooms[roomId] = { router: router1, peers: [...peers, socketId] };

    return router1;
  };

  // socket.on("createRoom", async (callback) => {
  //   if (router === undefined) {
  //     router = await worker.createRouter({ mediaCodecs });
  //     console.log("router created ID:", router.id);
  //   }
  //   getRtpCapabilities(callback);
  // });

  // const getRtpCapabilities = async (callback) => {
  //   const rtpCapabilities = router.rtpCapabilities;
  //   console.log("rtpCapabilities", rtpCapabilities);
  //   callback({ rtpCapabilities });
  // };

  // router = await worker.createRouter({ mediaCodecs });

  socket.on("getRtpCapabilities", (callback) => {
    const rtpCapabilities = router.rtpCapabilities;
    console.log("rtpCapabilities", rtpCapabilities);
    callback({ rtpCapabilities });
  });

  socket.on("createWebRtcTransport", async ({ consumer }, callback) => {
    console.log("Is this a sender request?", consumer);
    const roomId = peers[socket.id]?.roomId;
    const router = rooms[roomId]?.router;

    createWebRtcTransport(router).then(
      (transport) => {
        callback({
          params: {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
          },
        });
        addTransport(transport, roomId, consumer);
      },
      (error) => {
        console.log(error);
      }
    );
  });

  const addTransport = (transport, roomId, consumer) => {
    transports = [
      ...transports,
      {
        socketId: socket.id,
        roomId,
        transport,
        consumer,
      },
    ];

    peers[socket.id] = {
      ...peers[socket.id],
      transports: [...peers[socket.id].transports, transport.id],
    };
  };

  const informConsumers = (roomId, socketId, id) => {
    console.log(`just joined, id ${id} ${roomId}, ${socketId}`);
    // A new producer just joined
    // let all consumers to consume this producer
    producers.forEach((producerData) => {
      if (
        producerData.socketId !== socketId &&
        producerData.roomId === roomId
      ) {
        const producerSocket = peers[producerData.socketId].socket;
        // use socket to send producer id to producer
        producerSocket.emit("new-producer", { producerId: id });
      }
    });
  };

  const addConsumer = (consumer, roomId) => {
    consumers = [...consumers, { socketId: socket.id, roomId, consumer }];
    peers[socket.id] = {
      ...peers[socket.id],
      consumers: [...peers[socket.id].consumers, consumer.id],
    };
  };

  const addProducer = (producer, roomId) => {
    producers = [...producers, { socketId: socket.id, roomId, producer }];
    peers[socket.id] = {
      ...peers[socket.id],
      producers: [...peers[socket.id].producers, producer.id],
    };
  };

  const getTransport = (socketId) => {
    const [producerTransport] = transports.filter(
      (transport) => transport.socketId === socketId && !transport.consumer
    );
    return producerTransport.transport;
  };

  socket.on("transport-connect", async ({ dtlsParameters }) => {
    console.log("transport-connect", dtlsParameters);
    const transport = getTransport(socket.id);

    // Check if already connected
    if (connectedTransports.has(transport.id)) {
      console.log("Transport already connected:", transport.id);
      return;
    }

    await transport.connect({ dtlsParameters });
    connectedTransports.add(transport.id);
    console.log("Transport connected:", transport.id);
  });

  socket.on(
    "transport-produce",
    async ({ kind, rtpParameters, appData }, callback) => {
      // console.log("transport-produce", kind, rtpParameters, appData);
      const producer = await getTransport(socket.id).produce({
        kind,
        rtpParameters,
      });

      const { roomId } = peers[socket.id];

      addProducer(producer, roomId);

      informConsumers(roomId, socket.id, producer.id);

      console.log("producer created", producer);

      producer.on("transportclose", () => {
        console.log("transport for this producer closed");
        producer.close();
      });

      callback({
        id: producer.id,
        producersExist: producers.length > 1 ? true : false,
      });
    }
  );

  socket.on(
    "transport-recv-connect",
    async ({ dtlsParameters, serverConsumerTransportId }) => {
      // console.log("DTLS PRAMS: ", dtlsParameters);
      // console.log("transports", transports);
      // console.log("serverConsumerTransportId", serverConsumerTransportId);
      // console.log("transports", transports[0].transport.id);
      const consumer = transports.find(
        (transport) =>
          transport.consumer &&
          transport.transport.id == serverConsumerTransportId
      );
      if (consumer && consumer.transport) {
        await consumer.transport.connect({ dtlsParameters });
      } else {
        console.log("Consumer or consumer transport not found");
      }
    }
  );

  socket.on(
    "consume",
    async (
      { rtpCapabilities, remoteProducerId, serverConsumerTransportId },
      callback
    ) => {
      try {
        const { roomId } = peers[socket.id];
        const router = rooms[roomId].router;
        let consumerTransport = transports.find(
          (transport) =>
            transport.consumer &&
            transport.transport.id === serverConsumerTransportId
        ).transport;

        if (
          router.canConsume({ producerId: remoteProducerId, rtpCapabilities })
        ) {
          const consumer = await consumerTransport.consume({
            producerId: remoteProducerId,
            rtpCapabilities,
            paused: true,
          });
          consumer.on("transportclose", () => {
            console.log("transport close from consumer");
            //   consumer.close();
          });
          consumer.on("producerclose", () => {
            console.log("producer of consumer closed");
            socket.emit("producer-closed", { remoteProducerId });
            consumerTransport.close([]);
            transports = transports.filter(
              (transport) => transport.transport.id !== consumerTransport.id
            );
            consumer.close();
            consumers = consumers.filter(
              (consumer) => consumer.consumer.id !== consumer.id
            );
          });

          addConsumer(consumer, roomId);

          const params = {
            id: consumer.id,
            producerId: remoteProducerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
            serverConsumerId: consumer.id,
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
    }
  );

  socket.on("consumer-resume", async ({ serverConsumerId }) => {
    console.log("consumer resume");
    const { consumer } = consumers.find(
      (consumer) => consumer.consumer.id === serverConsumerId
    );
    await consumer.resume();
  });

  socket.on("getProducers", async (callback) => {
    const { roomId } = peers[socket.id];
    let producerList = [];
    producers.forEach((producer) => {
      if (producer.socketId !== socket.id && producer.roomId === roomId) {
        producerList = [...producerList, producer.producer.id];
      }
    });
    callback(producerList);
  });

  console.log("producers", producers);
  console.log("consumers", consumers);
});

const createWebRtcTransport = async (router) => {
  return new Promise(async (resolve, reject) => {
    try {
      const webRtcTransport_options = {
        listenIps: [{ ip: "127.0.0.1" }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
      };
      let transport = await router.createWebRtcTransport(
        webRtcTransport_options
      );

      transport.on("dtlsstatechange", async (dtlsState) => {
        if (dtlsState === "closed") {
          connectedTransports.delete(transport.id);
          await transport.close();
        } else if (dtlsState === "connected") {
          connectedTransports.add(transport.id);
        }
      });

      transport.on("close", async () => {
        connectedTransports.delete(transport.id);
      });

      resolve(transport);
    } catch (error) {
      reject(error);
    }
  });
};

if (process.env.NODE_ENV !== 'production') {
  server.listen(process.env.PORT || 8000, () =>
    console.log("server is running on port 8000")
  );
}

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
export default async function handler(req, res) {
  if (!res.socket.server.io) {
    console.log('*First use, starting socket.io');
    res.socket.server.io = io;
  } else {
    console.log('socket.io already running');
  }
  res.end();
}
