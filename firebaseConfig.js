// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// onAuthStateChanged를 추가로 불러옵니다 (로그인 상태 감지용)
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
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

// ✅ [핵심 추가] App.js에서 호출하는 초기화 함수
// 이 함수가 있어야 앱이 켜질 때 "로그인 상태인지 아닌지"를 확인하고 넘어갈 수 있습니다.
export const initializeAuth = () => {
  return new Promise((resolve) => {
    // Firebase가 로그인 정보를 불러올 때까지 기다립니다.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // 확인이 끝나면 구독을 해제하고 '완료(true)' 신호를 보냅니다.
      unsubscribe();
      resolve(true);
    });
  });
};