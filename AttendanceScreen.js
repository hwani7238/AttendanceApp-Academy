import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, ScrollView, Platform, Alert } from 'react-native';
import { db, auth } from './firebaseConfig';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, increment, Timestamp, getDoc } from 'firebase/firestore';
import { ResponsiveLayout } from './ResponsiveHandler';
import { theme } from './Theme';

export default function AttendanceScreen({ navigation }) {
  const colors = theme.light; // Force Light Mode

  // Custom Academy Name Logic
  const [academyName, setAcademyName] = useState("..."); // Changed default to '...' for loading state

  useEffect(() => {
    // Defensive check: Ensure auth is initialized
    if (!auth) {
      console.error("Auth object is undefined in AttendanceScreen");
      return;
    }

    if (auth.currentUser) {
      try {
        getDoc(doc(db, "users", auth.currentUser.uid)).then(snap => {
          if (snap.exists() && snap.data().academyName) {
            setAcademyName(snap.data().academyName);
          }
        }).catch(err => {
          console.error("Failed to fetch academy name:", err);
          // Non-fatal, just keep default or empty
        });
      } catch (e) {
        console.error("Error setting up academy name fetch:", e);
      }
    }
  }, []);

  const [pin, setPin] = useState("");
  const [time, setTime] = useState(new Date());

  const [siblingModalVisible, setSiblingModalVisible] = useState(false);
  const [siblings, setSiblings] = useState([]);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultConfig, setResultConfig] = useState({ title: "", message: "", type: "success" });
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => { setTime(new Date()); }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let timer;
    if (resultModalVisible) {
      setCountdown(5);
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            closeResult();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [resultModalVisible]);

  const month = time.getMonth() + 1;
  const date = time.getDate();
  const dayName = ['일', '월', '화', '수', '목', '금', '토'][time.getDay()];
  const hours = time.getHours();
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? '오후' : '오전';
  const displayHour = hours % 12 || 12;

  const showResult = (title, message, type = "success") => {
    setResultConfig({ title, message, type });
    setResultModalVisible(true);
  };

  const closeResult = () => {
    setResultModalVisible(false);
    setPin("");
  };

  const handlePress = (value) => {
    if (value === '취소') {
      setPin("");
    } else if (value === '지움') {
      setPin(pin.slice(0, -1));
    } else {
      if (pin.length < 4) {
        const newPin = pin + value;
        setPin(newPin);
        if (newPin.length === 4) {
          setTimeout(() => checkStudent(newPin), 100);
        }
      }
    }
  };

  const checkStudent = async (enteredPin) => {
    try {
      if (!auth.currentUser) return;
      // 🔑 내 회원의 학생 중에서만 핀번호 검색
      const q = query(
        collection(db, "students"),
        where("pinNumber", "==", enteredPin),
        where("userId", "==", auth.currentUser.uid)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        showResult("❌ 출석 실패", "등록되지 않은 번호입니다.", "error");
        return;
      }

      const foundStudents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        pinNumber: enteredPin,
        ...doc.data()
      }));

      if (foundStudents.length === 1) {
        processAttendance(foundStudents[0], enteredPin);
      } else {
        setSiblings(foundStudents);
        setSiblingModalVisible(true);
      }

    } catch (error) {
      console.error("Check Student Error:", error);
      // 🔥 인덱스 에러 표시 (중요) - Safely handle alert for both platforms
      const errorMsg = error.message || "알 수 없는 오류";
      if (Platform.OS === 'web') {
        alert("시스템 오류 (인덱스 필요): " + errorMsg);
      } else {
        Alert.alert("오류", "시스템 오류가 발생했습니다.\n" + errorMsg);
      }
      showResult("오류", "시스템 오류가 발생했습니다.", "error");
    }
  };

  const processAttendance = async (studentData, enteredPin) => {
    try {
      const total = studentData.totalCount || 0;
      const current = studentData.currentCount || 0;

      const usageType = studentData.usageType || 'session'; // Default to session if undefined

      if (usageType === 'session') {
        if (current >= total) {
          showResult("⚠️ 횟수 소진", `${studentData.name}님 수강 횟수가 끝났습니다.`, "error");
          return;
        }
      }

      await addDoc(collection(db, "attendance"), {
        userId: auth.currentUser.uid,
        studentId: studentData.id,
        name: studentData.name,
        pinNumber: enteredPin,
        subject: studentData.subject,
        timestamp: Timestamp.fromDate(new Date()),
        type: "출석"
      });

      const studentRef = doc(db, "students", studentData.id);
      // For session users, increment currentCount. For monthly, we can distinct or just increment too (optional, but let's just increment to track visits)
      await updateDoc(studentRef, { currentCount: increment(1) });

      let message = "";
      if (usageType === 'session') {
        message = `${studentData.name} (${studentData.subject})\n남은 횟수: ${total - (current + 1)}회`;
      } else {
        message = `${studentData.name} (${studentData.subject})\n출석이 완료되었습니다.`;
      }

      showResult("✅ 출석 완료", message, "success");

    } catch (error) {
      console.error("출석 처리 실패", error);
      showResult("오류", "출석 처리에 실패했습니다.", "error");
    }
  };

  return (
    <ResponsiveLayout>
      <View style={[styles.container, { backgroundColor: colors.background }]}>

        {/* 상단 섹션 */}
        <View style={styles.topSection}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={{ fontSize: 24, color: colors.foreground }}>⬅️</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>{academyName}</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.timeContainer}>
            <Text style={[styles.dateText, { color: colors.mutedForeground }]}>{month}월 {date}일 {dayName}요일</Text>
            <View style={styles.clockRow}>
              <Text style={[styles.ampmText, { color: colors.primary }]}>{ampm}</Text>
              <Text style={[styles.timeText, { color: colors.primary }]}>{displayHour} : {minutes}</Text>
            </View>
          </View>

          <View style={styles.pinContainer}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.pinBox,
                  { backgroundColor: colors.inputBackground, borderColor: colors.border },
                  pin.length > i && { borderColor: colors.chart3, borderWidth: 2, backgroundColor: colors.card }
                ]}
              >
                <Text style={[styles.pinText, { color: colors.chart3 }]}>{pin.length > i ? pin[i] : ""}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 하단 키패드 섹션 (Blue) */}
        <View style={[styles.bottomSection, { backgroundColor: '#3b82f6' }]}>
          <Text style={styles.instructionText}>출결번호 4자리를 입력하세요</Text>
          <View style={styles.keypadGrid}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '취소', '0', '지움'].map((key) => {
              const isControl = key === '취소' || key === '지움';
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.keyButton,
                    // 숫자키는 약간 투명한 흰색, 컨트롤키는 완전 투명하거나 다른 색
                    !isControl && { backgroundColor: 'rgba(255,255,255,0.2)' }
                  ]}
                  onPress={() => handlePress(key)}
                  activeOpacity={0.6}
                >
                  <Text style={[
                    styles.keyText,
                    isControl && { fontSize: 24, fontWeight: 'bold' } // 컨트롤 키 텍스트 크기 조절
                  ]}>
                    {key === '취소' ? 'C' : key === '지움' ? <Text style={{ fontSize: 28, color: 'white' }}>⌫</Text> : key}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Sibling Modal */}
        <Modal animationType="fade" transparent={true} visible={siblingModalVisible} onRequestClose={() => { setSiblingModalVisible(false); setPin(""); }}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>학생 선택</Text>
              <ScrollView style={{ maxHeight: 300 }}>
                {siblings.map((student, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.siblingItem, { backgroundColor: colors.secondary }]}
                    onPress={() => {
                      setSiblingModalVisible(false);
                      processAttendance({ ...student, pinNumber: pin }, pin);
                    }}
                  >
                    <Text style={[styles.siblingName, { color: colors.foreground }]}>{student.name}</Text>
                    <Text style={[styles.siblingSubject, { color: colors.chart3 }]}>{student.subject}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.muted }]} onPress={() => { setSiblingModalVisible(false); setPin(""); }}>
                <Text style={{ color: colors.mutedForeground }}>취소</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Result Modal */}
        <Modal animationType="fade" transparent={true} visible={resultModalVisible} onRequestClose={closeResult}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, styles.resultContent, { backgroundColor: colors.card }]}>
              <Text style={{ fontSize: 60, marginBottom: 15 }}>
                {resultConfig.type === 'success' ? "✅" : "⚠️"}
              </Text>
              <Text style={[styles.resultTitle, { color: colors.foreground }]}>{resultConfig.title}</Text>
              <Text style={[styles.resultMessage, { color: colors.mutedForeground }]}>{resultConfig.message}</Text>

              <Text style={[styles.countdownText, { color: colors.mutedForeground }]}>
                {countdown}초 후 닫힙니다
              </Text>
            </View>
          </View>
        </Modal>

      </View>
    </ResponsiveLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', height: '100%' },

  topSection: { flex: 1, paddingHorizontal: 20, paddingTop: 20, alignItems: 'center', justifyContent: 'center' },
  header: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  backBtn: { padding: 5 },

  timeContainer: { alignItems: 'center', marginBottom: 40 },
  dateText: { fontSize: 18, marginBottom: 5 },
  clockRow: { flexDirection: 'row', alignItems: 'flex-end' },
  ampmText: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, marginRight: 8 },
  timeText: { fontSize: 64, fontWeight: '800' },

  pinContainer: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  pinBox: { width: 64, height: 72, borderRadius: 16, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  pinText: { fontSize: 32, fontWeight: 'bold' },

  bottomSection: { flex: 1.4, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 32, alignItems: 'center', justifyContent: 'center', paddingBottom: 20 },
  instructionText: { color: 'white', fontSize: 16, fontWeight: '600', marginBottom: 24, opacity: 0.9 },
  keypadGrid: { width: '85%', maxWidth: 400, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },

  keyButton: { width: '31%', height: 72, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  keyText: { color: 'white', fontSize: 32, fontWeight: '500' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', maxWidth: 380, borderRadius: 24, padding: 32, elevation: 10, alignItems: 'center' },

  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  siblingItem: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, marginBottom: 12, borderRadius: 12 },
  siblingName: { fontSize: 18, fontWeight: 'bold' },
  siblingSubject: { fontSize: 16, fontWeight: '600' },
  closeButton: { marginTop: 16, padding: 12, width: '100%', alignItems: 'center', borderRadius: 12 },

  resultContent: { alignItems: 'center', paddingTop: 40, paddingBottom: 40 },
  resultTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  resultMessage: { fontSize: 18, textAlign: 'center', marginBottom: 32, lineHeight: 26 },
  countdownText: { fontSize: 14, opacity: 0.7 },
});