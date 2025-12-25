import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, Platform, useWindowDimensions } from 'react-native';
import { auth, db } from './firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ResponsiveLayout, useResponsive } from './ResponsiveHandler';
import { theme } from './Theme';

export default function ProfileSettingsScreen({ navigation }) {
    const colors = theme.light;
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        academyName: '',
        businessType: '', // 업태/종목
        representative: '',
        contact: '',
        address: '',
        businessLicense: '',
        subjects: [],
        branches: ['1관', '2관'] // Default branches
    });
    const [editingIndex, setEditingIndex] = useState(null);
    const [newBranch, setNewBranch] = useState('');
    const [newSubject, setNewSubject] = useState('');

    const [newFee, setNewFee] = useState('');

    // --- Branch Management ---
    const handleAddBranch = () => {
        if (!newBranch.trim()) return;
        if (form.branches && form.branches.includes(newBranch.trim())) {
            Alert.alert("알림", "이미 등록된 지점입니다.");
            return;
        }
        setForm(prev => ({
            ...prev,
            branches: [...(prev.branches || []), newBranch.trim()]
        }));
        setNewBranch('');
    };

    const handleRemoveBranch = (index) => {
        setForm(prev => ({
            ...prev,
            branches: prev.branches.filter((_, i) => i !== index)
        }));
    };

    const handleMoveBranch = (index, direction) => {
        const newBranches = [...(form.branches || [])];
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= newBranches.length) return;

        // Swap
        [newBranches[index], newBranches[targetIndex]] = [newBranches[targetIndex], newBranches[index]];
        setForm(prev => ({ ...prev, branches: newBranches }));
    };

    // --- Subject Management ---
    const handleAddSubject = () => {
        if (!newSubject.trim()) return;

        // Check for duplicates (exclude self if editing)
        const isDuplicate = form.subjects && form.subjects.some((sub, idx) => {
            if (editingIndex === idx) return false;
            const existingName = (typeof sub === 'object' && sub !== null) ? sub.name : sub;
            return existingName === newSubject.trim();
        });

        if (isDuplicate) {
            Alert.alert("알림", "이미 등록된 과목입니다.");
            return;
        }

        if (editingIndex !== null) {
            // Update
            const updated = [...form.subjects];
            updated[editingIndex] = { name: newSubject.trim(), fee: newFee.replace(/[^0-9]/g, '') };
            setForm(prev => ({ ...prev, subjects: updated }));
            setEditingIndex(null);
        } else {
            // Add
            setForm(prev => ({
                ...prev,
                subjects: [...(prev.subjects || []), { name: newSubject.trim(), fee: newFee.replace(/[^0-9]/g, '') }]
            }));
        }
        setNewSubject('');
        setNewFee('');
    };

    const handleEditSubject = (index) => {
        const sub = form.subjects[index];
        const isObject = typeof sub === 'object' && sub !== null;
        setNewSubject(isObject ? sub.name : sub);
        setNewFee(isObject ? sub.fee : '');
        setEditingIndex(index);
    };

    const handleCancelEdit = () => {
        setNewSubject('');
        setNewFee('');
        setEditingIndex(null);
    };

    const handleRemoveSubject = (indexToRemove) => {
        if (editingIndex === indexToRemove) handleCancelEdit();
        setForm(prev => ({
            ...prev,
            subjects: prev.subjects.filter((_, index) => index !== indexToRemove)
        }));
    };

    const { width } = useWindowDimensions();
    const isMobile = width < 768;

    useEffect(() => {
        const fetchProfile = async () => {
            if (!auth.currentUser) return;
            setLoading(true);
            try {
                const docRef = doc(db, "users", auth.currentUser.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setForm(prev => ({ ...prev, ...docSnap.data() }));
                }
            } catch (e) {
                console.error(e);
                Alert.alert("오류", "정보를 불러오는데 실패했습니다.");
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleChange = (key, value) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        if (!auth.currentUser) return;
        setLoading(true);
        try {
            await setDoc(doc(db, "users", auth.currentUser.uid), form, { merge: true });
            Platform.OS === 'web' ? alert("저장되었습니다.") : Alert.alert("완료", "정보가 저장되었습니다.");
            navigation.goBack();
        } catch (e) {
            console.error(e);
            Alert.alert("오류", "저장 실패: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ResponsiveLayout>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={[styles.contentContainer, { paddingHorizontal: isMobile ? 20 : 40 }]}>

                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <Text style={{ fontSize: 24, color: colors.foreground }}>⬅️</Text>
                        </TouchableOpacity>
                        <Text style={[styles.title, { color: colors.foreground }]}>학원 정보 수정</Text>
                        <View style={{ width: 30 }} />
                    </View>

                    <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.mutedForeground }]}>상호명 (메인 화면 표기)</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.foreground, borderColor: colors.border }]}
                                placeholder="예: 위 뮤직 아카데미"
                                value={form.academyName}
                                onChangeText={(text) => handleChange('academyName', text)}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.mutedForeground }]}>업태 / 종목</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.foreground, borderColor: colors.border }]}
                                placeholder="예: 학원 / 음악"
                                value={form.businessType}
                                onChangeText={(text) => handleChange('businessType', text)}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.mutedForeground }]}>대표자명</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.foreground, borderColor: colors.border }]}
                                placeholder="대표자 성함"
                                value={form.representative}
                                onChangeText={(text) => handleChange('representative', text)}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.mutedForeground }]}>학원 전화번호</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.foreground, borderColor: colors.border }]}
                                placeholder="02-123-4567"
                                keyboardType="phone-pad"
                                value={form.contact}
                                onChangeText={(text) => handleChange('contact', text)}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.mutedForeground }]}>주소</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.foreground, borderColor: colors.border }]}
                                placeholder="학원 상세 주소"
                                multiline
                                value={form.address}
                                onChangeText={(text) => handleChange('address', text)}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.mutedForeground }]}>사업자 등록번호 (선택)</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.foreground, borderColor: colors.border }]}
                                placeholder="000-00-00000"
                                keyboardType="numeric"
                                value={form.businessLicense}
                                onChangeText={(text) => handleChange('businessLicense', text)}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.mutedForeground }]}>지점(관) 관리</Text>
                            <Text style={{ fontSize: 13, color: colors.mutedForeground, marginBottom: 10 }}>
                                학생 목록과 출석부의 탭 순서를 변경할 수 있습니다.
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                                <TextInput
                                    style={[styles.input, { flex: 1, backgroundColor: colors.inputBackground, color: colors.foreground, borderColor: colors.border }]}
                                    placeholder="지점명 (예: 3관)"
                                    value={newBranch}
                                    onChangeText={setNewBranch}
                                />
                                <TouchableOpacity
                                    style={{ backgroundColor: colors.primary, justifyContent: 'center', paddingHorizontal: 15, borderRadius: 10 }}
                                    onPress={handleAddBranch}
                                >
                                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>추가</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={{ gap: 8 }}>
                                {(form.branches || []).map((branch, index) => (
                                    <View key={index} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.muted, paddingVertical: 10, paddingHorizontal: 15, borderRadius: 12 }}>
                                        <Text style={{ color: colors.foreground, fontWeight: '600', flex: 1 }}>{branch}</Text>
                                        <View style={{ flexDirection: 'row', gap: 10 }}>
                                            {index > 0 && (
                                                <TouchableOpacity onPress={() => handleMoveBranch(index, -1)}>
                                                    <Text style={{ fontSize: 18 }}>⬆️</Text>
                                                </TouchableOpacity>
                                            )}
                                            {index < (form.branches || []).length - 1 && (
                                                <TouchableOpacity onPress={() => handleMoveBranch(index, 1)}>
                                                    <Text style={{ fontSize: 18 }}>⬇️</Text>
                                                </TouchableOpacity>
                                            )}
                                            <TouchableOpacity onPress={() => handleRemoveBranch(index)}>
                                                <Text style={{ color: colors.mutedForeground, fontWeight: 'bold', marginLeft: 5 }}>✕</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                                {(form.branches || []).length === 0 && (
                                    <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>등록된 지점이 없습니다. 기본적으로 2관/1관이 사용됩니다.</Text>
                                )}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.mutedForeground }]}>운영 과목 및 수강료 관리</Text>
                            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                                <TextInput
                                    style={[styles.input, { flex: 2, backgroundColor: colors.inputBackground, color: colors.foreground, borderColor: colors.border }]}
                                    placeholder="과목명 (예: 논술)"
                                    value={newSubject}
                                    onChangeText={setNewSubject}
                                />
                                <TextInput
                                    style={[styles.input, { flex: 1.5, backgroundColor: colors.inputBackground, color: colors.foreground, borderColor: colors.border }]}
                                    placeholder="수강료 (원)"
                                    keyboardType="numeric"
                                    value={newFee}
                                    onChangeText={setNewFee}
                                />
                                <TouchableOpacity
                                    style={{ backgroundColor: editingIndex !== null ? colors.chart2 : colors.primary, justifyContent: 'center', paddingHorizontal: 15, borderRadius: 10 }}
                                    onPress={handleAddSubject}
                                >
                                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>{editingIndex !== null ? "수정" : "추가"}</Text>
                                </TouchableOpacity>
                                {editingIndex !== null && (
                                    <TouchableOpacity
                                        style={{ backgroundColor: colors.muted, justifyContent: 'center', paddingHorizontal: 15, borderRadius: 10 }}
                                        onPress={handleCancelEdit}
                                    >
                                        <Text style={{ color: colors.foreground, fontWeight: 'bold' }}>취소</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            <View style={{ gap: 8 }}>
                                {(form.subjects || []).map((sub, index) => {
                                    // Handle both string (legacy) and object (new) formats
                                    const isObject = typeof sub === 'object' && sub !== null;
                                    const name = isObject ? sub.name : sub;
                                    const fee = isObject ? sub.fee : '';

                                    return (
                                        <TouchableOpacity
                                            key={index}
                                            onPress={() => handleEditSubject(index)}
                                            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: editingIndex === index ? colors.inputBackground : colors.muted, paddingVertical: 10, paddingHorizontal: 15, borderRadius: 12, borderWidth: editingIndex === index ? 1 : 0, borderColor: colors.chart2 }}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={{ marginRight: 6, color: colors.foreground, fontWeight: '600' }}>{name}</Text>
                                                {fee ? <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>({parseInt(fee).toLocaleString()}원)</Text> : null}
                                            </View>
                                            <TouchableOpacity onPress={() => handleRemoveSubject(index)}>
                                                <Text style={{ color: colors.mutedForeground, fontWeight: 'bold' }}>✕</Text>
                                            </TouchableOpacity>
                                        </TouchableOpacity>
                                    );
                                })}
                                {(form.subjects || []).length === 0 && (
                                    <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>등록된 과목이 없습니다. 과목을 추가해주세요.</Text>
                                )}
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.saveButton, { backgroundColor: colors.chart3 }]}
                            onPress={handleSave}
                            disabled={loading}
                        >
                            <Text style={styles.saveButtonText}>{loading ? "저장 중..." : "저장하기"}</Text>
                        </TouchableOpacity>

                        <View style={{ height: 50 }} />
                    </ScrollView>

                </View>
            </View>
        </ResponsiveLayout>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        width: '100%',
    },
    contentContainer: {
        width: '100%',
        maxWidth: 600,
        flex: 1,
        paddingTop: 20
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 15
    },
    backBtn: { padding: 5 },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    formContainer: {
        flex: 1,
    },
    inputGroup: {
        marginBottom: 20
    },
    label: {
        fontSize: 14,
        marginBottom: 8,
        fontWeight: '600'
    },
    input: {
        width: '100%',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        fontSize: 16
    },
    saveButton: {
        width: '100%',
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold'
    }
});
