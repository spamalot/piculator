/**
* @file Contains a variety of pi approximation algorithms.
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

let loops = Number.MAX_SAFE_INTEGER;
let prec;

/**
 * Stores the precision in prec and applies this to decimal.js-light.
 * @param {number} newPrec - Precision
 */
function setPrec(newPrec) {
  prec = newPrec;
  // Have 75 places spare here so we can have 50 places spare for
  // manual approximations (mthRoot).
  Decimal.config({ precision: prec+75 });
}


/**
 * Asserts that decimal.js-light will use the arbitrary-precision
 * (exponentiation by squaring) approximator for pow().
 * @param {Decimal} power - Power to be raised to.
 */
function decimaljsPowCheck(power) {
  const MAX_SAFE_INTEGER = 9007199254740991;
  if (power.cmp(MAX_SAFE_INTEGER) == 1 || power.neg().cmp(MAX_SAFE_INTEGER) == 1) {
    throw new Error('Power too high');
  }
}


/**
 * Same as A.pow(m), but fails if not using an arbitrary-precision
 * (exponentiation by squaring) approximator.
 * @param {Decimal} A - Base
 * @param {Decimal} m - Exponent
 * @returns {Decimal}
 */
function intPow(A, m) {
  decimaljsPowCheck(m);
  return A.pow(m);
}

/**
 * Computes and returns the mth root of A.
 * @param {Decimal} A - Base
 * @param {Decimal} m - Root
 * @returns {Decimal}
 */
function mthRoot(A, m) {
  // For x^m - A = 0:
  //   x_n+1 = x_n - (x_n^m-A)/(m*x_n^(m-1))
  //         = ( (m-1) x_n^m + A ) / ( m * x_n^(m-1) )

  decimaljsPowCheck(m);

  const eps = new Decimal('1e-'+(prec+25));
  // previous
  const p1 = new Decimal('1');
  let x_n_p = new Decimal('0');
  let x_n = A.div(new Decimal('2'));
  while(true) {
    if (x_n.sub(x_n_p).abs().cmp(eps) == -1) {
      return x_n.toDecimalPlaces(prec+25);
    }
    x_n_p = x_n;
    const x_ntom_1 = x_n.pow(m.sub(p1));
    x_n = m.sub(p1).mul(x_ntom_1).mul(x_n).add(A).div(m.mul(x_ntom_1));
  }
}


/**
 * Computes and returns n!.
 * @param {Decimal} n
 * @returns {Decimal}
 */
function factorial(n) {
  // TODO: optimize factorial with caching?

  if (n.cmp(new Decimal('0')) == 0) {
    return new Decimal('1');
  }
  return [...Array(parseInt(n.toString())).keys()].map(i => new Decimal(i+1)).reduce((x,y) => x.mul(y));
}


//
// ALGORITHMS
//


function* pi_leibniz() {
  const n1 = new Decimal('-1');
  const p1 = new Decimal('1');
  const p2 = new Decimal('2');
  const p4 = new Decimal('4');
  let answer = new Decimal('0');
  for (let x = 0; x < loops; x++) {
    x = new Decimal(x);
    answer = answer.add(intPow(n1, x).div(x.mul(p2).add(p1)));
    yield answer.mul(p4);
  }
}

function* pi_bailey_borwein_plouffe() {
  const p1 = new Decimal('1');
  const p2 = new Decimal('2');
  const p4 = new Decimal('4');
  const p5 = new Decimal('5');
  const p6 = new Decimal('6');
  const p8 = new Decimal('8');
  const p1o16 = p1.div(new Decimal('16'));
  let answer = new Decimal('0');
  for (let x = 0; x < loops; x++) {
    x = new Decimal(x);
    const p8x = p8.mul(x);
    answer = answer.add(intPow(p1o16, x).mul(
      p4.div(p8x.add(p1)).sub(
      p2.div(p8x.add(p4))).sub(
      p1.div(p8x.add(p5))).sub(
      p1.div(p8x.add(p6)))
    ));
    yield answer;
  }
}


