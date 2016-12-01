'use strict';

const {EventEmitter} = require('events');

class BaseController extends EventEmitter {
  constructor() {
    super();
  }
  destroy() {
    this.removeAllListeners();
  }
}

module.exports = BaseController;
