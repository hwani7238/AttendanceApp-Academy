import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, TextInput, Alert, ScrollView, Platform } from 'react-native';
import { db, auth } from './firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ResponsiveLayout } from './ResponsiveHandler';
import { theme } from './Theme';

export default function TeacherManagementScreen({ navigation }) {
    const colors = theme.light;
    const [teachers, setTeachers] = useState([]);

    // New State for detailed info
    const [name, setName] = useState('');
    const [subject, setSubject] = useState('');
    const [contact, setContact] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTeachers();
    }, []);

    const fetchTeachers = async () => {
        if (!auth.currentUser) return;
        try {
            const docRef = doc(db, "users", auth.currentUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().teachers) {
                setTeachers(docSnap.data().teachers);
            } else {
                setTeachers([]);
            }
        } catch (error) {
            console.error("Error fetching teachers:", error);
            Alert.alert("오류", "강사 목록을 불러오는데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddTeacher = async () => {
        if (name.trim() === '') {
            Alert.alert("알림", "강사 이름을 입력해주세요.");
            return;
        }

        // Check duplicates (handle both string and object legacy data)
        const exists = teachers.some(t => {
            const tName = typeof t === 'object' ? t.name : t;
            return tName === name.trim();
        });

        if (exists) {
            Alert.alert("알림", "이미 등록된 이름입니다.");
            return;
        }

        const newTeacherObj = {
            name: name.trim(),
            subject: subject.trim(),
            contact: contact.trim(),
            regDate: date
        };

        const updatedList = [...teachers, newTeacherObj];
        try {
            await updateDoc(doc(db, "users", auth.currentUser.uid), {
                teachers: updatedList
            });
            setTeachers(updatedList);

            // Reset form
            setName('');
            setSubject('');
            setContact('');
            setDate(new Date().toISOString().split('T')[0]);

            Alert.alert("성공", "강사가 등록되었습니다.");
        } catch (error) {
            console.error("Error adding teacher:", error);
            Alert.alert("오류", "강사 등록에 실패했습니다.");
        }
    };

    const handleDeleteTeacher = (index, teacherItem) => {
        const teacherName = (typeof teacherItem === 'object' && teacherItem !== null) ? teacherItem.name : teacherItem;

        const executeDelete = async () => {
            const updatedList = [...teachers];
            updatedList.splice(index, 1); // Remove by index

            try {
                await updateDoc(doc(db, "users", auth.currentUser.uid), {
                    teachers: updatedList
                });
                setTeachers(updatedList);
            } catch (error) {
                console.error("Error deleting teacher:", error);
                if (Platform.OS === 'web') {
                    window.alert("오류: 강사 삭제에 실패했습니다: " + error.message);
                } else {
                    Alert.alert("오류", "강사 삭제에 실패했습니다: " + error.message);
                }
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm(`'${teacherName}' 강사를 삭제하시겠습니까?`)) {
                executeDelete();
            }
        } else {
            Alert.alert(
                "삭제 확인",
                `'${teacherName}' 강사를 삭제하시겠습니까?`,
                [
                    { text: "취소", style: "cancel" },
                    {
                        text: "삭제",
                        style: "destructive",
                        onPress: executeDelete
                    }
                ]
            );
        }
    };

    return (
        <ResponsiveLayout>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Text style={{ fontSize: 24 }}>⬅️</Text>
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.foreground }]}>강사 및 직원 관리</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Add Section */}
                    <View style={[styles.addSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>신규 강사 등록</Text>

                        <View style={styles.formGrid}>
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.mutedForeground }]}>이름</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.input, color: colors.foreground }]}
                                    placeholder="이름"
                                    value={name}
                                    onChangeText={setName}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.mutedForeground }]}>담당 과목</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.input, color: colors.foreground }]}
                                    placeholder="예: 피아노"
                                    value={subject}
                                    onChangeText={setSubject}
                                />
                            </View>
                        </View>

                        <View style={styles.formGrid}>
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.mutedForeground }]}>연락처</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.input, color: colors.foreground }]}
                                    placeholder="010-0000-0000"
                                    keyboardType="phone-pad"
                                    value={contact}
                                    onChangeText={setContact}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.mutedForeground }]}>등록일</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.input, color: colors.foreground }]}
                                    placeholder="YYYY-MM-DD"
                                    value={date}
                                    onChangeText={setDate}
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.addButton, { backgroundColor: colors.chart4 }]}
                            onPress={handleAddTeacher}
                        >
                            <Text style={styles.addButtonText}>등록하기</Text>
                        </TouchableOpacity>
                    </View>

                    {/* List Section */}
                    <View style={[styles.listSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>등록된 강사 목록 ({teachers.length}명)</Text>
                        <View>
                            {teachers.map((item, index) => {
                                const tName = typeof item === 'object' ? item.name : item;
                                const tSubject = typeof item === 'object' ? item.subject : '';
                                const tContact = typeof item === 'object' ? item.contact : '';
                                const tDate = typeof item === 'object' ? item.regDate : '';

                                return (
                                    <View key={index} style={[styles.teacherItem, { borderBottomColor: colors.border }]}>
                                        <View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                <Text style={[styles.teacherName, { color: colors.foreground }]}>{tName}</Text>
                                                {tSubject ? <View style={{ backgroundColor: colors.muted, paddingHorizontal: 6, borderRadius: 4 }}><Text style={{ fontSize: 12, color: colors.mutedForeground }}>{tSubject}</Text></View> : null}
                                            </View>
                                            <Text style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 4 }}>
                                                {tContact} {tDate ? `| ${tDate}` : ''}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.deleteButton}
                                            onPress={() => handleDeleteTeacher(index, item)}
                                        >
                                            <Text style={{ fontSize: 18 }}>🗑️</Text>
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                            {teachers.length === 0 && (
                                <View style={styles.emptyContainer}>
                                    <Text style={{ color: colors.mutedForeground }}>등록된 강사가 없습니다.</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </ScrollView>
            </View>
        </ResponsiveLayout>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        borderBottomWidth: 1,
        height: 60,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    backButton: {
        padding: 5,
    },
    content: {
        flex: 1,
        padding: 20,
        maxWidth: 800,
        width: '100%',
        alignSelf: 'center',
    },
    addSection: {
        padding: 24,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 20,
    },
    listSection: {
        padding: 24,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 50
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    formGrid: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 15
    },
    inputGroup: {
        flex: 1,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6
    },
    input: {
        width: '100%',
        height: 45,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        fontSize: 15,
    },
    addButton: {
        width: '100%',
        height: 50,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10
    },
    addButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    teacherItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        borderBottomWidth: 1,
    },
    teacherName: {
        fontSize: 16,
        fontWeight: '600'
    },
    deleteButton: {
        padding: 10,
    },
    emptyContainer: {
        padding: 30,
        alignItems: 'center',
    },
});
