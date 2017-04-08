'use strict';

const UIBase = require('./ui_base');
const dialogs = require('dialogs');
const simpleGit = require('simple-git');
const dialog = dialogs({});
class Git extends UIBase {
  /**
   * [constructor description]
   * @param  {Object} options
   *         - container
   *         - bookRoot
   * @return {[type]}         [description]
   */
  constructor(options) {
    super();
    this.container = options.container;
    this.git = simpleGit(options.bookRoot);
    let self = this;
    this.container.find('.close').on('click', function () {
      self.hide();
    });
    this.container.find('.opt').on('click', 'a', function () {
      let type = this.getAttribute('action');
      self.container.find('.cnt').html('loading...');
      switch (type) {
        case 'status':
          self.git.status(function (err, data) {
            // console.log(data);
            let html = [];
            html.push('<h3> current:' + data.current + '</h3>');
            html.push('file changes:');

            let staged = ['<h3>file staged</h3>'];
            let unstaged = ['<h3>file unstaged</h3>'];
            let untracked = ['<h3>file untracked</h3>']
            data.files.forEach(function (v) {
              if (v.working_dir === ' ' && v.index !== ' ') {
                staged.push('<p>' + v.working_dir + ' ' + processFileName(v.path) + '</p>');
              } else if (v.working_dir !== ' ' && v.index === ' ') {
                unstaged.push('<p>' + v.working_dir + ' ' + processFileName(v.path) + '</p>');
              } else {
                untracked.push('<p>' + v.working_dir + ' ' + processFileName(v.path) + '</p>');
              }
            });
            if (!data.files.length) {
              html.push('nothing changed!');
            } else {
              if (staged.length > 1) {
                html.push(staged.join(''));
              }
              if (unstaged.length > 1) {
                html.push(unstaged.join(''));
              }
              if (untracked.length > 1) {
                html.push(untracked.join(''));
              }
            }
            self.container.find('.cnt').html(html.join(''));
          });
          break;
        case 'pull':
          self.git.pull('origin', 'master', {}, function (err, data) {
            // console.log(err, data);
            if (err) {
              self.container.find('.cnt').html(err);
            } else {
              console.log(data);
              self.container.find('.cnt').html(`
                <p> changes: ${data.summary.changes}</p>
                <p> deletions: ${data.summary.deletions} </p>
                <p> insertions: ${data.summary.insertions} </p>
              `);
            }
          });
          break;
        case 'commit':
          dialog.prompt('commit message:', 'update book', function (value) {
            self.git.add('./*', function (err) {
              if (err) {
                return dialog.alert(err);
              }
              self.git.commit(value, function (err) {
                if (err) {
                  dialog.alert(err);
                } else {
                  self.switchTo('status');
                }
              });
            });
          });
          break;
        case 'tag':
          self.git.tags(function (err, data) {
            console.log(data);
          });
          break;
        case 'push':
          self.git.push('-u', 'origin', 'master', function (err, data) {
            if (err) {
              dialog.alert(err);
            } else {
              self.switchTo('status');
            }
          });
      }
    });
  }
  switchTo(name) {
    this.container.find(`.opt a[action=${name}]`).trigger('click');
  }
  show() {
    let self = this;
    this.git.getRemotes(true, function (err, data) {
      if (err) {
        return dialog.alert(err);
      }
      data.forEach(function (n) {
        if (n.name === 'origin') {
          self.container.find('.git-url').html(n.refs.fetch);
        }
      });
    });
    this.switchTo('status');
    this.container.show();
  }
  hide() {
    this.container.hide();
  }
}

/** 处理中文乱码显示问题 */
function processFileName(str) {
  if (!str.replace) {
    return str;
  }
  str = str.replace(/\\(\d{3})/g, function (m0, m1) {
    return '%' + parseInt(m1, 8).toString(16);
  });
  return decodeURIComponent(str);
}

module.exports = Git;
