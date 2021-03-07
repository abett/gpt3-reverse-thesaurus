import browser from 'webextension-polyfill';
import _ from 'lodash';
import axios from 'axios';

import 'img/animations/spinner-bubbles.svg';


const languageSelectionDict = [
  {label: 'EN', value: 'en', description: 'Find an English word', disabled: false},
  {label: 'DE', value: 'de', description: 'Find a German word', disabled: false},
  {label: 'FR', value: 'fr', description: 'Find a French word', disabled: true},
  {label: 'ES', value: 'es', description: 'Find a Spanish word', disabled: true},
];

// use this to persist the position of the caret when the user calls up the overlay
let targetAnchorPosition;

const handleSuggestionSelect = async (event) => {
  // event.preventDefault();
  const suggestion = event.currentTarget.dataset.suggestion;
  if (!suggestion) return;

  const target = document.querySelector('.thesaurus-anchor');

  if (target) {
    try {
      if (targetAnchorPosition) {
        target.value = target.value.slice(0,targetAnchorPosition).replace(/\?\?\?$/, '') + suggestion + target.value.slice(targetAnchorPosition+1);
      } else {
        target.value += suggestion;
      }
    } catch(e) {
      // console.log(e);
      target.value += suggestion;
    }
    console.log(`inserted "${suggestion}" into ${target.tagName.toLowerCase()}`);
  } else if (navigator.clipboard) {
    await navigator.clipboard.writeText(suggestion)
    .then(() => {
      console.log(`copied "${suggestion}" to clipboard`);
    })
    .catch(e => {
      console.log(e);
    });
  }

  const helperInputEl = document.getElementById('thesaurus-explanation-input');
  if (helperInputEl) helperInputEl.value = '';

  hideThesaurusHelper();
}

const handleSubmitClick = (event) => {
  event.preventDefault();
  getSuggestions();
}

