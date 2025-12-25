import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert, useWindowDimensions } from 'react-native';
import { db, auth } from './firebaseConfig';
import { collection, query, where, orderBy, onSnapshot, addDoc, deleteDoc, doc, getDoc, updateDoc, Timestamp, increment } from 'firebase/firestore';
import { ResponsiveLayout, useResponsive } from './ResponsiveHandler';
import { theme } from './Theme';
// import { Ionicons } from '@expo/vector-icons'; // Removed for stability

const SUBJECT_ORDER = ["피아노", "드럼", "보컬", "기타", "베이스", "미디", "작곡", "시창청음", "댄스"];
const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getDayOfWeek = (year, month, day) => new Date(year, month, day).getDay();

// 📐 Dimensions
export default function AttendanceHistoryScreen({ navigation }) {
  const colors = theme.light;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterBranch, setFilterBranch] = useState('ALL');
  const [branchList, setBranchList] = useState(['1관', '2관']); // Default
  const [loading, setLoading] = useState(true);

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

  // Ref for Auto-Scroll
  const scrollRef = React.useRef(null);
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const { isMobile } = useResponsive() || { isMobile: true };

  // 📐 Dimensions - Dynamic based on screen mode
  const CELL_WIDTH = isMobile ? 34 : 40; // Wider cells on Desktop
  const LEFT_COL_WIDTH = 85;

  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [groupedStudents, setGroupedStudents] = useState({});
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [sortBy, setSortBy] = useState('name');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Auto-Scroll Effect
  useEffect(() => {
    if (scrollRef.current && !loading) {
      const today = new Date();
      // Only scroll if looking at current month
      if (today.getFullYear() === year && today.getMonth() === month) {
        const day = today.getDate();
        // Calculate position to center today: (DayIndex * CellWidth) - (HalfScreen) + (LeftColOffset)
        let x = (day - 1) * CELL_WIDTH - (SCREEN_WIDTH / 2) + (LEFT_COL_WIDTH) + (CELL_WIDTH / 2);
        if (x < 0) x = 0;
        setTimeout(() => {
          scrollRef.current?.scrollTo({ x: x, animated: true });
        }, 500); // Small delay to ensure render
      }
    }
  }, [loading, year, month]);

  useEffect(() => {
    setLoading(true);
    let unsubscribeStudents = () => { };

    // Listen for Auth Changes to ensure we have a user before querying
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      // 1. Cleanup previous listener immediately when auth state changes
      unsubscribeStudents();

      if (!user) {
        setLoading(false);
        setStudents([]);
        setGroupedStudents({});
        setExpandedSubjects({});
        return;
      }

      // 2. Setup new listener for the current user
      const q = query(collection(db, "students"), where("userId", "==", user.uid), orderBy("name"));
      unsubscribeStudents = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setStudents(list);

        const groups = {};
        const initialExpanded = {};

        list.forEach(s => {
          let subj = s.subject || '기타';
          if (s.studentStatus === 'break') subj = '💤 휴원생';
          if (!groups[subj]) groups[subj] = [];
          groups[subj].push(s);
          initialExpanded[subj] = true;
        });

        setGroupedStudents(groups);
        setExpandedSubjects(prev => Object.keys(prev).length === 0 ? initialExpanded : prev);
        setLoading(false); // Students loaded
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

  useEffect(() => {
    setLoading(true);
    let unsubscribeAttendance = () => { };

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      unsubscribeAttendance(); // Cleanup previous listener

      if (!user) {
        setLoading(false);
        setAttendanceMap({});
        return;
      }

      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59, 59);

      // 2. 내 출석 기록만 가져오기
      const q = query(
        collection(db, "attendance"),
        where("userId", "==", user.uid),
        where("timestamp", ">=", start),
        where("timestamp", "<=", end)
      );

      unsubscribeAttendance = onSnapshot(q, (snapshot) => {
        const newMap = {};
        snapshot.forEach(doc => {
          const data = doc.data();
          const sid = data.studentId;
          const timestamp = data.timestamp;
          const dateObj = timestamp && typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
          const date = dateObj.getDate();
          const status = data.status || 'present';

          if (!newMap[sid]) newMap[sid] = {};
          newMap[sid][date] = { id: doc.id, status: status };
        });
        setAttendanceMap(newMap);
        setLoading(false);
      }, (error) => {
        console.error("Attendance Query Error:", error);
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      unsubscribeAttendance();
    };
  }, [year, month]);

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const toggleSubject = (subject) => setExpandedSubjects(prev => ({ ...prev, [subject]: !prev[subject] }));
  const toggleSortMode = () => setSortBy(prev => prev === 'name' ? 'regDate' : 'name');

  const sortSubjects = (subjects) => {
    return subjects.sort((a, b) => {
      if (a === '💤 휴원생') return 1;
      if (b === '💤 휴원생') return -1;
      const idxA = SUBJECT_ORDER.indexOf(a);
      const idxB = SUBJECT_ORDER.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  };

  const handleCellPress = async (student, day) => {
    if (student.studentStatus === 'break') {
      Alert.alert("알림", "휴원생은 출석 체크 불가");
      return;
    }
    const record = attendanceMap[student.id]?.[day];

    if (!record) {
      try {
        const targetDate = new Date(year, month, day, 12, 0, 0);
        await addDoc(collection(db, "attendance"), {
          userId: auth.currentUser.uid, // 🔑 Private Data
          studentId: student.id,
          name: student.name,
          subject: student.subject,
          timestamp: Timestamp.fromDate(targetDate),
          status: 'absent'
        });
        // 🔥 Sync: Increment Student Count
        await updateDoc(doc(db, "students", student.id), {
          currentCount: increment(1)
        });
      } catch (e) { Alert.alert("오류", "기록 실패"); }
    } else if (record.status === 'absent') {
      try {
        await updateDoc(doc(db, "attendance", record.id), { status: 'present' });
      } catch (e) { Alert.alert("오류", "수정 실패"); }
    } else if (record.status === 'present') {
      try {
        await updateDoc(doc(db, "attendance", record.id), { status: 'makeup' });
      } catch (e) { Alert.alert("오류", "수정 실패"); }
    } else {
      try {
        await deleteDoc(doc(db, "attendance", record.id));
        // 🔥 Sync: Decrement Student Count
        await updateDoc(doc(db, "students", student.id), {
          currentCount: increment(-1)
        });
      } catch (e) { Alert.alert("오류", "삭제 실패"); }
    }
  };

  const handleNameLongPress = (student) => {
    const isBreak = student.studentStatus === 'break';
    const actionText = isBreak ? "복귀" : "휴원";
    Alert.alert(
      `${student.name} 학생 관리`,
      `${actionText} 처리를 하시겠습니까?`,
      [
        { text: "취소", style: "cancel" },
        {
          text: actionText,
          onPress: async () => {
            try {
              await updateDoc(doc(db, "students", student.id), {
                studentStatus: isBreak ? 'active' : 'break'
              });
            } catch (e) { Alert.alert("오류", "상태 변경 실패"); }
          }
        }
      ]
    );
  };

  if (loading && students.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.chart3} />
      </View>
    );
  }

  return (
    <ResponsiveLayout>
      {({ isMobile }) => (
        <View style={[styles.container, { backgroundColor: colors.background }]}>

          <View style={[styles.topHeader, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
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
              onPress={toggleSortMode}
              style={[styles.sortBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            >
              <Text style={{ fontSize: 13, color: colors.secondaryForeground, fontWeight: 'bold' }}>
                {sortBy === 'name' ? '가나다순 ⬇' : '등록일순 ⬇'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.monthHeader, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn}>
              <Text style={{ fontSize: 24, color: colors.mutedForeground }}>◀️</Text>
            </TouchableOpacity>
            <Text style={[styles.monthTitle, { color: colors.chart3 }]}>{year}년 {month + 1}월</Text>
            <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
              <Text style={{ fontSize: 24, color: colors.mutedForeground }}>▶️</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.verticalScroll} contentContainerStyle={{ paddingBottom: 50 }}>
            {sortSubjects(Object.keys(groupedStudents)).map((subject) => {
              const isExpanded = expandedSubjects[subject];

              let studentList = [...groupedStudents[subject]];

              // Filter by Branch
              studentList = studentList.filter(s => {
                if (filterBranch === 'ALL') return true;
                const studentBranch = s.branch || '2관';
                return studentBranch === filterBranch;
              });

              if (studentList.length === 0) return null; // Hide subject if no students match

              if (sortBy === 'name') {
                studentList.sort((a, b) => a.name.localeCompare(b.name));
              } else {
                studentList.sort((a, b) => (a.regDate || '').localeCompare(b.regDate || ''));
              }

              const isBreakGroup = subject === '💤 휴원생';

              return (
                <View key={subject} style={[styles.card, { backgroundColor: isBreakGroup ? colors.muted : colors.card, borderColor: colors.border }]}>

                  <TouchableOpacity
                    style={[
                      styles.subjectHeader,
                      { backgroundColor: isBreakGroup ? colors.inputBackground : colors.accent, borderColor: colors.border },
                      !isExpanded && { borderBottomWidth: 0, backgroundColor: colors.card }
                    ]}
                    onPress={() => toggleSubject(subject)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.subjectTitle, { color: isBreakGroup ? colors.mutedForeground : colors.chart3 }]}>
                      {isExpanded ? '▼' : '▶'}  🎵 {subject} <Text style={{ fontSize: 14, color: colors.mutedForeground, fontWeight: 'normal' }}>({studentList.length}명)</Text>
                    </Text>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.tableWrapper}>

                      <View style={[styles.leftColumn, { width: LEFT_COL_WIDTH, backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.cell, { backgroundColor: colors.secondary, height: 40 }]}>
                          <Text style={{ fontWeight: 'bold', color: colors.mutedForeground, fontSize: 12 }}>
                            {sortBy === 'name' ? '이름' : '등록일'}
                          </Text>
                        </View>
                        {studentList.map((student) => {
                          const records = Object.values(attendanceMap[student.id] || {});
                          // Update: Count 'makeup' as present
                          const presentCount = records.filter(r => r.status === 'present' || r.status === 'makeup').length;
                          const absentCount = records.filter(r => r.status === 'absent').length;

                          return (
                            <TouchableOpacity
                              key={student.id}
                              style={[styles.cell, { borderColor: colors.border }]}
                              onLongPress={() => handleNameLongPress(student)}
                              delayLongPress={500}
                            >
                              <Text style={[
                                styles.nameText,
                                { color: colors.foreground },
                                isBreakGroup && { textDecorationLine: 'line-through', color: colors.mutedForeground }
                              ]} numberOfLines={1}>
                                {student.name} <Text style={{ fontSize: 10, color: colors.mutedForeground, fontWeight: 'normal' }}>{student.branch ? `(${student.branch})` : ''}</Text>
                              </Text>

                              <View style={styles.countRow}>
                                <Text style={{ fontSize: 10, color: colors.chart2, fontWeight: 'bold' }}>출석 {presentCount}</Text>
                                <Text style={{ fontSize: 10, color: colors.destructive, fontWeight: 'bold' }}>결석 {absentCount}</Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.rightScroll}
                        ref={scrollRef} // 🔥 Auto-Scroll Ref
                      >
                        <View>
                          <View style={styles.row}>
                            {daysArray.map(day => {
                              const dayOfWeek = getDayOfWeek(year, month, day);
                              const isSat = dayOfWeek === 6;
                              const isSun = dayOfWeek === 0;

                              return (
                                <View key={day} style={[styles.dateCell, { width: CELL_WIDTH, backgroundColor: colors.secondary }]}>
                                  <Text style={[
                                    styles.dateText,
                                    isSat && { color: colors.chart3 }, // Blue for Sat
                                    isSun && { color: colors.destructive }, // Red for Sun
                                    !isSat && !isSun && { color: colors.mutedForeground }
                                  ]}>
                                    {day}
                                  </Text>
                                </View>
                              );
                            })}
                          </View>

                          {studentList.map((student) => (
                            <View key={student.id} style={styles.row}>
                              {daysArray.map(day => {
                                const record = attendanceMap[student.id]?.[day];
                                const status = record?.status;

                                return (
                                  <TouchableOpacity
                                    key={day}
                                    style={[
                                      styles.checkCell,
                                      { width: CELL_WIDTH, borderColor: colors.border },
                                      isBreakGroup && { backgroundColor: colors.muted }
                                    ]}
                                    onPress={() => handleCellPress(student, day)}
                                  >
                                    {status === 'present' ? (
                                      <View style={[styles.dot, { backgroundColor: colors.chart2 }]} /> // Teal Dot
                                    ) : status === 'absent' ? (
                                      <Text style={{ color: colors.destructive, fontWeight: 'bold', fontSize: 14 }}>결</Text>
                                    ) : status === 'makeup' ? (
                                      <View style={[styles.dot, { backgroundColor: '#FFA500', justifyContent: 'center', alignItems: 'center', width: 24, height: 24, borderRadius: 12 }]}>
                                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>보</Text>
                                      </View>
                                    ) : null}
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          ))}
                        </View>
                      </ScrollView>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}
    </ResponsiveLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  topHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 15, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 5 },
  screenTitle: { fontSize: 18, fontWeight: 'bold' },

  sortBtn: {
    paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: 8, borderWidth: 1
  },

  monthHeader: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 15, marginBottom: 10,
    borderBottomWidth: 1, elevation: 1
  },
  monthTitle: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 20 },
  navBtn: { padding: 10 },

  verticalScroll: { flex: 1, padding: 10 },
  card: { marginBottom: 16, borderRadius: 12, overflow: 'hidden', borderWidth: 1 },

  subjectHeader: { padding: 16, borderBottomWidth: 1 },
  subjectTitle: { fontSize: 16, fontWeight: 'bold' },

  tableWrapper: { flexDirection: 'row' },
  leftColumn: { borderRightWidth: 1, zIndex: 10 }, // Width removed (handled inline)
  rightScroll: { flex: 1 },
  row: { flexDirection: 'row' },

  cell: { height: 50, justifyContent: 'center', paddingLeft: 10, borderBottomWidth: 1 },
  nameText: { fontSize: 13, fontWeight: 'bold' },

  countRow: { flexDirection: 'row', marginTop: 2, gap: 5 },

  // Widths removed (handled inline)
  dateCell: { height: 40, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderColor: 'transparent' },
  dateText: { fontSize: 12, fontWeight: 'bold' },

  checkCell: { height: 50, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderBottomWidth: 1 },

  dot: { width: 14, height: 14, borderRadius: 7 },

  filterTabs: { flexDirection: 'row', backgroundColor: '#f0f0f0', borderRadius: 20, padding: 4, gap: 4 },
  filterTab: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 },
  filterText: { fontSize: 13, fontWeight: '600', color: '#666' },
});