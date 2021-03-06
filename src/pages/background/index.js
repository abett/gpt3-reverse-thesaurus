// load icons that are referred to in manifest.json
import 'img/icon_64.png';
import 'img/icon_128.png';


// import browser API polyfill to make this extension multi-browser compatible
import browser from 'webextension-polyfill';

// import callback to ask for API key on installation
import { onInstalledCallback } from './scripts/event_listener/installation';
import { onCommandCallback, onBrowserActionCallback } from './scripts/event_listener/userInteraction';

// register onInstalledCallback
browser.runtime.onInstalled.addListener(onInstalledCallback);


browser.commands.onCommand.addListener(onCommandCallback);

browser.browserAction.onClicked.addListener(onBrowserActionCallback);
