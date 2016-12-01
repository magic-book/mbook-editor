#!/bin/sh
if [ "${0:0:1}" = "/" ]; then
  BASE=$(dirname `dirname $0`)
else
  BASE=$(dirname `pwd`/`dirname $0`)
fi

cd $BASE

./node_modules/.bin/electron . $1 $2 $3
