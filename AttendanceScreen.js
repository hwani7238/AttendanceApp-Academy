import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, ScrollView, Platform } from 'react-native';
import { db } from './firebaseConfig';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, increment } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons'; 
import { ResponsiveLayout } from './ResponsiveHandler';

// ==========================================================
// 1. Google Apps Script 연동 관련 상수 및 로직 모두 제거됨
// ==========================================================

export default function AttendanceScreen({ navigation }) {
  const [pin, setPin] = useState(""); 
  const [time, setTime] = useState(new Date());
  
  // 1. 형제/자매 선택 팝업 상태
  const [siblingModalVisible, setSiblingModalVisible] = useState(false);
  const [siblings, setSiblings] = useState([]);

  // 2. 결과 확인 팝업 상태
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultConfig, setResultConfig] = useState({ title: "", message: "", type: "success" });
  
  // 3. 카운트다운 상태 추가
  const [countdown, setCountdown] = useState(5);

  // 시간 업데이트 타이머
  useEffect(() => {
    const timer = setInterval(() => { setTime(new Date()); }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 결과 모달이 열리면 5초 카운트다운 시작
  useEffect(() => {
    let timer;
    if (resultModalVisible) {
      setCountdown(5); // 모달이 열릴 때 5초로 초기화
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer); // 타이머 정지
            closeResult();        // 모달 닫기
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer); // 컴포넌트가 사라지거나 모달이 닫히면 타이머 정리
    };
  }, [resultModalVisible]);

  const month = time.getMonth() + 1;
  const date = time.getDate();
  const dayName = ['일', '월', '화', '수', '목', '금', '토'][time.getDay()];
  const hours = time.getHours();
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? '오후' : '오전';
  const displayHour = hours % 12 || 12;

  // 팝업 띄우기 함수
  const showResult = (title, message, type = "success") => {
    setResultConfig({ title, message, type });
    setResultModalVisible(true);
  };

  // 팝업 닫기
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

  // 학생 조회
  const checkStudent = async (enteredPin) => {
    try {
      const q = query(collection(db, "students"), where("pinNumber", "==", enteredPin));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        showResult("❌ 출석 실패", "등록되지 않은 번호입니다.", "error");
        return;
      }

      const foundStudents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        pinNumber: enteredPin, // PIN 번호 추가
        ...doc.data()
      }));

      if (foundStudents.length === 1) {
        processAttendance(foundStudents[0], enteredPin);
      } else {
        setSiblings(foundStudents);
        setSiblingModalVisible(true);
      }

    } catch (error) {
      console.error(error);
      showResult("오류", "시스템 오류가 발생했습니다.", "error");
    }
  };

  // 출석 처리 (Firestore에만 기록)
  const processAttendance = async (studentData, enteredPin) => {
    try {
      const total = studentData.totalCount || 0;     
      const current = studentData.currentCount || 0; 
      
      // 횟수 소진 체크
      if (current >= total) {
        showResult("⚠️ 횟수 소진", `${studentData.name}님 수강 횟수가 끝났습니다.`, "error");
        return;
      }

      // 1. Firestore에 출석 기록 추가 (출결 기록의 핵심)
      await addDoc(collection(db, "attendance"), {
        studentId: studentData.id,
        name: studentData.name,
        pinNumber: enteredPin,
        subject: studentData.subject,
        timestamp: new Date(),
        type: "출석"
      });

      // 2. Firestore 잔여 횟수 업데이트
      const studentRef = doc(db, "students", studentData.id);
      await updateDoc(studentRef, { currentCount: increment(1) });
      
      // GAS 연동 로직이 모두 삭제되었습니다.

      // 3. 성공 팝업 표시
      showResult(
        "✅ 출석 완료", 
        `${studentData.name} (${studentData.subject})\n남은 횟수: ${total - (current + 1)}회`,
        "success"
      );

    } catch (error) {
      console.error("출석 처리 실패", error);
      showResult("오류", "출석 처리에 실패했습니다.", "error");
    }
  };

  return (
    <ResponsiveLayout>
      <View style={styles.container}>
        {/* 상단 */}
        <View style={styles.topSection}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backBtnText}>◀ 뒤로</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>위 뮤직 아카데미</Text>
            <View style={{ width: 50 }} /> 
          </View>

          <View style={styles.timeContainer}>
            <Text style={styles.dateText}>{month}월 {date}일 {dayName}요일</Text>
            <View style={styles.clockRow}>
              <Text style={styles.ampmText}>{ampm}</Text>
              <Text style={styles.timeText}>{displayHour} : {minutes}</Text>
            </View>
          </View>

          <View style={styles.pinContainer}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[styles.pinBox, pin.length > i && styles.pinBoxFilled]}>
                <Text style={styles.pinText}>{pin.length > i ? pin[i] : ""}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 하단 키패드 */}
        <View style={styles.bottomSection}>
          <Text style={styles.instructionText}>출결번호 4자리를 눌러주세요</Text>
          <View style={styles.keypadGrid}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '취소', '0', '지움'].map((key) => (
              <TouchableOpacity 
                key={key} 
                style={styles.keyButton} 
                onPress={() => handlePress(key)}
                activeOpacity={0.6}
              >
                <Text style={[
                  styles.keyText, 
                  (key === '취소' || key === '지움') && styles.controlKeyText
                ]}>
                  {key === '취소' ? 'C' : key === '지움' ? '←' : key}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 형제 선택 팝업 */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={siblingModalVisible}
          onRequestClose={() => { setSiblingModalVisible(false); setPin(""); }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>학생을 선택해주세요</Text>
              <ScrollView style={{ maxHeight: 300 }}>
                {siblings.map((student, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.siblingItem}
                    onPress={() => {
                      setSiblingModalVisible(false);
                      // PIN 번호를 studentData에 임시 추가하여 processAttendance로 전달
                      processAttendance({...student, pinNumber: pin}, pin);
                    }}
                  >
                    <Text style={styles.siblingName}>{student.name}</Text>
                    <Text style={styles.siblingSubject}>{student.subject}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.closeButton} onPress={() => { setSiblingModalVisible(false); setPin(""); }}>
                <Text style={styles.closeButtonText}>취소</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* 결과 확인 팝업 */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={resultModalVisible}
          onRequestClose={closeResult}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, styles.resultContent]}>
              <Ionicons 
                name={resultConfig.type === 'success' ? "checkmark-circle" : "alert-circle"} 
                size={60} 
                color={resultConfig.type === 'success' ? "#4CAF50" : "#ff5c5c"} 
                style={{marginBottom: 15}}
              />
              <Text style={styles.resultTitle}>{resultConfig.title}</Text>
              <Text style={styles.resultMessage}>{resultConfig.message}</Text>
              
              <Text style={styles.countdownText}>
                {countdown}초 후 자동으로 닫힙니다
              </Text>
            </View>
          </View>
        </Modal>

      </View>
    </ResponsiveLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', width: '100%', height: '100%' },
  
  topSection: { flex: 1, paddingHorizontal: 20, paddingTop: 20, alignItems: 'center', justifyContent: 'center' },
  header: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  backBtn: { padding: 10 },
  backBtnText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  
  timeContainer: { alignItems: 'center', marginBottom: 30 },
  dateText: { fontSize: 18, color: '#555', marginBottom: 5 },
  clockRow: { flexDirection: 'row', alignItems: 'flex-end' },
  ampmText: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, marginRight: 8 },
  timeText: { fontSize: 60, fontWeight: 'bold', color: '#333' },
  
  pinContainer: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  pinBox: { width: 60, height: 70, borderRadius: 15, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#f9f9f9', justifyContent: 'center', alignItems: 'center' },
  pinBoxFilled: { borderColor: '#4F8EF7', borderWidth: 2, backgroundColor: '#fff' },
  pinText: { fontSize: 30, fontWeight: 'bold', color: '#4F8EF7' },
  
  bottomSection: { flex: 1.5, backgroundColor: '#4285F4', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 30, alignItems: 'center', justifyContent: 'center', paddingBottom: 20 },
  instructionText: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  keypadGrid: { width: '80%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  
  keyButton: { width: '30%', height: 70, justifyContent: 'center', alignItems: 'center', marginBottom: 15, ...Platform.select({ web: { cursor: 'pointer', userSelect: 'none' } }) },
  keyText: { color: 'white', fontSize: 36, fontWeight: '500' },
  controlKeyText: { fontSize: 36, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 15, padding: 25, elevation: 5, alignItems: 'center' },
  
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 5, color: '#333' },
  siblingItem: { width:'100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#f9f9f9', marginBottom: 10, borderRadius: 8 },
  siblingName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  siblingSubject: { fontSize: 16, color: '#4285F4', fontWeight: '600' },
  closeButton: { marginTop: 10, padding: 15, width: '100%', alignItems: 'center', backgroundColor: '#eee', borderRadius: 8 },
  closeButtonText: { fontSize: 16, color: '#555', fontWeight: 'bold' },

  resultContent: { alignItems: 'center', paddingTop: 30, paddingBottom: 30 },
  resultTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  resultMessage: { fontSize: 16, color: '#555', textAlign: 'center', marginBottom: 25, lineHeight: 24 },
  
  countdownText: { fontSize: 14, color: '#888', marginTop: 10 },
  
  resultConfirmBtn: { backgroundColor: '#4285F4', paddingVertical: 12, paddingHorizontal: 40, borderRadius: 8 },
  resultConfirmText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});