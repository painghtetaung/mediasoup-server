const serverWS = [
  {
    _events: {},
    _eventsCount: 4,
    _maxListeners: null,
    _closed: false,
    _observer: {
      _events: {},
      _eventsCount: 0,
      _maxListeners: null,
    },
    _id: "77a80f5d-86e7-46ba-9366-36df84958bc4",
    _localId: "0",
    _producerId: "888c7154-806f-4f62-81c0-bdf56991ef93",
    _rtpReceiver: {},
    _track: {},
    _rtpParameters: {
      codecs: [
        {
          mimeType: "video/VP8",
          payloadType: 101,
          clockRate: 90000,
          parameters: {},
          rtcpFeedback: [
            {
              type: "transport-cc",
              parameter: "",
            },
            {
              type: "ccm",
              parameter: "fir",
            },
            {
              type: "nack",
              parameter: "",
            },
            {
              type: "nack",
              parameter: "pli",
            },
          ],
        },
        {
          mimeType: "video/rtx",
          payloadType: 102,
          clockRate: 90000,
          parameters: {
            apt: 101,
          },
          rtcpFeedback: [],
        },
      ],
      headerExtensions: [
        {
          uri: "urn:ietf:params:rtp-hdrext:sdes:mid",
          id: 1,
          encrypt: false,
          parameters: {},
        },
        {
          uri: "http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time",
          id: 4,
          encrypt: false,
          parameters: {},
        },
        {
          uri: "http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01",
          id: 5,
          encrypt: false,
          parameters: {},
        },
        {
          uri: "urn:3gpp:video-orientation",
          id: 11,
          encrypt: false,
          parameters: {},
        },
        {
          uri: "urn:ietf:params:rtp-hdrext:toffset",
          id: 12,
          encrypt: false,
          parameters: {},
        },
        {
          uri: "http://www.webrtc.org/experiments/rtp-hdrext/playout-delay",
          id: 14,
          encrypt: false,
          parameters: {},
        },
      ],
      encodings: [
        {
          ssrc: 236876710,
          rtx: {
            ssrc: 236876711,
          },
          scalabilityMode: "L3T3",
          maxBitrate: 900000,
          dtx: false,
        },
      ],
      rtcp: {
        cname: "8c7cc356",
        reducedSize: true,
      },
      mid: "0",
    },
    _paused: false,
    _appData: {},
    track: {},
  },
];
