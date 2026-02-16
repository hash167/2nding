(function (window) {
  'use strict';

  var config = window.SECOND_ENDING_FIREBASE_CONFIG;
  var isConfigured = config && config.apiKey && config.apiKey !== 'YOUR_API_KEY';

  window.SecondEndingFirebase = {
    enabled: false,
    getVotesRef: function () {
      return null;
    }
  };

  if (!window.firebase) {
    console.warn('Firebase SDK is not loaded.');
    return;
  }

  if (!isConfigured) {
    console.warn('Firebase config is missing. Update app/scripts/firebase-config.js.');
    return;
  }

  if (!window.firebase.apps.length) {
    window.firebase.initializeApp(config);
  }

  var db = window.firebase.database();

  window.SecondEndingFirebase = {
    enabled: true,
    getVotesRef: function (movieId) {
      return db.ref('movieVotes').child(String(movieId));
    }
  };
})(window);
