import React, { useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform, Alert } from 'react-native';
import { auth, db } from './firebaseConfig';
import { signOut, deleteUser } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';


import { ResponsiveLayout } from './ResponsiveHandler';
import { theme } from './Theme';
// import { Ionicons } from '@expo/vector-icons'; // 아이콘 추가 (Removed to prevent load errors)

export default function MainScreen({ navigation }) {
  const colors = theme.light;
  const [academyInfo, setAcademyInfo] = React.useState(null);
  const [paymentDueCount, setPaymentDueCount] = React.useState(0);

  useEffect(() => {
    let unsubscribeStudents = () => { };
    let unsubscribeProfile = () => { };

    // Listen for auth state changes
    const unsubscribeAuth = auth.onAuthStateChanged(async (u) => {
      // Cleanup previous listeners
      unsubscribeStudents();
      unsubscribeProfile();

      if (u) {
        // 1. Fetch Academy Info (Profile)
        unsubscribeProfile = onSnapshot(doc(db, "users", u.uid), (docSnap) => {
          if (docSnap.exists()) {
            setAcademyInfo(docSnap.data());
          }
        });

        // 2. Listen for student changes for Payment Due count
        const q = query(collection(db, "students"), where("userId", "==", u.uid));
        unsubscribeStudents = onSnapshot(q, (snapshot) => {
          let count = 0;
          const today = new Date();

          snapshot.forEach(doc => {
            const data = doc.data();
            if (data.usageType === 'monthly') {
              const lastDate = data.lastPaymentDate ? data.lastPaymentDate.toDate() : new Date(data.regDate);
              const nextDate = new Date(lastDate);
              nextDate.setMonth(nextDate.getMonth() + 1);

              const diffTime = nextDate - today;
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays <= 1) count++;
            } else {
              const remaining = (data.totalCount || 0) - (data.currentCount || 0);
              if (remaining <= 1) count++;
            }
          });
          setPaymentDueCount(count);
        });
      } else {
        setAcademyInfo(null);
        setPaymentDueCount(0);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeStudents();
      unsubscribeProfile();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.replace("Login");
    } catch (error) {
      console.error("로그아웃 실패:", error);
    }
  };

  const handleDeleteAccount = () => {
    if (Platform.OS === 'web') {
      if (confirm("정말로 탈퇴하시겠습니까? 계정이 영구적으로 삭제됩니다.")) {
        deleteUser(auth.currentUser).then(() => {
          alert("계정이 삭제되었습니다.");
          navigation.replace("Login");
        }).catch((error) => {
          alert("오류: " + error.message);
        });
      }
    } else {
      Alert.alert("회원 탈퇴", "정말로 탈퇴하시겠습니까? 계정이 영구적으로 삭제됩니다.", [
        { text: "취소", style: "cancel" },
        {
          text: "탈퇴",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteUser(auth.currentUser);
              Alert.alert("알림", "계정이 삭제되었습니다.");
              navigation.replace("Login");
            } catch (error) {
              Alert.alert("오류", "삭제 실패: " + error.message);
            }
          }
        }
      ]);
    }
  };

  return (
    <ResponsiveLayout>
      {({ isMobile }) => (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.contentContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>

            {/* Welcome Message (Moved to Top) */}
            {auth.currentUser && (
              <View style={{ width: '100%', alignItems: 'center', marginBottom: 20 }}>
                {auth.currentUser.displayName && (
                  <>
                    <Text style={{
                      fontSize: 22,
                      color: colors.primary,
                      fontWeight: '700',
                      marginBottom: 5,
                    }}>
                      환영합니다, {auth.currentUser.displayName}님!
                    </Text>
                  </>
                )}

                <Text style={{ fontSize: 14, color: colors.mutedForeground, fontWeight: 'normal', marginBottom: 10 }}>
                  ({auth.currentUser.email})
                </Text>
              </View>
            )}

            <Text style={[styles.title, { color: colors.foreground, fontSize: academyInfo?.academyName ? 32 : 28 }]}>
              {academyInfo?.academyName || "학원 출결 관리 🏫"}
            </Text>

            {isMobile ? (
              // =========================
              // 모바일 뷰 (출석 전용 모드)
              // =========================
              <View style={{ width: '100%', alignItems: 'center', marginTop: 20 }}>
                <Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign: 'center', marginBottom: 30 }]}>
                  학생들이 출석을 체크하는 화면입니다.
                </Text>

                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.primary, height: 80 }]}
                  onPress={() => navigation.navigate("Attendance")}
                  activeOpacity={0.9}
                >
                  <Text style={{ fontSize: 32, marginRight: 15 }}>✅</Text>
                  <Text style={[styles.buttonText, { fontSize: 22 }]}>출석 체크 시작하기</Text>
                </TouchableOpacity>

                {/* 모바일에서도 로그아웃/정보수정/회원탈퇴 제공 (하단 이동) */}
                <View style={[styles.logoutRow, { marginTop: 60 }]}>
                  <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                    <Text style={[styles.logoutText, { color: colors.destructive }]}>로그아웃</Text>
                  </TouchableOpacity>
                  <View style={styles.divider} />
                  <TouchableOpacity onPress={() => navigation.navigate("ProfileSettings")} style={styles.logoutButton}>
                    <Text style={[styles.logoutText, { color: colors.primary }]}>정보 수정</Text>
                  </TouchableOpacity>
                </View>
              </View>

            ) : (
              // =========================
              // 데스크탑 뷰 (관리자 모드)
              // =========================
              <View style={{ width: '100%', alignItems: 'center' }}>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                  관리자 모드 (웹)
                </Text>

                {/* ⚠️ Payment Alert */}
                {paymentDueCount > 0 && (
                  <TouchableOpacity
                    style={[styles.alertBox, { backgroundColor: '#fee2e2', borderColor: colors.destructive }]}
                    onPress={() => navigation.navigate("StudentList")}
                  >
                    <Text style={{ fontSize: 20, marginRight: 10 }}>⚠️</Text>
                    <Text style={{ color: colors.destructive, fontWeight: 'bold', fontSize: 16 }}>
                      결제 필요 학생: {paymentDueCount}명
                    </Text>
                  </TouchableOpacity>
                )}

                <View style={styles.menuContainer}>
                  <>
                    {/* 강제 학생 모드 이동 버튼 (모바일 인식 실패 또는 PC에서 띄울 때 대비) */}
                    <TouchableOpacity
                      style={[
                        styles.button,
                        { backgroundColor: colors.primary, height: 70, marginBottom: 10 }
                      ]}
                      onPress={() => navigation.navigate("Attendance")}
                      activeOpacity={0.9}
                    >
                      <Text style={[styles.emojiIcon, { fontSize: 26 }]}>✅</Text>
                      <Text style={[styles.buttonText, { fontSize: 20 }]}>학생 출석체크 모드 열기</Text>
                    </TouchableOpacity>

                    {/* 학생 관리 (Chart 3 - Blue) */}
                    <TouchableOpacity
                      style={[
                        styles.button,
                        { backgroundColor: colors.chart3 }
                      ]}
                      onPress={() => navigation.navigate("StudentList")}
                      activeOpacity={0.9}
                    >
                      <Text style={styles.emojiIcon}>👥</Text>
                      <Text style={styles.buttonText}>학생 명단 관리</Text>
                    </TouchableOpacity>

                    {/* 출석 기록 (Chart 2 - Teal) */}
                    <TouchableOpacity
                      style={[
                        styles.button,
                        { backgroundColor: colors.chart2 }
                      ]}
                      onPress={() => navigation.navigate("AttendanceHistory")}
                      activeOpacity={0.9}
                    >
                      <Text style={styles.emojiIcon}>📅</Text>
                      <Text style={styles.buttonText}>출석 기록 조회</Text>
                    </TouchableOpacity>

                    {/* 시간표 조회 (Chart 5 - Orange) */}
                    <TouchableOpacity
                      style={[
                        styles.button,
                        { backgroundColor: colors.chart5 }
                      ]}
                      onPress={() => navigation.navigate("Timetable")}
                      activeOpacity={0.9}
                    >
                      <Text style={styles.emojiIcon}>🕒</Text>
                      <Text style={styles.buttonText}>시간표 조회</Text>
                    </TouchableOpacity>

                    {/* 강사/직원 관리 (Chart 4 - Yellow/Gold) */}
                    <TouchableOpacity
                      style={[
                        styles.button,
                        { backgroundColor: colors.chart4 }
                      ]}
                      onPress={() => navigation.navigate("TeacherManagement")}
                      activeOpacity={0.9}
                    >
                      <Text style={styles.emojiIcon}>🧑‍🏫</Text>
                      <Text style={styles.buttonText}>강사 및 직원 관리</Text>
                    </TouchableOpacity>
                  </>
                </View>

                <View style={styles.logoutRow}>
                  <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                    <Text style={[styles.logoutText, { color: colors.destructive }]}>로그아웃</Text>
                  </TouchableOpacity>

                  <View style={styles.divider} />

                  <TouchableOpacity onPress={() => navigation.navigate("ProfileSettings")} style={styles.logoutButton}>
                    <Text style={[styles.logoutText, { color: colors.primary }]}>정보 수정</Text>
                  </TouchableOpacity>

                  <View style={styles.divider} />

                  <TouchableOpacity onPress={handleDeleteAccount} style={styles.logoutButton}>
                    <Text style={[styles.logoutText, { color: colors.mutedForeground }]}>회원 탈퇴</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

          </View>
        </View>
      )}
    </ResponsiveLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  contentContainer: {
    width: '100%',
    maxWidth: 560,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
    borderWidth: 1,
    borderRadius: 24,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  scrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%', // Ensure content is vertically centered if short
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.4
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 36,
    fontWeight: '500',
  },
  menuContainer: {
    width: '100%',
    gap: 14
  },
  alertBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 18,
  },
  button: {
    width: '100%',
    height: 66,
    borderRadius: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6
  },
  emojiIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700'
  },
  logoutRow: {
    marginTop: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  logoutButton: {
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  divider: {
    width: 1,
    height: 14,
    backgroundColor: '#cbd5e1'
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'none'
  }
});
