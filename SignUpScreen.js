import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
// Import db is needed
import { auth, db } from './firebaseConfig';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'; // UpdateProfile import
import { doc, setDoc } from 'firebase/firestore'; // Firestore imports
import { ResponsiveLayout } from './ResponsiveHandler';
// ... rest of imports
import { theme } from './Theme';

export default function SignUpScreen({ navigation, route }) {
    const colors = theme.light; // Fixed to Vibrant Light Theme
    const homeRoute = route?.params?.homeRoute || 'Main';
    const [companyName, setCompanyName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const getFriendlyErrorMessage = (errorCode) => {
        switch (errorCode) {
            case 'auth/email-already-in-use': return '이미 사용 중인 이메일입니다.';
            case 'auth/invalid-email': return '유효하지 않은 이메일 형식입니다.';
            case 'auth/weak-password': return '비밀번호는 6자리 이상이어야 합니다.';
            default: return '오류가 발생했습니다. (' + errorCode + ')';
        }
    };

    const handleSignUp = async () => {
        if (!companyName || !email || !password) {
            setErrorMessage("모든 정보를 입력해주세요.");
            return;
        }

        try {
            // 1. Firebase Auth Create User
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Update Profile with Company Name (Auth Profile)
            await updateProfile(user, {
                displayName: companyName
            });

            // 3. Save to Firestore (Critical for 'Find ID' feature)
            await setDoc(doc(db, "users", user.uid), {
                email: email,
                academyName: companyName,
                createdAt: new Date(),
            });

            Alert.alert("가입 성공", `${companyName}님 환영합니다!`, [
                { text: "확인", onPress: () => navigation.replace(homeRoute) }
            ]);

        } catch (error) {
            console.error("SignUp Error:", error.code, error.message);
            setErrorMessage(getFriendlyErrorMessage(error.code));
        }
    };

    return (
        <ResponsiveLayout>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>

                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Text style={{ fontSize: 24, color: colors.foreground, fontWeight: 'bold' }}>{"<"}</Text>
                    </TouchableOpacity>

                    <Text style={[styles.header, { color: colors.foreground }]}>회원가입</Text>
                    <Text style={[styles.subHeader, { color: colors.mutedForeground }]}>
                        서비스 이용을 위해 정보를 입력해주세요.
                    </Text>

                    <View style={styles.inputContainer}>
                        {/* Company Name */}
                        <View>
                            <Text style={[styles.label, { color: colors.foreground }]}>업체명</Text>
                            <TextInput
                                style={[styles.input, {
                                    backgroundColor: colors.inputBackground,
                                    color: colors.foreground,
                                    borderColor: colors.input
                                }]}
                                placeholder="예: 위 뮤직 아카데미"
                                placeholderTextColor={colors.mutedForeground}
                                value={companyName}
                                onChangeText={setCompanyName}
                                autoCapitalize="words"
                            />
                        </View>

                        {/* Email */}
                        <View>
                            <Text style={[styles.label, { color: colors.foreground }]}>이메일</Text>
                            <TextInput
                                style={[styles.input, {
                                    backgroundColor: colors.inputBackground,
                                    color: colors.foreground,
                                    borderColor: colors.input
                                }]}
                                placeholder="example@email.com"
                                placeholderTextColor={colors.mutedForeground}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        {/* Password */}
                        <View>
                            <Text style={[styles.label, { color: colors.foreground }]}>비밀번호</Text>
                            <TextInput
                                style={[styles.input, {
                                    backgroundColor: colors.inputBackground,
                                    color: colors.foreground,
                                    borderColor: colors.input
                                }]}
                                placeholder="6자리 이상 입력"
                                placeholderTextColor={colors.mutedForeground}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>
                    </View>

                    {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: colors.chart2, shadowColor: colors.chart2 }]} // Teal for SignUp
                        onPress={handleSignUp}
                        activeOpacity={0.9}
                    >
                        <Text style={[styles.buttonText, { color: '#ffffff' }]}>가입하기</Text>
                    </TouchableOpacity>

                </View>
            </View>
        </ResponsiveLayout>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 28,
    },
    card: {
        width: '100%',
        maxWidth: 430,
        padding: 34,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#dbe3ee',
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 6,
    },
    backBtn: {
        alignSelf: 'flex-start',
        marginBottom: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    header: {
        fontSize: 30,
        fontWeight: '800',
        marginBottom: 10,
        textAlign: 'center',
        letterSpacing: -0.4,
    },
    subHeader: {
        fontSize: 15,
        marginBottom: 28,
        textAlign: 'center',
        lineHeight: 22,
    },
    inputContainer: {
        gap: 16,
        marginBottom: 28,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        width: '100%',
        height: 54,
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 16,
        fontSize: 16,
    },
    button: {
        width: '100%',
        height: 54,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 4,
    },
    buttonText: {
        fontWeight: '700',
        fontSize: 16,
        letterSpacing: 0.1,
    },
    errorText: {
        color: '#d4183d',
        marginBottom: 14,
        textAlign: 'center',
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
    }
});
