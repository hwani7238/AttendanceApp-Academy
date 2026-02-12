import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { ResponsiveLayout, useResponsive } from './ResponsiveHandler';
import { theme } from './Theme';
import { db, auth } from './firebaseConfig';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

// 09:00 ~ 22:00 (30분 단위)
const START_HOUR = 9;
const END_HOUR = 22;
const TIMES = [];
for (let h = START_HOUR; h <= END_HOUR; h++) {
    const hour = h < 10 ? `0${h}` : `${h}`;
    TIMES.push(`${hour}:00`);
    if (h !== END_HOUR) {
        TIMES.push(`${hour}:30`);
    }
}

// 📌 Hardcoded Initial Data (Parsed from User)
const INITIAL_DATA = {
    "월_10:00": "- 심사 선생님\n- \n- 조수아 B,",
    "금_10:00": "이소연/이서율(일렉)",
    "토_10:00": "9:00 임경희님\n\nDrum. 이우찬(1/24)\n\n김서아\n\n유은서/은우\n이재현\n(1/17 결석)\n\n임시현\n김지유(1/17)\n\n작곡> 김래아",
    "월_10:30": "* 이두희 선생님 면접\n(010-2820-7051)",
    "토_10:30": "Drum. 윤시후\n\n\n권이안/방진서",
    "월_11:00": "* 적극적인 피드백",
    "화_11:00": "리코더 방학특강\n(박일후, 변서하,\n정도윤)",
    "수_11:00": "정도윤(미디)",
    "목_11:00": "보컬 방학특강\n(박일후, 이그린,\n허예안)\n\n\n드럼\n(박종하, 송주영-패드,\n김라일(1/22 결석)\n김다정,\n이승호(1/29 결석))",
    "금_11:00": "여행구님\n\n기타 방학특강 (1)\n임지유, 김윤조, \n홍서윤, 강지온, \n석아연",
    "토_11:00": "Drum. 김로이\n\n기타. 배주은\n(T. 이현창) - 12/20 재시작\n\n이주영 선생님\n(김래아, 현유주,\n안채원, 강민서, \n정서윤, 서아, 이루다)\n\n조세연\n\n이아린/문혜준\n(1/17)",
    "월_11:30": "* 이정엽(시창 청음)",
    "수_11:30": "* 이정엽(시창 청음)",
    "토_11:30": "Drum. 이민준\n\n11:35 이민준\n이지안",
    "화_12:00": "우쿨렐레> 임석우",
    "수_12:00": "Drum. 이주현\n\n- 피아노 조율 업체 선정\n\n- 연주 순서 정하기\n- 보드 제작 신청",
    "목_12:00": "우쿨렐레> 임석우",
    "금_12:00": "기타 방학특강 (2)",
    "토_12:00": "이주영 선생님\n(성예원, 문혜준, 정태이) \n\n12:00 이도경\n(T. 김수정 - 2관)\n\n\nVocal. 조준혁\n(T. 강준호)\n\n기타. 김시원\n(T. 이현창, 1/3~)\n\n12:00 권율",
    "월_12:30": "12:25 박유민\n강민서 A\n김규민/이유강\n\n조하경\n최서우\n이재현\n\n12:45 박일후",
    "화_12:30": "김서원\n최서우\n박수연\n김은채/이재현\n\n김세영\n\n박윤경/김지언",
    "수_12:30": "Drum. 김승후\n(1/21 결석)\n\n이유강/김규민\n임주환\n최서우\n임소민\n김지유\n\n김은채(1/14 보강)",
    "목_12:30": "김은채/임소민\n박시온/김규민\n박윤경\n이재현\n박수연",
    "금_12:30": "방진서(1/16)\n\n최서우\n권민서/임소민\n강민서 A\n\n김규민/이유강\n\n김세영/조하경\n이재현",
    "토_12:30": "Drum. 김용진\n\n우쿨렐레> 임석우",
    "월_13:00": "기타. 이수민(1/5~)\n\nDrum. 이승호\n(1/13~)\n\n김지유",
    "화_13:00": "Drum. 홍기향님\n\n박시온/박일후\n김다온\n진승혁\n\n최아현(1/13 여행)",
    "수_13:00": "Drum. 권민서/임예성\n\n박유준\n진승혁\n최아현\n장선우",
    "목_13:00": "Drum. 윤재웅(1/15)\nDrum. 김승후\n(1/21, 2/19)\n\n고윤우(1/22)\n김서원\n김지언\n최서우\n진승혁\n\n최아현(1/15 여행)",
    "금_13:00": "1:00 Vocal. 차해원\n(T. 김수정) - 2관\n\n김다온\n박윤경\n박유준",
    "토_13:00": "Drum. 이민준\n\nVocal. 구윤재\n(T. 김수정)",
    "월_13:30": "Drum. 장하준\n\n1:30 서연아\n문소원\n고윤우\n양수현/양현진",
    "화_13:30": "권이안/권율\n\n조세연\n박서아\n이아린",
    "수_13:30": "김서원\n이지안\n서연아\n이우준\n양수현/양현진\n문소원(여행)",
    "목_13:30": "이도겸\n\n박서아\n이아린\n송유빈\n김서하",
    "금_13:30": "2관> 유영재/김보겸\n\nVocal. 한효수님\n(T. 강준호) - 2관\n\n김은채\n서연아/최제인\n\n문소원\n조수아 A\n양수현/양현진",
    "토_13:30": "Drum. 강기현",
    "월_14:00": "Drum. 심하율\n(1/5~)\n\n황건우/양수현\n2:10 문서준\n\n2:20 백승민\n장하준",
    "화_14:00": "2:10 Drum. 이준수\n\n2관> 2:10 윤시원\n유영재(1/27)\n\n2:40 신이안\n(2/3)\n\n허예안\n이원준/우준\n황건우\n최우진\n최제인\n\n2:20 김정원",
    "수_14:00": "Drum. 이우찬 예약\n\n2관> 윤시원\n\n조하경\n\n2:10 문서준(병결)",
    "목_14:00": "2:00 김민정님\n(T. 이민기, 시창-청음)\n\n2:00 Drum. 신이안\n(1/22, 29, 2/12 결석)\n\n2:00 보컬 장세하\n(T. 김수정) - 2관\n\n2관> 유서원/조민희\n       윤시원\n\n김예준\n김지오\n황건우\n이우준/이원준\n2:20 김정원\n\n문소원",
    "금_14:00": "2관> 조민희/유서원\n\n기타. 김민건\n\n허예안\n권무휼/권레아\n정준수/은수",
    "토_14:00": "Drum. 서율\n\nVocal. 유재이\n(T. 김수정)",
    "월_14:30": "2:40 도윤 필즈\n\nDrum. 2:30 윤재웅\n\n김서하\n\n임지유",
    "화_14:30": "이예린\n한예서(1/20 여행)\n김서아\n2:50 장선우\n\n2:43 엄지인 픽업",
    "수_14:30": "김서아\n\n2:40 고윤우\n\n2:45 이도겸/이로은\n2:45 김예진\n한예서\n\n조주혜(1/28~)",
    "목_14:30": "Drum. 2:30 김시원\n\n2:30 서지민님\n\n최제인\n신이안(1관, 피아노)\n\n한예서(여행)",
    "금_14:30": "2:40 도윤 필즈\n\nDrum. 이우찬(1/16)\n\n일렉. 김보겸\n\n2:30 김다온\n이정엽\n백승민/김은채\n최서율\n2:45 김예진",
    "토_14:30": "Drum. 강주아\n(1/31~2/16)\n2/20 재시작",
    "월_15:00": "Drum. 3:00 김시원\n(1/12일)\n\n이지호(1/19, 26)\n\n한경원\n조수아 B\n유영재(1/19)",
    "화_15:00": "Drum. 백민현\n\n3:00 김지오\n이도겸/이로은",
    "수_15:00": "3:00 지서윤\n(T. 김수정 - 2관)\n\n\n3:05 현유주/김정원\n3:08 김시우\n3:15 최서율",
    "목_15:00": "Drum. 최은우\n\n3:00 보컬 박은영님\n(T. 김수정) - 2관\n\n3:00 김지오\n박유민\n김시우",
    "금_15:00": "기타. 배시아/최율\n\n장하준\n이로은\n임주환",
    "토_15:00": "Vocal. 손승용님\n(T. 김수정)",
    "월_15:30": "Drum. 구태희\n(1/19~)\n\n3:40 이윤우(초 4)\n\n최서율",
    "화_15:30": "3:35 최준서\n3:37 최서우\n\n3:38 유은서/은우",
    "수_15:30": "3:25 Drum. 최슬아\n\n유지안\n\n3:30 홍예서\n\n이지호(여행)",
    "목_15:30": "Drum. 이재용\n(1/22, 29 결석)\n\n이재인\n3:30 이주아\n\n3:35 유은서/유은우\n조세연\n\n3:40 최준서",
    "금_15:30": "3:30 Vocal. 주필립\n(T. 강준호)\n\n3:40 Drum. 최준서\n\n이윤우(초 4)\n홍예서\n\n이지호/고윤우\n(1/16 결석)\n\n3:40 태이 플레이팩토",
    "토_15:30": "3:20 Drum. 최준형",
    "월_16:00": "MIDI. 강신욱\n\nDrum> 이호수 예정\n(1/19~)",
    "화_16:00": "오시윤/송유빈\n성예원\n정은수/정준수\n\n4:20 이주아",
    "수_16:00": "4:00 보컬 서주은\n(T. 김수정 - 2관) \n1/14~\n\n정준수\n\n최우진\n조수아 A\n\n4:25 방진서",
    "목_16:00": "최준서/오시윤\n조수아 B\n\n성예원/문혜준\n\n정은수\n\n조수아 A",
    "금_16:00": "4:00 기타. 이시현\n\n조주혜(1/30~)\n유지안\n임시현\n4:00 백아연/최우진\n4:25 방진서",
    "토_16:00": "Drum. 서리라",
    "일_16:00": "Drum. 서율 연습",
    "월_16:30": "Drum. 김윤주\n\n4:30 작곡 김래아\n\n4:40 김로이\n\n4:50 조세연",
    "화_16:30": "김재홍\n\n4:50 권무휼/레아",
    "수_16:30": "도윤/태이 \n* 그리다 미술 *\n\n기타. 임율언\n\n\n4:25 문혜준\n\n4:45 김로이",
    "목_16:30": "Drum. 구태희\n(1/15~)\n\n4:40 김예준/이민준\n(1/15)\n\n김재홍\n\n권레아",
    "금_16:30": "4:30 Drum. 이준표\n\n장선우(2월부터~)\n문혜준\n\n권무휼",
    "월_17:00": "성예원",
    "화_17:00": "* 태권도 *\n\n박수연\n김예준\n5:05 현유주\n\n이민준",
    "목_17:00": "* 태권도 *\n\nDrum. 이지오",
    "금_17:00": "시창 청음. 백아연\n\n김시우\n5:10 박시온",
    "월_17:30": "5:30 Drum. 김윤주\n\n5:20 Vocal. 김래아\n(T. 김수정)",
    "수_17:30": "Drum. 심하민(초 6)",
    "목_17:30": "Drum. 김보겸",
    "금_18:00": "Vocal. 백아연\n(T. 김수정) - 2관",
    "수_18:30": "Drum. 김예한",
    "목_18:30": "Drum. 최범",
    "수_19:00": "Drum. 조유나",
    "목_19:00": "Drum. 양도윤",
    "금_19:00": "Vocal. 김윤주님\n(T. 김수정) - 2관",
    "월_19:30": "Drum. 김정환님",
    "월_20:00": "Drum. 이태진님\n(1/12, 19일 결석)",
    "수_20:00": "Drum. 조현애님",
    "수_21:00": "Drum. 백다민님"
};

