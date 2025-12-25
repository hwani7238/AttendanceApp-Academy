// This script simulates a logged-in user and attempts to read/write to Firestore
// to verify the new security rules.

const { initializeApp } = require("firebase/app");
const { getAuth, createUserWithEmailAndPassword } = require("firebase/auth");
const { getFirestore, collection, addDoc, getDocs, doc, setDoc, query, where } = require("firebase/firestore");

// Manually inserted config from firebaseConfig.js
const manualConfig = {
    apiKey: "AIzaSyDU6_hrIVyF93PGFNROmnFj7X-3rSrNq3s",
    authDomain: "whee-music-academy.firebaseapp.com",
    projectId: "whee-music-academy",
    storageBucket: "whee-music-academy.firebasestorage.app",
    messagingSenderId: "1064413771156",
    appId: "1:1064413771156:web:c179c8aff9de29dae78b81",
    measurementId: "G-S2L29JTGYN"
};

async function runTest() {
    console.log("🚀 Starting Firestore Rules Verification...");

    try {
        const app = initializeApp(manualConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);

        // 1. Authenticate
        const testEmail = `test_security_${Date.now()}@example.com`;
        const testPassword = "testpassword123";

        console.log(`Creating test user: ${testEmail}`);
        const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
        const user = userCredential.user;
        console.log("✅ User authenticated:", user.uid);

        // 2. Test: Write to 'users' (own document) -> SHOULD SUCCEED
        console.log("Test 1: Write to own user profile...");
        try {
            await setDoc(doc(db, "users", user.uid), {
                email: testEmail,
                createdAt: new Date(),
                academyName: "Security Test Academy"
            });
            console.log("✅ Write to own user profile SUCCESS");
        } catch (e) {
            console.error("❌ Write to own user profile FAILED", e.message);
        }

        // 3. Test: Write to 'students' (own data) -> SHOULD SUCCEED
        console.log("Test 2: Add a student...");
        try {
            await addDoc(collection(db, "students"), {
                userId: user.uid, // Must match
                name: "Test Student",
                pinNumber: "0000"
            });
            console.log("✅ Add student SUCCESS");
        } catch (e) {
            console.error("❌ Add student FAILED", e.message);
        }

        // 4. Test: Write to 'students' (wrong userId) -> SHOULD FAIL
        console.log("Test 3: Add student with wrong userId (Negative Test)...");
        try {
            await addDoc(collection(db, "students"), {
                userId: "some_other_user_id",
                name: "Hacker Student"
            });
            console.error("❌ Add student with wrong userId SHOULD HAVE FAILED but SUCCEEDED");
        } catch (e) {
            // Expected behavior: Permission denied
            console.log("✅ Add student with wrong userId BLOCKED as expected.");
        }

        // 5. Test: Query own students -> SHOULD SUCCEED
        console.log("Test 4: Query own students...");
        try {
            const q = query(collection(db, "students"), where("userId", "==", user.uid));
            const snapshot = await getDocs(q);
            console.log("✅ Query own students SUCCESS. Count:", snapshot.size);
        } catch (e) {
            console.error("❌ Query own students FAILED", e.message);
        }

        console.log("🎉 Verification Complete. Please check the logs above.");
        process.exit(0);

    } catch (err) {
        console.error("🚨 Test Suite Error:", err);
        process.exit(1);
    }
}

runTest();
