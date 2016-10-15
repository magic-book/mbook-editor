'use strict';

const $ = require('jquery');
const co = require('co');
const fs = require('fs');
const path = require('path');
const mmm = require('mmmagic');
const Magic = mmm.Magic;
const view = require('../../lib/view');
const log = require('../../lib/log');

const BaseCtrl = require('../base_controller');
const Book = require('../../model/data/book');
const Menu = require('../../model/ui/menu');
const Editor = require('../../model/ui/editor');
const Preview = require('../../model/ui/preview');
const clipboard = require('electron').clipboard;

class AppEditor extends BaseCtrl {
  /**
   * @param  {Object} options
   *         - bookRoot
   */
  constructor(options) {
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
      editor.createTab({
        file: file,
        title: title
      });
    });

    this.menu.on('rename_file', function (data, done) {
      co(function* () {
        if (!Array.isArray(data)) {
          data = [data];
        }
        for (let i = 0; i < data.length; i++) {
          yield self.book.renameFile(data[i].src, data[i].dest);
        }
        done();
      }).catch(function (e) {
        log.error('rename file error', e);
        done(e.message);
      });
    });

    this.editor.on('change', function (file, value) {
      preview.render(value);
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
    // 绑定黏贴事件
    window.addEventListener('paste', function (e) {
      log.info('clipboard availableFormat:', clipboard.availableFormats());
      log.info('clipboard content:', clipboard.readText(), clipboard.readHTML());

      function * pasteImage(img) {
        let imageData = yield self.book.res.getImageData(img);
        let imagePath = yield self.book.res.saveFile(imageData.name, imageData.buffer);
        self.editor.insertCurrent('![](' + imagePath + ')');
      }

      let dataFormats = clipboard.availableFormats();

      if (dataFormats.length == 0) {
        // TODO: use system tools to paste
      } else if (dataFormats.lastIndexOf('image/png') != -1) {
        co(pasteImage({
          nativeImage: clipboard.readImage(),
          html: clipboard.readHTML()
        })).catch(function (e) {
          log.error('save image to local error', e.stack);
        });
      /* TODO:in gnome, file in clipboard is saved as x-special/gnome-copied-files.
       * electron clipboard can use readText to get its adsolute path.
       * now i use libmagic to get the file mime type.
       */
      } else if (dataFormats.lastIndexOf('text/plain') != -1) {
        let data = clipboard.readText();
        try {
          let buffer = fs.readFileSync(data);
          e.preventDefault();
          self.magic.detect(buffer, function (err, res) {
            if (err) throw err;
            if (res.startsWith('image')) {
              co(pasteImage(data)).catch(function (e) {
                log.error('copy local image to project error', e.stack);
              });
            } else {
              log.error('unsupport file format');
            }
          });
        } catch (e) {
          // default text paste
        }
      }
    }, true);
  }
  * load() {
    yield this.menu.render();
    log.debug('menu ok');
  }
  resize() {
    $('#main').height($(window).height() - 40);
    this.menu.resize();
    this.editor.resize();
    this.preview.resize();
  }
  destroy() {
    super.destroy();
  }
}

module.exports = AppEditor;
