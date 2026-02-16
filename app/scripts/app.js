(function (doc) {
    'use strict';

    doc.addEventListener('polymer-ready', function () {
        // Perform some behaviour
        console.log('Polymer is ready to rock!');
    });

// Use ShadowDOM polyfill wrapper when available, otherwise use the real document.
})(typeof wrap === 'function' ? wrap(document) : document);
