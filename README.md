# JSONgle-Server

**JSONgle-Server** is a signaling server that can be use to exchange messages between peers by using a light **JSON-based** protocol.

This library is the server-side companion of the [JSONgle](https://github.com/oanguenot/JSONgle) browser library.

## Install

Using NPM

```bash
$ npm install jsongle-server
```

## Configuration

**JSONgle-Server** reads its configuration from an **.env** file.

```bash
wsPort=8080
restPort=8081
corsPolicyOrigin=https://localhost:3000
maxConcurrentUsers=10
logLevel=debug
id=barracuda
logPath=/tmp/jsongle-server.log
```

The **.env** file contains the following settings

| Settings | Description |
|:---------|:------------|
| **wsPort** | WebSocket Server Port<br>Default is `8080` |
| **restPort** | HTTP REST API Server Port <br>Default is `8081` |
| **corsPolicyOrigin** | Restricted CORS policy access |
| **maxConcurrentUsers** | Max number of connection to the WebSocket server<br>Default is `50` |
| **logLevel** | Level of logs<br>Default is `info` |
| **id** | Server identifier<br> Default is `jsongle-server` |
| **logPath** | Path to file for storing logs. No logs stored by default |


## Main principles

The **JSONgle-Server** has two 'end-points':

- A REST API used to monitor the server

- A WebSocket server that listens to incoming WebSocket connections and handle the signaling part

## Monitoring JSONgle-Server

Basically, **JSONgle-Server** offers the following APIs:

- **GET /about**: This API returns a JSON description of the server containing the version used and a description

- **GET /ping**: This API returns a JSON `OK` status

- **PUT /logs/levels**: This API expects a JSON object containing a `level` property for updating the log level. Expected values are as usual: `debug`, `info`, etc...

- **GET /metrics**: This API returns a **Prometheus** metrics when requested. 

These APIs allow to monitor the **JSONgle-Server** in real-time.

## Serving the signaling part

For exchanging the signaling part, client should be connected to the WebSocket and exchange formatted messages that follow the [**JSONgle**](https://github.com/oanguenot/JSONgle) protocol.

Here are the messages handled by the server in some specific situations.

### session-hello message

When a connection is set to the WebSocket server, **JSONgle-Server** sends back to the client the following query

```js
{
  "id": "...",
  "from": "barracuda", 
  "to": "8e784de9-ba76-4b0f-bedf-e21cac593f75",  // Server side identity that should be used for any message coming from that client
  "jsongle": {
    "action": "iq-get",
    "query": "session-hello",
    "transaction": "8c4feab5-71a0-41c6-8bcd-e21cac593f75"
    "description": {
      "version": "1.1.4",
      "sn": "barracuda",
      "info": "Easy signaling using JSONgle-Server",
    },
  },
}
```

The client should answer by the following message

```js
{
  "id": "...",
  "from": "8e784de9-ba76-4b0f-bedf-e21cac593f75", 
  "to": "barracuda",
  "jsongle": {
    "action": "iq-result",
    "query": "session-hello",
    "transaction": "8c4feab5-71a0-41c6-8bcd-e21cac593f75"
    "description": {
      "uid": "user_7000",     // Any unique identifier given by the client (Mandatory)
      "dn": "Jon Doe"         // Any user distinguish name (Optional)
    },
  },
}
```

An `ack` message is then sent to the client to inform him that the answer has been received and handled. A status `success` or `failed` is contained in that message to have a result if needed. In case of error, an additional `session-error` message is sent too that describes the error.

_Note_: Next client requests will be treated only if client has sent this `iq-result` response.

### Join a room

To join a room for having a call or an instant messaging conversation, the client should send the following message

```js
{
  "id": "9b2feab5-71a0-41c6-8bcd-de67b819fdca",
  "from": "8e784de9-ba76-4b0f-bedf-e21cac593f75", 
  "to": "barracuda",  // generated id (client is anonymous at that time)
  "jsongle": {
    "action": "iq-set",
    "query": "join",
    "description": {
      "rid": "43784dd3-cb76-4e5f-b4df-354cac5df777", // arbitrary room name known by clients who want to have a call or conversation
      "dn": "Jon Doe",
    },
  },
}
```

The server answers by an `iq_result` or an `iq_error` depending on the result of the operation.

The `iq_result` contains the list of users already in the room.

All existing members of that room will receive a `session-event` message to inform them about the new member.

## Roadmap

Future evolutions or questions:
- Keep Socket.io or rely on single agnostic socket library only
- Bunyan: add a stream for rotating file


### Unreachable recipient

When the issuer sent the **session-propose** message, once received, the server could check if the recipient exists and is connected.

If the recipient can't be reachable, a **session-info** message with `reason=unreachable` could be sent to the issuer to inform him that the call can't be proceeded and to change the call information to the `state=ended` with `reason=unreachable`.

See paragraph **Messages exchanged** to have the description of the message to send.

```js
// Example using socket-io on server side
socket.on("jsongle", (message) => {
    // Check that the recipient exists and is connected
    if (!(message.to in users)) {
        const abortMsg = {
            id: "<your_random_message_id>",
            from: "server",
            to: message.from,
            jsongle: {
                sid: message.jsongle.sid,
                action: "session-info",
                reason: "unreachable",
                initiator: message.jsongle.initiator,
                responder: message.jsongle.responder,
                description: {
                    ended: new Date().toJSON(),
                },
            },
        };

        // Send a try to issuer
        socket.emit("jsongle", abortMsg);
        return;
    }
});
```

### Trying

When the issuer sent the **session-propose** message and once the server has found the recipient, the server could send a **session-info** message with `reason=trying` to the issuer to inform him that the call is routing to the recipient.

See paragraph **Messages exchanged** to have the description of the message to send.

```js
// Example using socket-io on server side
socket.on("jsongle", (message) => {
    // Check the recipient and the message
    if (message.to in users && message.jsongle.action === "session-propose") {
        const abortMsg = {
            id: "<your_random_message_id>",
            from: "server",
            to: message.from,
            jsongle: {
                sid: message.jsongle.sid,
                action: "session-info",
                reason: "trying",
                initiator: message.jsongle.initiator,
                responder: message.jsongle.responder,
                description: {
                    tried: new Date().toJSON(),
                },
            },
        };

        // Send a try to issuer
        socket.emit("jsongle", abortMsg);
        return;
    }
});
```