function* pi_borwein() {
  // TODO: optimize exp with caching?

  const p2 = new Decimal('2');
  const rt5 = mthRoot(new Decimal('5'), p2);
  const p3 = new Decimal('3');
  const p6 = new Decimal('6');
  const a = new Decimal('63365028312971999585426220').add(
    new Decimal('28337702140800842046825600').mul(rt5)
    ).add(Decimal('384').mul(rt5).mul(mthRoot(new Decimal('10891728551171178200467436212395209160385656017').add(
    new Decimal('4870929086578810225077338534541688721351255040').mul(
    rt5)), p2)));
  const b = new Decimal('7849910453496627210289749000').add(
    new Decimal('3510586678260932028965606400').mul(rt5)).add(
    new Decimal('2515968').mul(mthRoot(new Decimal('3110'), p2)).mul(mthRoot(new Decimal('6260208323789001636993322654444020882161').add(
    new Decimal('2799650273060444296577206890718825190235').mul(rt5)), p2)));
  const c = new Decimal('-214772995063512240').sub(
    new Decimal('96049403338648032').mul(rt5)).sub(
    new Decimal('1296').mul(rt5).mul(mthRoot(new Decimal('10985234579463550323713318473').add(
    new Decimal('4912746253692362754607395912').mul(rt5)), p2)));
  let answer = new Decimal('0');
    for (let x = 0; x < loops; x++) {
      x = new Decimal(x);
      answer = answer.add(
        factorial(p6.mul(x)).div( factorial(p3.mul(x)).mul( intPow(factorial(x), p3) )  ).mul( a.add(x.mul(b)).div( intPow(c, p3.mul(x)) )  )
        );
      yield mthRoot(intPow(c.neg(), p3), p2).div(answer);
    }
}


function* pi_borwein_nonic() {
  const p1 = new Decimal('1');
  const p2 = new Decimal('2');
  const p3 = new Decimal('3');
  const p9 = new Decimal('9');
  const p27 = new Decimal('27');
  const p1o3 = p1.div(p3);
  let a = p1o3;
  let r = mthRoot(p3, p2).sub(p1).div(p2);
  let s = mthRoot(p1.sub(intPow(r,p3)), p3);
  for (let x = 0; x < loops; x++) {
    x = new Decimal(x);
    const t = p1.add(p2.mul(r));
    const u = mthRoot(p9.mul(r).mul(p1.add(r).add(intPow(r, p2))), p3);
    const v = intPow(t, p2).add(t.mul(u)).add(intPow(u, p2));
    const w = p27.mul(p1.add(s).add(intPow(s, p2))).div(v);
    a = w.mul(a).add(intPow(p3, p2.mul(x).sub(p1)).mul(p1.sub(w)));
    s = intPow(p1.sub(r), p3).div(t.add(p2.mul(u)).mul(v));
    r = mthRoot(p1.sub(intPow(s, p3)), p3);
    yield p1.div(a);
  }
}


function* pi_gauss_legendre() {
  const p2 = new Decimal('2');
  const p4 = new Decimal('4');

  let a_n_p;
  let a_n = new Decimal('1');
  let b = new Decimal('1').div(p2.sqrt());
  let t = new Decimal('0.25');
  let p = new Decimal('1');

  for (let x = 0; x < loops; x++) {
    a_n_p = a_n;
    a_n = a_n.add(b).div(p2);
    b = mthRoot(a_n_p.mul(b), p2);
    t = t.sub(p.mul(intPow(a_n_p.sub(a_n), p2)));
    p = p.mul(p2);
    yield intPow(a_n.add(b), p2).div(p4).div(t);
  }
}


/**
 * Mapping between algorithm names as strings and the generator
 * functions.
 * @constant
 * @type {Object.<string, function>}
 */
const algoMap = {
  leibniz: pi_leibniz,
  bbp: pi_bailey_borwein_plouffe,
  borwein: pi_borwein,
  borwein_nonic: pi_borwein_nonic,
  gauss_legendre: pi_gauss_legendre,
};

