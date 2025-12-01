import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform, FlatList } from 'react-native';
import { db } from './firebaseConfig';
import { collection, query, where, getDocs, onSnapshot, orderBy } from 'firebase/firestore';
import { ResponsiveLayout } from './ResponsiveHandler'; // 반응형 레이아웃 컴포넌트

// 아이콘 (Expo 환경 가정)
import { Ionicons } from '@expo/vector-icons'; 

// 날짜 포맷팅 함수
const formatDate = (timestamp) => {
  if (!timestamp) return '-';
  // Firestore Timestamp 처리
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = date.getHours();
  const min = String(date.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? '오후' : '오전';
  const hour = h % 12 || 12;
  
  return `${y}-${m}-${d} ${ampm} ${hour}:${min}`;
};

// ==========================================================
// Main Component
// ==========================================================

export default function AttendanceHistoryScreen() {
  const [loading, setLoading] = useState(true);
  const [allStudents, setAllStudents] = useState([]); // 학생 정보 매핑용
  const [attendanceRecords, setAttendanceRecords] = useState([]); // DB 원본 기록
  
  // 필터 상태
  const [searchName, setSearchName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 1. 학생 명단 먼저 로드 (이름 매칭 및 잔여 횟수 계산용)
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const q = query(collection(db, 'students'));
        const snapshot = await getDocs(q);
        const students = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAllStudents(students);
      } catch (error) {
        console.error("학생 명단 로드 실패:", error);
      }
    };
    fetchStudents();
  }, []);

  // 2. 출석 기록 실시간 리스너
  useEffect(() => {
    // 기본적으로 최근 순으로 정렬
    const q = query(collection(db, 'attendance'), orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAttendanceRecords(records);
      setLoading(false);
    }, (error) => {
      console.error("출석 기록 로드 실패:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 3. 데이터 가공 및 필터링 (메모이제이션)
  const filteredData = useMemo(() => {
    let data = attendanceRecords.map(record => {
      // 학생 정보 매칭
      const student = allStudents.find(s => s.id === record.studentId) || {};
      
      // 현재 상태 계산
      const total = student.totalCount || 0;
      const current = student.currentCount || 0;
      const remaining = total - current;
      
      return {
        ...record,
        studentName: student.name || record.name || '알 수 없음', // 학생 DB 이름 우선
        studentSubject: student.subject || record.subject || '-',
        currentCount: current,
        totalCount: total,
        remaining: remaining,
        lastPaymentDate: student.lastPaymentDate 
      };
    });

    // 필터: 이름
    if (searchName) {
      data = data.filter(item => item.studentName.includes(searchName));
    }

    // 필터: 날짜 (YYYY-MM-DD 문자열 비교)
    if (startDate) {
      data = data.filter(item => {
        const itemDate = formatDate(item.timestamp).split(' ')[0];
        return itemDate >= startDate;
      });
    }
    if (endDate) {
      data = data.filter(item => {
        const itemDate = formatDate(item.timestamp).split(' ')[0];
        return itemDate <= endDate;
      });
    }

    return data;
  }, [attendanceRecords, allStudents, searchName, startDate, endDate]);

  // 필터 초기화
  const clearFilters = () => {
    setSearchName('');
    setStartDate('');
    setEndDate('');
  };

  // ----------------------------------------------------
  // UI Components
  // ----------------------------------------------------

  const FilterSection = () => (
    <View style={styles.filterContainer}>
      <Text style={styles.sectionTitle}>검색 및 필터</Text>
      <View style={styles.filterRow}>
        <TextInput 
          style={styles.input} 
          placeholder="학생 이름 검색" 
          value={searchName}
          onChangeText={setSearchName}
        />
        <TextInput 
          style={styles.input} 
          placeholder="시작일 (2025-01-01)" 
          value={startDate}
          onChangeText={setStartDate}
        />
        <TextInput 
          style={styles.input} 
          placeholder="종료일 (2025-12-31)" 
          value={endDate}
          onChangeText={setEndDate}
        />
        <TouchableOpacity style={styles.resetBtn} onPress={clearFilters}>
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.resetBtnText}>초기화</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // 모바일용 카드 아이템
  const RenderMobileItem = ({ item }) => {
    // 상태에 따른 스타일
    const isExhausted = item.remaining <= 0;
    const isLow = item.remaining <= 2 && item.remaining > 0;
    
    let statusColor = '#e6ffe6'; // 정상 (초록 배경)
    let statusBorder = '#4CAF50';
    let statusText = '정상';

    if (isExhausted) {
      statusColor = '#ffe6e6'; // 소진 (빨강)
      statusBorder = '#dc3545';
      statusText = '소진됨';
    } else if (isLow) {
      statusColor = '#fffbe6'; // 임박 (노랑)
      statusBorder = '#ffc107';
      statusText = '마감임박';
    }

    return (
      <View style={[styles.card, { borderLeftColor: statusBorder, borderLeftWidth: 5 }]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardName}>{item.studentName}</Text>
          <View style={[styles.badge, { backgroundColor: statusColor, borderColor: statusBorder }]}>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#333' }}>{statusText}</Text>
          </View>
        </View>
        <Text style={styles.cardSubject}>{item.studentSubject}</Text>
        <View style={styles.divider} />
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>출석 일시:</Text>
          <Text style={styles.cardValue}>{formatDate(item.timestamp)}</Text>
        </View>
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>이용 현황:</Text>
          <Text style={styles.cardValue}>
            {item.currentCount} / {item.totalCount}회 (잔여 {item.remaining}회)
          </Text>
        </View>
      </View>
    );
  };

  // PC용 테이블 헤더
  const TableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.th, { flex: 2 }]}>출석 일시</Text>
      <Text style={[styles.th, { flex: 1 }]}>이름</Text>
      <Text style={[styles.th, { flex: 1.5 }]}>과목</Text>
      <Text style={[styles.th, { flex: 2 }]}>이용 현황 (현재/총)</Text>
      <Text style={[styles.th, { flex: 1 }]}>잔여 횟수</Text>
      <Text style={[styles.th, { flex: 1 }]}>상태</Text>
    </View>
  );

  // PC용 테이블 로우
  const RenderDesktopItem = ({ item }) => {
    const isExhausted = item.remaining <= 0;
    const isLow = item.remaining <= 2 && item.remaining > 0;
    const statusText = isExhausted ? '소진' : isLow ? '임박' : '이용중';
    const statusColor = isExhausted ? '#dc3545' : isLow ? '#ffc107' : '#28a745';

    return (
      <View style={styles.tableRow}>
        <Text style={[styles.td, { flex: 2 }]}>{formatDate(item.timestamp)}</Text>
        <Text style={[styles.td, { flex: 1, fontWeight: 'bold' }]}>{item.studentName}</Text>
        <Text style={[styles.td, { flex: 1.5 }]}>{item.studentSubject}</Text>
        <Text style={[styles.td, { flex: 2 }]}>{item.currentCount}회 / {item.totalCount}회</Text>
        <Text style={[styles.td, { flex: 1 }]}>{item.remaining}회</Text>
        <Text style={[styles.td, { flex: 1, color: statusColor, fontWeight: 'bold' }]}>{statusText}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={{ marginTop: 10 }}>데이터 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <ResponsiveLayout>
      {({ isMobile }) => (
        <View style={styles.container}>
          <Text style={styles.pageTitle}>📊 출석 기록 조회</Text>
          
          <FilterSection />

          <View style={styles.listContainer}>
            {filteredData.length === 0 ? (
              <View style={styles.center}>
                <Ionicons name="documents-outline" size={48} color="#ccc" />
                <Text style={styles.noData}>조회된 기록이 없습니다.</Text>
              </View>
            ) : (
              isMobile ? (
                <FlatList
                  data={filteredData}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => <RenderMobileItem item={item} />}
                  contentContainerStyle={{ paddingBottom: 20 }}
                />
              ) : (
                <View style={styles.tableContainer}>
                  <TableHeader />
                  <FlatList
                    data={filteredData}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => <RenderDesktopItem item={item} />}
                  />
                </View>
              )
            )}
          </View>
        </View>
      )}
    </ResponsiveLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8f9fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pageTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  
  // Filter Styles
  filterContainer: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10, color: '#555' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  input: { flex: 1, minWidth: 120, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, backgroundColor: '#fff' },
  resetBtn: { backgroundColor: '#6c757d', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  resetBtnText: { color: '#fff', marginLeft: 5, fontWeight: 'bold' },

  // List Container
  listContainer: { flex: 1 },
  noData: { marginTop: 10, color: '#999', fontSize: 16 },

  // Mobile Card Styles
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  cardSubject: { fontSize: 14, color: '#666', marginBottom: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 8 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  cardLabel: { fontSize: 14, color: '#888' },
  cardValue: { fontSize: 14, color: '#333', fontWeight: '500' },

  // Desktop Table Styles
  tableContainer: { flex: 1, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#eee', overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f1f3f5', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#ddd' },
  th: { textAlign: 'center', fontWeight: 'bold', color: '#555', fontSize: 14 },
  tableRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', alignItems: 'center' },
  td: { textAlign: 'center', color: '#333', fontSize: 14 },
});