const getSuggestions = async () => {
  const helperInputEl = document.getElementById('thesaurus-explanation-input');
  if (!helperInputEl) return;

  const explanation = (helperInputEl.value || '').trim();
  if (explanation && explanation.length > 15) {

    // first, disable the input, submit button and display a spinner
    helperInputEl.disabled = true;

    const submitButtonEl = document.getElementById('thesaurus-request-button');
    submitButtonEl.disabled = true;

    const resultArea = document.getElementById('thesaurus-suggestions');
    resultArea.innerHTML = `<div class="loading-spinner"><img src="${browser.extension.getURL('spinner-bubbles.svg')}" /></div>`;


    const apiKey = await browser.storage.local.get('apiKey')
    .then(({apiKey}) => apiKey)
    .catch(e => {
      // console.log(e);
      return process.env.API_TOKEN;
    });

    // prepare http agent
    const gtp3Api = axios.create({
      baseURL: 'https://1hpd1g.deta.dev/api/v1',
      headers: {
        'content-type' : 'application/json',
        // 'Authorization': `Bearer ${apiKey}`
      },
    });

    const requestBody = {
      user_prompt: explanation,
      input_language: 'en',
      output_language: 'en',
      tonality: 'friendly',
      max_suggestions: 5,
    }

    const inLangSelectionSelectEl = document.getElementById('thesaurus-helper-language-in-select');
    const outLangSelectionSelectEl = document.getElementById('thesaurus-helper-language-out-select');
    if (inLangSelectionSelectEl && inLangSelectionSelectEl.value) _.set(requestBody, 'input_language', inLangSelectionSelectEl.value);
    if (outLangSelectionSelectEl && outLangSelectionSelectEl.value) _.set(requestBody, 'output_language', outLangSelectionSelectEl.value);

    // TODO: activate real API below!
    /* const returnDummyData = async () => {
      return {
        suggestions: {
          "alien": "den Erfahrungen und Gefühlen anderer fremd sein, nicht zugehörig sein",
          "outsider": "jemand, der nicht Teil einer Gruppe ist",
          "loner": "jemand, der nicht gerne in Gruppen arbeitet oder sich mit anderen Menschen abgibt"
        },
        input_language: "en",
        output_language: "en",
        tonality: "friendly",
      }
    };
    returnDummyData() */
    // TODO: UNCOMMENT HERE and remove returnDummyData above
    // request word suggestions
    gtp3Api.post(`/findwords/`, requestBody)
    .then(response => response.data)
    .then(data => {
      if (!data) throw new Error('no-data');

      // check whether we have an anchor to push this data to
      const target = document.querySelector('.thesaurus-anchor');

      let suggestionDict = _.get(data, 'suggestions', {});
      if (!suggestionDict || _.keys(suggestionDict).length === 0) throw new Error('no-suggestions');

      // handle case of result being only a string array
      if (_.isArray(suggestionDict)) {
        suggestionDict = suggestionDict.reduce((a,b) => {a[b] = null; return a;}, {});
      }

      // clear result area, so we can render our results in
      resultArea.textContent = '';

      const suggestionsList = document.createElement('div');
      suggestionsList.id = 'thesaurus-suggestion-list';

      _.keys(suggestionDict).forEach((suggestion, i) => {
        const suggestionEl = document.createElement('div');
        suggestionEl.id = `thesaurus-suggestion-${i}`;
        suggestionEl.dataset.suggestion = suggestion;
        suggestionEl.classList.add(['thesaurus-suggestion']);

        const suggestionCaptionEl = document.createElement('div');
        suggestionCaptionEl.classList.add(['thesaurus-suggestion-caption']);
        suggestionCaptionEl.textContent = suggestion;

        const suggestionExplanationEl = document.createElement('div');
        suggestionExplanationEl.classList.add(['thesaurus-suggestion-explanation']);
        const suggestionExplanation = suggestionDict[suggestion];
        if (suggestionExplanation) suggestionExplanationEl.textContent = suggestionExplanation;

        const suggestionActionsEl = document.createElement('div');
        if (target) {
          suggestionActionsEl.classList.add(['thesaurus-suggestion-action-cta']);
          suggestionActionsEl.dataset.action = 'insert';
        } else if (navigator.clipboard) {
          suggestionActionsEl.classList.add(['thesaurus-suggestion-action-cta']);
          suggestionActionsEl.dataset.action = 'copy';
        }


        suggestionEl.appendChild(suggestionCaptionEl);
        suggestionEl.appendChild(suggestionExplanationEl);
        suggestionEl.appendChild(suggestionActionsEl);

        suggestionEl.addEventListener('click', handleSuggestionSelect, false);

        suggestionsList.appendChild(suggestionEl);
      });

      resultArea.appendChild(suggestionsList);

    })
    .catch(e => {
      console.log(e);

      // put a warning into the result area
      if (e.message === 'no-suggestions') {
        resultArea.textContent = '<div class="thesaurus-error">computer sagt nein</div>';
      } else {
        resultArea.innerHTML = '<div class="thesaurus-error">computer sagt nein</div>';
      }
    })
    .finally(() => {
      submitButtonEl.disabled = false;
      helperInputEl.disabled = false;
    })
  }
}

const unlockButton = (event) => {
  const helperInputEl = event.target;
  const submitButtonEl = document.getElementById('thesaurus-request-button');
  if (!helperInputEl || !submitButtonEl) return;

  if (helperInputEl.value.length > 15 && submitButtonEl.disabled) {
    submitButtonEl.disabled = false;
  } else if (helperInputEl.value.length <= 15) {
    submitButtonEl.disabled = true;
  }
}

