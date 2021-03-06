import browser from 'webextension-polyfill';

const toggleHelperOnActiveTab = () => {
  browser.tabs.query({
    currentWindow: true,
    active: true
  })
  .then(tabs => {
    console.log(tabs);
    browser.tabs.sendMessage(tabs[0].id, 'toggle-thesaurus-helper');
  })
  .catch(e => {
    console.log(e);
  });
};

const onCommandCallback = command => {
  console.log(command);
  if (command === 'toggle-thesaurus-helper') {
    toggleHelperOnActiveTab();
  }
};

const onBrowserActionCallback = tab => {
  console.log(tab);
  toggleHelperOnActiveTab();
};


export { onCommandCallback, onBrowserActionCallback, toggleHelperOnActiveTab,  };
