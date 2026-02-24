import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, useColorScheme, Modal } from 'react-native';
import { auth, db } from './firebaseConfig';
import { signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged } from 'firebase/auth'; // Added sendPasswordResetEmail
import { collection, query, where, getDocs } from 'firebase/firestore'; // Added Firestore query imports
// ... rest of imports
import { ResponsiveLayout } from './ResponsiveHandler';
import { theme } from './Theme';


export default function LoginScreen({ navigation, route }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Find ID/PW States
  const [findModalVisible, setFindModalVisible] = useState(false);
  const [findMode, setFindMode] = useState('id'); // 'id' or 'pw'
  const [findInput, setFindInput] = useState('');
  const [findResult, setFindResult] = useState('');

  // ... (systemColorScheme, colors definition)
  const systemColorScheme = useColorScheme();
  const colors = theme.light;

  const homeRoute = route?.params?.homeRoute || 'Main';

  // ... (useEffect for auth check)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigation.replace(homeRoute);
      }
    });
    return unsubscribe;
  }, [navigation, homeRoute]);

  const getFriendlyErrorMessage = (errorCode) => {
    // ... (existing error messages)
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

  // Find Logic
  const handleFind = async () => {
    setFindResult('');
    if (!findInput.trim()) {
      setFindResult("내용을 입력해주세요.");
      return;
    }

    if (findMode === 'id') {
      // Find ID: Query users by academyName
      try {
        const q = query(collection(db, "users"), where("academyName", "==", findInput));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
          setFindResult("해당 업체명으로 가입된 정보가 없습니다.");
        } else {
          // Assuming first match is correct or multiple matches handling?
          // For simplicity, take the first one.
          const userDoc = querySnapshot.docs[0].data();
          const userEmail = userDoc.email;

          // Masking email (e.g. wh***@gmail.com)
          const [local, domain] = userEmail.split('@');
          const maskedLocal = local.length > 2 ? local.substring(0, 2) + '*'.repeat(local.length - 2) : local + '***';
          setFindResult(`찾은 아이디: ${maskedLocal}@${domain}`);
        }
      } catch (e) {
        console.error(e);
        setFindResult("오류가 발생했습니다.");
      }
    } else {
      // Find PW: Reset Email
      try {
        await sendPasswordResetEmail(auth, findInput);
        setFindResult("✅ 비밀번호 재설정 이메일을 보냈습니다.\n이메일을 확인해주세요.");
      } catch (e) {
        console.error(e);
        if (e.code === 'auth/user-not-found') {
          setFindResult("가입되지 않은 이메일입니다.");
        } else if (e.code === 'auth/invalid-email') {
          setFindResult("유효하지 않은 이메일 형식입니다.");
        } else {
          setFindResult("오류가 발생했습니다: " + e.message);
        }
      }
    }
  };

  const openFindModal = (mode) => {
    setFindMode(mode);
    setFindInput('');
    setFindResult('');
    setFindModalVisible(true);
  };

  return (
    <ResponsiveLayout>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Modal for Find ID/PW */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={findModalVisible}
          onRequestClose={() => setFindModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {findMode === 'id' ? '아이디(이메일) 찾기' : '비밀번호 찾기'}
              </Text>

              <Text style={{ marginBottom: 8, color: colors.mutedForeground }}>
                {findMode === 'id' ? '가입하신 업체명을 입력해주세요.' : '가입하신 이메일 주소를 입력해주세요.'}
              </Text>

              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.foreground, borderColor: colors.input }]}
                placeholder={findMode === 'id' ? "예: 위 뮤직 아카데미" : "example@email.com"}
                placeholderTextColor={colors.mutedForeground}
                value={findInput}
                onChangeText={setFindInput}
                autoCapitalize={findMode === 'pw' ? 'none' : 'words'}
              />

              {findResult ? (
                <View style={{ marginVertical: 10, padding: 10, backgroundColor: colors.secondary, borderRadius: 8 }}>
                  <Text style={{ color: colors.secondaryForeground, textAlign: 'center' }}>{findResult}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.chart3, marginTop: 10 }]}
                onPress={handleFind}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>
                  {findMode === 'id' ? '아이디 찾기' : '이메일 발송'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ marginTop: 15, alignSelf: 'center' }}
                onPress={() => setFindModalVisible(false)}
              >
                <Text style={{ color: colors.mutedForeground }}>닫기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>


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
              secureTextEntry={true}
              autoComplete="password"
            />
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <View style={styles.buttonContainer}>
            {/* Login Button using Chart 3 (Blue) for vibrancy */}
            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor: colors.chart3,
                  shadowColor: colors.chart3,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3, // Increased opacity for better visibility
                  shadowRadius: 8,
                  elevation: 6 // Increased elevation
                }
              ]}
              onPress={handleLogin}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, { color: '#ffffff' }]}>로그인</Text>
            </TouchableOpacity>

            {/* Find ID / Find PW Buttons */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16, gap: 16 }}>
              <TouchableOpacity onPress={() => openFindModal('id')}>
                <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>아이디 찾기</Text>
              </TouchableOpacity>
              <View style={{ width: 1, backgroundColor: colors.border }} />
              <TouchableOpacity onPress={() => openFindModal('pw')}>
                <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>비밀번호 찾기</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 16 }} />

            {/* Signup Button using Chart 2 (Teal) or Secondary */}
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.secondary, marginTop: 0 }]}
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
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  card: {
    width: '100%',
    maxWidth: 430,
    padding: 34,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#dbe3ee',
    shadowColor: '#0f172a',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  header: {
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subHeader: {
    fontSize: 15,
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputContainer: {
    gap: 14,
    marginBottom: 22,
  },
  input: {
    width: '100%',
    height: 54,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  buttonContainer: {
    gap: 0,
    marginTop: 10,
  },
  button: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonText: {
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.1,
  },
  errorText: {
    color: '#d4183d',
    marginBottom: 14,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    padding: 26,
    borderRadius: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
});
