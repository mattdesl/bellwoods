const through = require('through2');
const duplexer = require('duplexer2');
const concat = require('concat-stream');
const prettyBytes = require('pretty-bytes');
const Terser = require('terser');
const budo = require('budo');
const fs = require('fs');
const path = require('path');
const execa = require('execa');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const rimraf = promisify(require('rimraf'));
const stat = promisify(fs.stat);
const htmlMinify = require('html-minifier').minify;
const htmlMinifyOptions = require('./minify-html.json');
const CleanCSS = require('clean-css');
const browserify = require('browserify');

const isBuild = process.argv.slice(2).includes('--build');
const isZIP = process.argv.slice(2).includes('--zip');
const isFinal = process.argv.slice(2).includes('--final');
let code = '';

// If you have this installed...
const advzip = true;

const plugin = bundler => {
  var bundle = bundler.bundle;
  // var input = path.resolve(__dirname, '../src/index-es6.js');

  bundler.on('reset', reset);
  bundler.transform(require('rollupify'), {
    sourceMap: 'inline'
  });
  bundler.plugin(require('bundle-collapser/plugin'));
  bundler.plugin(require('browser-pack-flat'));
  // bundler.transform();
  reset();

  // bundler.bundle = () => {
  //   const stream = through();
  //   stream.push(`console.log("Hello");`);
  //   stream.push(null);
  //   return stream;
  // };

  function reset () {
    if (isBuild) return;
    let newCode = '';
    bundler.pipeline.get('wrap').push(through(function (chunk, enc, next) {
      newCode += chunk.toString();
      next(null);
    }, function (next) {
      this.push(newCode);
      code = newCode;
      next(null);
      doZip(code);
    }));
  }

  // function rollupify () {
  // }
};

function compress (src) {
  return Terser.minify(src, {
    // beautify: true,
    compress: {
      drop_console: true,
      ecma: 10,
      passes: 2,
      hoist_funs: true
    },
    mangle: {
      // toplevel: true,
      properties: {
        // debug: '$_DEBUG_',
        regex: /^_MIN_/
      }
    }
  }).code;
}

async function checkSize () {
  if (isBuild) return;
  await doZip(code);
}

async function doZip (code) {
  console.log(`Unminified JS: ${prettyBytes(code.length)} - ${code.length}`);
  const result = compress(code);
  try {
    await writeFile(path.resolve(__dirname, '../public/bundle.js'), result);
    const zip = `app.zip`;
    await rimraf(zip);
    const excludes = (isFinal ? [] : [
      'public/about.html',
      'public/about.css',
      '*.png'
    ].filter(Boolean)).map(x => `-x ${x}`).join(' ');
    await execa.shell(`zip -9 -q -r ${zip} public/ ${excludes}`);
    if (advzip) await execa.shell(`advzip -z4 --iter=2 ${zip}`);
    const { size } = await stat(zip);
    console.log(`Minified JS: ${prettyBytes(result.length)} - ${result.length}`);
    console.log(`Minified ZIP: ${prettyBytes(size)} - ${size}`);
    if (!isZIP) await rimraf(zip);
  } catch (err) {
    console.error('Could not detect size', err.message);
  }
}

const zip = () => {
  checkSize().catch(err => {
    console.error('Error checking size...', err);
  });
};

const srcCSS = path.resolve(__dirname, '../src/main.css');
const srcHTML = path.resolve(__dirname, '../src/index.html');

const style = async () => {
  let src = await readFile(srcCSS, 'utf-8');
  src = new CleanCSS().minify(src).styles;
  await writeFile(path.resolve(__dirname, '../public/bundle.css'), src);
};

const html = async () => {
  let src = await readFile(srcHTML, 'utf-8');
  src = htmlMinify(src, htmlMinifyOptions)
  await writeFile(path.resolve(__dirname, '../public/index.html'), src);
};

const start = async () => {
  await style();
  await html();
  const app = budo('./src/index.js', {
    serve: 'bundle.js',
    dir: 'public',
    stream: process.stdout,
    browserify: {
      plugin
    }
  })
    .watch()
    .live()
    .on('watch', (ev, file) => {
      if (/\.css$/i.test(file)) {
        if (path.resolve(file) === srcCSS) {
          style();
        } else {
          app.reload(file);
          checkSize();
        }
      } else if (/\.html$/i.test(file)) {
        if (path.resolve(file) === srcHTML) {
          html();
        } else {
          app.reload(file);
          checkSize();
        }
      }
    })
    .on('pending', () => app.reload());
};

const bundle = () => {
  return new Promise((resolve, reject) => {
    browserify('./src/index.js', { plugin }).bundle((err, res) => {
      if (err) reject(err);
      else resolve(res.toString());
    });
  });
};

const doBuild = async () => {
  await style();
  await html();
  let src = await bundle();
  await doZip(src);
};

if (!isBuild) {
  start();
} else {
  doBuild();
}
