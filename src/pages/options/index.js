import browser from 'webextension-polyfill';

import './index.css';


const handleApiKeyInput = (event) => {
  if (!event || !event.target || !event.target.value) return;
  browser.storage.local.set({apiKey: event.target.value})
  .then(console.log('stored API key'))
  .catch(e => {
    // console.log(e);
  });
};

const prepareApiKeyInput = async () => {
  const apiKeyInputEl = document.getElementById('api-key-input');

  await browser.storage.local.get('apiKey')
  .then(({apiKey}) => {
    if (!apiKey) throw new Error('no-api-key-stored');
    apiKeyInputEl.value = apiKey;
  })
  .catch(e => {
    // console.log(e);
  })

  apiKeyInputEl.addEventListener('input', handleApiKeyInput, false);
}

prepareApiKeyInput();
