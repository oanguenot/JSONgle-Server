#JSONGLE-Server



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

### session-hello


### session-register

--> can fail