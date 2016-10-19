'use strict';

const $ = require('jquery');
const view = require('../../lib/view');
const log = require('../../lib/log');
const path = require('path');
const BaseCtrl = require('../base_controller');
const {dialog} = require('electron').remote;
require('jqmodal');

const Bookspace = require('../../model/data/bookspace');

class Home extends BaseCtrl {
  constructor(options) {
    super();
    this._sync();
    this.init(options);
    log.info('app_home inited');
  }

  init(options) {
    let self = this;
    view.render(options.container, 'home.html');

    self.renderUI();
  }



  resize() {

  }

  destroy() {
    super.destroy();
  }






  _sync() {
    this.container = null;
    this.bookspace = null;
    this.modalbox = null;
    let tplOpt = this.tplOpt = {
      getBookspaceTpl(item) {
        return `<li class="${item.icon ? '' : 'cover-failed'}">
                  <div class="cover j-trigger-openBook" data-path="${item.path}">
                    <img src="${item.icon}">
                    <div class="close j-trigger-removebook">
                      <i class="icon-close"></i>
                    </div>
                  </div>
                  <div class="titles">
                    <p class="name">${item.name}</p>
                    <p class="owner">${item.owner}</p>
                  </div>
                </li>`;
      },
      trigerTpl: `<li>
                    <div class="cover">
                      <div class="triggers">
                        <button class="j-trigger-newBook">[+] Create New Book</button>
                        <button class="j-trigger-openBook">[+] [~] Open Book</button>
                      </div>
                      <div class="close">
                        <i class="icon-close"></i>
                      </div>
                    </div>
                  </li>`
      ,
      getBookspacesTpl(bookspaces) {
        let tpls = bookspaces.map(tplOpt.getBookspaceTpl);
        tpls.unshift(tplOpt.trigerTpl);
        return `<ul class="bookspaces">${tpls.join('')}</ul>`;
      },
      dialogTpl(data) {
        return `<div class="modalContainer j-trigger-createmodal">
                  <div class="modal j-trigger-createmodal">
                    <div class="modal-heading">
                      <h4>Create New Book</h4><a href="javascript:;" class="modal-close j-trigger-closemodal">×</a>
                    </div>
                    <div class="modal-body">
                      <div class="modal-form">
                        <label>Name</label>
                        <input type="text" placeholder="My Awesome Book"/>
                        <p class="help-block">It will create a new local book on this computer</p>
                      </div>
                    </div>
                    <div class="modal-footer">
                      <button class="j-trigger-createBook">Create Book</button>
                      <button class="j-trigger-closemodal">Cancel</button>
                    </div>
                  </div>
                </div>
              `;
      }
    };
  }

  createDOM(bookspaces) {
    this.container.html(this.tplOpt.getBookspacesTpl(bookspaces) + this.tplOpt.dialogTpl());
  }
  bindUI() {
    this.modalbox.jqm({
      trigger: '.j-trigger-newBook',
      closeClass: 'j-trigger-closemodal',
      onHide(hash) {
        hash.w.hide() && hash.o && hash.o.remove();
      }
    });
    this.container.on('click', '.j-trigger-createBook', e => {
      let inp = this.modalbox.find('input');
      let val = inp.val();
      if (val) {
        let bookRoot = path.join(Bookspace.DIR, val);
        let branch = this.bookspace.save(bookRoot);
        branch && this.container.find('.bookspaces').append(this.tplOpt.getBookspaceTpl(branch));
        this.modalbox.jqmHide();
        inp.val('');
      }
    });
    this.container.on('click', '.j-trigger-openBook', e => {
      let tgr = $(e.currentTarget);
      let bookPath = tgr.data('path');
      let bookRoot;
      if (bookPath) {
        bookRoot = path.resolve(bookPath);
      } else {
        let bookDir = dialog.showOpenDialog({properties: ['openDirectory']});
        bookRoot = bookDir && bookDir[0];
        bookRoot && this.bookspace.save({
          name: bookRoot.split(path.sep).pop(),
          path: bookRoot,
          type: Bookspace.TYPES.history
        });
      }
      bookRoot && this.emit('scene', {
        scene: 'editor',
        options: {
          bookRoot: bookRoot
        }
      });
    });
    this.container.on('click', '.j-trigger-removebook', e => {
      e.stopPropagation();

      let tgr = $(e.currentTarget);
      let bookTgr = tgr.parent();
      let bookPath = bookTgr.data('path');
      this.bookspace.remove(path.resolve(bookPath));

      bookTgr.closest('li').remove();
    });
  }
  renderUI() {
    this.container = $('.j-con-home');
    this.bookspace = new Bookspace();

    this.createDOM(this.bookspace.retrieve(Bookspace.TYPES.local));
    this.modalbox = this.container.find('.j-trigger-createmodal');
    this.bindUI();
  }


}

module.exports = Home;
