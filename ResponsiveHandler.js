import React, { createContext, useContext } from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';

// 1. 글로벌 데이터(Context) 생성
const ResponsiveContext = createContext();

// 2. 모드 판독기 (Provider)
export const ResponsiveProvider = ({ children }) => {
  const { width } = useWindowDimensions();
  
  const MOBILE_BREAKPOINT = 600; // 600px 기준
  const isWeb = Platform.OS === 'web';
  const isMobileSize = width < MOBILE_BREAKPOINT;

  // 핵심 로직: 앱이거나 화면이 좁으면 '학생 모드'
  const isStudentMode = !isWeb || isMobileSize;
  const isAdminMode = isWeb && !isMobileSize;

  // 이 값들을 앱 전체에 뿌려줍니다.
  return (
    <ResponsiveContext.Provider value={{ isStudentMode, isAdminMode, isWeb }}>
      {children}
    </ResponsiveContext.Provider>
  );
};

// 3. 어디서든 모드를 확인할 수 있게 해주는 훅(Hook)
export const useResponsive = () => useContext(ResponsiveContext);

// 4. 화면 틀 (Layout Component) - 모든 화면을 이걸로 감싸면 됩니다!
export const ResponsiveLayout = ({ children, style }) => {
  return (
    <View style={[styles.background, style]}>
      <View style={styles.webContainer}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center', // 전체 중앙 정렬
    justifyContent: 'center',
  },
  webContainer: {
    width: '100%',
    maxWidth: 500, // 최대 너비 제한 (PC 대응)
    flex: 1,       // 내부 내용물 꽉 차게
    backgroundColor: '#fff',
  },
});