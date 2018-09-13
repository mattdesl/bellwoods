import seedRandom from '../seed-random';
import { clamp } from '../math';
import Reverb from './Reverb';

// https://gist.github.com/kevincennis/0a5bcd12625a02e48970
var enharmonics = 'B#-C|C#-Db|D|D#-Eb|E-Fb|E#-F|F#-Gb|G|G#-Ab|A|A#-Bb|B-Cb',
  middleC = 440 * Math.pow(Math.pow(2, 1 / 12), -9),
  offsets = {};

// populate the offset lookup (note distance from C, in semitones)
enharmonics.split('|').forEach(function (val, i) {
  val.split('-').forEach(function (note) {
    offsets[ note ] = i;
  });
});

const getFrequency = (a, b) => {
  const distance = offsets[ a ],
    octaveDiff = b,
    freq = middleC * Math.pow(Math.pow(2, 1 / 12), distance);
  return freq * Math.pow(2, octaveDiff);
};

export default function Audio () {
  const random = seedRandom(Math.random());
  const volumeMod = 1.75;
  // let isWebkit = typeof window.AudioContext === 'undefined';
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const context = new Ctx();
  const GAIN = () => context.createGain();
  const BIQUAD = () => context.createBiquadFilter();

  let noteTicks = 0;
  const beatsPerMinute = 90;
  const noteStep = (1 / 4);
  const noteDuration = 0.85 * noteStep;
  const interval = (60 / beatsPerMinute) * noteDuration;
  // const reverb = new Freeverb(context, {
  //   dampening: 3000, roomSize: 0.925, dryGain: 0.2, wetGain: 0.8
  // });
  
  // reverb.roomSize = 0.9;
  // reverb.dampening = 5000;
  // reverb.wet.value = 0.25;
  // reverb.dry.value = 0.75;

  const master = GAIN();
  let muted = false;
  const click = ev => {
    ev.preventDefault();
    // ev.stopImmediatePropagation();
    muted = !muted;
    window.mute.classList.toggle('OK');
    master.gain.value = muted ? 0 : 1;
  };
  window.muteC.addEventListener('click', click, { passive: false });
  window.muteC.addEventListener('touchstart', click, { passive: false });
  master.connect(context.destination);

  const HIGH = 'highpass';
  const highpass = BIQUAD();
  highpass.frequency.value = 170;
  highpass.type = HIGH;
  const lowpass = BIQUAD();
  lowpass.frequency.value = 5000;
  lowpass.type = 'lowpass';
  highpass.connect(lowpass);
  lowpass.connect(master);
  const output = highpass;

  const reverbs = [
    {
      _MIN_time: noteDuration * 6,
      _MIN_decay: 1.5,
      _MIN_wet: 0.5,
      _MIN_filterType: 'bandpass',
      _MIN_cutoff: 2000
    },
    {
      _MIN_time: noteDuration * 4,
      _MIN_decay: 2,
      _MIN_wet: 0.25,
      _MIN_filterType: HIGH,
      _MIN_cutoff: 500
    }
  ].map(data => {
    const r = Reverb(context, GAIN, BIQUAD, data)
    r.output.connect(output);
    return r;
  });
  
  const dry = GAIN();
  dry.gain.value = 0.1;
  dry.connect(output);

  // const gain = GAIN();
  // gain.connect(reverb1);
  // gain.connect(reverb2);
  // gain.connect(dry);
  // gain.gain.value = 1;

  const createWaveform = (data, imag) => {
    // const data = [0,0.4,0.4,1,1,1,0.3,0.7,0.6,0.5,0.9,0.8];
    var real = new Float32Array(data);
    var imagArray = new Float32Array(imag || data);
    var waveform = context.createPeriodicWave(real, imagArray);
    return waveform;
  };

  const instruments = [
    // NOTE: this is 'sine' type but iOS on iPad was giving me wrong frequency/sound
    // so using a 'sine wave'-like thing here...
    { _MIN_type: createWaveform([0, 0], [0, 1]), _MIN_level: 1 / 2, _MIN_attack: 0.0075, _MIN_duration: 0.0075, _MIN_release: 0.85 },
  // { _MIN_type: 'sine', _MIN_level: 1 / 2, _MIN_attack: 0.0075, _MIN_duration: 0.0075, _MIN_release: 0.85 },
    { _MIN_type: createWaveform([-1,0,0.0,0,0.0,0,0.0]), _MIN_level: 1 / 4, _MIN_attack: 0.0075, _MIN_duration: 0.0075, _MIN_release: 0.85 },
    { _MIN_flowerOnly: true, _MIN_type: createWaveform([ 1, 0, 0.05, 1 ]), _MIN_level: 1 / 10, _MIN_attack: 0.0075, _MIN_duration: 0.0075, _MIN_release: 0.85 }
  ];

  // const notes = [ 'C:0', 'G:0', 'G:0', 'F:0' ]
  // const notes = [ 'C:0', 'F:0', 'G:0', 'A:0', 'D:1', 'D:0' ] // good pitchy
  // const notes = [ 'C:0', 'F:0', 'G:0', 'A:0', 'D:0' ] // good pitchy
  // const notes = [ 'F:0', 'G:0', 'A:0', 'D:0' ] // good
  // const notes = [ 'C:0', 'F:0', 'G:0', 'A:0', 'D:0' ] // good
  // const notes = [ 'C:0', 'F:0', 'G:0', 'A:0', 'D:0' ]

  // const noteList = [
    // [ 'A:', 'F:', 'G:', 'A:', 'D:' ],
    // [ 'C:', 'B#:',  'A:' ],
    // [ 'C:', 'F:', 'G:', 'A:', 'D:' ], // good
    // [ 'G:', 'B#:' ],
    // [ 'F:', 'B#:' ],
    // [ 'F:', 'D:' ],
    // [ 'C:', 'F:', 'G:', 'B#:', 'D:' ],
    // [ 'C:', 'F:', 'G:', 'A:' ],
  // ]

  const getWeight = (weights) => {
    let total = 0;
    for (let i = 0; i < weights.length; i++) {
      total += weights[i];
    }
    return total;
  };

  // const weights = [ 100, 100, 100, 80, 10 ];
  // const noteWeightTotal = getWeight(weights);

  const octaveWeights = [ 50, 100, 100 ];
  const shuffledOctaveWeights = octaveWeights.slice();
  const octaveOffsets = [ -1, 0, 1 ];
  const octaveWeightTotal = getWeight(octaveWeights);

  const curNotes = [ 'C', 'F', 'G', 'A', 'D' ];
  let notePlaylist = curNotes.slice();
  let noteIndex = 0;

  const renote = (t = 0) => {
    // const curNotes = noteList[Math.floor(t * noteList.length)];
    random.shuffle(curNotes, notePlaylist);
    random.shuffle(octaveWeights, shuffledOctaveWeights);
    noteIndex = 0;
  };

  const queue = [];
  let lastWorld;

  return {
    _MIN_tick (world) {
      if (world !== lastWorld) {
        random.set(world.hash);
        renote(world.hash);
        lastWorld = world;
      }
      // reverb1.tick(elapsed, dt);
      // reverb2.tick(elapsed, dt);

      // This audio scheduling is probably not 100% accurate but w / e
      const currentTime = context.currentTime;

      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        if (item.played && i !== queue.length - 1 && currentTime - item.time > interval * 2) {
          item.dead = true;
        }
        if (!item.played && currentTime >= item.time) {
          note(item.time - currentTime, item.opts);
          item.played = true;
          noteTicks++;
          if (noteTicks % 16 === 0) {
            random.shuffle(octaveWeights, shuffledOctaveWeights);
          }
          //renote(world.hash);
        }
      }
      for (let i = queue.length - 1; i >= 0; i--) {
        if (queue[i].dead) queue.splice(i, 1);
      }
    },
    _MIN_schedule (opts = {}) {
      // console.log('Hit!')
      // this.note();
      if (muted) return;

      // How long to wait before each note
      const time = context.currentTime;
      const nextTime = Math.round(time / interval) * interval;
      
      let push = false;
      if (queue.length === 0) {
        // Nothing scheduled yet, fire away...
        push = true;
      } else {
        // We have another note that was played previously.
        const prev = queue[queue.length - 1];
        const prevTime = prev.time;
        // Don't schedule multiple at the same time
        if (nextTime > prevTime) {
          push = true;
        }
      }

      if (push) {
        queue.push({ time: nextTime, opts });
      }
    },
    // sequence (count = 100) {
    //   let offset = 0;
    //   for (let i = 0; i < count; i++, offset++) {
    //     // this.schedule({
    //     //   flower: true
    //     // })
    //     this.note(offset * interval, 1, true);
    //   }
    // },
    _MIN_transition (start = 0, count = 1) {
      const step = interval * 0.85;
      for (let i = 0; i < count; i++) {
        note(start + step * i, { portal: true });
      }
    },
    _MIN_resume () {
      context.resume();
    }
  };


  function note (start = 0, opt = {}) {
    const { portal, flower } = opt;
    start = Math.max(start, 0);


    // const weightedIndex = weighted(weights, noteWeightTotal);
    // const note = notePlaylist[weightedIndex];
    // noteIndex++;

    if (noteIndex > notePlaylist.length - 1) {
      noteIndex = 0;
      // if (lastWorld) random.shuffle(octaveWeights, shuffledOctaveWeights);
      // if (lastWorld) renote(lastWorld.hash);
    }
    // const curNote = notePlaylist[Math.floor(Math.random() * notePlaylist.length)];
    // const note = Math.random() > 0.5 ? notePlaylist[0] : notePlaylist[noteIndex++];
    // const note = notePlaylist[Math.floor(Math.random() * notePlaylist.length)];
    const note = lastWorld._MIN_audioRandom ? notePlaylist[Math.floor(Math.random() * notePlaylist.length)] : notePlaylist[noteIndex++];
    // const note = typeof hash === 'number'
    //   ? notePlaylist[Math.floor(hash * notePlaylist.length)]
    //   : notePlaylist[Math.floor(Math.random() * notePlaylist.length)];
    // let [ note, octaveScale ] = notes[Math.floor(Math.random() * notes.length)].split(':');
  
    let octave = 0;
    const baseOctave = lastWorld.hash > 0.5 ? -1 : 0;
    octave = baseOctave;
    // octave = lastWorld.variance > 0.5 ? (Math.random() > 0.5 ? 0 : -1) : baseOctave;

    // octave += weightedOff;
    // if (lastWorld._MIN_audioVariance > 0.75) {
    //   const ocoff = baseOctave === -1 ? 1 : 0;
    //   octave += Math.random() > 0.5 ? ocoff : 0;
    // }
    // if (lastWorld._MIN_audioPitch > 0.65) {
    //   octave = baseOctave + Math.random() > 0.5 ? (Math.random() > 0.5 ? -1 : 1) : 0;
    // } else {
    //   octave += Math.random() > 0.5 ? -1 : 0;
    // }
    if (lastWorld._MIN_audioVariance > 0.75) {
      const ocoff = baseOctave === -1 ? 1 : 0;
      octave += Math.random() > 0.5 ? ocoff : 0;
    }
    const weightedOff = octaveOffsets[weighted(shuffledOctaveWeights, octaveWeightTotal)];
    if (lastWorld._MIN_audioPitch > 0.5) {
      octave = baseOctave + weightedOff;
    } else {
      octave += weightedOff;
    }
    octave = clamp(octave, -1, 1);
    
    // octave += Math.random() > 0.5 ? -1 : 0;
    // octave += Math.random() > 0.5 ? (Math.random() > 0.5 ? -1 : -1) : 0;
    if (portal) octave = 0;
    // octave *= octaveScale;
    // if (octaveScale) octave = octaveScale;

    // note = 'C'
    const tail = portal ? 1 : 0;
    const frequency = getFrequency(note, octave);
    const time = context.currentTime + start;
    // console.log(`Playing ${note}${octave + 4}`);

    // console.log(time, note, octave + 4, frequency)
    instruments.forEach(({
      _MIN_attack,
      _MIN_type,
      // _MIN_detune,
      _MIN_duration,
      _MIN_offset = 0,
      _MIN_level,
      _MIN_release,
      _MIN_flowerOnly
    }) => {
      if (_MIN_flowerOnly && !flower) return;
      const min = 0.0001;
      const osc = context.createOscillator();

      _MIN_level *= volumeMod;
      _MIN_release += tail;

      osc.frequency.value = frequency;
      // osc.detune.value = _MIN_detune;

      if (typeof _MIN_type === 'string') {
        osc.type = _MIN_type;
      } else if (_MIN_type) {
        osc.setPeriodicWave(_MIN_type);
      }
      osc.start(time);
      //

      const gainNode = GAIN();
      osc.connect(gainNode);

      reverbs.forEach(r => gainNode.connect(r));
      gainNode.connect(dry);

      // initial
      gainNode.gain.setValueAtTime(min, time);
      // attack
      gainNode.gain.exponentialRampToValueAtTime(_MIN_level, time + _MIN_attack);
      gainNode.gain.setValueAtTime(_MIN_level, time + _MIN_attack + _MIN_duration);
      gainNode.gain.exponentialRampToValueAtTime(min, time + _MIN_attack + _MIN_duration + _MIN_release);
      // osc.stop(time + attack + duration + release + 1);

      osc.stop(time + _MIN_attack + _MIN_duration + _MIN_release);
      // osc.disconnect();
      // gainNode.disconnect();
      // console.log('end')
      // setTimeout(() => {
        
      // }, (attack + duration + release + 0) * 1000)
    });
  }

  function weighted (weights, totalWeight) {
    // weights = weights || [];
    // if (weights.length === 0) return -1;
    var i;
    // if (totalWeight <= 0) throw new Error('Weights must sum to > 0');
    var random = Math.random() * totalWeight;
    for (i = 0; i < weights.length; i++) {
      if (random < weights[i]) {
        return i;
      }
      random -= weights[i];
    }
    return 0;
  }
}
