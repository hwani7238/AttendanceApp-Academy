import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Firebase 인증 함수 불러오기
import { initializeAuth } from './firebaseConfig'; 

// 화면 파일들 불러오기
import LoginScreen from './LoginScreen'; 
import MainScreen from './MainScreen'; 
import AttendanceScreen from './AttendanceScreen'; 
import StudentManagementScreen from './StudentManagementScreen'; 
import StudentListScreen from './StudentListScreen';
import AttendanceHistoryScreen from './AttendanceHistoryScreen'; 

// [수정] ResponsiveProvider 주석 해제 (반응형 UI 작동을 위해 필수)
import { ResponsiveProvider } from './ResponsiveHandler';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isError, setIsError] = useState(false);
  const [statusMessage, setStatusMessage] = useState("초기화 시작...");

  console.log("[App.js] 렌더링 시작");

  useEffect(() => {
    const init = async () => {
      console.log("[App.js] Firebase 인증 시도 중...");
      setStatusMessage("Firebase 인증 시도 중...");
      
      const success = await initializeAuth();
      
      if (success) {
        console.log("[App.js] 인증 성공! 화면 로딩 준비");
        setIsAuthReady(true);
      } else {
        console.error("[App.js] 인증 실패");
        setStatusMessage("인증 실패! 콘솔을 확인하세요.");
        setIsError(true);
      }
    };
    init();
  }, []);

  // 1. 에러 발생 시 화면
  if (isError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>⚠️ 시스템 오류 발생</Text>
        <Text style={styles.statusText}>{statusMessage}</Text>
      </View>
    );
  }

  // 2. 로딩 중 화면
  if (!isAuthReady) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={styles.loadingText}>{statusMessage}</Text>
      </View>
    );
  }
    
  // 3. 정상 렌더링 화면
  return (
    <View style={styles.rootContainer}>
      {/* [수정] ResponsiveProvider로 NavigationContainer를 감싸줍니다. */}
      <ResponsiveProvider>
        <NavigationContainer>
          <Stack.Navigator 
            initialRouteName="Login"
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Main" component={MainScreen} />
            <Stack.Screen name="Attendance" component={AttendanceScreen} />
            <Stack.Screen name="StudentList" component={StudentListScreen} />
            <Stack.Screen name="StudentManagement" component={StudentManagementScreen} />
            <Stack.Screen name="AttendanceHistory" component={AttendanceHistoryScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </ResponsiveProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    height: Platform.OS === 'web' ? '100vh' : '100%', 
    backgroundColor: '#fff', 
  },
  centerContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#f0f0f0', 
    height: Platform.OS === 'web' ? '100vh' : '100%',
  },
  loadingText: { marginTop: 15, fontSize: 16, color: '#333' },
  statusText: { marginTop: 10, fontSize: 14, color: '#666' },
  errorText: { color: '#dc3545', fontSize: 24, fontWeight: 'bold' },
});