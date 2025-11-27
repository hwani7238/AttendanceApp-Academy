import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView, Modal, Platform } from 'react-native';
import { db } from './firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
// 👇 반응형 핸들러 가져오기
import { ResponsiveLayout } from './ResponsiveHandler';

export default function StudentManagementScreen({ navigation }) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [subject, setSubject] = useState('');
  const [count, setCount] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  const subjectList = ["피아노", "드럼", "보컬", "기타", "베이스", "미디", "작곡", "시창청음", "댄스"];

  const handleSave = async () => {
    // 1. 입력 확인
    if (!name || !contact || !subject || !count) {
      const msg = "모든 정보를 입력해주세요.";
      Platform.OS === 'web' ? alert(msg) : Alert.alert("알림", msg);
      return;
    }

    // 숫자만 남기고 뒤에서 4자리 자름
    const pinNumber = contact.replace(/[^0-9]/g, "").slice(-4);

    if (pinNumber.length < 4) {
       const msg = "연락처를 정확히 입력해주세요.";
       Platform.OS === 'web' ? alert(msg) : Alert.alert("알림", msg);
       return;
    }

    try {
      // 2. 데이터 저장 시도
      console.log("저장 시작...");

      await addDoc(collection(db, "students"), {
        name: name,
        contact: contact,
        pinNumber: pinNumber,
        regDate: date,
        subject: subject,
        totalCount: parseInt(count),
        currentCount: 0,
        createdAt: new Date()
      });

      console.log("저장 성공!");

      // 3. 성공 알림 및 페이지 이동
      const successMsg = `✅ 저장 완료\n${name} 학생이 등록되었습니다!\n(출석번호: ${pinNumber})`;

      if (Platform.OS === 'web') {
        // 웹: 브라우저 기본 알림창 띄우고 -> 확인 누르면 뒤로가기
        // (setTimeout을 써서 화면이 멈추지 않게 함)
        setTimeout(() => {
          alert(successMsg);
          navigation.goBack();
        }, 100);
      } else {
        // 앱: 네이티브 알림창 띄우고 -> 버튼 누르면 뒤로가기
        Alert.alert("성공", successMsg, [
          { text: "확인", onPress: () => navigation.goBack() }
        ]);
      }

    } catch (error) {
      // 4. 에러 발생 시 처리
      console.error("저장 실패 에러:", error);

      let errorMsg = "학생 등록에 실패했습니다.";
      if (error.code === 'permission-denied') {
        errorMsg += "\n(권한 오류: 파이어베이스 규칙을 확인해주세요)";
      } else {
        errorMsg += "\n" + error.message;
      }

      Platform.OS === 'web' ? alert(errorMsg) : Alert.alert("오류", errorMsg);
    }
  };

  return (
    <ResponsiveLayout>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>👨‍🎓 학생 등록</Text>

        <View style={styles.formContainer}>
          <Text style={styles.label}>이름</Text>
          <TextInput style={styles.input} placeholder="예: 홍길동" value={name} onChangeText={setName} />

          <Text style={styles.label}>연락처 (전체 번호)</Text>
          <TextInput style={styles.input} placeholder="예: 010-1234-5678" keyboardType="phone-pad" value={contact} onChangeText={setContact} />

          <Text style={styles.label}>등록일</Text>
          <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={date} onChangeText={setDate} />

          <Text style={styles.label}>수강 과목</Text>
          <TouchableOpacity style={styles.dropdownButton} onPress={() => setModalVisible(true)}>
            <Text style={[styles.dropdownText, !subject && { color: '#aaa' }]}>{subject || "과목을 선택해주세요"}</Text>
            <Ionicons name="chevron-down" size={20} color="#555" />
          </TouchableOpacity>

          <Text style={styles.label}>등록 횟수 (회)</Text>
          <TextInput style={styles.input} placeholder="예: 8" keyboardType="numeric" value={count} onChangeText={setCount} />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>저장하기</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 모달 */}
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
                <TouchableOpacity key={index} style={styles.modalItem} onPress={() => { setSubject(item); setModalVisible(false); }}>
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
    </ResponsiveLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 20, paddingBottom: 50, width: '100%' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 30, marginTop: 20, textAlign: 'center' },
  formContainer: { width: '100%', marginBottom: 20 },
  label: { fontSize: 16, fontWeight: 'bold', color: '#555', marginBottom: 5, marginTop: 10 },
  input: { width: '100%', height: 50, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 15, fontSize: 16, backgroundColor: '#f9f9f9' },
  dropdownButton: { width: '100%', height: 50, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 15, backgroundColor: '#f9f9f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownText: { fontSize: 16, color: '#333' },
  saveButton: { width: '100%', height: 55, backgroundColor: '#4285F4', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 15, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalItemText: { fontSize: 16, color: '#333' },
  modalCloseButton: { marginTop: 20, alignItems: 'center', padding: 10 },
  modalCloseText: { fontSize: 16, color: '#ff5c5c', fontWeight: 'bold' }
});