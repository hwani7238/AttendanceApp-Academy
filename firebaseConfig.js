// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// 출결 앱에 필수적인 인증(Authentication)과 Firestore 데이터베이스를 추가합니다.
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration (사용자님의 설정 정보)
const firebaseConfig = {
    apiKey: "AIzaSyDU6_hrIVyF93PGFNROmnFj7X-3rSrNq3s",
    authDomain: "whee-music-academy.firebaseapp.com",
    projectId: "whee-music-academy",
    storageBucket: "whee-music-academy.firebasestorage.app",
    messagingSenderId: "1064413771156",
    appId: "1:1064413771156:web:c179c8aff9de29dae78b81",
    measurementId: "G-S2L29JTGYN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ----------------------------------------------------
// 앱에서 사용할 핵심 서비스 초기화 및 내보내기 (Export)
// ----------------------------------------------------

// 1. 사용자 인증 (로그인/회원가입 처리)
export const auth = getAuth(app); 

// 2. Firestore 데이터베이스 (출결 기록, 학생/강사 정보 저장)
export const db = getFirestore(app); 

// Analytics는 개발 초기에는 필수가 아니므로 주석 처리하거나 제거했습니다.
// const analytics = getAnalytics(app);
