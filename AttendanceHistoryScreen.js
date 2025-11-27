import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity } from 'react-native';
import { db } from './firebaseConfig';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

export default function AttendanceHistoryScreen({ navigation }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    // 최근 날짜가 위로 오게 정렬 (desc)
    const q = query(collection(db, "attendance"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // 날짜 객체로 변환 (화면에 예쁘게 보여주기 위해)
        dateObj: doc.data().timestamp.toDate() 
      }));
      setHistory(list);
    });
    return () => unsubscribe();
  }, []);

  const renderItem = ({ item }) => {
    // 날짜 포맷 (예: 11월 26일 15:30)
    const dateStr = `${item.dateObj.getMonth()+1}월 ${item.dateObj.getDate()}일`;
    const timeStr = `${item.dateObj.getHours()}:${item.dateObj.getMinutes().toString().padStart(2,'0')}`;

    return (
      <View style={styles.row}>
        <View style={styles.leftInfo}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.pin}>({item.pinNumber})</Text>
        </View>
        <View style={styles.rightInfo}>
          <Text style={styles.date}>{dateStr}</Text>
          <Text style={styles.time}>{timeStr}</Text>
          <Text style={styles.typeBadge}>출석완료</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📋 출석 기록</Text>
        <View style={{width: 28}} /> 
      </View>

      <FlatList
        data={history}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>기록이 없습니다.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee'
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  list: { padding: 20 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', padding: 15, marginBottom: 10, borderRadius: 10,
    shadowColor: "#000", shadowOpacity: 0.05, elevation: 1
  },
  leftInfo: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: 'bold', marginRight: 5 },
  pin: { color: '#888', fontSize: 14 },
  rightInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  date: { color: '#555' },
  time: { fontWeight: 'bold', color: '#333' },
  typeBadge: { backgroundColor: '#E8F5E9', color: '#2E7D32', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5, fontSize: 12, overflow: 'hidden' },
  empty: { textAlign: 'center', marginTop: 50, color: '#aaa' }
});