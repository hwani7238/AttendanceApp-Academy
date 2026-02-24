const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();

const db = admin.firestore();

// ==========================================
// NHN Cloud 카카오톡 비즈메시지 API 설정 (TODO: 발급받은 키로 교체하세요)
// ==========================================
const NHN_APP_KEY = "YOUR_NHN_APP_KEY";           // 앱키
const NHN_SECRET_KEY = "YOUR_NHN_SECRET_KEY";     // 시크릿 키 (X-Secret-Key)
const NHN_SENDER_KEY = "YOUR_NHN_SENDER_KEY";     // 발신 프로필 키
const NHN_TEMPLATE_CODE = "ATTENDANCE_LOC_V1"; // ⭐️ 등록하실 템플릿 코드 (작성하신 번호로 맞추세요)

/**
 * NHN Cloud API를 통해 알림톡을 발송합니다.
 */
async function sendNhnAlimtalk(receiver, templateParams) {
    try {
        const url = `https://api-alimtalk.cloud.toast.com/alimtalk/v2.2/appkeys/${NHN_APP_KEY}/messages`;

        // 휴대폰 번호에서 숫자만 추출 (예: 010-1234-5678 -> 01012345678)
        const cleanReceiverNo = receiver.replace(/[^0-9]/g, "");

        const payload = {
            "senderKey": NHN_SENDER_KEY,
            "templateCode": NHN_TEMPLATE_CODE,
            "recipientList": [
                {
                    "recipientNo": cleanReceiverNo,
                    "templateParameter": templateParams
                }
            ]
        };

        const response = await axios.post(url, payload, {
            headers: {
                "X-Secret-Key": NHN_SECRET_KEY,
                "Content-Type": "application/json;charset=UTF-8"
            }
        });

        console.log("NHN Cloud Response:", response.data);
        return response.data;
    } catch (error) {
        console.error("Error sending NHN Alimtalk:");
        // Axios 에러의 경우 response.data에 에러 상세가 들어있음
        if (error.response) {
            console.error(error.response.data);
        } else {
            console.error(error);
        }
        throw error;
    }
}

exports.sendAttendanceNotification = functions.firestore
    .document("attendance/{docId}")
    .onCreate(async (snap, context) => {
        const attendanceData = snap.data();
        const studentId = attendanceData.studentId;
        const studentName = attendanceData.name;
        const userId = attendanceData.userId;
        const status = attendanceData.type || "출석"; // "출석"

        try {
            // 1. 학원명 및 학원 연락처 가져오기 (users 컬렉션)
            let academyName = "학원"; // 기본값
            let academyContact = "전화번호 확인 요망"; // 학원 연락처 기본값
            if (userId) {
                const userDoc = await db.collection("users").doc(userId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    if (userData.academyName) {
                        academyName = userData.academyName;
                    }
                    if (userData.contact) {
                        academyContact = userData.contact;
                    } else if (userData.phoneNumber) {
                        academyContact = userData.phoneNumber;
                    }
                }
            }

            // 2. 부모님(학생) 연락처 가져오기 (students 컬렉션)
            let parentPhoneNumber = "";
            const studentDoc = await db.collection("students").doc(studentId).get();
            if (studentDoc.exists && studentDoc.data().contact) {
                parentPhoneNumber = studentDoc.data().contact;
            }

            console.log(`Processing attendance for: ${studentName} (${parentPhoneNumber})`);

            if (!parentPhoneNumber) {
                console.log("Contact phone number not found. Skipping notification.");
                return;
            }

            // 3. 한국 시간으로 출석 시간 포맷팅
            const date = attendanceData.timestamp ? attendanceData.timestamp.toDate() : new Date();
            const koreanTime = new Intl.DateTimeFormat('ko-KR', {
                timeZone: 'Asia/Seoul',
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            }).format(date);

            // 4. 알림톡 발송 (작성된 템플릿 변수에 완벽히 매핑)
            // ⭐️ 주의: 매핑 키 이름은 반드시 NHN Cloud에 등록한 템플릿의 '#{변수명}'과 완벽히 일치해야 합니다.
            // 템플릿: #{학원명}, #{학생명}, #{출석시간}, #{연락처}
            const templateParams = {
                "학원명": academyName,
                "학생명": studentName,
                "출석시간": koreanTime,
                "연락처": academyContact
            };

            await sendNhnAlimtalk(parentPhoneNumber, templateParams);

        } catch (error) {
            console.error("Error processing attendance notification:", error);
        }
    });
