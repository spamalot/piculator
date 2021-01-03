/**
* @file Manages browser compatibility error messages.
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
 * Shows error messages if user is running IE or doesn't have web
 * worker support.
 */
function checkCompatibilityProblem() {
  var mainarea = document.getElementById('mainarea');
  var errorOverlay = document.getElementById('error-overlay');
  var template = 'Error: MESSAGE Please upgrade your browser to use the &pi;culator.';

  if (window.document.documentMode) {
    // Running IE 9 - 11
    mainarea.className += ' error';
    errorOverlay.innerHTML = template.replace(
      'MESSAGE', 'Internet Explorer is not supported.');
  }

  if (!window.Worker) {
    mainarea.className += ' error';
    errorOverlay.innerHTML = template.replace(
      'MESSAGE', 'Web workers are unsupported in this browser.');
  }
}


window.addEventListener('DOMContentLoaded', checkCompatibilityProblem);
