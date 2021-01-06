/**
* @file Main Piculator interface code.
* @copyright 2021 Aarmale and Spamalot
* @license
* This file is part of Piculator.
*
* Piculator is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
*
* Piculator is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with Piculator.  If not, see <https://www.gnu.org/licenses/>.
*/


/**
 * Enum for current state of approximation.
 * @readonly
 * @enum {number}
 */
const State = Object.freeze({
  NONE: 0,
  WAITING_ADVANCE: 1,
  RUNNING_AUTO_ADVANCE: 2,
  WAITING_AUTO_ADVANCE: 3,
  WAITING_PAUSE: 4,
});

/**
 * Minimum number (limit) of seconds before allowing approximation
 * to advance.
 * @constant
 * @type {number}
 * @default
 */
const MIN_ADVANCE_TIME = 0.1;

/**
 * @type {?Worker}
 * @default
 */
let worker = null;

/**
 * Current approximation state. Set with applyState().
 * @type {State}
 * @default
 * @see applyState
 */
let state = State.NONE;

/**
 * Cached output HTML in case computation is resumed after being paused
 * before a result was computed.
 * @type {?string}
 * @default
 */
let cachedOutput = null;

/**
 * Active requestAnimationFrame() id.
 * @type {number}
 * @default
 */
let animationFrame = null;

/**
 * Last time in milliseconds that the computation was advanced.
 * @type {number}
 */
let lastAdvanceTime = -Infinity;

/**
 * Current algorithm as string.
 *
 * (Current precision stored in global (prec) in algos.js until
 *  module Workers become widely supported.)
 */
let algo;


/**
 * Restart the approximation from the beginning.
 *
 * Uses whatever algorithm and precision was previously specified. If
 * the approximation was paused, remains in the paused state.
 */
function restart() {
  if (!window.Worker) {
    throw new Error('Web workers unsupported');
  }

  cachedOutput = null;
  document.getElementById('output').innerHTML = '';
  if (state == State.WAITING_ADVANCE) {
    applyState(State.NONE);
  } else if (state == State.WAITING_AUTO_ADVANCE) {
    applyState(State.RUNNING_AUTO_ADVANCE);
  }

  if (worker) {
    worker.terminate();
  }
  worker = new Worker('worker.js');
  worker.onmessage = onAdvanced;
  worker.postMessage({type: 'init', algo, prec});
}


/**
 * Toggle the auto advancing of the approximation.
 */
function playpause() {
  if (state == State.NONE) {
    scheduleAutoAdvance();
    applyState(State.RUNNING_AUTO_ADVANCE);
    if (cachedOutput) {
      updateOutput(cachedOutput);
      cachedOutput = null;
    }
  } else if (state == State.RUNNING_AUTO_ADVANCE) {
    applyState(State.NONE);
  } else if (state == State.WAITING_AUTO_ADVANCE) {
    applyState(State.WAITING_PAUSE);
  } else if (state == State.WAITING_PAUSE) {
    // Would already have been set to State.NONE if the current
    // computation had finished, which is not the case, so we resume
    // at the waiting state.
    scheduleAutoAdvance();
    applyState(State.WAITING_AUTO_ADVANCE);
  } else {
    throw new Error('Invalid state: ' + state);
  }
}

/**
 * Take in a preformatted text string of code, HTML escape it, and
 * break up each line and format it with inline CSS so it wraps with
 * a visually appealing indentation level.
 * @param {string} codeString
 * @returns {string}
 */
function makeCodeWrappable(codeString) {
  return codeString.split('\n').map(line => {
    let indent = line.search(/\S/);
    if (indent === -1) {
      indent = 0;
    }

    const escapedLine = line
      .replace('&', '&amp;')
      .replace('<', '&lt;')
      .replace('>', '&gt;');

    return `<div style="text-indent:-${indent+2}ex;padding-left:${indent+2}ex">${'&nbsp;'.repeat(indent)}${escapedLine.slice(indent)}</div>`;
  }).join('\n');
}

/**
 * Sets the current algorithm name and restarts approximation.
 * @param {string} newAlgo
 */
function algoChanged(newAlgo) {
  let func = algoMap[newAlgo];

  if (!func) {
    throw new Error('Not implemented');
  }

  let codeElem = document.getElementById('code');
  codeElem.innerHTML = makeCodeWrappable(func.toString());
  hljs.highlightBlock(codeElem);

  algo = newAlgo;

  restart();
}


/**
 * Sets the current precision and restarts approximation.
 * @param {string} newPrec - Precision in string
 */
function precChanged(newPrec) {
  let intPrec = parseInt(newPrec);

  // Set the prec in this thread too, so we have it cached in the case
  // of a reset, but also in case a user wants to play with the
  // functions in the JavaScript console.
  setPrec(intPrec);

  restart();
}


/**
 * Single-step one iteration of the current algorithm.
 */
