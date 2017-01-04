'use strict';

const $ = require('jquery');

function color(type) {
  let c = {
    warn: '',
    error: '#f30',
    success: '',
    info: ''
  };
  return c[type];
}

class Message {
  constructor() {
    this.cnt = $(`
      <div style="
        position:fixed;
        display:inline-block;
        color: #fff;
        width: 280px;
        margin:auto;
        text-align:center;
        left:0;
        right:0;
        top:-20px;"><div style="padding:5px 15px; border-radius: 0px 0px 4px 4px; display:inline-block"><div></div>`);
    this.cnt.appendTo('body');
  }
  show(type, msg) {
    if (msg === undefined) {
      msg = type;
      type = 'error';
    }
    this.cnt.find('div').text(msg).css({
      background: color(type)
    });
    this.cnt.animate({
      top: '0px'
    }, 'fast', () => {
      setTimeout(() => this.hide(), 3000);
    });
  }
  hide() {
    this.cnt.animate({
      top: -this.cnt.height()
    }, 'fast');
  }
}

module.exports = new Message();
