let db; // Firestore database instance

fetch("firebase-config.json")
  .then(response => response.json())
  .then(config => {
    firebase.initializeApp(config);
    const auth = firebase.auth();
    db = firebase.firestore(); // Initialize Firestore

    // 🔹 Check if User is Already Logged In
    auth.onAuthStateChanged((user) => {
        updateUI(user);
        if (user) {
            loadBlockedMovies(user.uid); // Load movies when user logs in
        }
    });

    // 🔹 Add Event Listener for Movie Input
    document.getElementById("addMovieBtn").addEventListener("click", function () {
        const movieName = document.getElementById("movieName").value.trim();
        if (movieName) {
            addBlockedMovie(auth.currentUser.uid, movieName);
        }
    });
  })
  .catch(error => console.error("Error loading Firebase config:", error));
