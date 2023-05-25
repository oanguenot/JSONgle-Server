const  os = require("os");
const fs = require("fs");

exports.computeDisk = () => {
  return new Promise((resolve, reject) => {
    const arch = os.arch();
    let path = "/";

    if (arch === "arm64") {
      path = "/System/Volumes/Data";
      try {
        fs.statSync(path);
      } catch (_err) {
        path = "/";
      }
    }

    require("child_process").exec(`df -k ${path}`, function (error, stdout, stderr) {
      if(error) {
        reject(error);
        return;
      }

      const lines = stdout.split("\n");
      let diskFree = -1;

      if (lines) {
        const str_disk_info = lines[1].replace(/[\s\n\r]+/g, " ");
        const disk_info = str_disk_info.split(" ");
        const total = Math.ceil((Number(disk_info[1]) * 1024) / Math.pow(1024, 2));
        const free = Math.ceil((disk_info[3] * 1024) / Math.pow(1024, 2));
        if( free && total) {
          diskFree = (free / total) * 100;
        }
      }

      resolve(+diskFree.toFixed(1));
    });
  });
};

exports.computeMemory = () => {
  const totalMemory = os.totalmem() / (1024 * 1024);
  const freeMemory = os.freemem() / (1024 * 1024);
  if(freeMemory && totalMemory) {
    const percentFreeMem = (freeMemory / totalMemory) * 100;
    return +percentFreeMem.toFixed(1);
  }
  return -1;
}

exports.computeCPU = () => {
  return new Promise((resolve, reject) => {
    const system = os.platform();

    let command = "top -bn1 | grep '%Cpu'";
    // case for macOS
    if(system === "darwin") {
      command = "top -l 2 -n 10 | tail -22 | grep 'CPU usage'";
    }

    require("child_process").exec(command, function (error, stdout, stderr) {
      if(error) {
        reject(error);
        return;
      }

      let cpuFree = -1;
      const parts = stdout.split(",");
      let part = "";
      part = parts.find((elt) => elt.includes("id"));
      if (!part) {
        reject(cpuFree);
        return;
      }
      let val = part.substring(0, part.indexOf("id")).trim();

      if (val.endsWith("%")) {
        val = val.substring(0, val.length - 1);
      }

      cpuFree = Number(val);
      resolve(+cpuFree.toFixed(1));
    });
  });
}

exports.computeUptime = () => {
  const uptime = os.uptime() || 0;
  let current = new Date();
  let timestamp = current.setSeconds(current.getSeconds() - uptime)
  return new Date(timestamp).toJSON();
}

exports.computeSystem = () => {
  const arch = os.arch();
  const system = os.platform();
  const release = os.release();
  return `${arch}:${system}-${release}`;
}
