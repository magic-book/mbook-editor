'use strict';
const $ = require('jquery');
const contextMenu = document.querySelector('#contextmenu');

$(contextMenu).on('click', function (e) {
  if (e.target.tagName !== 'A') {
    return;
  }
  ContextMenu._cb && ContextMenu._cb($(e.target).attr('action'));
});

$(window).on('click', function () {
  $(contextMenu).hide();
});

let ContextMenu = {
  show(menu, options, cb) {
    contextMenu.innerHTML = menu;
    $(contextMenu).show().css({
      left: options.x + 'px',
      top: options.y + 'px'
    });
    this._cb = cb;
  },
  hide() {
    $(contextMenu).hide();
  }
};

module.exports = ContextMenu;
