# TRY IT OUT

## Installation

Just unpack the zip folder in the main directory and load it as an unpacked extension in your browser!
Any modern browser should do.

You will be prompted to enter your api key. For now, please use `gpt3-hackathon-demo`.

## Usage

### Open the App

You can bring the extension up one of three ways:
- press the keybinding `CTRL+SHIFT+U` on a website
- click the extension icon right of the browser omnibox
- type `???` in an `<input>` or `<textarea>` element on a website
(! some sites such as gmail have their custom editors, which we don't yet recognize)

### Search

1. Set the Language you want to describe and receive word-explanations in ("Input") and the language you want suggestions in ("Output")

Just type away!
(*The submit button unclocks once you've typed 15 characters*)




# Dev Setup

First, install node libraries:
```
$ npm i
$ npm run dev
```






To run the dev mode into /build folder:

```
$ npm run dev
```


To build the browser extension
```
$ NODE_ENV=production npm run build
```
