const localWS = [
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
    _id: "72a58fb9-1ddb-4ec1-965e-9c2473a59b10",
    _localId: "0",
    _producerId: "ef2d0285-a186-456f-b9ff-c826b6f08f4e",
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
          ssrc: 915771624,
          rtx: {
            ssrc: 915771625,
          },
          scalabilityMode: "L3T3",
          maxBitrate: 900000,
          dtx: false,
        },
      ],
      rtcp: {
        cname: "47f2f067",
        reducedSize: true,
      },
      mid: "0",
    },
    _paused: false,
    _appData: {},
    track: {
        
    },
  },
];
