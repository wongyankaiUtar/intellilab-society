/* ============================================================================
   IntelliLab Society — Firebase configuration
   ----------------------------------------------------------------------------
   PASTE YOUR FIREBASE CONFIG BELOW.  See FIREBASE_SETUP.md for how to get it.

   While these values are empty the website automatically falls back to
   browser-only accounts (localStorage), so the site never breaks. Fill them in
   and accounts start working across every device and every visitor.

   Is it safe to put these keys in a public repository?
     Yes. Firebase web config values are PUBLIC by design — Google's own docs
     say so. They identify your project; they do not grant access to it.
     Access is controlled by your Firestore Security Rules, which is why
     setting those rules correctly (step 5 of the setup guide) is the part
     that actually matters.

     This is different from a normal secret API key. Never commit those.
   ========================================================================== */

var FIREBASE_CONFIG = {
  apiKey:            "AIzaSyArZOygA7-tCzrbXxoRD7Ior4Ala6JQIPM",
  authDomain:        "intellilab-society.firebaseapp.com",
  projectId:         "intellilab-society",
  storageBucket:     "intellilab-society.firebasestorage.app",
  messagingSenderId: "780678866291",
  appId:             "1:780678866291:web:bff02997e8823968bb5106"
};

/* Leave this alone — it decides whether the cloud backend is even attempted. */
var FIREBASE_READY = !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);
