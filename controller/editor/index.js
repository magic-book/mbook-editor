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
      root: options.bookRoot
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

    this.menu.on('bookspace', function () {
      self.emit('scene', {
        scene: 'home'
      });
    });

    this.editor.on('change', function (data) {
      preview.render(data);
    });

    this.editor.on('save', function (file) {
      if (self.menu.isMenuFile(file)) {
        log.info('menu file saved, reload menu');
        co(function *() {
          yield self.menu.render();
        }).catch(function (err) {
          log.error(err);
        });
      }
    });
    this.editor.on('scroll', function (data) {
      preview.scrollToFlag({
        line: data.line
      });
    });

    this.clipboard.on('file-saved', function (fname) {
      self.editor.insertCurrent('image', fname);
    });

    ipcRenderer.on('screenshot', function () {
      getImg();
      ipcRenderer.send('create-sub-window', [screen.width, screen.height]);
    });
    ipcRenderer.on('cuted', function () {
      self.clipboard.paste();
    });
    this.editor.on('cut', function () {
      ipcRenderer.send('hide-main-window');
    });


    // 绑定黏贴事件
    window.addEventListener('paste', function (e) {
      self.clipboard.paste(e);
    }, true);

    window.addEventListener('keydown', function (e) {
      if (!e.metaKey) {
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

function getImg() {
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
    function (error, sources) {
      if (error) throw error;
      // console.log(sources[0].thumbnail.toDataURL());
      window.localStorage.screenshot = sources[0].thumbnail.toDataURL();
    }
  );
}

module.exports = AppEditor;
