# JSONgle-Server

**JSONgle-Server** is a WebRTC signaling server allowing users to have WebRTC calls. The signaling protocol used is based on [JSONgle](https://github.com/oanguenot/JSONgle) which uses JSON to describe the messages exchanged.

**JSONgle-Server** allows to
- Connect clients to a dedicated room
- Handle room 'joined' and 'left' events
- Handle WebRTC signaling protocol between members of a room
- Handle custom JSON messages between members of a room
- Handle chat messages between members of a room
- Handle audio & video conference (planned)

## Install

**JSONgle-Server** is a Node.JS server that can be installed by cloning the repository.

```sh
$ git clone https://github.com/oanguenot/JSONgle-Server
```

Then you need to install the dependencies

```sh
$ yarn install

or

$ npm install
```

## Configuration

**JSONgle-Server** reads its configuration from an **.env** file or directly from any environments variables set. See file **.env.defaults** for the default values used.


The following variables can be set

| Settings                   | Description                                                                                                                                  |
|:---------------------------|:---------------------------------------------------------------------------------------------------------------------------------------------|
| **wsPort**                 | WebSocket Server Port used.<br>Default value is `8080`                                                                                       |
| **restPort**               | HTTP REST API Server Port used.<br>Default value is `8081`                                                                                   |
| **corsPolicyOrigin**       | Restricted CORS policy access.<br>Default value is `''`                                                                                      |
| **maxConcurrentUsers**     | Max number of simultaneous connections to the WebSocket server.<br>Default value is `10`                                                     |
| **id**                     | Server identifier.<br>Default value is `jsongle-server`                                                                                      |
| **logDefaultLevel**        | Level of logs.<br>Default value is `warn`.                                                                                                   |
| **logPath**                | Path to file for storing logs.<br>Default value is `/tmp/jsongle-server.log`.<br>Level is always equals to `debug` when logging to the file. |
| **logFilesNumber**         | Number of old log files kept.<br>Default value is `3`                                                                                        |
| **logFilePeriod**          | Period of logging before changing to a new file.<br>Default value is `1d` (1 day)                                                            |
| **key**                    | Path to the certificate KEY file used.<br>Default value is `./key.pem`                                                                       |
| **cert**                   | Path to the certificate CERT file used.<br>Default value is `./cert.pem`                                                                     |
| **appToken**               | Application token used.<br>Default value is `''`                                                                                             |
| **multiRoomPrefix**        | Prefix used to identify MUC room. Only used when disconnecting from the server (eg: "#muc#")                                                 |
| **maxMembersPerMultiRoom** | Maximum number of users per MUC                                                                                                              |
| **maxMultiRoomPerUser**    | Maximum number of MUC joined at the same time for a user                                                                                     |

Note: **appToken** value is sent by the client and verified by **JSONgle-Server** when initiating the connection.

## Start JSONgle-Server

For testing purpose or in your development/integration environment, you can launch the following command:

```sh
$ yarn dev

or 

$ npm run dev
```

The server will be automatically restarted thanks to **nodemon**.

## Main principles

**JSONgle-Server** has two 'end-points':

- A REST API used to monitor the server

- A WebSocket server that listens to incoming WebSocket connections and handle the signaling part

## Monitoring JSONgle-Server

Basically, **JSONgle-Server** offers the following APIs:

- **GET /about**: This API returns a JSON description of the server containing the version used and a description

- **GET /ping**: This API returns the code HTTP 200OK if the server is up 

- **PUT /logs/levels**: This API expects a JSON object containing a `level` property for updating the log level. Expected values are as usual: `debug`, `info`, etc...

- **GET /metrics**: This API returns a **Prometheus** metrics when requested. 

- **GET /stats**: This API returns the statistics (Prometheus) in JSON

- **GET /tests**: This API does a self-check and returns the code 200OK in case of success

These APIs allow to monitor the **JSONgle-Server** in real-time.

## Serving the signaling part

For exchanging the signaling part, client should be connected to the WebSocket and exchange formatted messages that follow the [**JSONgle**](https://github.com/oanguenot/JSONgle) protocol.

Here are the messages handled by the server in some specific situations.


### Websocket connection

**JSONgle-Server** uses [Socket.IO](https://socket.io/) for handling the connection coming from the client.

To be accepted, connections should contain an `appToken` that is checked by **JSONgle-Server**.

```js
// Somewhere in your client application
import {io} from "socket.io-client";

const SERVER_URL = "...";

socketIO = io(SERVER_URL, {
  auth: {
    appToken: "d371db...733b384"
  }
});
```

### session-hello message

When a connection is set to the WebSocket server, **JSONgle-Server** sends back to the client the following query

```json
{
  "id": "...",
  "from": "jsongle-server", 
  "to": "8e784de9-ba76-4b0f-bedf-e21cac593f75",
  "jsongle": {
    "action": "iq-get",
    "query": "session-hello",
    "transaction": "8c4feab5-71a0-41c6-8bcd-e21cac593f75",
    "description": {
      "version": "1.1.4",
      "sn": "jsongle-server",
      "info": "Easy signaling using JSONgle-Server"
    }
  }
}
```

**to** is the user identity.

The client should answer by the following message

```json
{
  "id": "...",
  "from": "8e784de9-ba76-4b0f-bedf-e21cac593f75", 
  "to": "jsongle-server",
  "jsongle": {
    "action": "iq-result",
    "query": "session-hello",
    "transaction": "8c4feab5-71a0-41c6-8bcd-e21cac593f75",
    "description": {
      "uid": "user_7000",     
      "dn": "Jon Doe"         
    }
  }
}
```

`uid` should be the unique identifier of the user. `dn` is optional.

An `ack` message is then sent to the client to inform him that the answer has been received and handled. A status `success` or `failed` is contained in that message to have a result if needed. In case of error, an additional `session-error` message is sent too that describes the error.

_Note_: Next client requests will be treated only if client has sent this `iq-result` response.

### Join a room for a P2P call or a P2P instant messaging conversation

To join a room for having a call or an instant messaging conversation, the client should send the following message

```json
{
  "id": "9b2feab5-71a0-41c6-8bcd-de67b819fdca",
  "from": "8e784de9-ba76-4b0f-bedf-e21cac593f75", 
  "to": "jsongle-server",  
  "jsongle": {
    "action": "iq-set",
    "query": "session-join",
    "namespace": "room",
    "description": {
      "rid": "43784dd3-cb76-4e5f-b4df-354cac5df777" 
    }
  }
}
```

Where `rid` is an arbitrary uniq room id known by clients who want to have a call or conversation.

The server answers by an `iq_result` or an `iq_error` depending on the result of the operation.

The `iq_result` contains the list of users already in the room.

All existing members of that room receive a `session-event` message to inform them about the new member.

### Leaving a room

In the same manner, a user can leave a room by sending the following message

```json
{
  "id": "9b2feab5-71a0-41c6-8bcd-de67b819fdca",
  "from": "8e784de9-ba76-4b0f-bedf-e21cac593f75", 
  "to": "jsongle-server",
  "jsongle": {
    "action": "iq-set",
    "query": "session-leave",
    "description": {
      "rid": "43784dd3-cb76-4e5f-b4df-354cac5df777"
    },
  },
}
```

### Join a MUC room

In the same way, joining a MUC room could be done by sending a IQ

```json
{
  "id": "9b2feab5-71a0-41c6-8bcd-de67b819fdca",
  "from": "8e784de9-ba76-4b0f-bedf-e21cac593f75", 
  "to": "jsongle-server",  
  "jsongle": {
    "action": "iq-set",
    "query": "muc-join",
    "namespace": "muc",
    "description": {
      "rid": "43784dd3-cb76-4e5f-b4df-354cac5df777" 
    }
  }
}
```

Where `rid` is the id of the MUC room to join.

An `iq_result` or an `iq_error` message is sent depending on the result.

All remaining members of that room receive a `session-event` message to inform them of the leaving of a member.

### Handling signalization

Any messages sent to the room is then dispatched to all members (except the emitter) on behalf of the room. 

At this time of writing, only P2P room can have video calls (limited to 2 participants), muc rooms could only have messaging conversation. 

See [JSONgle](https://github.com/oanguenot/JSONgle) for the client API.

### Prometheus Metrics

**JSONgle-Server** computes the following metrics:

| Metrics               | Description                                                                                              |
|:----------------------|:---------------------------------------------------------------------------------------------------------|
| **users_count**       | (gauge) Counts the number of active clients connected                                                    |
| **users_total**       | (counter) Counts the grand total of connected clients since the last restart                             |
| **conferences_count** | (gauge) Counts the number of active conferences                                                          |                                                          
 | **conferences_total** | (counter) Counts the grand total of conferences created since the last restart                           |                           
| **duration_total**    | (counter) Counts the connection's duration grand total for all users since the last restart (in minutes) |
| **recv_total**        | (counter) Counts the grand total of traffic received from all users since the last restart (in MB)       |
| **sent_total**        | (counter) Counts the grand total of traffic sent to all users since the last restart (in MB)             |

These metrics are available in the REST API `GET /metrics` for Prometheus and in API `GET /stats` in JSON.
