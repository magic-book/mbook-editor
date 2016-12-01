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


#TODO: icon and ignore files
release:
	@$(ELECTRON_PACKAGER) . MagicBook \
		--platform=$(PLATFORM) \
		--arch=$(ARCH) \
		--out=release \
		--no-prune \
		--overwrite \
		--version=$(ELECTRON_VERSION) \
		--ignore=bin/ \
		--ignore=node_modules/.npminstall \
		--ignore=node_modules/mocha \
		--ignore=node_modules/should \
		--ignore=node_modules/electron-builder \
		--ignore=node_modules/electron-rebuild \
		--ignore=node_modules/electron \
		--ignore=node_modules/electron-packager

pack-mac:
	@if [ ! -d "bin/create-dmg" ]; then git clone git@github.com:andreyvit/create-dmg.git bin/create-dmg; fi
	@bin/create-dmg/create-dmg \
		--volname "MagicBook" \
		--window-pos 200 120 \
		--window-size 800 400 \
		--app-drop-link 600 185 \
		release/mbook.dmg release/MagicBook-darwin-x64

rebuild:
	./bin/node_modules/.bin/electron-rebuild -m=$(shell pwd)/node_modules -d=https://gh-contractor-zcbenz.cnpmjs.org/atom-shell/dist  -f -w mmmagic
	# @./node_modules/.bin/electron-rebuild -f -w mmmagic

test:
	@./bin/node_modules/.bin/mocha --recursive -r should test

.PHONY: test release install package pack-mac
