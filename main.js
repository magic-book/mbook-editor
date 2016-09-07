/*!
 * GitbookEditor2: main.js
 * Authors  : fish <zhengxinlin@gmail.com> (https://github.com/fishbar)
 * Create   : 2016-07-24 11:52:58
 * CopyRight 2016 (c) Fish And Other Contributors
 */
'use strict';
// const config = require('./config');
const log = require('./lib/log');
// require('electron-cookies');
const electron = require('electron');
const app = electron.app;  // Module to control application life.
const BrowserWindow = electron.BrowserWindow;
const ipcMain = electron.ipcMain;
// var os = require('os');


// Report crashes to our server.
electron.crashReporter.start({
  productName: 'editor',
  companyName: 'fishbar',
  submitURL: '~',
  autoSubmit: true
});

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the javascript object is GCed.
var mainWindow = null;
// Quit when all windows are closed.
app.on('window-all-closed', function () {
  if (process.platform != 'darwin') {
    app.quit();
  }
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
    width: 800,
    height: 600,
    // titleBarStyle: 'hidden-inset',
    // frame: false,
    // transparent: true
  });


  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/view/main.html#!/editor?bookRoot=` + __dirname + '/example');
  // Open the devtools.
  mainWindow.webContents.openDevTools({
    mode: 'bottom'
  });

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
    app.exit(0);
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
  ipcMain.on('ctrl-ready', function (event, args) {

  });
  /**
   * 控制器切换事件
   */
  ipcMain.on('ctrl-change', function (event, args) {

  });
  /*
  mainWindow.webContents.on('dom-ready', function (evt) {
    console.log(evt);
    this.executeJavaScript('', function () {});
  });
  */
  // console.log(mainWindow.webContents);
});