const createThesaurusHelper = () => {
  // create an overlay
  const helperEl = document.createElement('div');
  helperEl.id = 'thesaurus-helper';

  // create a header row
  const headerEl = document.createElement('div');
  headerEl.id = 'thesaurus-helper-header';

  // create a selector for the language to suggest
  const languageSelectionEl = document.createElement('div');
  languageSelectionEl.id = 'thesaurus-helper-language-switch';

  const inLanguageSelectionLabelEl = document.createElement('label');
  inLanguageSelectionLabelEl.for = 'thesaurus-helper-language-in-select';
  inLanguageSelectionLabelEl.textContent = 'Input: ';
  // inLanguageSelectionLabelEl.style.display = 'none';

  const inLanguageSelectionSelectEl = document.createElement('select');
  inLanguageSelectionSelectEl.id = 'thesaurus-helper-language-in-select';
  inLanguageSelectionSelectEl.name = 'thesaurus-helper-language';

  languageSelectionDict.forEach(lang => {
    const inLanguageSelectionOptionEl = document.createElement('option');
    inLanguageSelectionOptionEl.value = lang.value;
    inLanguageSelectionOptionEl.textContent = lang.label;
    inLanguageSelectionOptionEl.disabled = lang.disabled
    inLanguageSelectionOptionEl.title = lang.description;
    inLanguageSelectionSelectEl.appendChild(inLanguageSelectionOptionEl);
  });
  inLanguageSelectionSelectEl.addEventListener('select', e => {
    e.preventDefault();
    // console.log(e);
  });


  const outLanguageSelectionLabelEl = document.createElement('label');
  outLanguageSelectionLabelEl.for = 'thesaurus-helper-language-out-select';
  outLanguageSelectionLabelEl.textContent = 'Output: ';
  // languageSelectionLabelEl.style.display = 'none';

  const outLanguageSelectionSelectEl = document.createElement('select');
  outLanguageSelectionSelectEl.id = 'thesaurus-helper-language-out-select';
  outLanguageSelectionSelectEl.name = 'thesaurus-helper-language';

  languageSelectionDict.forEach(lang => {
    const outLanguageSelectionDict = document.createElement('option');
    outLanguageSelectionDict.value = lang.value;
    outLanguageSelectionDict.textContent = lang.label;
    outLanguageSelectionDict.disabled = lang.disabled
    outLanguageSelectionDict.title = lang.description;
    outLanguageSelectionSelectEl.appendChild(outLanguageSelectionDict);
  });
  outLanguageSelectionSelectEl.addEventListener('select', e => {
    e.preventDefault();
    // console.log(e);
  });


  languageSelectionEl.appendChild(inLanguageSelectionLabelEl);
  languageSelectionEl.appendChild(inLanguageSelectionSelectEl);
  languageSelectionEl.appendChild(outLanguageSelectionLabelEl);
  languageSelectionEl.appendChild(outLanguageSelectionSelectEl);

  headerEl.appendChild(languageSelectionEl);


  // create a small button to remove the overlay
  const closeEl = document.createElement('div');
  closeEl.id = 'thesaurus-helper-close';
  closeEl.textContent = 'X';
  closeEl.addEventListener('click', hideThesaurusHelper, false);

  headerEl.appendChild(closeEl);


  // create a main body
  const bodyEl = document.createElement('div');
  bodyEl.id = 'thesaurus-helper-body';

  // create an area where the user can input their request
  const requestArea = document.createElement('div');
  requestArea.classList.add(['request-wrapper']);

  const helperInputLabelEl = document.createElement('label');
  helperInputLabelEl.for = 'thesaurus-explanation-input';
  helperInputLabelEl.style.display = 'none';
  helperInputLabelEl.textContent = 'thesaurus explanation';

  requestArea.appendChild(helperInputLabelEl);

  const helperInputEl = document.createElement('input');
  helperInputEl.type = 'text';
  helperInputEl.id = 'thesaurus-explanation-input';
  helperInputEl.name = 'thesaurus-explanation';
  helperInputEl.placeholder = "explain the word you're looking for";
  helperInputEl.addEventListener('input', unlockButton, false);
  helperInputEl.addEventListener('keyup', event => {
    if (event.key === "Escape") hideThesaurusHelper();
    if (event.key === "Enter") getSuggestions();
  }, false);

  requestArea.appendChild(helperInputEl);

  const submitButtonEl = document.createElement('button');
  submitButtonEl.type = 'button';
  submitButtonEl.id = 'thesaurus-request-button';
  submitButtonEl.innerHTML = 'GO';
  submitButtonEl.disabled = true;
  submitButtonEl.addEventListener('click', handleSubmitClick, false);

  requestArea.appendChild(submitButtonEl);


  // create an area where we explain how this works & then display the results
  const resultArea = document.createElement('div');
  resultArea.id = 'thesaurus-suggestions';
  resultArea.classList.add(['result-wrapper']);

  bodyEl.appendChild(requestArea);
  bodyEl.appendChild(resultArea);


  // create a footer row
  const footerEl = document.createElement('div');
  footerEl.id = 'thesaurus-helper-footer';
  footerEl.innerHTML = '<div><p class="team-note">' +
    'Created with ❤️ & <a href="https://openai.com/blog/openai-api/">Skynet</a> by <span class="team-name" /><br/>' +
    '(submission to the <a href="https://www.meetup.com/Natural-Language-Processing-Understanding-NLP-NLU/events/276054436/">GPT3 Hackathon</a> organized by <a href="https://www.meetup.com/Natural-Language-Processing-Understanding-NLP-NLU/">NLP Munich</a> Meetup group)' +
    '</p></div>';

  // put it all together
  helperEl.appendChild(headerEl);
  helperEl.appendChild(bodyEl);
  helperEl.appendChild(footerEl);

  helperEl.style.display = 'none';
  document.body.appendChild(helperEl);
}

