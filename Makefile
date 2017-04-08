ELECTRON_PACKAGER = ./bin/node_modules/.bin/electron-packager
ELECTRON_VERSION = $(cat ./package.json | grep "\"electron\"" | awk -F'"' '{print $4}')
NPM = $(sehll if [ `which cnpm`]; then  echo 'cnpm' else echo 'npm' fi)
UNAME_S := $(shell uname -s)

ifeq ($(UNAME_S), Darwin)
	PLATFORM = darwin
else
	ifeq ($(UNAME_S),Linux)
		PLATFORM = linux
	else
		PLATFORM = win32
	endif
endif

UNAME_M := $(shell uname -m)
ifeq ($(UNAME_M), x86_64)
	ARCH = x64
else ifeq ($(UNAME_M), i686)
	ARCH = x64
else
	ifeq ($(UNAME_M), x86)
		ARCH = ia32
	else
		ARCH = unknow
	endif
endif

npm-install:
	@npm install
	@cd bin && tnpm install

install: npm-install rebuild

package-clean:
	@rm -rf release
	@rm -rf run.sock
	@rm -rf node_modules/codemirror/src
	@ls node_modules/codemirror/theme/ | grep -v base16-light | xargs -I {} rm node_modules/codemirror/theme/{}
	@ls node_modules/codemirror/mode/ | grep -v gfm | \
		grep -v markdown | \
		grep -v xml | \
		grep -v meta | \
		grep -v stex | \
		xargs -I {} rm -r node_modules/codemirror/mode/{}
	@rm -rf node_modules/jquery/src node_modules/jquery/external
	@rm -rf node_modules/jquery/dist/core.js
	@rm -rf node_modules/jquery/dist/jquery.min.js
	@rm -rf node_modules/jquery/dist/jquery.min.map
	@rm -rf node_modules/jquery/dist/jquery.slim.js
	@rm -rf node_modules/jquery/dist/jquery.slim.min.js
	@rm -rf node_modules/jquery/dist/jquery.slim.min.map
	@rm -rf node_modules/ejs/test


#TODO: icon and ignore files
release: package-clean
	@mkdir release
	@cp config/config_release.js config/config.js
	@$(ELECTRON_PACKAGER) . MagicBook \
		--platform=$(PLATFORM) \
		--arch=$(ARCH) \
		--icon=./mbook.icns \
		--out=./release \
		--no-prune \
		--overwrite \
		--version=$(ELECTRON_VERSION) \
		--ignore=bin/ \
		--ignore=node_modules/.npminstall \
		--ignore=node_modules/mocha \
		--ignore=node_modules/should \
		--ignore=node_modules/electron
	@rm -rf config/config.js
	@bin/packer.sh

pack-mac:
	@if [ ! -d "bin/create-dmg" ]; then git clone git@github.com:andreyvit/create-dmg.git bin/create-dmg; fi
	@bin/create-dmg/create-dmg \
		--volname "MagicBook" \
		--window-pos 200 120 \
		--window-size 800 400 \
		--app-drop-link 600 185 \
		release/mbook.dmg release/MagicBook-darwin-x64

rebuild:
	./bin/node_modules/.bin/electron-rebuild -m ./ -d=https://npm.taobao.org/mirrors/atom-shell/  -f -w mmmagic
	# @./node_modules/.bin/electron-rebuild -f -w mmmagic

test:
	@./bin/node_modules/.bin/mocha --recursive -r should test

.PHONY: test release install package pack-mac
