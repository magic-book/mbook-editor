'use strict';

const $ = require('jquery');
const view = require('../../lib/view');
const log = require('../../lib/log');

const BaseCtrl = require('../base_controller');

const {dialog} = require('electron').remote;

class Home extends BaseCtrl {
  constructor(options) {
    super();
    this.init(options);
    log.info('app_home inited');
  }

  init(options) {
    let self = this;
    view.render(options.container, 'home.html');

    $('#open_book').on('click', () => {
      let bookDir = dialog.showOpenDialog({properties: ['openDirectory']});
      if (bookDir && bookDir.length) {
        self.emit('scene', {
          scene: 'editor',
          options: {
            bookRoot: bookDir[0]
          }
        });
      } else {
        // TODO show message
      }
    });
  }
  resize() {

  }
  destroy() {
    super.destroy();
  }
}

module.exports = Home;
