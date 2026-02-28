import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User,
} from "firebase/auth";
import {
    doc,
    setDoc,
    getDocs,
    collection,
    query,
    where,
    serverTimestamp,
} from "firebase/firestore";
import { app, db } from "./firebase";

export const auth = getAuth(app);

// --- Registration ---
export async function registerUser(email: string, username: string, password: string) {
    // Check username is not already taken
    const usernameQuery = query(collection(db, "users"), where("username", "==", username.toLowerCase()));
    const existing = await getDocs(usernameQuery);
    if (!existing.empty) throw new Error("Username is already taken.");

    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = credential.user.uid;

    // Store user profile with username
    await setDoc(doc(db, "users", uid), {
        uid,
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        displayUsername: username,
        role: "user", // default role — set to "admin" manually in Firestore for admin accounts
        createdAt: serverTimestamp(),
    });

    return credential.user;
}

// --- Login by Username ---
export async function loginWithUsername(username: string, password: string) {
    // Resolve username → email
    const usernameQuery = query(collection(db, "users"), where("username", "==", username.toLowerCase()));
    const snap = await getDocs(usernameQuery);
    if (snap.empty) throw new Error("No account found with that username.");

    const email = snap.docs[0].data().email as string;
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
}

// --- Logout ---
export async function logoutUser() {
    await signOut(auth);
}

export { onAuthStateChanged };
export type { User };
