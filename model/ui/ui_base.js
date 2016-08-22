const events = require('events');

class UIBase extends events.EventEmitter {
  constructor(options) {
    super();
  }
  resize() {

  }
  destroy() {

  }
}

module.exports = UIBase;
