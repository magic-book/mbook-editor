'use strict';

const $ = require('jquery');
const co = require('co');
const fs = require('xfs');
const path = require('path');
const view = require('../../lib/view');
const log = require('../../lib/log');
const ipcRenderer = require('electron').ipcRenderer;

const BaseCtrl = require('../base_controller');
const Book = require('../../model/data/book');
const Menu = require('../../model/ui/menu');
const Editor = require('../../model/ui/editor');
const Preview = require('../../model/ui/preview');
const ClipBoard = require('../../model/data/clipboard');
const Renderer = require('../../model/data/book_renderer');

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


    let clipboard = new ClipBoard({
      book: book,
      editor: editor,
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

    this.menu.on('export-pdf', () => {

    });

    this.editor.on('load', function (data) {
      preview.render(data);
    });

    this.editor.on('save', function (data) {
      log.debug('file saved', data);
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


'use strict';

function genOptions(options) {
  if (options.pdfHeader) {
    options.pdfHeader = options.pdfHeader.replace(/\n/g, '');
  }
  if (options.pdfFooter) {
    options.pdfFooter = options.pdfFooter.replace(/\n/g, '');
  }

  // options ref:https://manual.calibre-ebook.com/generated/en/ebook-convert.html
  let tpl = `
--title="${options.title}"
--comments="${options.description}"
--isbn="${options.isbn}"
--authors="${options.author}"
--language="${options.language}"
--book-producer="${options.producer}"
--publisher="${options.publisher}"
--chapter="descendant-or-self::*[contains(concat(' ', normalize-space(@class), ' '), ' book-chapter ')]"
--level1-toc="descendant-or-self::*[contains(concat(' ', normalize-space(@class), ' '), ' book-chapter-1 ')]"
--level2-toc="descendant-or-self::*[contains(concat(' ', normalize-space(@class), ' '), ' book-chapter-2 ')]"
--level3-toc="descendant-or-self::*[contains(concat(' ', normalize-space(@class), ' '), ' book-chapter-3 ')]"
--max-levels=5
--no-chapters-in-toc
--breadth-first
--chapter-mark=pagebreak
--page-breaks-before=/
--margin-left=${options.marginLeft}
--margin-right=${options.marginRight}
--margin-top=${options.marginTop}
--margin-bottom=${options.marginBottom}
--pdf-default-font-size=${options.fontSize}
--pdf-mono-font-size=${options.monoFontSize}
--paper-size=${options.paperSize}
--pdf-page-numbers
--pdf-sans-family="${options.fontFamily}"
--pdf-header-template="${options.pdfHeader}"
--pdf-footer-template="${options.pdfFooter}"
  `;
  return tpl.split(/\n/g);
}

function pdfHeader() {
  return `
<div class="pdf-header" style="font-size:10px; padding: 10px 0px; border-bottom: 1px solid #eee; color: #aaa;">
    _SECTION_ <span style="float: right;">-_PAGENUM_-</span>
</div>`.replace(/>\s+</g, '><').replace(/"/g, '\\"');
}

function pdfFooter() {
  return `
    <div class="pdf-footer" style="font-size:10px; padding: 10px 0px; border-top: 1px solid #eee; color: #aaa;">
       _SECTION_ <span style="float: right;">-_PAGENUM_-</span>
    </div>`.replace(/>\s+</g, '><').replace(/"/g, '\\"');
}

const defaultOptions = {
  producer: 'MBook',
  language: 'en-us',
  marginLeft: 62,
  marginRight: 62,
  marginTop: 56,
  marginBottom: 56,
  fontSize: 12,
  monoFontSize: 12,
  paperSize: 'a4',
  fontFamily: 'Arial',
  pdfHeader: pdfHeader(),
  pdfFooter: pdfFooter()
};

const _ = require('lodash');
const childProcess = require('child_process');

class Convertor {
  constructor(options) {
    this.executor = 'ebook-convert',
    this.options = _.merge({}, defaultOptions, options || {});
  }
  exec(input, output) {
    let args = [
      input,
      output
    ].concat(genOptions(this.options));
    log.info(args.join(' '));
    let cp = childProcess.exec(this.executor + ' ' + args.join(' '));
    cp.stdout.on('data', function (data) {
      log.info('>>>', data);
    }); // pipe(process.stdout);
    cp.stderr.on('data', function (data) {
      log.info('>>>', data);
    }); // pipe(process.stderr);
    cp.on('error', function (err) {
      log.error('>>>', err);
    });
    cp.on('exit', function () {
      log.error('ebook convert done', arguments);
    });
  }
}

module.exports = AppEditor;
