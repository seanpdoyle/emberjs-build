'use strict';

var concat     = require('broccoli-concat');
var writeFile  = require('broccoli-file-creator');
var mergeTrees = require('broccoli-merge-trees');

var es6Package            = require('./get-es6-package');
var concatenateES6Modules = require('./concatenate-es6-modules');

/*
  Resolves dependencies for ember-runtime and compiles / concats them to /ember-runtime.js

  Dependency graph looks like this:
  ```
    'ember-runtime': {vendorRequirements: ['rsvp'], requirements: ['container', 'ember-metal']}
  ```
*/
module.exports = function buildRuntimeTree(packages, vendoredPackages) {
  es6Package(packages, 'ember-runtime', vendoredPackages);

  var runtimeTrees = [packages['ember-runtime'].trees.lib];
  var runtimeVendorTrees = packages['ember-runtime'].vendorRequirements.map(function(req){ return vendoredPackages[req];});

  packages['ember-runtime'].requirements.forEach(function(req){
    es6Package(packages, req, vendoredPackages);
    runtimeTrees.push(packages[req].trees.lib);
    (packages[req].vendorRequirements || []).forEach(function(vreq) {
      runtimeVendorTrees.push(vendoredPackages[vreq]);
    });
  });

  var compiledRuntime = concatenateES6Modules(mergeTrees(runtimeTrees), {
    includeLoader: true,
    bootstrapModule: 'ember-runtime',
    vendorTrees: mergeTrees(runtimeVendorTrees),
    destFile: '/ember-runtime.js',
    vendoredPackages: vendoredPackages
  });

  var exportsTree = writeFile('export-ember', ';module.exports = Ember;\n');

  return concat(mergeTrees([compiledRuntime, exportsTree]), {
    wrapInEval: false,
    inputFiles: ['ember-runtime.js', 'export-ember'],
    outputFile: '/ember-runtime.js'
  });
};
