import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { auth } from './firebaseConfig';
import { signOut } from 'firebase/auth';

// 모바일 화면 기준 너비 (600px 이하면 폰으로 간주)
const MOBILE_BREAKPOINT = 768;

export default function MainScreen({ navigation }) {
  
  // 1. 현재 화면의 너비를 실시간으로 가져옵니다.
  const { width } = useWindowDimensions();
  
  // 2. 기기 환경 + 화면 크기로 모드를 결정합니다.
  const isWeb = Platform.OS === 'web';
  const isMobileSize = width < MOBILE_BREAKPOINT;
  
  // 앱이거나, 웹이어도 화면이 좁으면 '학생 모드'
  const isStudentMode = !isWeb || isMobileSize;
  
  // 웹이면서 화면이 넓을 때만 '관리자 모드'
  const isAdminMode = isWeb && !isMobileSize;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.replace("Login");
    } catch (error) {
      console.error("로그아웃 실패:", error);
    }
  };

  return (
    <View style={styles.container}>
      {/* 웹 반응형 컨테이너 */}
      <View style={styles.webContainer}>
        
        <Text style={styles.title}>학원 출결 관리 🏫</Text>
        
        <Text style={styles.subtitle}>
          {isAdminMode ? "관리자 모드 (PC)" : "학생용 출석 체크 (모바일)"}
        </Text>
        
        <View style={styles.menuContainer}>
          
          {/* 📱 [학생 모드] 출석 체크 버튼만 표시 */}
          {isStudentMode && (
            <TouchableOpacity 
              style={[styles.button, styles.attendanceButton]} 
              onPress={() => navigation.navigate("Attendance")}
            >
              <Text style={styles.buttonText}>📍 출석 체크하기</Text>
            </TouchableOpacity>
          )}

          {/* 💻 [관리자 모드] 관리 버튼들 표시 */}
          {isAdminMode && (
            <>
              <TouchableOpacity 
                style={[styles.button, styles.studentButton]} 
                onPress={() => navigation.navigate("StudentList")}
              >
                <Text style={styles.buttonText}>👨‍🎓 학생 명단 관리</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.button, styles.historyButton]} 
                onPress={() => navigation.navigate("AttendanceHistory")}
              >
                <Text style={styles.buttonText}>📋 출석 기록 조회</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

// --- 스타일 정의 ---
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  
  webContainer: {
    width: '100%',
    maxWidth: 500, 
    alignItems: 'center',
    padding: 20,
  },

  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 5, color: '#333' },
  subtitle: { fontSize: 16, color: 'gray', marginBottom: 40 },
  menuContainer: { width: '100%', gap: 15 },
  
  button: {
    width: '100%', height: 60, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 3
  },
  
  attendanceButton: { backgroundColor: '#4CAF50' },
  studentButton: { backgroundColor: '#4285F4' },    
  historyButton: { backgroundColor: '#FF9800' },    

  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  logoutButton: { marginTop: 40, padding: 10 },
  logoutText: { color: '#ff5c5c', fontSize: 16, fontWeight: '600' }
});