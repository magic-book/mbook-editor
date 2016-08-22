'use strict';
const marked = require('marked');
const UIBase = require('./ui_base');
const log = require('../../lib/log');

class Preview extends UIBase {
  constructor(options) {
    super();
    this.cnt = options.container;
  }
  /**
   * render markstring
   */
  render(mdString) {
    let self = this;
    // TODO change mdString to html
    marked(mdString || '', function (err, data) {
      if (err) {
        return log.error(err);
      }
      self.cnt.html(data);
    });
  }
}

module.exports = Preview;
