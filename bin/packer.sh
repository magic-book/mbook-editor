#!/bin/sh

UNAME_S=`uname -s`
if [ "$UNAME_S" = "Darwin" ]; then
  PLATFORM=darwin
elif [ "$UNAME_S" = "Linux" ]; then
  PLATFORM=linux
else
  PLATFORM=unknow
fi

UNAME_M=`uname -m`
if [ "$UNAME_M" = "x86_64" ]; then
  ARCH=x64
elif [ "$UNAME_M" = "x86"]; then
  ARCH=ia32
else
  ARCH=unknow
fi

## pack mac os dmg
function pack_macox {
  if [ ! -d "bin/create-dmg" ]; then
    git clone git@github.com:andreyvit/create-dmg.git bin/create-dmg
  fi

  bin/create-dmg/create-dmg \
    --volname "MagicBook" --window-pos 200 120 --window-size 800 400 --app-drop-link 600 185 release/mbook.dmg release/MagicBook-$PLATFORM-$ARCH
}



if [ "$PLATFORM" = 'darwin' ]; then
  pack_macox
else
  echo windows
fi