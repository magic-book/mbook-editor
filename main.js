/*!
 * GitbookEditor2: main.js
 * Authors  : fish <zhengxinlin@gmail.com> (https://github.com/fishbar)
 * Create   : 2016-07-24 11:52:58
 * CopyRight 2016 (c) Fish And Other Contributors
 */
'use strict';
// const config = require('./config');
const log = require('./lib/log');
const program = require('commander');
const qs = require('querystring');
const path = require('path');
const fs = require('fs');
// require('electron-cookies');
const electron = require('electron');
const menu = electron.Menu;
const app = electron.app;  // Module to control application life.
const BrowserWindow = electron.BrowserWindow;
const ipcMain = electron.ipcMain;
const os = require('os');
const sockPath = path.join(os.tmpdir(), 'mbook.sock');
const pkg = require('./package.json');
const clipboard = electron.clipboard;

const versions = [
  '\n==============',
  'versions.app: ' + pkg.version,
  'version.electron: ' + process.versions.electron,
  'version.node: ' + process.versions.node,
  'version.v8: ' + process.versions.v8,
  'version.chrome: ' + process.versions.chrome,
  '=============='
];
log.info('versions:', versions.join('\n'));

function checkAbsPath(p) {
  let platform = os.platform();

  if (platform === 'win32') {
    return /^\w:\\/.test(p);
  } else {
    return p.startsWith('/');
  }
}

function cleanLog() {
  let p = path.join(__dirname, 'log');
  function fixZero(n) {
    return n > 9 ? n : '0' + n;
  }
  fs.readdir(p, function (err, data) {
    if (err) {
      return;
    }
    var d = new Date(new Date().getTime() - 3600 * 24 * 1000 * 3);
    var year = d.getFullYear();
    var month = d.getMonth() + 1;
    var day = d.getDate();
    var maxLog = 'sys.' + year + '-' + fixZero(month) + '-' + fixZero(day) + 'log';
    data.forEach(function (v) {
      if (v < maxLog) {
        fs.unlink(path.join(__dirname, './log', v));
      }
    });
  });
}

cleanLog();

