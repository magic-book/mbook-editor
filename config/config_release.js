'use strict';

const path = require('path');

module.exports = {
  logs: {
    sys: {
      level: 'WARN',
      file: path.join(__dirname, '../log/sys.%year%-%month%-%day%.log')
    }
  }
};
