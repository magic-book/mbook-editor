'use strict';

const $ = require('jquery');
const log = require('../../lib/log');

function nextLevel(name) {
  let n = name[name.length - 1];
  return name.substr(0, name.length - 1) + (Number(n) + 1);
}

function resolveLevel(node, name) {
  $(node).find('> a').attr('class', name);
  $(node).find('> ul > li').each(function () {
    resolveLevel(this, nextLevel(name));
  });
}

const UIBase = require('./ui_base');

class Menu extends UIBase {
  /**
   * [constructor description]
   * @param  {Object} option
   *         - book {Book} book model instance
   *         - container {JQueryNode}
   * @return {[type]}        [description]
   */
  constructor(option) {
    super();
    let self = this;
    this.book = option.book;
    option.container.find('.trewview').html('<div><a class="btn_edit" data-id="/SUMMARY.md">编辑目录</a></div><div class="bookmenu"></div>');
    let editBtn = option.container.find('.btn_edit');
    let menuList = option.container.find('.bookmenu');

    this.cnt = menuList;

    editBtn.on('click', function () {
      let file = this.dataset.id;
      self.emit('open_file', 'menu', file);
    });

    menuList.on('click', function (e) {
      if (e.which !== 1) {
        log.warn('menu right click');
        return;
      }
      let file = e.target.dataset.id;
      if (!file) {
        log.warn('empty node');
        return;
      }
      self.emit('open_file', $(e.target).text(), file);
    });

    menuList.on('mousedown', 'a', function (e) {
      if (e.which !== 1) {
        return;
      }
      let node = e.target;
      let dragee = node.cloneNode(true);
      let pos = $(node).position();
      let parentPos = $(self.cnt).position();
      let parentWidth = $(self.cnt).width();
      var parentHeight = $(self.cnt).height();
      let offset = {
        x: e.offsetX,
        y: e.offsetY
      };
      self.dragee = $(dragee);
      self.dragee.inited = false;
      self.dragee.origin = node;

      let bound = {
        top: parentPos.top,
        bottom: parentPos.top + parentHeight,
        left: parentPos.left,
        right: parentPos.left + $(node).width(),
        minX: parentPos.left,
        minY: parentPos.top - $(node).height(),
        maxX: parentPos.left + (parentWidth - $(node).width()),
        maxY: parentPos.top + parentHeight
      };
      $(dragee).css({
        position: 'absolute',
        zIndex: 100,
        backgroundColor: '#3f0',
        left: pos.left + 'px',
        top: pos.top + 'px',
        opacity: 0.5,
        width: $(node).width() + 'px',
        height: $(node).height() + 'px'
      });

      function _move(e) {
        self.mousemove(e, offset, bound);
      }
      function _up() {
        $(document).unbind('mousemove', _move)
          .unbind('losecapture')
          .unbind('mouseup', _up);
        self.dragee.remove();
        self.dragee.origin = null;
        self.dragee = null;
      }
      $(document).on('mousemove', _move)
        .on('losecapture', function () {
          self.cnt.trigger('mouseup');
        })
        .on('mouseup', _up);
    });
  }
  * render() {
    let data = yield this.book.menu.load();
    this.cnt.html(this.genHTML(data));
  }
  /**
   * 检查文件是否为菜单文件
   * @return {Boolean} [description]
   */
  isMenuFile(file) {
    return file === '/SUMMARY.md';
  }
  mousemove(e, offset, bound) {
    if (!this.dragee.inited) {
      $('.menu').append(this.dragee);
      this.dragee.inited = true;
    }
    let self = this;
    let d = this.dragee;
    let left = e.pageX - offset.x;
    let top = e.pageY - offset.y;

    let list = self.cnt.find('a');

    if (bound) {
      if (left < bound.minX) {
        left = bound.minX;
      } else if (left > bound.maxX) {
        left = bound.maxX;
      }

      if (top < bound.minY) {
        top = bound.minY;
      } else if (top > bound.maxY) {
        top = bound.maxY;
      }
    }
    d.css({
      left: left,
      top: top
    });

    // 判断节点位置
    let origin = d.origin;
    let h = $(d).height();
    let offsetY = e.pageY - bound.top - offset.y;
    let offsetN = Math.floor(offsetY / h);
    // console.log('::', offsetY, h, offsetN);

    if (offsetN < 0) {
      offsetN = 0;
    } else if (offsetN > list.length - 1) {
      offsetN = list.length - 1;
    }
    let tmpNode = list[offsetN];
    let tmpPos = $(tmpNode).position();

    let cmd = null;

    if (top < tmpPos.top - 3) { // previewSibling
      cmd = {
        target: tmpNode,
        action: 'prev'
      };
      // console.log('>>>', $(tmpNode).text(), 'prev');
    } else if (top >= tmpPos.top - 3 && top <= tmpPos.top + 3) { // child
      cmd = {
        target: tmpNode,
        action: 'child'
      };
      // console.log('>>>', $(tmpNode).text(), 'child');
    } else if (top > tmpPos.top + 3) { // nextSibling
      let nextTmpNode = list[offsetN + 1];
      if (nextTmpNode) {
        // switch node
        let tmpPos2 = $(nextTmpNode).position();
        if (top >= tmpPos2.top - 3) {
          cmd = {
            target: nextTmpNode,
            action: 'prev'
          };
        } else {
          cmd = {
            target: tmpNode,
            action: 'next'
          };
        }
      } else {
        cmd = {
          target: tmpNode,
          action: 'next'
        };
        // console.log('>>>', $(tmpNode).text(), 'next');
      }
    }

    if (cmd) {
      let p;
      let ll;

      if (cmd.target === origin) {
        return;
      }
      p = cmd.target.parentNode;
      while (p) {
        if (p === origin.parentNode) {
          return;
        }
        p = p.parentNode;
      }
      // console.log('>>>>', origin.parentNode);
      $(origin.parentNode).remove();
      switch (cmd.action) {
        case 'prev':
          $(origin.parentNode).insertBefore(cmd.target.parentNode);
          origin.className = cmd.target.className;
          resolveLevel(origin.parentNode, cmd.target.className);
          break;
        case 'next':
          $(origin.parentNode).insertAfter(cmd.target.parentNode);
          resolveLevel(origin.parentNode, cmd.target.className);
          break;
        case 'child':
          p = cmd.target.parentNode;
          ll = $(p).find('> ul.list');
          if (!ll.length) {
            ll = $('<ul class="list"></ul');
            $(p).append(ll);
          }
          $(origin.parentNode).prependTo(ll);
          resolveLevel(origin.parentNode, nextLevel(cmd.target.className));
          break;
        default:
          // do nothing
      }
    }
    e.stopPropagation();
    e.preventDefault();
  }
  genHTML(data, index) {
    let html = ['<ul class="list">'];
    let self = this;
    index = index || 0;
    data.forEach(function (node) {
      html.push('<li>');
      html.push('<a data-id="' + node.id + '" class="level' + index + '">', node.text, '</a>');
      if (node.children && node.children.length) {
        html = html.concat(self.genHTML(node.children, index + 1));
      }
      html.push('</li>');
    });
    html.push('</ul>');
    return html.join('');
  }
}

module.exports = Menu;
