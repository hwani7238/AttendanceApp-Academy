import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// 화면 파일들 불러오기
import LoginScreen from './LoginScreen'; 
import MainScreen from './MainScreen'; 
import AttendanceScreen from './AttendanceScreen'; 
import StudentManagementScreen from './StudentManagementScreen'; 
import StudentListScreen from './StudentListScreen';
import AttendanceHistoryScreen from './AttendanceHistoryScreen'; 

// 반응형 핸들러 불러오기 (웹 반응형 적용을 위함)
import { ResponsiveProvider } from './ResponsiveHandler';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    // 1. 앱 전체를 ResponsiveProvider로 감싸서 어디서든 화면 크기 정보를 쓸 수 있게 함
    <ResponsiveProvider>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Login"
          screenOptions={{ headerShown: false }} // 상단 헤더 숨김
        >
          {/* 로그인 화면 */}
          <Stack.Screen name="Login" component={LoginScreen} />
          
          {/* 메인 화면 (대시보드) */}
          <Stack.Screen name="Main" component={MainScreen} />
          
          {/* 출석 체크 화면 (키패드) */}
          <Stack.Screen name="Attendance" component={AttendanceScreen} />
          
          {/* 학생 명단 화면 (목록/결제) */}
          <Stack.Screen name="StudentList" component={StudentListScreen} />

          {/* 학생 등록 화면 (입력 폼) */}
          <Stack.Screen name="StudentManagement" component={StudentManagementScreen} />
          
          {/* 출석 기록 조회 화면 (히스토리) */}
          <Stack.Screen name="AttendanceHistory" component={AttendanceHistoryScreen} />
        
        </Stack.Navigator>
      </NavigationContainer>
    </ResponsiveProvider>
  );
}