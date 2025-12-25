import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView, Modal, Platform } from 'react-native';
import { db, auth } from './firebaseConfig';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { ResponsiveLayout } from './ResponsiveHandler';
import { theme } from './Theme';

export default function StudentManagementScreen({ navigation }) {
  const colors = theme.light; // Force Light Mode
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [subject, setSubject] = useState('');
  const [tuitionFee, setTuitionFee] = useState(''); // New State for Fee
  const [usageType, setUsageType] = useState('session'); // 'session' (회차) or 'monthly' (월결제)
  const [count, setCount] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [subjectList, setSubjectList] = useState([]); // Stores objects {name, fee} or strings

  // Default fallback if nothing is set
  const DEFAULT_SUBJECTS = ["피아노", "드럼", "보컬", "기타", "베이스"];

  React.useEffect(() => {
    const fetchSubjects = async () => {
      if (!auth.currentUser) return;
      try {
        const { doc, getDoc } = require('firebase/firestore'); // Lazy import if needed or use existing
        const docRef = doc(db, "users", auth.currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().subjects && docSnap.data().subjects.length > 0) {
          // Normalize to objects { name, fee }
          const rawSubjects = docSnap.data().subjects;
          const processedSubjects = rawSubjects.map(sub => {
            if (typeof sub === 'object' && sub !== null) return sub;
            return { name: sub, fee: '' };
          });
          setSubjectList(processedSubjects);
        } else {
          setSubjectList([]);
        }
      } catch (e) {
        console.error("Failed to load subjects", e);
      }
    };
    fetchSubjects();
  }, []);

  const handleSubjectSelect = (item) => {
    setSubject(item.name);
    if (item.fee) {
      setTuitionFee(item.fee);
    }
    setModalVisible(false);
  };

  const handleSave = async () => {
    if (!name || !contact || !subject) {
      const msg = "필수 정보를 입력해주세요.";
      Platform.OS === 'web' ? alert(msg) : Alert.alert("알림", msg);
      return;
    }
    // ... validation logic ...

    // ... (rest of validation)

    // ... 

    // Auto-fill fee check? No, optional.

    try {
      // ... existing pin generation ... 
      const pinNumber = contact.replace(/[^0-9]/g, "").slice(-4);
      if (pinNumber.length < 4) {
        // ... alert ...
        const msg = "연락처를 정확히 입력해주세요.";
        Platform.OS === 'web' ? alert(msg) : Alert.alert("알림", msg);
        return;
      }

      if (usageType === 'session' && !count) {
        const msg = "등록 횟수를 입력해주세요.";
        Platform.OS === 'web' ? alert(msg) : Alert.alert("알림", msg);
        return;
      }


      await addDoc(collection(db, "students"), {
        userId: auth.currentUser.uid,
        name: name,
        contact: contact,
        pinNumber: pinNumber,
        regDate: date,
        subject: subject,
        tuitionFee: tuitionFee.replace(/[^0-9]/g, ''), // Save pure number
        usageType: usageType,
        totalCount: usageType === 'session' ? parseInt(count) : 0,
        currentCount: 0,
        createdAt: new Date(),
        lastPaymentDate: new Date()
      });

      // ... success handling
      const successMsg = `✅ 저장 완료\n${name} 학생 등록 (출석번호: ${pinNumber})`;
      if (Platform.OS === 'web') {
        setTimeout(() => { alert(successMsg); navigation.goBack(); }, 100);
      } else {
        Alert.alert("성공", successMsg, [{ text: "확인", onPress: () => navigation.goBack() }]);
      }

    } catch (error) {
      // ... error handling
      console.error("저장 실패:", error);
      Alert.alert("오류", "저장 실패");
    }
  };

  return (
    <ResponsiveLayout>
      {({ isMobile }) => (
        <View style={[styles.container, { backgroundColor: colors.background }]}>

          <View style={[styles.header, { borderColor: colors.border }]}>
            {/* ... header ... */}
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
              <Ionicons name="arrow-back" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>신규 학생 등록</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formContainer}>
              {/* ... Name, Contact, Date fields similar to before ... */}
              <Text style={[styles.label, { color: colors.mutedForeground }]}>이름</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border }]}
                placeholder="예: 홍길동"
                placeholderTextColor={colors.mutedForeground}
                value={name}
                onChangeText={setName}
              />

              <Text style={[styles.label, { color: colors.mutedForeground }]}>연락처 (자동으로 출석번호 생성)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border }]}
                placeholder="예: 010-1234-5678"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="phone-pad"
                value={contact}
                onChangeText={setContact}
              />

              <Text style={[styles.label, { color: colors.mutedForeground }]}>등록일</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.mutedForeground}
                value={date}
                onChangeText={setDate}
              />

              {/* Subject & Fee Row */}
              <Text style={[styles.label, { color: colors.mutedForeground }]}>수강 과목 및 수업료</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={[styles.dropdownButton, { flex: 1.5, backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => setModalVisible(true)}
                >
                  <Text style={[styles.dropdownText, { color: subject ? colors.foreground : colors.mutedForeground }]}>
                    {subject || "과목 선택"}
                  </Text>
                </TouchableOpacity>

                <TextInput
                  style={[styles.input, { flex: 1, backgroundColor: colors.card, borderColor: colors.border }]}
                  placeholder="수업료 (원)"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numeric"
                  value={tuitionFee}
                  onChangeText={setTuitionFee}
                />
              </View>

              <Text style={[styles.label, { color: colors.mutedForeground }]}>수강 방식</Text>
              {/* ... Usage Type ... */}
              <View style={styles.typeContainer}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    usageType === 'session' ? { backgroundColor: colors.chart3, borderColor: colors.chart3 } : { backgroundColor: colors.card, borderColor: colors.border }
                  ]}
                  onPress={() => setUsageType('session')}
                >
                  <Text style={[styles.typeText, { color: usageType === 'session' ? '#fff' : colors.mutedForeground }]}>회차제</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    usageType === 'monthly' ? { backgroundColor: colors.chart3, borderColor: colors.chart3 } : { backgroundColor: colors.card, borderColor: colors.border }
                  ]}
                  onPress={() => setUsageType('monthly')}
                >
                  <Text style={[styles.typeText, { color: usageType === 'monthly' ? '#fff' : colors.mutedForeground }]}>월결제</Text>
                </TouchableOpacity>
              </View>

              {usageType === 'session' && (
                <View>
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>등록 횟수</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border }]}
                    placeholder="예: 8"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric"
                    value={count}
                    onChangeText={setCount}
                  />
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: colors.chart3, shadowColor: colors.chart3 }
              ]}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>저장하기</Text>
            </TouchableOpacity>
          </ScrollView>

          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>과목 선택</Text>
                <ScrollView style={{ maxHeight: 300 }}>
                  {subjectList.length > 0 ? (
                    subjectList.map((item, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[styles.modalItem, { borderColor: colors.border }]}
                        onPress={() => handleSubjectSelect(item)}
                      >
                        <Text style={[styles.modalItemText, { color: colors.foreground }]}>{item.name}</Text>
                        {subject === item.name && <Ionicons name="checkmark" size={20} color={colors.chart3} />}
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                      {/* ... empty ... */}
                      <Text style={{ color: colors.mutedForeground, textAlign: 'center', marginBottom: 20 }}>
                        등록된 과목이 없습니다.{'\n'}정보 수정 메뉴에서 과목을 추가해주세요.
                      </Text>
                      <TouchableOpacity
                        style={{ padding: 10, backgroundColor: colors.muted, borderRadius: 8 }}
                        onPress={() => {
                          setModalVisible(false);
                        }}
                      >
                        <Text style={{ color: colors.foreground }}>닫기</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>
                <TouchableOpacity style={styles.modalCloseButton} onPress={() => setModalVisible(false)}>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    height: 60
  },
  headerBtn: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },

  scrollContent: {
    padding: 20,
    paddingBottom: 50,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center'
  },

  formContainer: { width: '100%', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  input: { width: '100%', height: 50, borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, fontSize: 16 },

  dropdownButton: { width: '100%', height: 50, borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownText: { fontSize: 16 },

  saveButton: { width: '100%', height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 32, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, elevation: 4 },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', maxWidth: 350, borderRadius: 20, padding: 24, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  modalItem: { paddingVertical: 16, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalItemText: { fontSize: 16 },
  modalItemText: { fontSize: 16 },
  modalCloseButton: { marginTop: 24, alignItems: 'center', padding: 10 },

  typeContainer: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  typeButton: { flex: 1, paddingVertical: 12, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  typeText: { fontSize: 16, fontWeight: 'bold' },
});