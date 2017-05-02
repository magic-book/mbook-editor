#!/bin/sh

if [ "${0:0:1}" = "/" ]; then
  BASE=$(dirname `dirname $0`)
else
  BASE=$(dirname `pwd`/`dirname $0`)
fi

cd $BASE

# build webworker file
./bin/node_modules/.bin/browserify ./model/ui/webworker_render_src.js -o ./model/ui/webworker_render.js
# start electron
./node_modules/.bin/electron . $1 $2 $3
