const env = require("env-smart");

const DEFAULT_CONFIG = {
  wsPort: 8080,
  restPort: 8081,
  corsPolicyOrigin: "https://localhost:3000",
  maxConcurrentUsers: 10,
  id: "jsongle-server",
  logDefaultLevel: "debug",
  logPath: "/tmp/jsongle-server.log",
  logFilesNumber: 3,
  logFilePeriod: "1d",
  key: "key.pem",
  cert: "cert.pem",
  appToken: "",
  multiRoomPrefix: "#muc#",
  maxMembersPerMultiRoom: 10,
  maxMultiRoomPerUser: 10,
};

let _CONFIG = null;

const mixConfig = (env) => {
  _CONFIG = { ...DEFAULT_CONFIG, ...env };
};

exports.configure = () => {
  try {
    const _ENV = env.load();
    mixConfig(_ENV);
  } catch (error) {
    console.log({ module: moduleName, label: `can't read .env file - use default configuration`, error });
    mixConfig({});
  }
}

exports.CONFIG = () => (
  _CONFIG
);