const displayThesaurusHelper = () => {
  const helperEl = document.getElementById('thesaurus-helper');

  if (helperEl) {
    helperEl.style.display = '';
    try {
      const helperInputEl = document.getElementById('thesaurus-explanation-input');
      helperInputEl.focus();
    } catch(e) {
      // console.log(e);
    }
  }
}

const hideThesaurusHelper = () => {
  const helperEl = document.getElementById('thesaurus-helper');
  if (helperEl) helperEl.style.display = 'none';

  const anchors = document.querySelectorAll('.thesaurus-anchor');
  [].forEach.call(anchors, (target) => target.classList.remove('thesaurus-anchor'));

  targetAnchorPosition = null;
}

const toggleThesaurusHelper = () => {
  const helperEl = document.getElementById('thesaurus-helper');
  if (helperEl) {
    const isHidden = helperEl.style.display === 'none';
    if (isHidden) {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        activeEl.classList.add(['thesaurus-anchor']);
        targetAnchorPosition = activeEl.selectionEnd;
      }
      displayThesaurusHelper();
    } else {
      hideThesaurusHelper();
    }
  }
}

/* const removeThesaurusHelper = () => {
  const helperEl = document.getElementById('thesaurus-helper');
  if (helperEl) helperEl.remove();

  const target = document.querySelector('.thesaurus-anchor');
  if (target) target.classList.remove('thesaurus-anchor');
} */

const handleInputChange = (event) => {
  if (event.target.id === 'thesaurus-explanation-input') return;
  if (!event.target.value) return;

  if (event.data === '?') {
    try {
      const targetCaretPosition = event.target.selectionEnd || null;
      const inputThreeQuestionMarks = /\?\?\?$/.test(event.target.value.slice(0,targetCaretPosition));

      if (inputThreeQuestionMarks) {
        event.target.classList.add(['thesaurus-anchor']);
        targetAnchorPosition = targetCaretPosition;
        displayThesaurusHelper();
      }
    } catch(e) {
      // console.log(e);
    }
  }
}

createThesaurusHelper();

document.body.addEventListener('input', handleInputChange, false);

document.body.addEventListener('keydown', (event) => {
  if (event.key === "Escape") hideThesaurusHelper();
}, false);

browser.runtime.onMessage.addListener(request => {
  if (request === 'toggle-thesaurus-helper') toggleThesaurusHelper();
})
