'use strict';

var concat     = require('broccoli-concat');
var writeFile  = require('broccoli-file-creator');
var mergeTrees = require('broccoli-merge-trees');
var pickFiles  = require('broccoli-static-compiler');

var es6Package            = require('./get-es6-package');
var concatenateES6Modules = require('./concatenate-es6-modules');

/*
  Resolves dependencies for ember-template-compiler and compiles / concats them to /ember-template-compiler.js

  Dependency graph looks like this:
  ```
    'ember-template-compiler':    {trees: null,  vendorRequirements: ['simple-html-tokenizer', 'htmlbars-util', 'htmlbars-compiler', 'htmlbars-syntax', 'htmlbars-test-helpers']},
  ```
*/
module.exports = function buildTemplateCompilerTree(packages, vendoredPackages) {
  es6Package(packages, 'ember-metal', vendoredPackages);
  es6Package(packages, 'ember-template-compiler', vendoredPackages);

  var trees = [packages['ember-template-compiler'].trees.lib];
  var vendorRequirements = packages['ember-template-compiler'].vendorRequirements || [];
  var vendorTrees = vendorRequirements.map(function(req){ return vendoredPackages[req];});

  var metalSubset = pickFiles(packages['ember-metal'].trees.lib, {
    files: ['ember-metal/core.js'],
    destDir: '/',
    srcDir: '/'
  });

  trees.push(metalSubset);

  var compiled = concatenateES6Modules(trees, {
    includeLoader: true,
    bootstrapModule: 'ember-template-compiler',
    vendorTrees: mergeTrees(vendorTrees),
    destFile: '/ember-template-compiler.js',
    vendoredPackages: vendoredPackages
  });

  var exportsTree = writeFile('export-ember', ';\nif (typeof exports === "object") {\n  module.exports = Ember.__loader.require("ember-template-compiler");\n }');

  return concat(mergeTrees([compiled, exportsTree]), {
    wrapInEval: false,
    inputFiles: ['ember-template-compiler.js', 'export-ember'],
    outputFile: '/ember-template-compiler.js'
  });
};