function advance() {
  if (cachedOutput) {
    updateOutput(cachedOutput);
    cachedOutput = null;
    return;
  }

  const alreadySent = state == State.WAITING_PAUSE;

  applyState(State.WAITING_ADVANCE);
  if (!alreadySent) {
    worker.postMessage({type: 'advance'});
  }
}


/**
 * Sets the #output container HTML to newOutput.
 * @param {string} newOutput - HTML content to set
 */
function updateOutput(newOutput) {
  document.getElementById('output').innerHTML = newOutput;
}


/**
 * Called by the worker when posting a message, which contains a result
 * of approximation from the last iteration.
 *
 * e.data contains HTML that displays in the #output container.
 * @param {Object} e - Event
 */
function onAdvanced(e) {
  if (state == State.WAITING_PAUSE) {
    cachedOutput = e.data;
    applyState(State.NONE);
    return;
  } else if (state == State.WAITING_AUTO_ADVANCE) {
    applyState(State.RUNNING_AUTO_ADVANCE);
  } else if (state == State.WAITING_ADVANCE) {
    applyState(State.NONE);
  } else {
    throw new Error('Invalid state: ' + state);
  }

  updateOutput(e.data);
}


/**
 * Ensures autoAdvance() is called on the next animation frame. Ensures
 * that there are no duplicate requests scheduled.
 */
function scheduleAutoAdvance() {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
  requestAnimationFrame(autoAdvance);
}


/**
 * Ensures that the worker advances at a regular rate when auto
 * advancing is on. Called as a result of requestAnimationFrame().
 *
 * If auto advancing is paused, does nothing and doesn't reschedule.
 * If auto advancing is on but it's not time to advance, do nothing and
 * reschedule.
 * @param {number} time - Time in milliseconds
 */
function autoAdvance(time) {
  if (!worker) {
    // Don't schedule any more auto advances if workers unsupported.
    return;
  }

  if (state == State.NONE || state == State.WAITING_PAUSE) {
    // Paused, don't render.
    return;
  }

  if (state == State.WAITING_AUTO_ADVANCE) {
    // Wait until finished.
    scheduleAutoAdvance();
    return;
  }

  if (time - lastAdvanceTime < MIN_ADVANCE_TIME) {
    scheduleAutoAdvance();
    return;
  }

  const rangeTime =
    (10
     - parseInt(document.getElementById('range-speed').value) / 100
     * (10 - MIN_ADVANCE_TIME)) * 1000;
  if (time - lastAdvanceTime > rangeTime) {
    applyState(State.WAITING_AUTO_ADVANCE);
    worker.postMessage({type: 'advance'});
    lastAdvanceTime = time;
  }

  scheduleAutoAdvance();
}


/**
 * Sets the current approximation state to newState and configures the
 * UI controls to reflect this state.
 * @param {State} newState
 */
function applyState(newState) {
  state = newState;

  switch (state) {
    case State.NONE:
    case State.WAITING_PAUSE:
      document.body.classList.remove('waiting');
      document.getElementById('button-playpause').classList.remove('running');
      document.getElementById('button-playpause').disabled = false;
      document.getElementById('button-advance').disabled = false;
      break;
    case State.WAITING_ADVANCE:
      document.body.classList.add('waiting');
      document.getElementById('button-playpause').classList.remove('running');
      document.getElementById('button-playpause').disabled = true;
      document.getElementById('button-advance').disabled = true;
      break;
    case State.RUNNING_AUTO_ADVANCE:
      document.body.classList.remove('waiting');
      document.getElementById('button-playpause').classList.add('running');
      document.getElementById('button-playpause').disabled = false;
      document.getElementById('button-advance').disabled = true;
      break;
    case State.WAITING_AUTO_ADVANCE:
      document.body.classList.add('waiting');
      document.getElementById('button-playpause').classList.add('running');
      document.getElementById('button-playpause').disabled = false;
      document.getElementById('button-advance').disabled = true;
      break;
    default: throw new Error('Invalid state: ' + state);
  }
}


/**
 * Hide the help screen if it is visible.
 */
function hideHelp() {
  document.body.classList.remove('help-shown');
}


/**
 * Show the help screen if it is hidden.
 */
function showHelp() {
  document.body.classList.add('help-shown');
}


/**
 * Called when key pressed. Hides the help screen when Esc is pressed.
 * @param {Object} e - Event
 */
function onKeyPress(e) {
  if(e.key === 'Escape') {
    hideHelp();
  }
}


/**
 * Called when DOM loads. Sets the default precision and algorithm,
 * then starts auto advancing.
 */
function onLoaded() {
  document.getElementById('prec-500').checked = true;
  precChanged('500');
  document.getElementById('algo-chudnovsky').checked = true;
  algoChanged('chudnovsky');

  playpause();

  document.body.addEventListener('keydown', onKeyPress);
}


window.addEventListener('DOMContentLoaded', onLoaded);
