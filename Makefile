ELECTRON_PACKAGER = ./node_modules/.bin/electron-packager
BUILD_IGNORE = ./node_modules/.npminstall

UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
	PLATFORM = darwin
else
	ifeq ($(UNAME_S),Linux)
		PLATFORM = linux
	else
		PLATFORM = unknow
	endif
endif

UNAME_M := $(shell uname -m)
ifeq ($(UNAME_M),x86_64)
	ARCH = x64
else
	ifeq ($(UNAME_M),x86)
		ARCH = ia32
	else
		ARCH = unknow
	endif
endif

#TODO: icon and ignore files
release:
	@$(ELECTRON_PACKAGER) . MagicBook --platform=$(PLATFORM) --arch=$(ARCH) --out=release --overwrite --version=1.3.3 --ignore=$(BUILD_IGNORE)

test:
	@./node_modules/.bin/mocha --recursive -r should test

.PHONY: test release
