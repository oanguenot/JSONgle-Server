const { v4: uuidv4 } = require('uuid');

let upTime = null;

exports.generateNewId = () => uuidv4();

exports.setUpTime = () => {
  upTime = new Date();
}

exports.getUptTime = () => {
  return upTime || new Date();
}
