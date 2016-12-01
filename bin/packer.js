#!/usr/bin/env node
'use strict';

const builder = require('electron-builder');
const Platform = builder.Platform;

// Promise is returned
builder.build({
  targets: Platform.MAC.createTarget(),
  devMetadata: {

  }
}).then(() => {
  console.log('success'); // eslint-disable-line
}).catch((error) => {
  console.log(error); // eslint-disable-line
});
