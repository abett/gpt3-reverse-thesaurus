import browser from 'webextension-polyfill';

const onInstalledCallback = details => {

  if (details.reason === 'install') {
    // Code to be executed on first install
    browser.tabs.create({
      url: browser.runtime.getURL('options.html'),
    });
  } else if (details.reason === 'update') {
    // Code to be executed on every update
    /* browser.tabs.create({
      url: browser.runtime.getURL('options.html'),
    }); */
  }
};

export { onInstalledCallback };
