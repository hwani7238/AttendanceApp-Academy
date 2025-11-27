import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert, Modal, TextInput, Platform } from 'react-native';
import { db } from './firebaseConfig';
import { collection, onSnapshot, query, doc, updateDoc, deleteDoc } from 'firebase/firestore'; 

export default function StudentListScreen({ navigation }) {
  const [students, setStudents] = useState([]);
  
  // 수정 모달 상태
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editName, setEditName] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editTotal, setEditTotal] = useState("");
  const [editCurrent, setEditCurrent] = useState("");

  // 확인 팝업 상태
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [actionType, setActionType] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "students"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => {
        const data = doc.data();
        const total = data.totalCount || 0;
        const current = data.currentCount || 0;
        const remaining = total - current;
        return { id: doc.id, ...data, remaining: remaining, isPaymentNeeded: remaining <= 1 };
      });
      list.sort((a, b) => {
        if (a.isPaymentNeeded === b.isPaymentNeeded) return a.name.localeCompare(b.name);
        return a.isPaymentNeeded ? -1 : 1;
      });
      setStudents(list);
    });
    return () => unsubscribe();
  }, []);

  // --- 기능 함수들 ---
  const promptDelete = (student) => {
    setSelectedStudent(student);
    setActionType('DELETE');
    setConfirmMessage(`'${student.name}' 학생 정보를\n정말 삭제하시겠습니까?`);
    setConfirmModalVisible(true);
  };

  const promptPayment = (student) => {
    setSelectedStudent(student);
    setActionType('PAYMENT');
    setConfirmMessage(`${student.name} 학생의 횟수를\n초기화(충전) 하시겠습니까?`);
    setConfirmModalVisible(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedStudent || !actionType) return;
    try {
      if (actionType === 'DELETE') {
        await deleteDoc(doc(db, "students", selectedStudent.id));
      } else if (actionType === 'PAYMENT') {
        const studentRef = doc(db, "students", selectedStudent.id);
        await updateDoc(studentRef, { currentCount: 0 });
      }
      setConfirmModalVisible(false);
      setSelectedStudent(null);
      setActionType(null);
    } catch (err) {
      alert("작업에 실패했습니다.");
    }
  };

  const openEditModal = (student) => {
    setEditingStudent(student);
    setEditName(student.name);
    setEditSubject(student.subject);
    setEditTotal(String(student.totalCount));
    setEditCurrent(String(student.currentCount));
    setEditModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!editingStudent) return;
    try {
      const studentRef = doc(db, "students", editingStudent.id);
      await updateDoc(studentRef, {
        name: editName,
        subject: editSubject,
        totalCount: parseInt(editTotal) || 0,
        currentCount: parseInt(editCurrent) || 0
      });
      setEditModalVisible(false);
    } catch (err) {
      alert("수정 실패");
    }
  };

  const renderItem = ({ item }) => (
    <View style={[styles.card, item.isPaymentNeeded && styles.warningCard]}>
      <View style={styles.infoContainer}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{item.name}</Text>
          {item.isPaymentNeeded && <View style={styles.badge}><Text style={styles.badgeText}>결제 필요</Text></View>}
        </View>
        <Text style={[styles.subText, item.isPaymentNeeded && styles.redText]}>
          {item.subject} • {item.remaining}회 남음 (총 {item.totalCount}회)
        </Text>
        <View style={styles.actionButtons}>
          {item.isPaymentNeeded && (
            <TouchableOpacity style={styles.paymentButton} onPress={() => promptPayment(item)}>
              <Text style={styles.btnTextWhite}>💰 결제완료</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.editButton} onPress={() => openEditModal(item)}>
            <Text style={styles.btnTextGray}>✏️ 수정</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={() => promptDelete(item)}>
            <Text style={styles.btnTextRed}>🗑️ 삭제</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.rightInfo}>
        <Text style={styles.contact}>{item.contact}</Text>
        <Text style={styles.pinText}>No. {item.pinNumber}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.webContainer}>
        
        {/* 상단 헤더 수정: 아이콘 제거하고 텍스트 버튼으로 변경 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>◀ 뒤로</Text>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>학생 명단 ({students.length}명)</Text>
          
          <TouchableOpacity onPress={() => navigation.navigate("StudentManagement")} style={styles.headerBtn}>
            <Text style={[styles.headerBtnText, {color: '#4285F4'}]}>+ 학생등록</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={students}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>학생이 없습니다.</Text></View>}
        />

        {/* 확인 팝업 */}
        <Modal animationType="fade" transparent={true} visible={confirmModalVisible} onRequestClose={() => setConfirmModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>확인해주세요</Text>
              <Text style={styles.confirmMessage}>{confirmMessage}</Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setConfirmModalVisible(false)}>
                  <Text style={styles.modalBtnText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.confirmBtn]} onPress={handleConfirmAction}>
                  <Text style={[styles.modalBtnText, {color:'white'}]}>확인</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* 수정 팝업 */}
        <Modal animationType="slide" transparent={true} visible={editModalVisible} onRequestClose={() => setEditModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>학생 정보 수정</Text>
              <Text style={styles.label}>이름</Text>
              <TextInput style={styles.input} value={editName} onChangeText={setEditName} />
              <Text style={styles.label}>과목</Text>
              <TextInput style={styles.input} value={editSubject} onChangeText={setEditSubject} />
              <View style={styles.row}>
                <View style={{flex:1, marginRight:5}}>
                  <Text style={styles.label}>총 횟수</Text>
                  <TextInput style={styles.input} value={editTotal} onChangeText={setEditTotal} keyboardType="numeric" />
                </View>
                <View style={{flex:1, marginLeft:5}}>
                  <Text style={styles.label}>현재 사용</Text>
                  <TextInput style={styles.input} value={editCurrent} onChangeText={setEditCurrent} keyboardType="numeric" />
                </View>
              </View>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setEditModalVisible(false)}>
                  <Text style={styles.modalBtnText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleUpdate}>
                  <Text style={[styles.modalBtnText, {color:'white'}]}>저장</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', alignItems: 'center' },
  webContainer: { width: '100%', maxWidth: 600, flex: 1, backgroundColor: '#f5f5f5' },
  
  // 헤더 스타일 수정
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    paddingTop: 40, // 상단 여백 확보
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderColor: '#eee' 
  },
  headerBtn: { padding: 8 },
  headerBtnText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },

  listContainer: { padding: 20 },
  card: { backgroundColor: '#fff', padding: 20, marginBottom: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, elevation: 2, borderLeftWidth: 5, borderLeftColor: 'transparent' },
  warningCard: { borderLeftColor: '#ff5c5c', backgroundColor: '#fff5f5' },
  infoContainer: { flex: 1, marginRight: 10 }, 
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  name: { fontSize: 18, fontWeight: 'bold', color: '#333', marginRight: 8 },
  badge: { backgroundColor: '#ff5c5c', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  subText: { fontSize: 14, color: '#666', marginBottom: 10 },
  redText: { color: '#d32f2f', fontWeight: 'bold' },
  
  actionButtons: { flexDirection: 'row', gap: 8, marginTop: 5 },
  paymentButton: { backgroundColor: '#4CAF50', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  editButton: { backgroundColor: '#eee', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  deleteButton: { backgroundColor: '#fff0f0', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  btnTextWhite: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  btnTextGray: { color: '#555', fontSize: 12, fontWeight: 'bold' },
  btnTextRed: { color: '#ff5c5c', fontSize: 12, fontWeight: 'bold' },

  rightInfo: { alignItems: 'flex-end' },
  contact: { fontSize: 12, color: '#888' },
  pinText: { fontSize: 12, color: '#aaa', marginTop: 2 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 16, color: '#aaa' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', maxWidth: 350, backgroundColor: '#fff', borderRadius: 15, padding: 25, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  confirmMessage: { fontSize: 16, color: '#555', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 5, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 16, backgroundColor: '#f9f9f9' },
  row: { flexDirection: 'row' },
  modalButtons: { flexDirection: 'row', marginTop: 20, gap: 10 },
  modalBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#eee' },
  saveBtn: { backgroundColor: '#4285F4' },
  confirmBtn: { backgroundColor: '#4CAF50' },
  modalBtnText: { fontSize: 16, fontWeight: 'bold', color: '#333' }
});