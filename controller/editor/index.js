'use strict';

const $ = require('jquery');
const co = require('co');
const fs = require('fs');
const path = require('path');
const mmm = require('mmmagic');
const Magic = mmm.Magic;
const view = require('../../lib/view');
const log = require('../../lib/log');
const ipcRenderer = require('electron').ipcRenderer;

const BaseCtrl = require('../base_controller');
const Book = require('../../model/data/book');
const Menu = require('../../model/ui/menu');
const Editor = require('../../model/ui/editor');
const Preview = require('../../model/ui/preview');
const ClipBoard = require('../../model/data/clipboard');

function captureScreenShot(callback) {
  let desktopCapturer = require('electron').desktopCapturer;
  let width = screen.width;
  let height = screen.height;
  desktopCapturer.getSources(
    {
      types: ['screen'],
      thumbnailSize: {
        width: width,
        height: height
      }
    },
    function (err, sources) {
      if (err) {
        log.error('screenshot error', err);
        return;
      }
      window.localStorage.__screenshot = sources[0].thumbnail.toDataURL();
      callback && callback();
    }
  );
}

class AppEditor extends BaseCtrl {
  /**
   * @param  {Object} options
   *         - bookRoot
   */
  constructor(options) {
    log.debug('editor debug', options);
    super(options);
    let self = this;

    this.init(options);
    log.info('app_editor inited');

    co(function *() {
      yield self.load();
    }).catch(function (err) {
      log.error('book init error', err.stack);
    });
  }

  init(options) {
    let self = this;
    // init layout
    view.render(options.container, 'editor.html', {
      autosave: false,
      keyboardShortcut: function (str) {
        return str;
      }
    });
    let book = new Book({
      root: options.bookRoot,
      readOnly: options.readOnly
    });
    this.book = book;
    log.info('init book model');

    let menu = new Menu({
      book: book,
      container: $('#menu')
    });
    this.menu = menu;
    log.info('init book menu');

    let editor = new Editor({
      book: book,
      container: $('#editor')
    });
    this.editor = editor;
    log.info('init book editor');

    let magic = new Magic(mmm.MAGIC_MIME_TYPE);
    this.magic = magic;

    let clipboard = new ClipBoard({
      book: book,
      editor: editor,
      magic: magic
    });
    this.clipboard = clipboard;
    /**
     * preview
     * @type {Preview}
     */
    let preview = new Preview({
      book: book,
      container: $('#preview')
    });
    this.preview = preview;
    log.info('init book preview');


    this.menu.on('open_file', function (title, file) {
      if (!file || !path.extname(file)) {
        log.error('can not openfile when file is unknow or file without .md ext');
      }
      editor.openFile({
        file: file,
        title: title
      });
    });

    this.menu.on('rename_file', function (data, done) {
      self.editor.renameFile(data);
      co(function* () {
        if (!Array.isArray(data)) {
          data = [data];
        }
        for (let i = 0; i < data.length; i++) {
          yield self.book.renameFile(data[i].src, data[i].dest);
        }
        done && done();
      }).catch(function (e) {
        log.error('rename file error', e);
        done && done(e.message);
      });
    });

    this.menu.on('export_pdf', function () {
      // self.book.genPDF();
    });

    this.editor.on('load', function (data) {
      preview.render(data);
    });

    this.editor.on('change', function (data) {
      preview.render(data);
    });

    /*
    this.editor.on('save', function (file) {

    });
    */

    this.editor.on('scroll', function (data) {
      preview.scrollToFlag({
        line: data.line
      });
    });

    this.clipboard.on('file-saved', function (fname) {
      self.editor.insertCurrent('image', fname);
    });
    /*
    ipcRenderer.on('screenshot', function () {
      getImg();
      ipcRenderer.send('create-sub-window', [screen.width, screen.height]);
    });
    */
    ipcRenderer.on('cuted', function () {
      self.clipboard.paste();
    });
    ipcRenderer.on('hide-main-window-done', function () {
      log.debug('then capture screen');
      captureScreenShot(function () {
        ipcRenderer.send('screenshot-cut', {
          width: screen.width,
          height: screen.height
        });
      });
    });

    this.editor.on('cut', function () {
      log.debug('start cut, first hide main window');
      ipcRenderer.send('hide-main-window');
      /*
      ipcRenderer.send('screenshot-cut', {
        hiddenMainWin: true,
        size: [screen.width, screen.height]
      });
      */
    });


    // 绑定黏贴事件
    window.addEventListener('paste', function (e) {
      self.clipboard.paste(e);
    }, true);

    window.addEventListener('keydown', function (e) {
      if (!e.metaKey && !e.altKey) {
        return;
      }
      switch (e.keyCode) {
        case 80: // p
          $('.preview').toggle();
          break;
      }
    });
  }
  * load() {
    yield this.menu.render();
    log.debug('menu ok');
  }
  resize() {
    let height = $(window).height();
    this.menu.resize({height: height});
    this.editor.resize();
    // this.preview.resize();
  }
  destroy() {
    super.destroy();
  }
}

module.exports = AppEditor;
