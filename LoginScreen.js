import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, useColorScheme } from 'react-native';
import { auth } from './firebaseConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
// 👇 반응형 핸들러(ResponsiveHandler)에서 레이아웃 가져오기
import { ResponsiveLayout } from './ResponsiveHandler';
import { theme } from './Theme';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // 테마 (현재는 Light Mode로 고정됨)
  // 만약 Dark Mode를 다시 원하시면 Theme.js에서 Default를 변경하면 됩니다.
  const systemColorScheme = useColorScheme();
  // const colors = theme[systemColorScheme === 'dark' ? 'dark' : 'light'];
  const colors = theme.light; // Force Light Mode based on user feedback

  // 1. 이미 로그인된 상태라면 자동으로 메인 화면으로 이동
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigation.replace("Main");
      }
    });
    return unsubscribe;
  }, []);

  const getFriendlyErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return '이메일 또는 비밀번호가 일치하지 않습니다.';
      case 'auth/email-already-in-use':
        return '이미 사용 중인 이메일입니다.';
      case 'auth/invalid-email':
        return '유효하지 않은 이메일 형식입니다.';
      case 'auth/weak-password':
        return '비밀번호는 6자리 이상이어야 합니다.';
      case 'auth/network-request-failed':
        return '네트워크 연결 상태를 확인해주세요.';
      case 'auth/too-many-requests':
        return '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.';
      default:
        return '오류가 발생했습니다. 다시 시도해주세요. (' + errorCode + ')';
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Login Error:", error.code, error.message);
      const friendlyMsg = getFriendlyErrorMessage(error.code);
      setErrorMessage(friendlyMsg);
      Alert.alert("로그인 실패", friendlyMsg);
    }
  };

  // handleSignUp Removed (Moved to SignUpScreen)

  return (
    <ResponsiveLayout>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.header, { color: colors.foreground }]}>학원 출결 관리 🏫</Text>
          <Text style={[styles.subHeader, { color: colors.mutedForeground }]}>
            강사와 학생을 위한 스마트한 관리
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, {
                backgroundColor: colors.inputBackground,
                color: colors.foreground,
                borderColor: colors.input
              }]}
              placeholder="이메일"
              placeholderTextColor={colors.mutedForeground}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <TextInput
              style={[styles.input, {
                backgroundColor: colors.inputBackground,
                color: colors.foreground,
                borderColor: colors.input
              }]}
              placeholder="비밀번호"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <View style={styles.buttonContainer}>
            {/* Login Button using Chart 3 (Blue) for vibrancy */}
            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: colors.chart3, shadowColor: colors.chart3 }
              ]}
              onPress={handleLogin}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, { color: '#ffffff' }]}>로그인</Text>
            </TouchableOpacity>

            {/* Signup Button using Chart 2 (Teal) or Secondary */}
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.secondary, marginTop: 8 }]}
              onPress={() => navigation.navigate("SignUp")}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, { color: colors.secondaryForeground }]}>회원가입</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ResponsiveLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subHeader: {
    fontSize: 16,
    marginBottom: 40,
    textAlign: 'center',
    lineHeight: 24,
  },
  inputContainer: {
    gap: 16,
    marginBottom: 24,
  },
  input: {
    width: '100%',
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  buttonContainer: {
    gap: 0,
    marginTop: 8,
  },
  button: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, // Colored shadow support (iOS)
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontWeight: '700',
    fontSize: 16,
  },
  errorText: {
    color: '#d4183d',
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  }
});