export default function TimetableScreen({ navigation }) {
    const colors = theme.light;
    const { isMobile } = useResponsive();

    const [schedule, setSchedule] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Firestore Real-time Listener safely wrapped in Auth Listener
    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
            if (user) {
                const docRef = doc(db, 'timetables', user.uid);
                const unsubscribeSnapshot = onSnapshot(docRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data().schedule || {};
                        if (data && Object.keys(data).length > 0) {
                            setSchedule(data);
                        } else {
                            setSchedule(INITIAL_DATA);
                        }
                    } else {
                        setSchedule(INITIAL_DATA);
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Timetable Listen Error:", error);
                    setLoading(false);
                });

                return () => unsubscribeSnapshot();
            } else {
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    // 저장 버튼 핸들러
    const handleSave = async () => {
        if (!auth.currentUser) return;
        setSaving(true);
        try {
            await setDoc(doc(db, 'timetables', auth.currentUser.uid), {
                schedule: schedule,
                updatedAt: serverTimestamp(),
            }, { merge: true });
            Alert.alert("완료", "시간표가 저장되었습니다.");
        } catch (error) {
            console.error("Error saving timetable:", error);
            Alert.alert("오류", "저장에 실패했습니다.");
        } finally {
            setSaving(false);
        }
    };

    const updateSchedule = (day, time, text) => {
        const key = `${day}_${time}`;
        setSchedule(prev => ({
            ...prev,
            [key]: text
        }));
    };

    if (loading) {
        return (
            <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.chart3} />
            </View>
        );
    }

    return (
        <ResponsiveLayout>
            <View style={[styles.container, { backgroundColor: colors.background }]}>

                {/* Header */}
                <View style={[styles.header, { borderColor: colors.border }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Text style={{ fontSize: 24 }}>⬅️</Text>
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: colors.foreground }]}>시간표 관리 🗓️</Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity
                            onPress={() => {
                                if (confirm("초기 데이터로 되돌리시겠습니까?")) {
                                    setSchedule(INITIAL_DATA);
                                }
                            }}
                            style={[styles.saveBtn, { backgroundColor: colors.muted }]}
                        >
                            <Text style={[styles.saveText, { color: colors.foreground }]}>초기화</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleSave}
                            style={[styles.saveBtn, { backgroundColor: colors.chart3 }]}
                            disabled={saving}
                        >
                            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>저장</Text>}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Timetable Grid */}
                <ScrollView style={styles.scrollView}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View>
                            {/* Header Row (Days) */}
                            <View style={styles.row}>
                                <View style={[styles.timeColumn, { backgroundColor: colors.muted }]}>
                                    <Text style={[styles.headerText, { color: colors.mutedForeground }]}>시간</Text>
                                </View>
                                {DAYS.map(day => (
                                    <View key={day} style={[styles.dayHeader, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                                        <Text style={[styles.headerText, { color: colors.foreground }]}>{day}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* Data Rows */}
                            {TIMES.map(time => (
                                <View key={time} style={styles.row}>
                                    {/* Time Label */}
                                    <View style={[styles.timeColumn, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                                        <Text style={[styles.timeText, { color: colors.mutedForeground }]}>{time}</Text>
                                    </View>

                                    {/* Day Cells */}
                                    {DAYS.map(day => {
                                        const key = `${day}_${time}`;
                                        const val = schedule[key] || '';
                                        return (
                                            <View key={key} style={[styles.cell, { borderColor: colors.border }]}>
                                                <TextInput
                                                    style={[styles.input, { color: colors.foreground }]}
                                                    value={val}
                                                    onChangeText={(text) => updateSchedule(day, time, text)}
                                                    placeholder="-"
                                                    placeholderTextColor={colors.mutedForeground}
                                                    multiline
                                                />
                                            </View>
                                        );
                                    })}
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                </ScrollView>

            </View>
        </ResponsiveLayout>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
    },
    backBtn: {
        padding: 5,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    saveBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    saveText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    scrollView: {
        flex: 1,
    },
    row: {
        flexDirection: 'row',
    },
    timeColumn: {
        width: 60,
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#e4e4e7',
    },
    dayHeader: {
        width: 140,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 1,
        borderBottomWidth: 1,
    },
    cell: {
        width: 140,
        minHeight: 80,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        padding: 5,
        justifyContent: 'center',
    },
    headerText: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    timeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    input: {
        flex: 1,
        fontSize: 11,
        textAlign: 'center',
        textAlignVertical: 'center',
    }
});
