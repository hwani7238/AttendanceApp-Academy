import React, { createContext, useContext } from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';

// 1. 글로벌 데이터(Context) 생성
const ResponsiveContext = createContext();

// 2. 모드 판독기 (Provider)
export const ResponsiveProvider = ({ children }) => {
  const { width } = useWindowDimensions();

  const MOBILE_BREAKPOINT = 768; // 태블릿/모바일 기준을 조금 넉넉하게 768px로 조정
  const isWeb = Platform.OS === 'web';
  const isMobileSize = width < MOBILE_BREAKPOINT;

  // 핵심 로직: 앱이거나 화면이 좁으면 '학생 모드(모바일)'
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

// 4. 화면 틀 (Layout Component) - [핵심 수정됨]
export const ResponsiveLayout = ({ children, style }) => {
  // Provider에서 값을 가져옴
  const context = useResponsive();

  // context가 없을 경우(App.js에서 Provider로 안 감싼 경우) 대비 안전장치
  const isMobile = context ? context.isStudentMode : true;
  const isWeb = context ? context.isWeb : Platform.OS === 'web';

  return (
    <View style={[styles.background, style]}>
      <View style={[styles.webContainer, isWeb && styles.webContainerWeb]}>
        {/* 👇 여기가 수정되었습니다! */}
        {/* 자식이 '함수'라면 실행해서 isMobile 값을 넘겨주고, 아니면 그냥 보여줍니다. */}
        {typeof children === 'function'
          ? children({ isMobile })
          : children
        }
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#eef2f7',
    alignItems: 'center',
  },
  webContainer: {
    width: '100%',
    flex: 1,
    backgroundColor: '#fff',
  },
  webContainerWeb: {
    maxWidth: 1320,
    marginVertical: 14,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dbe3ee',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
  },
});
