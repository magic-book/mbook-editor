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
// require('electron-cookies');
const electron = require('electron');
const app = electron.app;  // Module to control application life.
const BrowserWindow = electron.BrowserWindow;
const ipcMain = electron.ipcMain;
const os = require('os');
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
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 700,
    frame: false,
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

  /**
   * 控制器ready事件
   */
  ipcMain.on('scene', function (event, args) {
    let scene = args.scene;
    let options = qs.stringify(args.options);
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

  ipcMain.on('hide-main-window', function (e) {
    mainWindow.hide();
    e.sender.send('screenshot');
  });
  ipcMain.on('create-sub-window', function (e, wh) {
    cutWindow = new BrowserWindow({
      width: wh[0],
      height: wh[1],
      modal: false,
      parent: mainWindow,
      fullscreen: true,
      resizable: false,
      skipTaskbar: true,
      frame: false,
      transparent: true
    });
    cutWindow.loadURL(`file://${__dirname}/view/cutter.html`);
    cutWindow.show();
    /*
    cutWindow.once('ready-to-show', () => {
      cutWindow.show();
      cutWindow.webContents.executeJavaScript('window.');
    });
    */

    // cutWindow.webContents.openDevTools(true);
  });

  ipcMain.on('close-subwindow', function () {
    cutWindow.close();
    mainWindow.show();
  });

  ipcMain.on('cut', function (e, arg) {
    cutWindow.capturePage(arg, function (image) {
      clipboard.writeImage(image);
      cutWindow.close();
      mainWindow.show();
    });
  });
  // mainWindow.webContents.on('dom-ready', function (evt) {
  //   console.log(evt);
  //   this.executeJavaScript('', function () {});
  // });
});
