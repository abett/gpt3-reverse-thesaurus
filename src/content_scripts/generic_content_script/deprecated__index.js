import _ from 'lodash';
import axios from 'axios';
import getCaretCoordinates from'textarea-caret';


const openAiEngine = 'davinci';
const openAiPrompt = 'A clever bot that finds the correct word.\r\n' +
  '\r\n' +
  'Q: when something or someone leaves somewhere abruptly\r\n' +
  'A: absquatulate, abscond, bolt, decamp, depart, disappear.\r\n' +
  'Q: like shrewd\r\nA: argute, astute, cagey, canny, crafty.\r\n' +
  'Q: Acting in a rage or really hysterical\r\n' +
  'A: conniption, blowup, fit, huff, outburst, scene, tantrum\r\n' +
  'Q: When someone is reddening or blushing\r\n' +
  'A: erubescent, blooming, cerise, crimson.\r\n' +
  'Q: a mixture of horrible sounds\r\n' +
  'A: cacophony, noise, discord, harsh.';



let targetAnchorPosition;

const insertSuggestion = (suggestion) => {
  const target = document.querySelector('.thesaurus-anchor');
  if (!target) return;

  target.value = target.value.slice(0,targetAnchorPosition-1) + suggestion + target.value.slice(targetAnchorPosition+1);

  removeThesaurusHelper();
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
      baseURL: 'https://api.openai.com/v1',
      headers: {
        'content-type' : 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_TOKEN}`
      },
    });

    const finalPrompt = openAiPrompt + '\r\nQ: ' + explanation + '\r\nA: ';

    gtp3Api.post(`/engines/${openAiEngine}/completions`, {
      prompt: finalPrompt,
      max_tokens: 8,
    })
    .then(response => response.data)
    .then(data => _.get(data, ['choices', 0, 'text']) )
    .then(completion => {
      completion = completion.replace(/^(\r|\n)+/, '');
      const suggestions = completion
      .split(/[, ]/)
      .map(s => s.trim()) // trim whitespace
      .filter(s => s.length > 2); // remove results of <= 2 characters length

      if (!suggestions) throw new Error('no-suggestions');

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

const displayThesaurusHelper = (targetEl) => {
  // create an overlay and position it at the input caret, if possible
  const helperEl = document.createElement('div');
  helperEl.id = 'thesaurus-helper';
  // helperEl.classList.add(['gtp-thesaurus']);

  try {
    const caret = getCaretCoordinates(targetEl, targetEl.selectionEnd);
    if (caret && caret.top && caret.left && caret.height) {
      helperEl.style.position = 'absolute';
      helperEl.style.top = (caret.top + 10)+'px';
      helperEl.style.left = caret.left+'px';
    }
  } catch(e) {
    // just skip the positioning for now
  }


  // create a small button to remove the overlay
  const closeEl = document.createElement('a');
  closeEl.id = 'close-thesaurus-helper';
  closeEl.href = '#';
  closeEl.textContent = 'X';
  closeEl.addEventListener('click', removeThesaurusHelper, false);

  // create an area where the user can input their request
  const requestArea = document.createElement('div');
  requestArea.classList.add(['request-wrapper']);

  const helperInputLabelEl = document.createElement('label');
  helperInputLabelEl.for = 'thesaurus-explanation-input';
  helperInputLabelEl.style.display = 'none';
  helperInputLabelEl.innerHTML = 'thesaurus explanation';

  requestArea.appendChild(helperInputLabelEl);

  const helperInputEl = document.createElement('input');
  helperInputEl.type = 'text';
  helperInputEl.id = 'thesaurus-explanation-input';
  helperInputEl.name = 'thesaurus-explanation-input';
  helperInputEl.placeholder = "Explain the word you're looking for with 15+ characters...";
  helperInputEl.addEventListener('input', unlockButton, false);
  helperInputEl.addEventListener('keyup', (e) => {
    if (e.key === "Escape") removeThesaurusHelper();
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
  resultArea.innerHTML = "<small>Please enter a description of the word you're trying to find (>15 characters)</small>";

  // put it all together
  helperEl.appendChild(closeEl);
  helperEl.appendChild(requestArea);
  helperEl.appendChild(resultArea);
  targetEl.parentElement.insertBefore(helperEl, targetEl);

  // focus the input on the thesaurus helper
  helperInputEl.focus();
}

const removeThesaurusHelper = () => {
  const helperEl = document.getElementById('thesaurus-helper');
  if (helperEl) helperEl.remove();

  const target = document.querySelector('.thesaurus-anchor');
  if (target) target.classList.remove('thesaurus-anchor');
}

const handleInputChange = (event) => {
  if (event.target.id === 'thesaurus-explanation-input') return;
  if (!event.target.value) return;

  if (event.data === '{') {
    removeThesaurusHelper();

    event.target.classList.add(['thesaurus-anchor']);
    targetAnchorPosition = event.target.selectionEnd;

    displayThesaurusHelper(event.target);

  } else {
    removeThesaurusHelper();
  }

}

document.body.addEventListener('input', handleInputChange, false);
// console.log('loaded!');
