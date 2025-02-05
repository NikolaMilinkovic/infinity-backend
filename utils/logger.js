require('dotenv').config();

const { Logtail } = require("@logtail/node");
const logtail = new Logtail(process.env.LOGTAIL_SOURCE_TOKEN, {
  endpoint: process.env.LOGTAIL_ENDPOINT,
  sendLogsToConsoleOutput: process.env.NODE_ENV === 'development' ? true : false,
});

module.exports = logtail;