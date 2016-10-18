'use strict';
const clipboard = require('electron').clipboard;
const log = require('../../lib/log');
const co = require('co');
const fs = require('fs');

const clipboardio = require('../utils/clipboardio');

class ClipBoard {
  constructor(options) {
    this.magic = options.magic;
    this.editor = options.editor;
    this.book = options.book;
  }
  paste(e) {
    let self = this;
    clipboardio.paste(res => {
      co(function *(){
        let imagePath = yield self.book.res.saveFile(res.name, res.buffer);
        self.editor.insertCurrent('![](' + imagePath + ')');
      }).catch(function (e) {
        log.error('save image to local error', e.stack);
      });
    })
    e.preventDefault();
    // let dataFormats = clipboard.availableFormats().reverse();
    // log.info('clipboard availableFormat:', dataFormats);
    // log.info('clipboard content, text:', clipboard.readText(), 'html:', clipboard.readHTML());

    // function * pasteImage(img) {
    //   let imageData = yield self.book.res.getImageData(img);
    //   let imagePath = yield self.book.res.saveFile(imageData.name, imageData.buffer);
    //   self.editor.insertCurrent('![](' + imagePath + ')');
    // }

    

    // if (dataFormats.length == 0) {
    //   // TODO: use system tools to paste
    // } else if (dataFormats.lastIndexOf('image/png') != -1) {
    //   co(pasteImage({
    //     nativeImage: clipboard.readImage(),
    //     html: clipboard.readHTML()
    //   })).catch(function (e) {
    //     log.error('save image to local error', e.stack);
    //   });
    // /* TODO:in gnome, file in clipboard is saved as x-special/gnome-copied-files.
    //  * electron clipboard can use readText to get its adsolute path.
    //  * now i use libmagic to get the file mime type.
    //  */
    // } else if (dataFormats.lastIndexOf('text/plain') != -1) {
    //   let data = clipboard.readText();
    //   try {
    //     let buffer = fs.readFileSync(data);
    //     e.preventDefault();
    //     self.magic.detect(buffer, function (err, res) {
    //       if (err) throw err;
    //       if (res.startsWith('image')) {
    //         co(pasteImage(data)).catch(function (e) {
    //           log.error('copy local image to project error', e.stack);
    //         });
    //       } else {
    //         log.error('unsupport file format');
    //       }
    //     });
    //   } catch (e) {
    //     // default text paste
    //   }
    // } else if (dataFormats.lastIndexOf('mediaid') != 0) { // copy images from DingDing
    //   log.info('images from DingDing');
    // } else if (dataFormats.lastIndexOf('text/rtf') != 0) {
    //   let data = clipboard.readRtf();
    //   log.info('images from rtf', data);
    // }
  }
  /**
   * 黏贴 text/html
   */
  pasteHtml() {

  }
  /**
   * 黏贴 text/plan
   */
  pasteText() {

  }
  /**
   * 黏贴 image/png
   */
  pasteImagePng() {

  }
  pasteImageJpg() {

  }
  /**
   * 黏贴 mediaid
   * 注： 来自钉钉
   */
  pasteMediaId() {

  }
  /**
   * 黏贴 text/rtf
   * 注：来自旺旺
   */
  pasteRtf() {

  }

  destroy() {
    this.book = null;
    this.magic = null;
    this.editor = null;
  }
}

module.exports = ClipBoard;
