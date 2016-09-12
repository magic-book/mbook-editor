/*!
 * GitbookEditor2: lib/log.js
 * Authors  : fish <zhengxinlin@gmail.com> (https://github.com/fishbar)
 * Create   : 2016-07-24 11:52:58
 * CopyRight 2016 (c) Fish And Other Contributors
 */
'use strict';

const electron = require('electron');

if (!electron.remote) {
  const config = require('../config');
  const Log = require('litelog');
  const log = Log.create(config.logs);
  log.colorful(config.debug);
  require('electron').app.log = log;
  module.exports = log;
} else {
  let log = require('electron').remote.app.log;
  ['debug', 'trace', 'info', 'warn', 'error', 'fatal'].forEach(function (key) {
    let type;
    switch (key) {
      case 'debug':
      case 'trace':
      case 'info':
        type = 'log';
        break;
      case 'warn':
        type = 'warn';
        break;
      case 'error':
      case 'fatal':
        type = 'error';
        break;
    }
    log[key] = function () {
      let args = Array.prototype.slice.apply(arguments);
      console[type].apply(console, args); // eslint-disable-line
      args.forEach(function (v, i, a) {
        if (typeof v !== 'string' && typeof v !== 'number') {
          a[i] = JSON.stringify(v);
        }
      });

      log._log(key.toUpperCase(), 5, args, getPos(3));
    };
  });
  module.exports = log;
}

const path = require('path');
const root = path.join(__dirname, '../');
function getPos(fix) {
  // fix = fix ? fix : 0;
  // var e = new Error();
  var stack = new Error().stack.split('\n');
  var line = stack[fix];
  var lastSpace = line.lastIndexOf(' ');
  line = line.substring(lastSpace + 1, line.length);
  if (line[0] === '(') {
    line = line.substring(1, line.length - 1);
  }
  if (line.startsWith('file:')) {
    line = line.substr(root.length + 7);
  } else {
    line = line.substr(root.length);
  }
  return line;
}
