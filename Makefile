ELECTRON_PACKAGER = ./node_modules/.bin/electron-packager
ELECTRON_VERSION = $(cat ./package.json | grep "\"electron\"" | awk -F'"' '{print $4}')
BUILD_IGNORE = ./node_modules/.npminstall,./node_modules/mocha,./node_modules/should
NPM = $(sehll if [ `which cnpm`]; then  echo 'cnpm' else echo 'npm' fi)
UNAME_S := $(shell uname -s)

ifeq ($(UNAME_S), Darwin)
	PLATFORM = darwin
else
	ifeq ($(UNAME_S),Linux)
		PLATFORM = linux
	else
		PLATFORM = unknow
	endif
endif

UNAME_M := $(shell uname -m)
ifeq ($(UNAME_M), x86_64)
	ARCH = x64
else
	ifeq ($(UNAME_M), x86)
		ARCH = ia32
	else
		ARCH = unknow
	endif
endif

npm-install:
	@cnpm install || npm install

install: npm-install rebuild


#TODO: icon and ignore files
release:
	@$(ELECTRON_PACKAGER) . MagicBook --platform=$(PLATFORM) --arch=$(ARCH) --out=release --overwrite --version=$(ELECTRON_VERSION) --ignore=$(BUILD_IGNORE)\

rebuild:
	@./node_modules/.bin/electron-rebuild

test:
	@./node_modules/.bin/mocha --recursive -r should test

.PHONY: test release install package
