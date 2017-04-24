'use strict';

const path = require('path');
const os = require('os');

module.exports = {
  logs: {
    sys: {
      level: 'WARN',
      file: path.join(os.homedir(), '/.mbook/log/sys.%year%.log')
    }
  }
};
