'use strict';
const log = require('../../lib/log');
const co = require('co');

const fs = require('fs');
const path = require('path');
const request = require('request');
const clipboard = require('electron').clipboard;
const fsp = require('fs-promise');
// import fs from 'fs';
// import path from 'path';
// import request from 'request';
// import { clipboard } from 'electron';
/**
 * all mime types
 * see: https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Complete_list_of_MIME_types
*/
const allMimeTypes = {
  image: 'image/png',
  text: 'text/plain',
  html: 'text/html',
  rtf: 'text/rtf'
};
// see: http://stackoverflow.com/questions/4482686/check-synchronously-if-file-directory-exists-in-node-js?answertab=active#tab-top
function checkIsAFile(text) {
  try {
    let stats = fs.lstatSync(text);
    // Is it a directory?
    if (!stats.isDirectory()) {
      switch (path.extname(text)) {
        case 'png':
        case 'jpg':
          return allMimeTypes.image;
        default:
          break;
      }
    }
  } catch (e) {
    //
  }
}

// <meta charset='utf-8'><img src="[path].png_[^\.]*.jpg"/>
const dingdingImageRegexp = /<meta[^>]*><img\s*src="([^"]*)"\s*\/>/;
function checkImageFromDingDing(html) {
  let mt = html.match(dingdingImageRegexp);
  if (mt) {
    return mt[1];
  }
}

/**
 * check all mime types
 * see: https://github.com/dmfarcas/clipboard-manager/blob/master/assets/index.js
 */
function checkFormat(contentTypes) {
  contentTypes = contentTypes || clipboard.availableFormats();

  switch (true) {
    /**
     * 符合图片类型，直接粘贴图片内容
     * 1. 本地图片粘贴，有text内容
     * 2. 网页上直接复制图片内容粘贴， 此时没有text内容
     * 3. 复制mockup等软件, 其text===html，所以不能用来识别名字
     * 4. 复制omnigraffle等软件内容，自动复制成图片内容
     */
    case contentTypes.indexOf(allMimeTypes.image) > -1:
      return {
        name: 'pasteImage',
        cfg: {
          text: clipboard.readText(),
          nativeImage: clipboard.readImage()
        }
      };
    /**
     * 符合文本类型
     * 1. 本地图片地址， 目前只做这部分判断
     * 2. 网页图片地址
     * 3. 本地或者网页其他文件地址，比如doc, docx, xmind等（复制xmind内容实际上是文本）
     */
    case contentTypes.indexOf(allMimeTypes.text) > -1: {
      let text = clipboard.readText();
      let result = checkIsAFile(text);
      if (result === allMimeTypes.image) {
        return {
          name: 'pasteImage',
          cfg: {
            path: text
          }
        };
      } else {
        return {
          name: 'pasteText',
          cfg: {
            text: text
          }
        };
      }
    }
    /**
     * 符合html类型
     * 1. 直接复制网页内容来粘贴
     * 2. 复制钉钉图片来粘贴，此时只有html包含了图片地址
     */
    case contentTypes.indexOf(allMimeTypes.html) > -1: {
      let html = clipboard.readHTML();
      let url = checkImageFromDingDing(html);
      if (contentTypes.indexOf('mediaid') > -1 && url) {
        return {
          name: 'pasteImage',
          cfg: {
            url: url.split('?')[0]
          }
        };
      } else {
        return {
          name: 'pasteHtml',
          cfg: {
            html: html
          }
        };
      }
    }
    /**
     * 富文本类型
     */
    case contentTypes.indexOf(allMimeTypes.rtf) > -1: {
      let rtf = clipboard.readRTF();
      return {
        name: 'pasteRTF',
        cfg: {
          rtf: rtf
        }
      };
    }
    default:
      break;
  }
}


const pasteFuncObj = {
  * pasteImage(cfg) {
    let result = {
      buffer: null,
      name: null,
      extname: null
    };
    // http://stackoverflow.com/questions/125813/how-to-determine-the-os-path-separator-in-javascript
    // path.sep instead of /
    switch (true) {
      // see: http://stackoverflow.com/questions/6926016/nodejs-saving-a-base64-encoded-image-to-disk?answertab=active#tab-top
      case !!cfg.nativeImage: {
        let matches = cfg.nativeImage.toDataURL().match(/^data:[A-Za-z-+]+\/([A-Za-z]+);base64,(.+)$/);
        result.extname = matches[1];
        result.buffer = new Buffer(matches[2], 'base64');
        if (cfg.text) {
          result.name = cfg.text.split(path.sep).pop();
        } else {
          result.name = new Date().getTime() + '.' + result.extname;
        }
        break;
      }
      case !!cfg.path: {
        result.name = cfg.path.split(path.sep).pop();
        result.extname = path.extname(result.name);
        result.buffer = yield fsp.readFile(cfg.path);
        break;
      }
      case !!cfg.url: {
        result.name = cfg.url.split(path.sep).pop();
        result.extname = path.extname(result.name);

        // [path]/lALOe-SVAczCzQQ1_1077_194.png_620x10000q90.jpg
        // get the real filename
        let name = result.name.slice(0, -result.extname.length);
        if (name.indexOf('.') > -1) {
          let extname = path.extname(name);
          result.extname = extname.split('_')[0];
          result.name = name.slice(0, -extname.length) + result.extname;
        }
        result.buffer = yield new Promise((resolve, reject) => {
          request({
            method: 'GET',
            uri: cfg.url,
            encoding: null
          }, (err, res) => {
            if (err) {
              reject(err);
            } else {
              result.buffer = res.body;
              resolve(result);
            }
          });
        });
      }
        break;
      default:
        break;
    }
    return result;
  }
};





/**
 * clipboard
 *  - writeText, readText, readHTML, writeHTML
 *  - readImage => nativeImage, writeImage
 *  - readRTF, writeRTF, readBookmark, writeBookmark
 *  - clear, availableFormats, has, read, write
 * see: https://github.com/electron/electron/blob/master/docs/api/clipboard.md
 *
 * nativeImage, BrowserWindow, Tray, Buffer
 *  - supported format: png, jpeg
 *  - icon: (16, 20, 24, 32) ^ 2 for small, (32, 40, 48, 64) ^ 2 for large
 *  - template image: xxxTemplate.png
 *  - methods: createEmpty, createFromPath, createFromBuffer, createFromDataURL
 *  - instance Methods: toPNG, toJPEG, toBitmap, toDataURL, getBitmap, getNativeHandle, isEmpty, getSize, setTemlateImage, isTemplateImage, crop, resize, getAspectRatio
 * see: https://github.com/electron/electron/blob/master/docs/api/native-image.md
 */

/**
 * @imports
 * 1. co
 *  * yieldables
 *  * promises,
 *  * arrays
 *  * objects
 *  * generators
 * @see: https://www.npmjs.com/package/co#var-fn--cowrapfn
 */


class ClipBoard {
  constructor(options) {
    this.magic = options.magic;
    this.editor = options.editor;
    this.book = options.book;
  }
  paste(e) {
    let self = this;
    let callback = res => {
      co(function* () {
        let imagePath = yield self.book.res.saveFile(res.name, res.buffer);
        self.editor.insertCurrent('![](' + imagePath + ')');
      }).catch(function (e) {
        log.error('save image to local error', e.stack);
      });
    };

    let opt = checkFormat();

    if (opt && pasteFuncObj[opt.name]) {
      let result = pasteFuncObj[opt.name](opt.cfg).next();
      if (result.value.then) {
        result.value.then(callback);
      } else {
        callback(result.value);
      }
      e.preventDefault();
    }
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
