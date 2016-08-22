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
    let origin = log[key];
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
      console[type].apply(console, args);
      log._log(key.toUpperCase(), 5, args);
    };
  });
  module.exports = log;
}