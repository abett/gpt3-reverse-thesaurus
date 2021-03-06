import browser from 'webextension-polyfill';
import _ from 'lodash';
import axios from 'axios';


let targetAnchorPosition;

const insertSuggestion = (suggestion) => {
  const target = document.querySelector('.thesaurus-anchor');
  if (!target) return;

  console.log(`we will now try to insert ${suggestion}`);

  try {
    if (targetAnchorPosition) {
      target.value = target.value.slice(0,targetAnchorPosition-1) + suggestion + target.value.slice(targetAnchorPosition+1);
    } else {
      target.value += suggestion;
    }
  } catch(e) {
    // console.log(e);
  }

  hideThesaurusHelper();
}

const handleSuggestionSelect = (event) => {
  // event.preventDefault();
  const suggestion = event.target.textContent;
  if (suggestion) insertSuggestion(suggestion);
}

const handleSubmitClick = (event) => {
  event.preventDefault();
  getSuggestions();
}

const getSuggestions = () => {
  const helperInputEl = document.getElementById('thesaurus-explanation-input');
  if (!helperInputEl) return;

  const explanation = (helperInputEl.value || '').trim();
  if (explanation && explanation.length > 15) {

    // prepare axios client headers
    const gtp3Api = axios.create({
      baseURL: 'https://1hpd1g.deta.dev/api/v1',
      headers: {
        'content-type' : 'application/json',
        'Authorization': `Bearer ${process.env.API_TOKEN}`
      },
    });

    gtp3Api.post(`/findwords/`, {
      body: {
        user_prompt: explanation,
        input_language: 'en',
        output_language: 'en',
        tonality: 'friendly',
        max_suggestions: 5,
      }
    })
    .then(response => response.data)
    .then(data => {
      console.log(data);
      if (!data) throw new Error('no-data');

      const suggestions = _.get(data, 'suggestions', []);
      if (!suggestions || suggestions.length === 0) throw new Error('no-suggestions');

      // first, disable the submit button again
      const submitButtonEl = document.getElementById('thesaurus-request-button');
      submitButtonEl.disabled = true;

      // then clear result area
      const resultArea = document.getElementById('thesaurus-suggestions');
      resultArea.textContent = '';

      const suggestionsList = document.createElement('ul');
      suggestionsList.id = 'thesaurus-suggestion-list';

      suggestions.forEach((suggestion, i) => {
        const suggestionLiEl = document.createElement('li');
        suggestionLiEl.classList.add(['thesaurus-suggestion']);
        suggestionLiEl.textContent = suggestion;
        suggestionLiEl.addEventListener('click', handleSuggestionSelect, false);

        suggestionsList.appendChild(suggestionLiEl);
      });

      resultArea.appendChild(suggestionsList);

    })
    .catch(e => {
      console.log(e);

      // put a warning into the result area
      const resultArea = document.getElementById('thesaurus-suggestions');
      if (e.message === 'no-suggestions') {
        resultArea.textContent = "there haven't been any good suggestions :'(";
      } else {
        resultArea.textContent = 'computer sagt nein.';
      }
    })
  }
}

const unlockButton = (event) => {
  const helperInputEl = event.target;
  const submitButtonEl = document.getElementById('thesaurus-request-button');
  if (!helperInputEl || !submitButtonEl) return;

  if (helperInputEl.value.length > 15 && submitButtonEl.disabled) {
    submitButtonEl.disabled = false;
  }
}

const createThesaurusHelper = () => {

  // create an overlay and position it at the input caret, if possible
  const helperEl = document.createElement('div');
  helperEl.id = 'thesaurus-helper';

  const headerEl = document.createElement('div');
  headerEl.id = 'thesaurus-helper-header';

  // create a small button to remove the overlay
  const closeEl = document.createElement('a');
  closeEl.id = 'close-thesaurus-helper';
  closeEl.href = '#';
  closeEl.textContent = 'X';
  closeEl.addEventListener('click', hideThesaurusHelper, false);

  headerEl.appendChild(closeEl);



  const bodyEl = document.createElement('div');
  bodyEl.id = 'thesaurus-helper-body';

  // create an area where the user can input their request
  const requestArea = document.createElement('div');
  requestArea.classList.add(['request-wrapper']);

  const helperInputLabelEl = document.createElement('label');
  helperInputLabelEl.for = 'thesaurus-explanation';
  helperInputLabelEl.style.display = 'none';
  helperInputLabelEl.innerHTML = 'thesaurus explanation';

  requestArea.appendChild(helperInputLabelEl);

  const helperInputEl = document.createElement('input');
  helperInputEl.type = 'text';
  helperInputEl.id = 'thesaurus-explanation-input';
  helperInputEl.name = 'thesaurus-explanation';
  helperInputEl.placeholder = "explain the word you're looking for";
  helperInputEl.addEventListener('input', unlockButton, false);
  helperInputEl.addEventListener('keyup', (e) => {
    if (e.key === "Escape") hideThesaurusHelper();
    if (e.key === "Enter") getSuggestions();
  }, false);

  requestArea.appendChild(helperInputEl);

  const submitButtonEl = document.createElement('button');
  submitButtonEl.type = 'submit';
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



  const footerEl = document.createElement('div');
  footerEl.id = 'thesaurus-helper-footer';
  footerEl.innerHTML = "<div><p>Please enter a description of the word you're trying to find (>15 characters)</p></div>";

  // put it all together
  helperEl.appendChild(headerEl);
  helperEl.appendChild(bodyEl);
  helperEl.appendChild(footerEl);

  helperEl.style.display = 'none';
  document.body.appendChild(helperEl);
}

const displayThesaurusHelper = () => {
  try {
    document.activeElement.classList.add(['thesaurus-anchor']);
    targetAnchorPosition = document.activeElement.selectionEnd || null;
  } catch(e) {
    // console.log(e);
  }

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

  const target = document.querySelector('.thesaurus-anchor');
  if (target) target.classList.remove('thesaurus-anchor');

  targetAnchorPosition = null;
}

const toggleThesaurusHelper = () => {
  const helperEl = document.getElementById('thesaurus-helper');
  if (helperEl) {
    const isHidden = helperEl.style.display === 'none';
    if (isHidden) {
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
    event.target.classList.add(['thesaurus-anchor']);
    displayThesaurusHelper();

  } else {
    hideThesaurusHelper();
  }
}

createThesaurusHelper();

document.body.addEventListener('input', handleInputChange, false);
// console.log('loaded!');

browser.runtime.onMessage.addListener(request => {
  console.log(request);
  if (request === 'toggle-thesaurus-helper') toggleThesaurusHelper();
})
