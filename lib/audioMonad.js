/*
The MIT License (MIT)

Copyright (c) 2015 Bill Enright

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

// monad.js
// Douglas Crockford
// 2012-10-17

// Public Domain

// The MONAD function is a macroid that produces monad constructor functions.
// It can take an optional modifier function, which is a function that is
// allowed to modify new monads at the end of the construction processes.

// A monad constructor (sometimes called 'unit' or 'return' in some mythologies)
// comes with three methods, lift, lift_value, and method, all of which can add
// methods and properties to the monad's prototype.

// A monad has a 'bind' method that takes a function that receives a value and
// is usually expected to return a monad.

//    var identity = MONAD();
//    var monad = identity("Hello world.");
//    monad.bind(alert);

//    var ajax = MONAD()
//        .lift('alert', alert);
//    var monad = ajax("Hello world.");
//    monad.alert();

//    var maybe = MONAD(function (monad, value) {
//        if (value === null || value === undefined) {
//            monad.is_null = true;
//            monad.bind = function () {
//                return monad;
//            };
//        }
//    });
//    var monad = maybe(null);
//    monad.bind(alert);

function MONAD(modifier) {
    'use strict';

	// Each unit constructor has a monad prototype. The prototype will contain an
	// is_monad property for classification, as well as all inherited methods.

	// all monads created with the unit constructor
	// (monads are returned by the unit constructor)
	// will have 'prototype' as their prototype
    var prototype = Object.create(null);
    prototype.is_monad = true;

	// Each call to MONAD will produce a new unit constructor function.

    function unit(value) {

		// Construct a new monad with 'prototype' as it's prototype
		// the unit constructor's (the unit is a function that 'has' functions)
		// lift, lift_value and method functions
		// are used to augment the prototype (add domain-specific functions)

        var monad = Object.create(prototype);

		// In some mythologies 'bind' is called 'pipe' or '>>='.
		// The bind method will deliver the unit's value parameter to a function.

		// note that bind is specific to the monad instance, not the prototype!
		// this is the basic bind..deliver the monad's value
        monad.bind = function (func, args) {

			// bind takes a function and an optional array of arguments. It calls that
			// function passing the monad's value and bind's optional array of args.

			// With ES6, this horrible return statement can be replaced with

			//          return func(value, ...args);

            return func.apply(
                undefined,
                [value].concat(Array.prototype.slice.apply(args || []))
            );
        };

		// If MONAD's modifier parameter is a function, then call it, passing the monad
		// and the value.

		// here is an opportunity to customize the instance with a passed-in function
		// you can imagine providing a new 'bind' function if the value is undefined

        if (typeof modifier === 'function') {
            modifier(monad, value);
        }

		// Return the shiny new monad.

        return monad;
    }
    unit.method = function (name, func) {

// Add a method to the prototype.

        prototype[name] = func;
        // this is 'builder' functionality so you can chain the configuration
        // of the domain-specific monad functions
        return unit;
    };
    unit.lift_value = function (name, func) {

// Add a method to the prototype that calls bind with the func. This can be
// used for ajax methods that return values other than monads.

        prototype[name] = function () {
            return this.bind(func, arguments);
        };
        return unit;
    };
    unit.lift = function (name, func) {

// Add a method to the prototye that calls bind with the func. If the value
// returned by the func is not a monad, then make a monad.

        prototype[name] = function () {
            var result = this.bind(func, arguments);
            return result && result.is_monad === true ? result : unit(result);
        };
        return unit;
    };
    return unit;
}


// note that 'audioMonad' is a function after this assignment
var audioMonad = (function () {
	// create monad constructor
	// every audio monad uses the same audio context
	// but if there isn't one...nothing happens
	var ContextConstructor = window.AudioContext || window.webkitAudioContext,
		audioContext = ContextConstructor && new ContextConstructor(),
		audioMonad = MONAD(function (monad, value) {
			// if we don't have an audio context or no data value
			if (!audioContext || !value) {
				// then there is nothing to do ever, so replace bind
				// to do nothing but return its do-nothing self
				monad.bind = function () {
					return monad;
				};
			}
		});

	/*
	 * ADAPETED FROM
	 * base64-arraybuffer
	 * https://github.com/niklasvh/base64-arraybuffer
	 *
	 * Copyright (c) 2012 Niklas von Hertzen
	 * Licensed under the MIT license.
	 */
	function base64ToArrayBuffer(base64) {	
		var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
			bufferLength = base64.length * 0.75,
			len = base64.length,
			i,
			p = 0,
			encoded1,
			encoded2,
			encoded3,
			encoded4;

		if (base64[base64.length - 1] === "=") {
			bufferLength--;
			if (base64[base64.length - 2] === "=") {
				bufferLength--;
			}
		}

		var arraybuffer = new ArrayBuffer(bufferLength),
		bytes = new Uint8Array(arraybuffer);

		for (i = 0; i < len; i+=4) {
			encoded1 = chars.indexOf(base64[i]);
			encoded2 = chars.indexOf(base64[i+1]);
			encoded3 = chars.indexOf(base64[i+2]);
			encoded4 = chars.indexOf(base64[i+3]);

			bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
			bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
			bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
		}

		return arraybuffer;
	};
  
	// setAudioBuffers - set the available audio buffers
	// copy the references into a new object
	audioMonad.lift('setAudioBuffers', function (value, buffers) {
		var newValue = cloneData(value),
			copyBuffers = {},
			id;
			
		for (id in buffers) {
			if (buffers.hasOwnProperty(id)) {
				copyBuffers[id] = buffers[id];
			}
		}
		
		newValue.audioBuffers = copyBuffers;

		return newValue;
	});

	// getAudioBuffers - get the available audio buffers
	// note 'lift_value' - does not return a monad
	audioMonad.lift_value('getAudioBuffers', function (value) {
		// get the buffers
		var audioBuffers = {};
		if (value.audioBuffers) {
			audioBuffers = shallowCopy(value.audioBuffers);
		}
		return audioBuffers;
	});

	function createGain(volume){
		var gain = audioContext.createGain();
		gain.gain.value = volume || 1;
		return gain;
	}

	function createMasterGain(volume) {
		var masterGain = createGain(volume);
		masterGain.connect(audioContext.destination);
		return masterGain;
	}

	// masterGain - create master gain with an optional initial volume
	audioMonad.lift('masterGain', function (value, initialVolume) {
		var newValue = cloneData(value);

		newValue.masterGain = createMasterGain(initialVolume);

		return newValue;
	});

	// play - select a sound from the audio buffers and play it now
	// location is optional
	audioMonad.lift('play', function (value, id, location) {
		var buffer = value.audioBuffers && value.audioBuffers[id],
			audioSource;

		if (buffer && buffer !== 'pending' && buffer !== 'failed') {

			// if needed, add a master gain and connect to audio context destination
			if (!value.masterGain) {
				// we'll make and return a new monad value if we added master gain
				value = cloneData(value);
				value.masterGain = createMasterGain();
			}

			// create audio source and set the buffer
			audioSource = audioContext.createBufferSource();
			audioSource.buffer = buffer;
			
			if (location && value.locations && value.locations[location]) {
				// use location if one was provided
				audioSource.connect(value.locations[location]);
				value.locations[location].connect(value.masterGain);
			} else {
				// otherwise just use master gain
				audioSource.connect(value.masterGain);
			}
		
			// play it
			audioSource.start(0);
		}
		
		return value;
	});

	// removeSound - remove a sound by id
	audioMonad.lift('removeSound', function (value, id) {
		var newValue = cloneData(value);
		
		if (newValue.audioBuffers) {
			delete newValue.audioBuffers[id];
		}

		return newValue;
	});
	
	function shallowCopy(o) {
		var newO = {};
		for (prop in o) {
			if (o.hasOwnProperty(prop)) {
				newO[prop] = o[prop];
			}
		}
		return newO;
	}
	
	function cloneData(data) {
		var clone = {};
		// copy locations
		if (data.locations) {
			clone.locations = shallowCopy(data.locations);
		}
		// copy sources
		if (data.sources) {
			clone.sources = shallowCopy(data.sources);
		}
		if (data.masterGain) {
			clone.masterGain = data.masterGain;
		}
		// shallowCopy bufferes
		if (data.audioBuffers) {
			clone.audioBuffers = shallowCopy(data.audioBuffers);
		}
		return clone;
	}
	
	// sounds - set sounds
	audioMonad.lift('sounds', function (value, sounds) {
		var newValue = cloneData(value),
			audioBuffers = newValue.audioBuffers,
			sound,
			buff,
			audioDecodedSuccess,
			audioDecodedFailed;

		if (!audioBuffers) {
			audioBuffers = {};
		}
		for (sound in sounds) {
			if (sounds.hasOwnProperty(sound)) {
				audioBuffers[sound] = 'pending';
				var buff = base64ToArrayBuffer(sounds[sound].split(',')[1]);
				var audioDecodedSuccess = (function (id) {
					return function (audioData) {
						console.log('decoded ', id);
						audioBuffers[id] = audioData;
					};
				}(sound));
				var audioDecodedFailed = (function (id) {
					return function () {
						console.log('failed to decode audio ', id);
						audioBuffers[id] = 'failed';
					};
				}(sound));
	
				audioContext.decodeAudioData(buff, audioDecodedSuccess, audioDecodedFailed);			
			}
		}
		newValue.audioBuffers = audioBuffers;
		return newValue;
	});
	
	// addSound - add a sound to the buffer list - decode it
	audioMonad.lift('addSound', function (value, id, data) {
		var newValue = cloneData(value),
			audioBuffers = newValue.audioBuffers;
			
		audioBuffers[id] = 'pending';
		var buff = base64ToArrayBuffer(data.split(',')[1]);
		var audioDecodedSuccess = (function (id) {
			return function (audioData) {
				console.log('decoded ', id);
				audioBuffers[id] = audioData;
			};
		}(id));
		var audioDecodedFailed = (function (id) {
			return function () {
				console.log('failed to decode audio ', id);
				audioBuffers[id] = 'failed';
			};
		}(id));
		
		audioContext.decodeAudioData(buff, audioDecodedSuccess, audioDecodedFailed);			

		return newValue;
	});

	// locate - locate an audio source
	// this creates a panner if needed
	audioMonad.lift('locate', function (value, id, x, y, z, options) {
		var value = cloneData(value);
		
		x = x || 0.0;
		y = y || 0.0;
		z = z || 0.0;
		
		if (!value.locations) {
			value.locations = {};
		}
		
		// if the id does not already have a panner, create a panner
		if (!value.locations[id]) {
			value.locations[id] = audioContext.createPanner();
		}
		
		// set the position of the panner
		value.locations[id].setPosition(x, y, z);

		if (options) {
			for (prop in options) {
				if (options.hasOwnProperty(prop)) {
					value.locations[id][prop] = options[prop];
				}
			}
		}
		return value;
	});

	// removeLocation - remove a location
	audioMonad.lift('removeLocation', function (value, id) {
		var newValue = cloneData(value);
		
		if (newValue.locations) {
			delete newValue.locations[id];
		}
		
		return newValue;
	});
	
	// listenAt - position the listener (there is only one listener in the audio context)
	audioMonad.lift('listenAt', function (value, x, y, z) {
		x = x || 0.0;
		y = y || 0.0;
		z = z || 0.0;
		audioContext.listener.setPosition(x, y, z);
		return value;
	});

	// orient a sound source at a location
	// 0,0,0 is omnidirectional
	audioMonad.lift('orient', function (value, id, x, y, z) {
		x = x || 0.0;
		y = y || 0.0;
		z = z || 0.0;
		if (value.panners && value.panners[id]) {
			value.panners[id].setOrientation(x, y, z);
		}
		return value;
	});
	
	// sound cone
	audioMonad.lift('cone', function (value, id, innerAngle, outerAngle, outerGain) {
		innerAngle = innerAngle || 360.0;
		outerAngle = outerAngle || 360.0;
		outerGain = outerGain || 0.0;
		if (value.panners && value.panners[id] && id !== 'listener') {
			value.panners[id].coneInnerAngle(innerAngle);
			value.panners[id].coneOuterAngle(outerAngle);
			value.panners[id].coneOuterGain(outerGain);
		}
		return value;
	});
	
	return audioMonad;
}());
