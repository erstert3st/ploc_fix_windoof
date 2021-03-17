#!/usr/bin/env node

var fs = require('fs');
var glob = require('glob');
var ploc = require('./ploc.js');

// Util for parsing arguments: We reuse and extend ploc attributes here.
ploc.utils.parseCliArgs = require('minimist');
ploc.opts.cliArgs = {
  string: ["in", "out", "tocStyles"],
  boolean: ["help", "autoHeaderIds"],
  alias: {
    i: "in",
    o: "out",
    t: "toc",
    h: "help",
    d: "debug"
  },
  default: { in: "**/*.pks",
    out: "{folder}{file}.md",
    toc: ploc.opts.minItemsForToc
  }
};

// cli help text.
ploc.opts.cliHelp = [
  '',
  'Usage: ploc [options]',
  '',
  '-i, --in:         The glob pattern for the code files to read.',
  '                  (default is "' + ploc.opts.cliArgs.default.in + '")',
  '',
  '-o, --out:        The pattern for the doc files to write.',
  '                  (default is "' + ploc.opts.cliArgs.default.out + '")',
  '                  {folder} = in file path with trailing directory separator',
  '                  {file} = in file name without extension',
  '',
  '-t, --toc:        How many items (methods including object/package name) the',
  '                  code must have before a TOC is included.',
  '                  (default is ' + ploc.opts.cliArgs.default.toc + ')',
  '',
  '--tocStyles:      Inline styles to use for the TOC. If provided, the TOC',
  '                  is generated as a HTML unordered list instead of a',
  '                  Markdown list to be able to use the styles.',
  '',
  '--autoHeaderIds:  Boolean - if present the headers are generated in HTML',
  '                  format instead of Markdown to be able to integrate the IDs.',
  '',
  '-h, --help:       Command line help.',
  '',
  '-d, --debug:      Write CLI arguments to console.',
  '',
  'Example 1: npx ploc --in "**/*.pks" --out {folder}{file}.md',
  'Example 2: npx ploc --out docs/{file}.md',
  'Example 3: npx ploc -i "**/*.*(pks|sql)" -o docs/{file}.md -t 5',
  'Example 4: npx ploc --in "src/*.pks" --out docs/{file}.md --autoHeaderIds --tocStyles "float: right;"',
  'https://blog.npmjs.org/post/162869356040/introducing-npx-an-npm-package-runner',
  '',
].join('\n');

// Utility to calculate one out file path from an in file path and an out file pattern.
ploc.utils.getOutFilePath = function (inFilePath, outFilePattern) {
  var folder, file, match;
  var regexp = /(.*(?:\\|\/)+)?((.*)(\.([^?\s]*)))\??(.*)?/i;
  /*
  This regex is taken from https://regexr.com/3dns9 and splits a URL it its components: 
  - $1: folder path
  - $2: file name(including extension)
  - $3: file name without extension
  - $4: extension
  - $5: extension without dot sign
  - $6: variables
  */

  // Extract folder and file from inFilePath for replacements of {folder} and {file} in outFilePattern.
  match = inFilePath.match(regexp);
  folder = match[1] || '';
  file = match[3];

  // Do the final replacements and return.
  return outFilePattern.replace('{folder}', folder).replace('{file}', file);
}

// Utility to process all files for the provided in and out file patterns.
ploc.utils.files2docs = function (inFilePattern, outFilePattern) {
  var outFilePath;
  var options = {
    matchBase: false
  };
  glob(inFilePattern, options, function (err, files) {
    if (err) throw err;
    files.forEach(function (inFilePath) {
      outFilePath = ploc.utils.getOutFilePath(inFilePath, outFilePattern);
      console.log(inFilePath + ' => ' + outFilePath);
      fs.writeFileSync(
        outFilePath,
        '<!-- DO NOT EDIT THIS FILE DIRECTLY - it is generated from source file ' + inFilePath + ' -->\n' +
        '<!-- markdownlint-disable MD003 MD012 MD024 MD033 -->\n\n' +
        ploc.getDoc(fs.readFileSync(inFilePath, 'utf8'))
      );
    });
  })
};

// Parse cli arguments.
var args = ploc.utils.parseCliArgs(process.argv.slice(2), ploc.opts.cliArgs);

// Save args for TOC as these are used internally by ploc.getDoc.
ploc.opts.autoHeaderIds = args.autoHeaderIds;
ploc.opts.minItemsForToc = args.toc;
ploc.opts.tocStyles = args.tocStyles;

// Print help, if options -h or --help were provided.
if (args.help) {
  console.log(ploc.opts.cliHelp);
} else {
  // Otherwise create the documents.
  if (args.debug) {
    console.log("CLI arguments:\n", args);
  }
  ploc.utils.files2docs(args.in, args.out)
}
