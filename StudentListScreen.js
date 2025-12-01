import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { db } from './firebaseConfig';
import { collection, onSnapshot, query, doc, updateDoc, deleteDoc, where, getDocs, orderBy } from 'firebase/firestore'; 
import { ResponsiveLayout } from './ResponsiveHandler'; 

// --- 로컬 시간 기준 날짜 변환 함수 ---
const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// --- 미니 캘린더 컴포넌트 ---
const MiniCalendar = ({ selectedDate, onSelectDate, onReset }) => {
  const [currentDate, setCurrentDate] = useState(new Date()); 

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const generateDays = () => {
    const days = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay(); 
    
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const calendarDays = generateDays();
  const isSelected = (d) => d && selectedDate === formatLocalDate(d);

  return (
    <View style={styles.calendarContainer}>
      <View style={styles.calHeader}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.iconBtn}>
          <Text style={styles.arrowIcon}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.calTitle}>{year}년 {month + 1}월</Text>
        <TouchableOpacity onPress={handleNextMonth} style={styles.iconBtn}>
          <Text style={styles.arrowIcon}>▶</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {['일','월','화','수','목','금','토'].map((d, i) => (
          <Text key={i} style={[styles.weekText, i===0 && {color:'#ff5c5c'}]}>{d}</Text>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {calendarDays.map((date, index) => {
          if (!date) return <View key={index} style={styles.dayCell} />;
          
          const dateStr = formatLocalDate(date); 
          const selected = isSelected(date);

          return (
            <TouchableOpacity 
              key={index} 
              style={[styles.dayCell, selected && styles.selectedDay]} 
              onPress={() => onSelectDate(dateStr)}
            >
              <Text style={[styles.dayText, selected && {color:'white'}]}>{date.getDate()}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={styles.resetButton} onPress={onReset}>
        {/* 아이콘을 🔔(알림)으로 변경하여 주목도 상승 */}
        <Text style={styles.resetIcon}>🔔</Text>
        <Text style={styles.resetText}> 결제 필요 리스트</Text>
      </TouchableOpacity>
    </View>
  );
};

// --- 메인 화면 ---
export default function StudentListScreen({ navigation }) {
  const [viewMode, setViewMode] = useState('ALL'); 
  const [selectedDate, setSelectedDate] = useState(null);
  const [students, setStudents] = useState([]); 
  const [dailyAttendees, setDailyAttendees] = useState([]); 

  // 모달 상태들
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editName, setEditName] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editTotal, setEditTotal] = useState("");
  const [editCurrent, setEditCurrent] = useState("");
  const [editPin, setEditPin] = useState(""); 
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [actionType, setActionType] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "students"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => {
        const data = doc.data();
        const remaining = (data.totalCount || 0) - (data.currentCount || 0);
        return { id: doc.id, ...data, remaining, isPaymentNeeded: remaining <= 2 };
      });
      // [정렬 로직] 결제 필요한 학생(isPaymentNeeded)이 상단에 옴
      list.sort((a, b) => (a.isPaymentNeeded === b.isPaymentNeeded ? a.name.localeCompare(b.name) : a.isPaymentNeeded ? -1 : 1));
      setStudents(list);
    });
    return () => unsubscribe();
  }, []);

  const fetchDailyAttendance = async (dateStr) => {
    setSelectedDate(dateStr);
    setViewMode('DAILY');
    const start = new Date(dateStr + "T00:00:00");
    const end = new Date(dateStr + "T23:59:59");

    try {
      const q = query(
        collection(db, "attendance"),
        where("timestamp", ">=", start),
        where("timestamp", "<=", end),
        orderBy("timestamp", "desc")
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDailyAttendees(list);
    } catch (e) {
      console.error(e);
      Alert.alert("오류", "출석 데이터를 불러오지 못했습니다.");
    }
  };

  const handleReset = () => {
    setSelectedDate(null);
    setViewMode('ALL');
  };

  // --- 액션 핸들러 ---
  const promptDelete = (student) => {
    setSelectedStudent(student);
    setActionType('DELETE');
    setConfirmMessage(`'${student.name}' 학생 정보를\n삭제하시겠습니까?`);
    setConfirmModalVisible(true);
  };
  const promptPayment = (student) => {
    setSelectedStudent(student);
    setActionType('PAYMENT');
    setConfirmMessage(`'${student.name}' 학생 결제 처리를 하시겠습니까?`);
    setConfirmModalVisible(true);
  };
  const handleConfirmAction = async () => {
    if (!selectedStudent || !actionType) return;
    try {
      const ref = doc(db, "students", selectedStudent.id);
      if (actionType === 'DELETE') await deleteDoc(ref);
      else if (actionType === 'PAYMENT') await updateDoc(ref, { currentCount: 0, lastPaymentDate: new Date() });
      setConfirmModalVisible(false);
    } catch (err) { alert("작업 실패"); }
  };
  const openEditModal = (s) => {
    setEditingStudent(s); setEditName(s.name); setEditSubject(s.subject||''); 
    setEditTotal(String(s.totalCount||0)); setEditCurrent(String(s.currentCount||0)); setEditPin(s.pinNumber||'');
    setEditModalVisible(true);
  };
  const handleUpdate = async () => {
    if(!editingStudent) return;
    try {
      await updateDoc(doc(db,"students",editingStudent.id), {
        name:editName, subject:editSubject, totalCount:parseInt(editTotal)||0, currentCount:parseInt(editCurrent)||0, pinNumber:editPin
      });
      setEditModalVisible(false);
    } catch(e) { alert("수정 실패"); }
  };

  const renderStudentItem = ({ item }) => (
    <View style={[styles.card, item.isPaymentNeeded && styles.warningCard]}>
      <View style={styles.infoContainer}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{item.name}</Text>
          {item.isPaymentNeeded && (
            <View style={[styles.badge, item.remaining <= 0 ? styles.bgRed : styles.bgYellow]}>
              <Text style={[styles.badgeText, item.remaining <= 0 ? {color:'white'} : {color:'#333'}]}>
                {item.remaining <= 0 ? '소진됨' : '임박'}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.subText, item.isPaymentNeeded && styles.redText]}>
          {item.subject} • 잔여 {item.remaining}회 (총 {item.totalCount}회)
        </Text>
        <View style={styles.actionButtons}>
          {item.isPaymentNeeded && (
            <TouchableOpacity style={styles.paymentButton} onPress={() => promptPayment(item)}>
              <Text style={styles.btnIcon}>💳</Text>
              <Text style={styles.btnTextWhite}> 결제</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.editButton} onPress={() => openEditModal(item)}>
            <Text style={styles.btnTextGray}>수정</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={() => promptDelete(item)}>
            <Text style={styles.btnTextRed}>삭제</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.rightInfo}>
        <Text style={styles.pinText}>No.{item.pinNumber}</Text>
        {item.lastPaymentDate && <Text style={styles.dateText}>{new Date(item.lastPaymentDate.seconds * 1000).toLocaleDateString()}</Text>}
      </View>
    </View>
  );

  const renderDailyItem = ({ item }) => (
    <View style={styles.dailyCard}>
      <View style={{flexDirection:'row', alignItems:'center'}}>
        <Text style={{fontSize: 20, marginRight: 10}}>✅</Text>
        <View>
          <Text style={styles.dailyName}>{item.name}</Text>
          <Text style={styles.dailyTime}>{new Date(item.timestamp.seconds * 1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</Text>
        </View>
      </View>
      <Text style={styles.dailySubject}>{item.subject}</Text>
    </View>
  );

  return (
    <ResponsiveLayout>
      {({ isMobile }) => (
        <View style={styles.container}>
          
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerLeft}>
              <Text style={{fontSize: 24, color: '#333'}}>◀</Text>
              <Text style={styles.backText}>뒤로</Text>
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>
                {viewMode === 'ALL' ? `학생 관리 (${students.length}명)` : `${selectedDate} 출석자`}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={() => navigation.navigate("StudentManagement")} style={styles.newAddButton}>
                <Text style={styles.newAddButtonText}>+ 신규등록</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.contentBody, isMobile && styles.columnLayout]}>
            <View style={[styles.leftPanel, isMobile && styles.mobileTopPanel]}>
              <MiniCalendar 
                selectedDate={selectedDate} 
                onSelectDate={fetchDailyAttendance} 
                onReset={handleReset} 
              />
            </View>
            <View style={styles.rightPanel}>
              {viewMode === 'ALL' ? (
                <FlatList
                  data={students}
                  renderItem={renderStudentItem}
                  keyExtractor={item => item.id}
                  contentContainerStyle={styles.listContainer}
                  ListEmptyComponent={<View style={styles.emptyBox}><Text>등록된 학생이 없습니다.</Text></View>}
                />
              ) : (
                <View style={{flex:1}}>
                  <View style={styles.dailyHeaderBar}>
                    <Text style={styles.dailyHeaderTitle}>📅 {selectedDate} 출석 명단 ({dailyAttendees.length}명)</Text>
                  </View>
                  <FlatList
                    data={dailyAttendees}
                    renderItem={renderDailyItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={<View style={styles.emptyBox}><Text>해당 날짜의 출석 기록이 없습니다.</Text></View>}
                  />
                </View>
              )}
            </View>
          </View>

          {/* 모달 (기존 코드 유지) */}
          <Modal animationType="fade" transparent={true} visible={confirmModalVisible} onRequestClose={() => setConfirmModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>확인해주세요</Text>
                <Text style={styles.confirmMessage}>{confirmMessage}</Text>
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setConfirmModalVisible(false)}><Text style={styles.modalBtnText}>취소</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, actionType === 'DELETE' ? styles.deleteConfirmBtn : styles.paymentConfirmBtn]} onPress={handleConfirmAction}><Text style={[styles.modalBtnText, {color:'white'}]}>{actionType === 'DELETE' ? '삭제' : '확인'}</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          <Modal animationType="slide" transparent={true} visible={editModalVisible} onRequestClose={() => setEditModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>정보 수정</Text>
                <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="이름" />
                <TextInput style={styles.input} value={editSubject} onChangeText={setEditSubject} placeholder="과목" />
                <TextInput style={styles.input} value={editPin} onChangeText={setEditPin} keyboardType="numeric" maxLength={4} placeholder="출석번호"/>
                <View style={styles.row}>
                  <TextInput style={[styles.input, {flex:1, marginRight:5}]} value={editTotal} onChangeText={setEditTotal} keyboardType="numeric" placeholder="총 횟수"/>
                  <TextInput style={[styles.input, {flex:1, marginLeft:5}]} value={editCurrent} onChangeText={setEditCurrent} keyboardType="numeric" placeholder="현재 횟수"/>
                </View>
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setEditModalVisible(false)}><Text style={styles.modalBtnText}>취소</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleUpdate}><Text style={[styles.modalBtnText, {color:'white'}]}>저장</Text></TouchableOpacity>
                </View>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', height: 70 },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  backText: { marginLeft: 5, fontSize: 16, color: '#333' },
  headerCenter: { flex: 2, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  headerRight: { flex: 1, alignItems: 'flex-end' },
  newAddButton: { backgroundColor: '#4285F4', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, elevation: 3 },
  newAddButtonText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

  contentBody: { flex: 1, flexDirection: 'row' },
  columnLayout: { flexDirection: 'column' },
  leftPanel: { width: 320, backgroundColor: '#fff', borderRightWidth: 1, borderColor: '#eee', padding: 15 },
  mobileTopPanel: { width: '100%', borderRightWidth: 0, borderBottomWidth: 1 },
  rightPanel: { flex: 1, backgroundColor: '#f8f9fa' },

  calendarContainer: { alignItems: 'center' },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 10, marginBottom: 15, alignItems: 'center' },
  calTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  arrowIcon: { fontSize: 20, color: '#555', fontWeight: 'bold' }, 
  iconBtn: { padding: 5 }, 

  weekRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 5 },
  weekText: { width: 35, textAlign: 'center', fontWeight: 'bold', color: '#666', fontSize: 12 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', width: '100%' },
  dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  dayText: { fontSize: 14, color: '#333' },
  selectedDay: { backgroundColor: '#4285F4', borderRadius: 20 },
  
  // 버튼 스타일 변경 (회색 -> 강조된 파란색 테두리 또는 진한 회색)
  resetButton: { flexDirection: 'row', marginTop: 20, backgroundColor: '#343a40', padding: 12, borderRadius: 8, width: '100%', justifyContent: 'center', alignItems: 'center' },
  resetIcon: { fontSize: 16, color: 'white', marginRight: 6 }, 
  resetText: { color: 'white', fontWeight: 'bold', fontSize: 15 },

  listContainer: { padding: 15 },
  emptyBox: { alignItems: 'center', marginTop: 50 },
  
  card: { backgroundColor: '#fff', padding: 15, marginBottom: 12, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2, borderLeftWidth: 5, borderLeftColor: '#4CAF50' },
  warningCard: { borderLeftColor: '#ffc107', backgroundColor: '#fffdf5' },
  infoContainer: { flex: 1, marginRight: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  name: { fontSize: 18, fontWeight: 'bold', color: '#333', marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  bgRed: { backgroundColor: '#ffe6e6', borderWidth: 1, borderColor: '#dc3545' },
  bgYellow: { backgroundColor: '#fffbe6', borderWidth: 1, borderColor: '#ffc107' },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  subText: { fontSize: 14, color: '#666', marginBottom: 12 },
  redText: { color: '#d32f2f', fontWeight: 'bold' },
  actionButtons: { flexDirection: 'row', gap: 8 },
  paymentButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4CAF50', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  editButton: { backgroundColor: '#f1f3f5', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  deleteButton: { backgroundColor: '#ffe6e6', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  
  btnIcon: { fontSize: 12, color: 'white', marginRight: 4 }, 
  btnTextWhite: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  btnTextGray: { color: '#495057', fontSize: 12, fontWeight: 'bold' },
  btnTextRed: { color: '#dc3545', fontSize: 12, fontWeight: 'bold' },
  rightInfo: { alignItems: 'flex-end', justifyContent: 'space-between', height: '100%' },
  pinText: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  dateText: { fontSize: 12, color: '#999', marginTop: 5 },

  dailyHeaderBar: { backgroundColor: '#e9ecef', padding: 10, borderRadius: 8, marginBottom: 10 },
  dailyHeaderTitle: { fontWeight: 'bold', color: '#495057' },
  dailyCard: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  dailyName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  dailyTime: { fontSize: 12, color: '#888' },
  dailySubject: { fontSize: 14, color: '#4285F4', fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 16, padding: 24, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  confirmMessage: { fontSize: 16, color: '#555', textAlign: 'center', marginBottom: 25 },
  input: { borderWidth: 1, borderColor: '#dee2e6', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#f8f9fa', marginBottom: 10, width:'100%' },
  row: { flexDirection: 'row' },
  modalButtons: { flexDirection: 'row', marginTop: 10, gap: 10 },
  modalBtn: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#f1f3f5' },
  saveBtn: { backgroundColor: '#4285F4' },
  deleteConfirmBtn: { backgroundColor: '#dc3545' },
  paymentConfirmBtn: { backgroundColor: '#4CAF50' },
  modalBtnText: { fontSize: 16, fontWeight: 'bold', color: '#495057' }
});