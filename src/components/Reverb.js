export default function Reverb (context, GAIN, BIQUAD, opts = {}) {
  var node = GAIN();
  var wet = GAIN();
  var output = node.output = GAIN();
  var convolver = context.createConvolver();
  var filter = BIQUAD();
  node.connect(wet);
  convolver.connect(filter);
  wet.connect(convolver);
  filter.connect(output);
  wet.value = opts._MIN_wet;
  var time = opts._MIN_time;
  filter.frequency.value = opts._MIN_cutoff;
  filter.type = opts._MIN_filterType;

  const rate = context.sampleRate;
  const length = Math.max(1, Math.floor(rate * time));
  const impulseL = new Float32Array(length);
  const impulseR = new Float32Array(length);
  var decay = opts._MIN_decay;
  const chunkSize = 2048;
  let from = 0;
  let to = Math.min(chunkSize, length);
  output.gain.value = 0.0001;
  setTimeout(next, 5);

  function next () {
    for (let i = from; i < to; i++) {
      var k = length === 0 ? 0 : (i / length);
      var pow = Math.pow(1 - k, decay) || 0;
      impulseL[i] = (Math.random() * 2 - 1) * pow;
      impulseR[i] = (Math.random() * 2 - 1) * pow;
    }
    if (to >= length - 1) {
      const impulse = context.createBuffer(2, length, rate);
      impulse.getChannelData(0).set(impulseL);
      impulse.getChannelData(1).set(impulseR);
      convolver.buffer = impulse;
      output.gain.exponentialRampToValueAtTime(1, context.currentTime + 0.3);
    } else {
      from = to;
      to = Math.min(to + chunkSize, length);
      setTimeout(next, 5);
    }
  }
  return node;
}
