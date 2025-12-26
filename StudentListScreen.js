import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { db, auth } from './firebaseConfig';
import { collection, onSnapshot, query, doc, getDoc, updateDoc, deleteDoc, where, getDocs, orderBy } from 'firebase/firestore';
import { ResponsiveLayout } from './ResponsiveHandler';
import { theme } from './Theme';
// import { Ionicons } from '@expo/vector-icons'; // Removed for stability

const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const MiniCalendar = ({ selectedDate, onSelectDate, onReset, colors }) => {
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
          <Text style={{ fontSize: 20, color: colors.mutedForeground }}>◀️</Text>
        </TouchableOpacity>
        <Text style={[styles.calTitle, { color: colors.foreground }]}>{year}년 {month + 1}월</Text>
        <TouchableOpacity onPress={handleNextMonth} style={styles.iconBtn}>
          <Text style={{ fontSize: 20, color: colors.mutedForeground }}>▶️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
          <Text key={i} style={[styles.weekText, { color: i === 0 ? colors.destructive : colors.mutedForeground }]}>{d}</Text>
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
              style={[
                styles.dayCell,
                selected && { backgroundColor: colors.chart3, borderRadius: 12 } // Selected: Vibrant Blue
              ]}
              onPress={() => onSelectDate(dateStr)}
            >
              <Text style={[
                styles.dayText,
                { color: colors.foreground },
                selected && { color: '#fff', fontWeight: 'bold' }
              ]}>{date.getDate()}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[styles.resetButton, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
        onPress={onReset}
      >
        <Text style={{ fontSize: 16, marginRight: 6 }}>🔄</Text>
        <Text style={[styles.resetText, { color: colors.primary }]}>전체 목록 보기</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function StudentListScreen({ navigation }) {
  const colors = theme.light;
  const [viewMode, setViewMode] = useState('ALL');
  const [filterBranch, setFilterBranch] = useState('ALL');
  const [branchList, setBranchList] = useState(['1관', '2관']); // Default

  useEffect(() => {
    const fetchBranches = async () => {
      if (!auth.currentUser) return;
      try {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.branches && data.branches.length > 0) {
            setBranchList(data.branches);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchBranches();
  }, []);
  const [selectedDate, setSelectedDate] = useState(null);
  const [students, setStudents] = useState([]);
  const [dailyAttendees, setDailyAttendees] = useState([]);

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
  const [lastRefreshed, setLastRefreshed] = useState(new Date().toLocaleTimeString());

  const [subjectModalVisible, setSubjectModalVisible] = useState(false);
  const [subjectList, setSubjectList] = useState([]);

  useEffect(() => {
    if (editModalVisible && auth.currentUser) {
      const { doc, getDoc } = require('firebase/firestore');
      getDoc(doc(db, "users", auth.currentUser.uid)).then(snap => {
        if (snap.exists() && snap.data().subjects) {
          const raw = snap.data().subjects;
          // Handle both string and object {name, fee}
          const processed = raw.map(s => (typeof s === 'object' && s !== null) ? s.name : s);
          setSubjectList(processed);
        } else {
          setSubjectList([]);
        }
      });
    }
  }, [editModalVisible]);

  const fetchStudents = async () => {
    if (!auth.currentUser) return;
    try {
      const q = query(collection(db, "students"), where("userId", "==", auth.currentUser.uid));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => {
        const data = doc.data();
        let isPaymentNeeded = false;
        let remainingText = '';

        if (data.usageType === 'monthly') {
          const lastDate = data.lastPaymentDate ? data.lastPaymentDate.toDate() : new Date(data.regDate);
          const nextDate = new Date(lastDate);
          nextDate.setMonth(nextDate.getMonth() + 1);
          const today = new Date();
          const diffTime = nextDate - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays <= 1) {
            isPaymentNeeded = true;
            remainingText = diffDays < 0 ? `연체됨 (${Math.abs(diffDays)}일)` : (diffDays === 0 ? '오늘 결제' : '내일 결제');
          } else {
            remainingText = `결제일: ${nextDate.getMonth() + 1}/${nextDate.getDate()}`;
          }
        } else {
          const remaining = (data.totalCount || 0) - (data.currentCount || 0);
          isPaymentNeeded = remaining <= 1;
          remainingText = remaining <= 0 ? '소진됨' : `${remaining}회 남음`;
        }
        return { id: doc.id, ...data, isPaymentNeeded, remainingText };
      });

      list.sort((a, b) => {
        if (a.isPaymentNeeded === b.isPaymentNeeded) {
          return a.name.localeCompare(b.name);
        }
        return a.isPaymentNeeded ? -1 : 1;
      });
      setStudents(list);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (e) {
      console.error(e);
      Alert.alert("새로고침 실패", e.message);
    }
  };

  useEffect(() => {
    let unsubscribeStudents = () => { };

    // Listen for Auth Changes to ensure we have a user before querying
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      unsubscribeStudents(); // Cleanup previous listener

      if (!user) {
        setStudents([]);
        return;
      }

      const q = query(collection(db, "students"), where("userId", "==", user.uid));
      unsubscribeStudents = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(doc => {
          const data = doc.data();
          let isPaymentNeeded = false;
          let remainingText = '';

          if (data.usageType === 'monthly') {
            // Monthly Logic
            const lastDate = data.lastPaymentDate ? data.lastPaymentDate.toDate() : new Date(data.regDate);
            const nextDate = new Date(lastDate);
            nextDate.setMonth(nextDate.getMonth() + 1);

            // Check if today is day before nextDate or passed
            const today = new Date();
            const diffTime = nextDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Alert if within 1 day (tomorrow is due) or overdue
            if (diffDays <= 1) {
              isPaymentNeeded = true;
              remainingText = diffDays < 0 ? `연체됨 (${Math.abs(diffDays)}일)` : (diffDays === 0 ? '오늘 결제' : '내일 결제');
            } else {
              remainingText = `결제일: ${nextDate.getMonth() + 1}/${nextDate.getDate()}`;
            }

          } else {
            // Session Logic (Default)
            const remaining = (data.totalCount || 0) - (data.currentCount || 0);
            isPaymentNeeded = remaining <= 1;
            remainingText = remaining <= 0 ? '소진됨' : `${remaining}회 남음`;
          }

          return { id: doc.id, ...data, isPaymentNeeded, remainingText };
        });

        // Sort: Payment Needed first
        list.sort((a, b) => {
          if (a.isPaymentNeeded === b.isPaymentNeeded) {
            return a.name.localeCompare(b.name);
          }
          return a.isPaymentNeeded ? -1 : 1;
        });
        setStudents(list);
        setLastRefreshed(new Date().toLocaleTimeString());
      }, (error) => {
        console.error("Student Query Error:", error);
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      unsubscribeStudents();
    };
  }, []);

  const fetchDailyAttendance = async (dateStr) => {
    setSelectedDate(dateStr);
    setViewMode('DAILY');
    const start = new Date(dateStr + "T00:00:00");
    const end = new Date(dateStr + "T23:59:59");

    if (!auth.currentUser) return;

    try {
      // Removed orderBy("timestamp") to avoid index issues. Sorting client-side.
      const q = query(
        collection(db, "attendance"),
        where("userId", "==", auth.currentUser.uid), // 🔥 Fix: Filter by User
        where("timestamp", ">=", start),
        where("timestamp", "<=", end)
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Client-side sort (Newest first)
      list.sort((a, b) => {
        const tA = a.timestamp?.seconds || 0;
        const tB = b.timestamp?.seconds || 0;
        return tB - tA;
      });

      setDailyAttendees(list);
    } catch (e) {
      console.error(e);
      Alert.alert("오류", "데이터 로드 실패: " + e.message);
    }
  };

  const handleReset = () => { setSelectedDate(null); setViewMode('ALL'); };

  const promptDelete = (student) => {
    setSelectedStudent(student); setActionType('DELETE');
    setConfirmMessage(`'${student.name}' 학생 정보를 삭제하시겠습니까?`);
    setConfirmModalVisible(true);
  };
  const promptPayment = (student) => {
    setSelectedStudent(student); setActionType('PAYMENT');
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
    setEditingStudent(s); setEditName(s.name); setEditSubject(s.subject || '');
    setEditTotal(String(s.totalCount || 0)); setEditCurrent(String(s.currentCount || 0)); setEditPin(s.pinNumber || '');
    setEditModalVisible(true);
  };
  const handleUpdate = async () => {
    if (!editingStudent) return;
    try {
      await updateDoc(doc(db, "students", editingStudent.id), {
        name: editName,
        subject: editSubject,
        totalCount: parseInt(editTotal) || 0,
        currentCount: parseInt(editCurrent) || 0,
        pinNumber: editPin,
        // Preserve existing fields like usageType
      });
      setEditModalVisible(false);
    } catch (e) { alert("수정 실패"); }
  };

  const renderStudentItem = ({ item }) => (
    <View style={[
      styles.card,
      { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
      // Red Point: Strong Red Border for warning
      item.isPaymentNeeded && { borderColor: colors.destructive, borderWidth: 2 }
    ]}>
      <View style={styles.infoContainer}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
          {item.isPaymentNeeded && (
            <View style={[
              styles.badge,
              // Red Point: Strong Red Badge
              { backgroundColor: colors.destructive }
            ]}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>
                {item.remainingText}
              </Text>
            </View>
          )}
          {/* Branch Badge */}
          {item.branch && (
            <View style={{ marginLeft: 8, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: colors.muted, borderRadius: 4 }}>
              <Text style={{ fontSize: 11, color: colors.mutedForeground, fontWeight: 'bold' }}>{item.branch}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.subText, { color: colors.mutedForeground }]}>
          {item.subject} • {item.usageType === 'monthly' ? '월결제' : `잔여: ${(item.totalCount || 0) - (item.currentCount || 0)} (현재 ${item.currentCount} / 총 ${item.totalCount})`}
        </Text>
        <View style={styles.actionButtons}>
          {item.isPaymentNeeded && (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.destructive }]}
              onPress={() => promptPayment(item)}
            >
              <Text style={{ fontSize: 12, marginRight: 4 }}>💳</Text>
              <Text style={styles.btnTextWhite}>결제</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.secondary }]}
            onPress={() => openEditModal(item)}
          >
            <Text style={{ color: colors.secondaryForeground, fontSize: 12, fontWeight: '600' }}>수정</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: '#fee2e2' }]} // Soft Red background for delete btn
            onPress={() => promptDelete(item)}
          >
            <Text style={{ color: colors.destructive, fontSize: 12, fontWeight: '600' }}>삭제</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.rightInfo}>
        <Text style={[styles.pinText, { color: colors.primary }]}>No.{item.pinNumber}</Text>
        {item.lastPaymentDate && <Text style={[styles.dateText, { color: colors.mutedForeground }]}>{new Date(item.lastPaymentDate.seconds * 1000).toLocaleDateString()}</Text>}
      </View>
    </View>
  );

  return ( // ... Same layout ...
    <ResponsiveLayout>
      {({ isMobile }) => (
        <View style={[styles.container, { backgroundColor: colors.background }]}>

          <View style={[styles.header, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerLeft}>
              <Text style={{ fontSize: 24, color: colors.foreground }}>⬅️</Text>
            </TouchableOpacity>

            {/* Filter Tabs */}
            <View style={styles.filterTabs}>
              <TouchableOpacity onPress={() => setFilterBranch('ALL')} style={[styles.filterTab, filterBranch === 'ALL' && { backgroundColor: colors.chart3 }]}>
                <Text style={[styles.filterText, filterBranch === 'ALL' && { color: '#fff', fontWeight: 'bold' }]}>전체</Text>
              </TouchableOpacity>
              {branchList.map((b, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setFilterBranch(b)}
                  style={[styles.filterTab, filterBranch === b && { backgroundColor: colors.chart3 }]}
                >
                  <Text style={[styles.filterText, filterBranch === b && { color: '#fff', fontWeight: 'bold' }]}>{b}</Text>
                </TouchableOpacity>
              ))}
            </View>


            <TouchableOpacity
              onPress={() => navigation.navigate("StudentManagement")}
              style={[styles.newAddButton, { backgroundColor: colors.chart3 }]}
            >
              <Text style={styles.newAddButtonText}>+ 신규</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.contentBody, isMobile && styles.columnLayout]}>
            <View style={[
              styles.leftPanel,
              { backgroundColor: colors.card, borderColor: colors.border },
              isMobile && styles.mobileTopPanel
            ]}>
              <MiniCalendar
                selectedDate={selectedDate}
                onSelectDate={fetchDailyAttendance}
                onReset={handleReset}
                colors={colors}
              />
            </View>
            <View style={[styles.rightPanel, { backgroundColor: colors.background }]}>
              {viewMode === 'ALL' ? (
                <FlatList
                  data={students.filter(s => {
                    if (filterBranch === 'ALL') return true;
                    // Legacy Support: undefined/null branch treated as '2관'
                    const studentBranch = s.branch || '2관';
                    return studentBranch === filterBranch;
                  })}
                  renderItem={renderStudentItem}
                  keyExtractor={item => item.id}
                  contentContainerStyle={styles.listContainer}
                  ListEmptyComponent={<View style={styles.emptyBox}><Text style={{ color: colors.mutedForeground }}>등록된 학생이 없습니다.</Text></View>}
                />
              ) : ( // Daily View
                <View style={{ flex: 1 }}>
                  <View style={[styles.dailyHeaderBar, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.dailyHeaderTitle, { color: colors.foreground }]}>📅 {selectedDate} 명단</Text>
                  </View>
                  <FlatList
                    data={dailyAttendees}
                    renderItem={({ item }) => ( // Inline render for daily to save space
                      <View style={[styles.dailyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ fontSize: 24, marginRight: 10 }}>✅</Text>
                          <View>
                            <Text style={[styles.dailyName, { color: colors.foreground }]}>{item.name}</Text>
                            <Text style={[styles.dailyTime, { color: colors.mutedForeground }]}>
                              {(() => {
                                const t = item.timestamp;
                                const d = t && typeof t.toDate === 'function' ? t.toDate() : new Date(t.seconds ? t.seconds * 1000 : t);
                                return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                              })()}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.dailySubject, { color: colors.chart3 }]}>{item.subject}</Text>
                      </View>
                    )}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContainer}
                  />
                </View>
              )}
            </View>
          </View>

          {/* Reuse Modals... */}
          <Modal animationType="fade" transparent={true} visible={confirmModalVisible} onRequestClose={() => setConfirmModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>확인</Text>
                <Text style={[styles.confirmMessage, { color: colors.mutedForeground }]}>{confirmMessage}</Text>
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.secondary }]} onPress={() => setConfirmModalVisible(false)}>
                    <Text style={{ color: colors.secondaryForeground }}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: actionType === 'DELETE' ? colors.destructive : colors.chart2 }]}
                    onPress={handleConfirmAction}
                  >
                    <Text style={{ color: '#fff' }}>{actionType === 'DELETE' ? '삭제' : '확인'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          <Modal animationType="slide" transparent={true} visible={editModalVisible} onRequestClose={() => setEditModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>정보 수정</Text>

                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>이름</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.input }]} value={editName} onChangeText={setEditName} placeholder="이름" />

                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>수강 과목</Text>
                {/* Subject Dropdown Trigger */}
                <TouchableOpacity
                  style={[styles.input, { justifyContent: 'center', backgroundColor: colors.inputBackground, borderColor: colors.input }]}
                  onPress={() => setSubjectModalVisible(true)}
                >
                  <Text style={{ color: editSubject ? colors.foreground : colors.mutedForeground }}>{editSubject || "과목 선택"}</Text>
                </TouchableOpacity>

                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>출석번호 (4자리)</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.input }]} value={editPin} onChangeText={setEditPin} keyboardType="numeric" maxLength={4} placeholder="출석번호" />

                {/* Only show counts if NOT monthly */}
                {editingStudent?.usageType !== 'monthly' && (
                  <>
                    <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>총 횟수 / 현재 횟수</Text>
                    <View style={styles.row}>
                      <TextInput style={[styles.input, { flex: 1, marginRight: 5, backgroundColor: colors.inputBackground, borderColor: colors.input }]} value={editTotal} onChangeText={setEditTotal} keyboardType="numeric" placeholder="총 횟수" />
                      <TextInput style={[styles.input, { flex: 1, marginLeft: 5, backgroundColor: colors.inputBackground, borderColor: colors.input }]} value={editCurrent} onChangeText={setEditCurrent} keyboardType="numeric" placeholder="현재 횟수" />
                    </View>
                  </>
                )}

                <View style={styles.modalButtons}>
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.secondary }]} onPress={() => setEditModalVisible(false)}>
                    <Text style={{ color: colors.secondaryForeground }}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.chart3 }]} onPress={handleUpdate}>
                    <Text style={{ color: '#fff' }}>저장</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Subject Selection Modal */}
          <Modal animationType="slide" transparent={true} visible={subjectModalVisible} onRequestClose={() => setSubjectModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: colors.card, maxHeight: 400 }]}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>과목 변경</Text>
                <FlatList
                  data={subjectList}
                  keyExtractor={(item, index) => index.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={{ padding: 15, borderBottomWidth: 1, borderColor: colors.border }}
                      onPress={() => {
                        setEditSubject(item);
                        setSubjectModalVisible(false);
                      }}
                    >
                      <Text style={{ fontSize: 16, color: colors.foreground }}>{item}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={<Text style={{ padding: 20, textAlign: 'center', color: colors.mutedForeground }}>등록된 과목이 없습니다.</Text>}
                />
                <TouchableOpacity
                  style={{ padding: 15, alignItems: 'center', marginTop: 10 }}
                  onPress={() => setSubjectModalVisible(false)}
                >
                  <Text style={{ color: colors.destructive, fontWeight: 'bold' }}>닫기</Text>
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
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, height: 60, borderBottomWidth: 1, justifyContent: 'space-between' },
  headerLeft: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  newAddButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  newAddButtonText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

  contentBody: { flex: 1, flexDirection: 'row' },
  columnLayout: { flexDirection: 'column' },
  leftPanel: { width: 320, borderRightWidth: 1, padding: 20 },
  mobileTopPanel: { width: '100%', borderRightWidth: 0, borderBottomWidth: 1 },
  rightPanel: { flex: 1 },

  calendarContainer: { alignItems: 'center' },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 15, alignItems: 'center' },
  calTitle: { fontSize: 16, fontWeight: 'bold' },
  iconBtn: { padding: 5 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 8 },
  weekText: { width: 32, textAlign: 'center', fontWeight: 'bold', fontSize: 12 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', width: '100%' },
  dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  dayText: { fontSize: 14 },
  resetButton: { flexDirection: 'row', marginTop: 20, padding: 10, borderRadius: 8, width: '100%', justifyContent: 'center', alignItems: 'center' },
  resetText: { fontWeight: 'bold', fontSize: 14 },

  listContainer: { padding: 15 },
  emptyBox: { alignItems: 'center', marginTop: 50 },

  card: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderWidth: 1,
    backgroundColor: '#fff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  infoContainer: { flex: 1, marginRight: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  name: { fontSize: 16, fontWeight: 'bold', marginRight: 8 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  subText: { fontSize: 13, marginBottom: 12 },
  actionButtons: { flexDirection: 'row', gap: 8 },
  btn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  btnTextWhite: { color: 'white', fontSize: 12, fontWeight: 'bold' },

  rightInfo: { alignItems: 'flex-end', justifyContent: 'space-between', height: '100%' },
  pinText: { fontSize: 14, fontWeight: 'bold' },
  dateText: { fontSize: 11, marginTop: 4 },

  dailyHeaderBar: { padding: 10, borderRadius: 8, margin: 10 },
  dailyHeaderTitle: { fontWeight: 'bold' },
  dailyCard: { padding: 16, borderRadius: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1 },
  dailyName: { fontSize: 16, fontWeight: 'bold' },
  dailyTime: { fontSize: 12 },
  dailySubject: { fontSize: 14, fontWeight: '600' },


  filterTabs: { flexDirection: 'row', backgroundColor: '#f0f0f0', borderRadius: 20, padding: 4, gap: 4 },
  filterTab: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 },
  filterText: { fontSize: 13, fontWeight: '600', color: '#666' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxWidth: 360, borderRadius: 20, padding: 24, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  confirmMessage: { fontSize: 16, textAlign: 'center', marginBottom: 25 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12, width: '100%' },
  row: { flexDirection: 'row' },
  modalButtons: { flexDirection: 'row', marginTop: 10, gap: 10 },
  modalBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  inputLabel: { fontSize: 13, fontWeight: 'bold', marginBottom: 6, marginLeft: 4 }
});