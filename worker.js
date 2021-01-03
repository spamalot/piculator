---
---
{% comment %} Comment this line and the above two to run JSDoc. {% endcomment %}

/**
* @file Web worker that computes pi and formats the result for display.
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

importScripts('{{ "/lib/decimal.js-light/decimal.min.js" | prepend: site.baseurl }}');
importScripts('{{ "/algos.js" | prepend: site.baseurl }}');


/**
 * Last truncated but unformatted value of pi.
 * @type {string}
 * @default
 */
let lastPi = "";

/** Generator iterator. */
let gen;


/**
 * Truncate pi to the specified precision and pad with zeros to ensure
 * consistent length.
 * @param {string} val - Full untruncated result from computation
 */
function piTruncate(val) {
  // prec in algos.js
  const truncated = val.slice(0, prec+2);
  const withpoint = truncated.includes('.') ? truncated : truncated+'.';
  return withpoint.padEnd(prec+2, '0');
}

/**
 * Formats the per-decimal place differences between newPi and lastPi
 * using CSS classes (coloured via CSS).
 * @param {string} newPi - Unformatted, but truncated pi to display
 */
function piDiff(newPi) {
  if (newPi.length !== lastPi.length) {
    return newPi;
  }
  return newPi.split('').map(function(x, i) {
    if (x === '.') {
      return x;
    }
    let delta = Math.abs(parseInt(x) - parseInt(lastPi.charAt(i)));
    if (delta === 0) {
      return x;
    }
    return `<span class="x${delta}">${x}</span>`;
  }).join('');
}


onmessage = (e) => {
  if (e.data.type === 'init') {
    setPrec(e.data.prec);
    gen = algoMap[e.data.algo]();
  }

  if (e.data.type === 'advance') {
    const newPi = piTruncate(gen.next().value.toString());
    const output = piDiff(newPi);
    lastPi = newPi;
    postMessage(output);
  }
}
