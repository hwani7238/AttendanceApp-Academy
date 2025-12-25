import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Platform } from 'react-native';
// import { useFonts } from 'expo-font'; // Removed for stability
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { initializeAuth } from './firebaseConfig';

import LoginScreen from './LoginScreen';
import SignUpScreen from './SignUpScreen';
import MainScreen from './MainScreen';
import AttendanceScreen from './AttendanceScreen';
import StudentManagementScreen from './StudentManagementScreen';
import StudentListScreen from './StudentListScreen';
import AttendanceHistoryScreen from './AttendanceHistoryScreen';
import ProfileSettingsScreen from './ProfileSettingsScreen';

import { ResponsiveProvider } from './ResponsiveHandler';

const Stack = createNativeStackNavigator();

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>⚠️ 치명적 오류 발생</Text>
          <Text style={styles.statusText}>{this.state.error && this.state.error.toString()}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isError, setIsError] = useState(false);
  const [statusMessage, setStatusMessage] = useState("초기화 시작...");

  // 🔥 REMOVED: useFonts hook (We use emojis now, so no need to block loading for fonts)
  // const [fontsLoaded] = useFonts({ ...Ionicons.font });

  useEffect(() => {
    const init = async () => {
      console.log("[App.js] Firebase Auth Check...");
      setStatusMessage("Firebase 인증 시도 중...");

      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => resolve(false), 5000);
      });

      try {
        const success = await Promise.race([
          initializeAuth(),
          timeoutPromise
        ]);

        if (success) {
          console.log("[App.js] Auth Success");
          setIsAuthReady(true);
        } else {
          console.error("[App.js] Auth Failed or Timed Out");
          setStatusMessage("인증 시간이 초과되었습니다. 네트워크를 확인하세요.");
          setIsError(true);
        }
      } catch (e) {
        console.error("[App.js] Error:", e);
        setStatusMessage("초기화 오류: " + e.message);
        setIsError(true);
      }
    };
    init();
  }, []);

  if (isError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>⚠️ 시스템 오류 발생</Text>
        <Text style={styles.statusText}>{statusMessage}</Text>
      </View>
    );
  }

  if (!isAuthReady) { // Removed !fontsLoaded check
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={styles.loadingText}>{statusMessage}</Text>
        <Text style={{ marginTop: 10, fontSize: 12, color: '#999' }}>폰트 로딩 건너뜀 (Emoji 모드)</Text>
      </View>
    );
  }

  return (
    <View style={styles.rootContainer}>
      <ErrorBoundary>
        <ResponsiveProvider>
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName="Login"
              screenOptions={{ headerShown: false }}
            >
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="SignUp" component={SignUpScreen} />
              <Stack.Screen name="Main" component={MainScreen} />
              <Stack.Screen name="Attendance" component={AttendanceScreen} />
              <Stack.Screen name="StudentList" component={StudentListScreen} />
              <Stack.Screen name="StudentManagement" component={StudentManagementScreen} />
              <Stack.Screen name="AttendanceHistory" component={AttendanceHistoryScreen} />
              <Stack.Screen name="ProfileSettings" component={ProfileSettingsScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </ResponsiveProvider>
      </ErrorBoundary>
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