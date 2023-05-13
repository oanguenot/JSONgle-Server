const  os = require("os");

exports.computeDisk = () => {
  return new Promise((resolve, reject) => {
    const arch = os.arch();
    let path = "/";

    if (arch === "arm64") {
      path = "/System/Volumes/Data";
    }

    require("child_process").exec(`df -k ${path}`, function (error, stdout, stderr) {
      if(error) {
        reject(error);
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

      resolve(diskFree);
    });
  });
};

exports.computeMemory = () => {
  const totalMemory = os.totalmem() / (1024 * 1024);
  const freeMemory = os.freemem() / (1024 * 1024);
  if(freeMemory && totalMemory) {
    return (freeMemory / totalMemory) * 100;
  }
  return -1;
}

exports.computeCPU = () => {
  return new Promise((resolve, reject) => {
    const arch = os.arch();

    let command = "top -bn1 | grep '%Cpu' | awk '{printf $8}'";
    if(arch === "arm64") {
      command = "top -l 2 -n 10 | tail -22 | grep 'CPU usage' | awk '{print $7}'";
    }

    require("child_process").exec(command, function (error, stdout, stderr) {
      if(error) {
        reject(error);
      }

      let cpuFree = -1;
      const lines = stdout.split("\n");
      const firstLine = lines[0].trim();
      cpuFree = Number(firstLine.substring(0, firstLine.indexOf('%')));
      resolve(cpuFree);
    });
  });
}

exports.computeUptime = () => {
  return os.uptime() || 0;
}

exports.computeSystem = () => {
  const arch = os.arch();
  const system = os.platform();
  const release = os.release();
  return `${arch}:${system}-${release}`;
}