const template = [
  {
    label: 'MagicBook',
    submenu: [
      {label: 'About MagicBook', role: 'orderFrontStandardAboutPanel'},
      {type: 'separator'},
      {label: 'Quit', accelerator: 'Command+Q', click: function () {
        app.quit();
      }}
    ]
  },
  {
    label: 'Edit',
    submenu: [
      {label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo'},
      {label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo'},
      {label: 'Reload', accelerator: 'CmdOrCtrl+R', role: 'reload'},
      {type: 'separator'},
      {label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut'},
      {label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy'},
      {label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste'},
      {label: 'Select All', accelerator: 'CmdOrCtrl+A', role: 'selectAll'}
    ]
  }
];

/**
 * 处理命令行进来的参数，比如直接打开文件夹
 */
if (process.argv.length === 1) {
  process.argv.unshift('');
}
const cwd = process.cwd();
program.version(require('./package.json').version)
  .option('-d, --dev', 'dev model')
  .parse(process.argv);

let bookdir = program.args[0];
if (bookdir) {
  if (!checkAbsPath(bookdir)) {
    bookdir = path.join(cwd, bookdir);
  }
}

if (program.dev) {
  bookdir = path.join(__dirname, './example');
  log.warn('dev model, open example book');
}

// Report crashes to our server.
electron.crashReporter.start({
  productName: 'editor',
  companyName: 'fishbar',
  submitURL: '~',
  autoSubmit: true
});

try {
  fs.unlinkSync(sockPath);
} catch (e) {

}
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the javascript object is GCed.
let mainWindow = null;
let cutWindow = null;
// Quit when all windows are closed.
app.on('window-all-closed', function () {
  app.quit();
});

app.on('quit', function () {
  log.warn('app quit');
});

// This method will be called when Electron has done everything
// initialization and ready for creating browser windows.
app.on('ready', function () {
  let base = __dirname;
  // setup menu
  menu.setApplicationMenu(menu.buildFromTemplate(template));
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 700,
    frame: false,
    titleBarStyle: 'hidden-inset',
    show: false
  });

  mainWindow.once('ready-to-show', () => {
    log.info('window is ready');
    mainWindow.show();
  });

  if (bookdir) {
    mainWindow.loadURL(`file://${__dirname}/view/main.html#!/editor?bookRoot=${bookdir}`);
  } else {
    mainWindow.loadURL(`file://${__dirname}/view/main.html#!/home`);
  }

  // and load the index.html of the app.
  // mainWindow.loadURL(`file://${__dirname}/view/main.html#!/editor?bookRoot=` + __dirname + '/example');
  // Open the devtools.


  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });

  // catch the drop event, and trigger
  mainWindow.webContents.on('will-navigate', function (event, url) {
    // navigate in base dir is granted;
    if (url.indexOf(base) === 0) {
      return;
    }
    this.send('will-navigate', url);
    // console.log(event, url);
    event.preventDefault();
  });
  ipcMain.on('exit', function () {
    mainWindow.close();
    cutWindow && cutWindow.isClosable() && cutWindow.close();
  });
  /**
   * 控制器ready事件
   */
  ipcMain.on('scene', function (event, args) {
    let scene = args.scene;
    let options = qs.stringify(args.options || {});
    mainWindow.loadURL(`file://${__dirname}/view/main.html#!/${scene}?${options}`);
    event.returnValue = 'success';
  });

  ipcMain.on('devtools', function (event, bool) {
    const mode = {
      mode: 'bottom'
    };
    if (bool !== undefined) {
      if (bool) {
        mainWindow.webContents.openDevTools(mode);
      } else {
        mainWindow.webContents.closeDevTools();
      }
    } else {
      // toggle devTool
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools(mode);
      }
    }
    event.returnValue = 'success';
  });

  ipcMain.on('hide-main-window', function (event) {
    mainWindow.hide();
    setTimeout(function () {
      event.sender.send('hide-main-window-done');
    }, 0);
  });

  ipcMain.on('screenshot-cut', function (e, data) {
    cutWindow = new BrowserWindow({
      width: data.width,
      height: data.height,
      modal: false,
      parent: mainWindow,
      fullscreen: true,
      resizable: false,
      skipTaskbar: true,
      frame: false,
      transparent: false,
      show: true
    });
    cutWindow.loadURL(`file://${__dirname}/view/cutter.html`);
    log.info('show cutWindow');
    // cutWindow.webContents.openDevTools(true);
  });

  ipcMain.on('cutwindow-close', function () {
    cutWindow.isClosable() && cutWindow.close();
    mainWindow.show();
  });

  ipcMain.on('cut', function (e, arg) {
    cutWindow.capturePage(arg, function (image) {
      clipboard.writeImage(image);
      cutWindow.close();
      mainWindow.show();
      mainWindow.webContents.send('cuted');
    });
  });
  // mainWindow.webContents.on('dom-ready', function (evt) {
  //   console.log(evt);
  //   this.executeJavaScript('', function () {});
  // });
  //
  const http = require('http');
  const URL = require('url');
  const marked = require('./lib/marked.js');
  const path = require('path');
  const renderer = new marked.Renderer();
  let resRoot;

  renderer.image = function (href, title, text) {
    var out = '<img src="' + path.join(resRoot, href) + '" alt="' + text + '"';
    if (title) {
      out += ' title="' + title + '"';
    }
    out +=  '/>';
    return out;
  };

  marked.setOptions({
    renderer: renderer,
    gfm: true,
    tables: true,
    breaks: false,
    pedantic: false,
    sanitize: false,
    smartLists: true,
    smartypants: false,
    highlight: function (code) {
      return require('highlight.js').highlightAuto(code).value;
    }
  });

  function resolvePath(base, file) {
    if (file.startsWith('/')) {
      return file;
    } else {
      return path.join(path.dirname(base), file);
    }
  }

  function resolveRes(file, md) {
    let regImg = /(\!\[[^\]]*\]\()([^\)]*)(\))/g;
    return md.replace(regImg, function (m0, m1, m2, m3) {
      m2 = resolvePath(file, m2);
      return m1 + m2 + m3;
    });
  }

  const serv = http.createServer(function (req, res) {
    let url = URL.parse(req.url, true);
    let query = url.query;
    // console.log('Message received from main script', query);
    let file = query.file || '';
    let md = query.md || '';

    resRoot = query.resRoot || '';

    marked(resolveRes(file, md) || '', function (err, data) {
      if (err) {
        return res.end(JSON.stringify({error: err}));
      }
      // console.log('>>>>', data);
      res.end(JSON.stringify({data: data}));
    });
  });
  serv.listen(43210);
});
