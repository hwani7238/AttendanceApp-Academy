import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView, Modal, Platform } from 'react-native';
import { db } from './firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
// 반응형 레이아웃
import { ResponsiveLayout } from './ResponsiveHandler';

export default function StudentManagementScreen({ navigation }) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  // 기본값: 오늘 날짜 (YYYY-MM-DD 형식 문자열)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [subject, setSubject] = useState('');
  const [count, setCount] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  const subjectList = ["피아노", "드럼", "보컬", "기타", "베이스", "미디", "작곡", "시창청음", "댄스"];

  const handleSave = async () => {
    // 1. 입력값 검증
    if (!name || !contact || !subject || !count) {
      const msg = "모든 정보를 입력해주세요.";
      Platform.OS === 'web' ? alert(msg) : Alert.alert("알림", msg);
      return;
    }

    // 연락처에서 숫자만 추출 후 뒤 4자리 사용
    const pinNumber = contact.replace(/[^0-9]/g, "").slice(-4);

    if (pinNumber.length < 4) {
       const msg = "연락처를 정확히 입력해주세요.";
       Platform.OS === 'web' ? alert(msg) : Alert.alert("알림", msg);
       return;
    }

    try {
      // 2. 데이터 저장
      // [중요] lastPaymentDate를 함께 저장해야 기록 조회 화면에서 결제일이 정상 표시됩니다.
      await addDoc(collection(db, "students"), {
        name: name,
        contact: contact,
        pinNumber: pinNumber,
        regDate: date,        // 문자열 날짜 (표시용)
        subject: subject,
        totalCount: parseInt(count),
        currentCount: 0,
        createdAt: new Date(),
        lastPaymentDate: new Date() // ✅ 추가됨: 신규 등록 시점 = 최종 결제일
      });

      // 3. 성공 처리
      const successMsg = `✅ 저장 완료\n${name} 학생이 등록되었습니다!\n(출석번호: ${pinNumber})`;

      if (Platform.OS === 'web') {
        // 웹에서는 브라우저 알림 후 약간의 딜레이를 두고 뒤로 이동
        setTimeout(() => {
          alert(successMsg);
          navigation.goBack();
        }, 100);
      } else {
        Alert.alert("성공", successMsg, [
          { text: "확인", onPress: () => navigation.goBack() }
        ]);
      }

    } catch (error) {
      console.error("저장 실패:", error);
      let errorMsg = "학생 등록에 실패했습니다.";
      if (error.code === 'permission-denied') {
        errorMsg += "\n(권한 오류: Firebase 규칙을 확인해주세요)";
      }
      Platform.OS === 'web' ? alert(errorMsg) : Alert.alert("오류", errorMsg);
    }
  };

  return (
    <ResponsiveLayout>
      {({ isMobile }) => (
        <View style={styles.container}>
          
          {/* 상단 헤더 (뒤로가기 버튼) */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>학생 등록</Text>
            {/* 타이틀 중앙 정렬을 위한 더미 뷰 */}
            <View style={{ width: 24 }} /> 
          </View>

          <ScrollView 
            contentContainerStyle={styles.scrollContent} 
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formContainer}>
              <Text style={styles.label}>이름</Text>
              <TextInput 
                style={styles.input} 
                placeholder="예: 홍길동" 
                value={name} 
                onChangeText={setName} 
              />

              <Text style={styles.label}>연락처 (전체 번호)</Text>
              <TextInput 
                style={styles.input} 
                placeholder="예: 010-1234-5678" 
                keyboardType="phone-pad" 
                value={contact} 
                onChangeText={setContact} 
              />

              <Text style={styles.label}>등록일</Text>
              <TextInput 
                style={styles.input} 
                placeholder="YYYY-MM-DD" 
                value={date} 
                onChangeText={setDate} 
              />

              <Text style={styles.label}>수강 과목</Text>
              <TouchableOpacity style={styles.dropdownButton} onPress={() => setModalVisible(true)}>
                <Text style={[styles.dropdownText, !subject && { color: '#aaa' }]}>
                  {subject || "과목을 선택해주세요"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#555" />
              </TouchableOpacity>

              <Text style={styles.label}>등록 횟수 (회)</Text>
              <TextInput 
                style={styles.input} 
                placeholder="예: 8" 
                keyboardType="numeric" 
                value={count} 
                onChangeText={setCount} 
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>저장하기</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* 과목 선택 모달 */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>과목 선택</Text>
                <ScrollView style={{ maxHeight: 300 }}>
                  {subjectList.map((item, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={styles.modalItem} 
                      onPress={() => { setSubject(item); setModalVisible(false); }}
                    >
                      <Text style={styles.modalItemText}>{item}</Text>
                      {subject === item && <Ionicons name="checkmark" size={20} color="#4285F4" />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity style={styles.modalCloseButton} onPress={() => setModalVisible(false)}>
                  <Text style={styles.modalCloseText}>닫기</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      )}
    </ResponsiveLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  
  // 헤더 스타일 (StudentListScreen과 통일)
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 15, 
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderColor: '#eee',
    height: 60
  },
  headerBtn: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },

  scrollContent: { 
    padding: 20, 
    paddingBottom: 50, 
    width: '100%', 
    maxWidth: 600, // PC 화면에서 입력 폼이 너무 늘어지지 않게 제한
    alignSelf: 'center'
  },
  
  formContainer: { width: '100%', marginBottom: 20 },
  label: { fontSize: 15, fontWeight: 'bold', color: '#555', marginBottom: 8, marginTop: 15 },
  input: { width: '100%', height: 50, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 15, fontSize: 16, backgroundColor: '#fff' },
  
  dropdownButton: { width: '100%', height: 50, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 15, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownText: { fontSize: 16, color: '#333' },
  
  saveButton: { width: '100%', height: 55, backgroundColor: '#4285F4', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 30, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, elevation: 3 },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', maxWidth: 350, backgroundColor: '#fff', borderRadius: 15, padding: 20, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f1f1f1', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalItemText: { fontSize: 16, color: '#333' },
  modalCloseButton: { marginTop: 20, alignItems: 'center', padding: 10 },
  modalCloseText: { fontSize: 16, color: '#ff5c5c', fontWeight: 'bold' }
});