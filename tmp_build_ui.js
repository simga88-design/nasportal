const fs = require('fs');

const cssStyles = `
    :root {
        --primary: #2563eb;
        --border: #e2e8f0;
        --text: #334155;
        --background: #f8fafc;
        --bg-sub: #f1f5f9;
        --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
    }

    body {
        font-family: 'Pretendard', sans-serif;
        margin: 0;
        padding: 0;
        color: var(--text);
        font-size: 14px;
        background: transparent;
    }

    .form-container {
        padding: 20px 25px 40px;
        background: #f8fafc;
        max-width: 800px;
        margin: 0 auto;
    }

    .section-title {
        font-size: 18px;
        font-weight: 800;
        color: #1e293b;
        margin: 30px 0 15px;
        padding-bottom: 10px;
        border-bottom: 2px solid var(--primary);
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .section-title::before {
        content: '';
        display: block;
        width: 6px;
        height: 18px;
        background: var(--primary);
        border-radius: 3px;
    }

    .section-title:first-child {
        margin-top: 10px;
    }

    .form-group {
        margin-bottom: 18px;
    }

    .form-label {
        display: block;
        font-size: 13.5px;
        font-weight: 700;
        color: #475569;
        margin-bottom: 8px;
    }

    .form-control {
        width: 100%;
        padding: 10px 14px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        font-size: 14px;
        font-family: inherit;
        transition: all 0.2s;
        box-sizing: border-box;
        background-color: #fff;
        color: #1e293b;
    }

    .form-control:focus {
        outline: none;
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
    }

    .form-control::placeholder {
        color: #94a3b8;
    }

    .form-control-inline {
        display: inline-block;
        width: auto;
        min-width: 140px;
    }

    textarea.form-control {
        resize: vertical;
        min-height: 80px;
        line-height: 1.5;
    }

    .row {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        margin-bottom: 18px;
    }

    .col {
        flex: 1;
        min-width: 0;
    }
    
    .col-2 {
        flex: 2;
    }

    .checkbox-group {
        background: #f1f5f9;
        padding: 12px 16px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        font-size: 14px;
        display: flex;
        flex-wrap: wrap;
        gap: 10px 20px;
        align-items: center;
    }

    .checkbox-group.grid-col {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 12px;
    }
    
    .checkbox-group.vertical {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
    }

    .checkbox-group label {
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: #334155;
        white-space: nowrap;
        font-weight: 500;
        padding: 4px 0;
    }
    
    .checkbox-group input[type="text"] {
        width: 160px;
        padding: 6px 10px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        font-size: 13px;
        margin-left: 4px;
        background: #fff;
    }
    
    .checkbox-group input[type="text"]:focus {
        outline: none;
        border-color: var(--primary);
    }
    
    .checkbox-group input[type="checkbox"], 
    .checkbox-group input[type="radio"] {
        margin: 0;
        cursor: pointer;
        width: 16px;
        height: 16px;
        accent-color: var(--primary);
    }

    .card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 24px;
        margin-bottom: 20px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
    }
    
    .sub-label {
        font-size: 12.5px;
        color: #64748b;
        margin-top: -4px;
        margin-bottom: 12px;
        display: block;
        font-weight: 500;
    }
    
    .divider {
        height: 1px;
        background: #e2e8f0;
        margin: 20px 0;
    }
    
    .highlight-box {
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 20px;
    }
    
    .highlight-box .form-label {
        color: #1e3a8a;
    }
`;

function buildHtml() {
    let out = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>응급개입 기록지 폼</title>
    <link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.8/dist/web/static/pretendard.css" />
    <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css">
    <style>${cssStyles}</style>
</head>
<body>
<div class="form-container" id="form-content">`;

    // --- HEADER ---
    out += `
    <div class="row card" style="background: var(--bg-sub);">
        <div class="col">
            <label class="form-label">개입일</label>
            <input type="date" id="f_1" class="form-control">
        </div>
        <div class="col">
            <label class="form-label">기록자 성명</label>
            <input type="text" id="f_2" class="form-control" placeholder="성명 입력">
        </div>
    </div>
`;

    // --- 1. 기본정보 ---
    out += `
    <div class="section-title">1. 기본정보</div>
    <div class="card">
        <div class="row">
            <div class="col"><label class="form-label">성명</label><input type="text" id="f_3" class="form-control"></div>
            <div class="col"><label class="form-label">성별</label>
                <div class="checkbox-group">
                    <label><input type="checkbox" id="f_4"> 남</label>
                    <label><input type="checkbox" id="f_5"> 여</label>
                </div>
            </div>
            <div class="col"><label class="form-label">나이</label><input type="number" id="f_6" class="form-control"></div>
        </div>
        <div class="row">
            <div class="col"><label class="form-label">생년월일</label><input type="text" id="f_9" class="form-control" placeholder="YYYY-MM-DD"></div>
            <div class="col"><label class="form-label">연락처</label><input type="text" id="f_8" class="form-control"></div>
        </div>
        <div class="form-group"><label class="form-label">주소</label><input type="text" id="f_7" class="form-control"></div>
        
        <div class="form-group">
            <label class="form-label">보호자 정보</label>
            <div class="checkbox-group" style="margin-bottom:8px;">
                <label>성명: <input type="text" id="f_10" placeholder="보호자 성명"></label>
                <label><input type="checkbox" id="f_11"> 부</label>
                <label><input type="checkbox" id="f_12"> 모</label>
                <label><input type="checkbox" id="f_13"> 자녀</label>
                <label><input type="checkbox" id="f_14"> 기타 <input type="text" id="f_15"></label>
                <label><input type="checkbox" id="f_16"> 없음</label>
            </div>
            <div class="row">
                <div class="col"><label class="form-label">보호자 연락처</label><input type="text" id="f_17" class="form-control"></div>
            </div>
        </div>

        <div class="row">
            <div class="col">
                <label class="form-label">행정복지센터 관리 여부</label>
                <div class="checkbox-group">
                    <label><input type="checkbox" id="f_18"> 예</label>
                    <label><input type="checkbox" id="f_19"> 아니오</label>
                    <label><input type="checkbox" id="f_20"> 미파악</label>
                </div>
            </div>
            <div class="col">
                <label class="form-label">센터등록 여부</label>
                <div class="checkbox-group">
                    <label><input type="checkbox" id="f_21"> 예</label>
                    <label><input type="checkbox" id="f_22"> 아니오</label>
                    <label><input type="checkbox" id="f_23"> 미파악</label>
                </div>
            </div>
            <div class="col">
                <label class="form-label">민원 발생 여부</label>
                <div class="checkbox-group">
                    <label><input type="checkbox" id="f_24"> 예</label>
                    <label><input type="checkbox" id="f_25"> 아니오</label>
                    <label><input type="checkbox" id="f_26"> 미파악</label>
                </div>
            </div>
        </div>

        <div class="form-group">
            <label class="form-label">건강보험 유형</label>
            <div class="checkbox-group">
                <label><input type="checkbox" id="f_27"> 건강보험</label>
                <label><input type="checkbox" id="f_28"> 의료급여 1종</label>
                <label><input type="checkbox" id="f_29"> 의료급여 2종</label>
                <label><input type="checkbox" id="f_30"> 미가입</label>
                <label><input type="checkbox" id="f_31"> 기타 <input type="text" id="f_32"></label>
            </div>
        </div>
    </div>
`;

    // --- 2. 정신건강력 및 증상 ---
    out += `
    <div class="section-title">2. 정신건강력 및 증상</div>
    <div class="card">
        <div class="form-group">
            <label class="form-label">진단이력</label>
            <div class="checkbox-group">
                <label><input type="checkbox" id="f_33"> 있음 (코드: <input type="text" id="f_34">)</label>
                <label><input type="checkbox" id="f_35"> 없음</label>
                <label><input type="checkbox" id="f_36"> 미파악</label>
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">정신과 치료력</label>
            <div class="checkbox-group">
                <label><input type="checkbox" id="f_37"> 외래 <input type="text" id="f_38"></label>
                <label><input type="checkbox" id="f_39"> 입원 <input type="text" id="f_40"></label>
                <label><input type="checkbox" id="f_41"> 없음</label>
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">주요 증상</label>
            <div class="checkbox-group grid-col">
                <label><input type="checkbox" id="f_42"> 자살시도</label>
                <label><input type="checkbox" id="f_43"> 자해</label>
                <label><input type="checkbox" id="f_44"> 타해</label>
                <label><input type="checkbox" id="f_45"> 우울</label>
                <label><input type="checkbox" id="f_46"> 불안</label>
                <label><input type="checkbox" id="f_47"> 환청</label>
                <label><input type="checkbox" id="f_48"> 망상</label>
                <label><input type="checkbox" id="f_49"> 알코올 사용</label>
                <label><input type="checkbox" id="f_50"> 기타 <input type="text" id="f_51"></label>
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">증상 내용 (상세 기술)</label>
            <textarea id="f_163" class="form-control" placeholder="구체적 관찰 내용 기록"></textarea>
        </div>
    </div>
`;

    // --- 3. 대상자 특징 ---
    out += `
    <div class="section-title">3. 대상자 특징</div>
    <div class="card">
        <div class="row">
            <div class="col">
                <label class="form-label">외형</label>
                <div class="checkbox-group">
                    <label><input type="checkbox" id="f_52"> 불결</label>
                    <label><input type="checkbox" id="f_53"> 정상</label>
                    <label><input type="checkbox" id="f_54"> 기타 <input type="text" id="f_55"></label>
                </div>
            </div>
            <div class="col">
                <label class="form-label">언어</label>
                <div class="checkbox-group">
                    <label><input type="checkbox" id="f_56"> 횡설수설</label>
                    <label><input type="checkbox" id="f_57"> 단답형</label>
                    <label><input type="checkbox" id="f_58"> 침묵</label>
                    <label><input type="checkbox" id="f_59"> 정상</label>
                </div>
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">행동</label>
            <div class="checkbox-group">
                <label><input type="checkbox" id="f_60"> 흥분</label>
                <label><input type="checkbox" id="f_61"> 위협</label>
                <label><input type="checkbox" id="f_62"> 도주 시도</label>
                <label><input type="checkbox" id="f_63"> 공격성 없음</label>
                <label><input type="checkbox" id="f_64"> 기타 <input type="text" id="f_65"></label>
            </div>
        </div>
    </div>
`;

    // --- 4. 보호자 반응 ---
    out += `
    <div class="section-title">4. 보호자 반응</div>
    <div class="card">
        <div class="form-group">
            <label class="form-label">보호자 협조도</label>
            <div class="checkbox-group">
                <label><input type="checkbox" id="f_66"> 협조적</label>
                <label><input type="checkbox" id="f_67"> 비협조적</label>
                <label><input type="checkbox" id="f_68"> 부재</label>
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">특이사항</label>
            <textarea id="f_164" class="form-control" rows="2"></textarea>
        </div>
    </div>
`;

    // --- 5. 개입 내용 ---
    out += `
    <div class="section-title">5. 개입 내용</div>
    <div class="card">
        <div class="row">
            <div class="col"><label class="form-label">일시</label><input type="text" id="f_69" class="form-control" placeholder="YYYY.MM.DD HH:mm"></div>
            <div class="col"><label class="form-label">장소</label><input type="text" id="f_70" class="form-control"></div>
        </div>
        <div class="form-group">
            <label class="form-label">개입 요청 대상</label>
            <div class="checkbox-group">
                <label><input type="checkbox" id="f_71"> 행정기관</label>
                <label><input type="checkbox" id="f_72"> 의료기관</label>
                <label><input type="checkbox" id="f_73"> 지역복지기관</label>
                <label><input type="checkbox" id="f_74"> 기타 <input type="text" id="f_75"></label>
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">동행자 (출동)</label>
            <div class="checkbox-group">
                <label><input type="checkbox" id="f_76"> 보건소</label>
                <label><input type="checkbox" id="f_77"> 경찰</label>
                <label><input type="checkbox" id="f_78"> 소방</label>
                <label><input type="checkbox" id="f_79"> 행정복지센터</label>
                <label><input type="checkbox" id="f_80"> 기타 <input type="text" id="f_81"></label>
            </div>
        </div>
        <div class="row">
            <div class="col">
                <label class="form-label">대상자 반응</label>
                <div class="checkbox-group">
                    <label><input type="checkbox" id="f_82"> 수용</label>
                    <label><input type="checkbox" id="f_83"> 거부</label>
                    <label><input type="checkbox" id="f_84"> 혼란</label>
                    <label><input type="checkbox" id="f_85"> 기타 <input type="text" id="f_86"></label>
                </div>
            </div>
            <div class="col">
                <label class="form-label">개입 방법</label>
                <div class="checkbox-group">
                    <label><input type="checkbox" id="f_87"> 대면상담</label>
                    <label><input type="checkbox" id="f_88"> 상담거부</label>
                    <label><input type="checkbox" id="f_89"> 병원 이송</label>
                    <label><input type="checkbox" id="f_90"> 기타 <input type="text" id="f_91"></label>
                </div>
            </div>
        </div>
    </div>
`;

    // --- 6. 위기상황 판단 ---
    out += `
    <div class="section-title">6. 위기상황 판단</div>
    <div class="card">
        <label class="form-label" style="font-size:14px; font-weight:700; border-bottom:1px solid #e2e8f0; margin-bottom:10px;">자살·자해 위험 (유증상 시 하단 '7.자살세부항목' 구체적 기록)</label>
        <div class="row">
            <div class="col">
                <label class="form-label">현재 위험</label>
                <div class="checkbox-group">
                    <label><input type="checkbox" id="f_92"> 있음</label>
                    <label><input type="checkbox" id="f_93"> 없음</label>
                </div>
            </div>
            <div class="col">
                <label class="form-label">과거 위험</label>
                <div class="checkbox-group">
                    <label><input type="checkbox" id="f_94"> 있음</label>
                    <label><input type="checkbox" id="f_95"> 없음</label>
                </div>
            </div>
        </div>
        
        <label class="form-label" style="font-size:14px; font-weight:700; border-bottom:1px solid #e2e8f0; margin-bottom:10px; margin-top:20px;">타해 위험</label>
        <div class="row">
            <div class="col">
                <label class="form-label">현재 위험</label>
                <div class="checkbox-group">
                    <label><input type="checkbox" id="f_96"> 있음</label>
                    <label><input type="checkbox" id="f_97"> 없음</label>
                </div>
            </div>
            <div class="col">
                <label class="form-label">과거 위험</label>
                <div class="checkbox-group">
                    <label><input type="checkbox" id="f_98"> 있음</label>
                    <label><input type="checkbox" id="f_99"> 없음</label>
                </div>
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">타해 위험 내용 기록</label>
            <textarea id="f_165" class="form-control" rows="2"></textarea>
        </div>

        <div class="form-group" style="margin-top:20px;">
            <label class="form-label">위기 정도</label>
            <div class="checkbox-group">
                <label><input type="checkbox" id="f_100"> 경미</label>
                <label><input type="checkbox" id="f_101"> 중증도</label>
                <label><input type="checkbox" id="f_102"> 심각</label>
            </div>
        </div>

        <label class="form-label" style="font-size:14px; font-weight:700; border-bottom:1px solid #e2e8f0; margin-bottom:10px; margin-top:20px;">CRI 분석 점수</label>
        <div class="row" style="background:#f1f5f9; padding:15px; border-radius:8px; border:1px solid #e2e8f0;">
            <div class="col" style="text-align:center;"><label class="form-label">자타해위험</label><input type="text" id="f_103" class="form-control" style="text-align:center;"></div>
            <div class="col" style="text-align:center;"><label class="form-label">정신상태</label><input type="text" id="f_104" class="form-control" style="text-align:center;"></div>
            <div class="col" style="text-align:center;"><label class="form-label">기능수준</label><input type="text" id="f_105" class="form-control" style="text-align:center;"></div>
            <div class="col" style="text-align:center;"><label class="form-label">지지체계</label><input type="text" id="f_106" class="form-control" style="text-align:center;"></div>
            <div class="col-2" style="text-align:center;"><label class="form-label">최종 판정결과</label><input type="text" id="f_107" class="form-control"></div>
        </div>
    </div>
`;

    // --- 7. 자살세부 항목 ---
    out += `
    <div class="section-title">7. 자살세부 항목 (유증상자 작성)</div>
    <div class="card">
        <div class="form-group" style="background:var(--bg-sub); padding:10px; border-radius:6px; margin-bottom:15px;">
            <label class="form-label" style="margin-bottom:8px; font-weight:700;">[현재 시도]</label>
            <div class="checkbox-group" style="background:white; margin-bottom:10px;">
                <label><input type="checkbox" id="f_108"> 유</label>
                <label><input type="checkbox" id="f_109"> 무</label>
                <label><input type="checkbox" id="f_110"> 미파악</label>
            </div>
            <label class="form-label">현재 시도방법</label>
            <div class="checkbox-group grid-col" style="background:white;">
                <label><input type="checkbox" id="f_111"> 음독</label>
                <label><input type="checkbox" id="f_112"> 질식</label>
                <label><input type="checkbox" id="f_113"> 추락</label>
                <label><input type="checkbox" id="f_114"> 운수사고</label>
                <label><input type="checkbox" id="f_115"> 흉기</label>
                <label><input type="checkbox" id="f_116"> 화상</label>
                <label><input type="checkbox" id="f_117"> 기타</label>
                <label><input type="checkbox" id="f_118"> 미상</label>
                <label><input type="checkbox" id="f_119"> 없음</label>
            </div>
        </div>

        <div class="form-group" style="background:var(--bg-sub); padding:10px; border-radius:6px; margin-bottom:15px;">
            <label class="form-label" style="margin-bottom:8px; font-weight:700;">[과거 시도력]</label>
            <div class="checkbox-group" style="background:white; margin-bottom:10px;">
                <label><input type="checkbox" id="f_120"> 유</label>
                <label><input type="checkbox" id="f_121"> 무</label>
                <label><input type="checkbox" id="f_122"> 미파악</label>
            </div>
            <label class="form-label">과거 시도횟수</label>
            <div class="checkbox-group" style="background:white; margin-bottom:10px;">
                <label><input type="checkbox" id="f_123"> 없음</label>
                <label><input type="checkbox" id="f_124"> 1회</label>
                <label><input type="checkbox" id="f_125"> 2~3회</label>
                <label><input type="checkbox" id="f_126"> 4~5회</label>
                <label><input type="checkbox" id="f_127"> 6~10회</label>
                <label><input type="checkbox" id="f_128"> 11회 이상</label>
                <label><input type="checkbox" id="f_129"> 미파악</label>
            </div>
            <label class="form-label">과거 시도방법</label>
            <div class="checkbox-group grid-col" style="background:white;">
                <label><input type="checkbox" id="f_130"> 음독</label>
                <label><input type="checkbox" id="f_131"> 질식</label>
                <label><input type="checkbox" id="f_132"> 추락</label>
                <label><input type="checkbox" id="f_133"> 운수사고</label>
                <label><input type="checkbox" id="f_134"> 흉기</label>
                <label><input type="checkbox" id="f_135"> 화상</label>
                <label><input type="checkbox" id="f_136"> 기타</label>
                <label><input type="checkbox" id="f_137"> 미상</label>
                <label><input type="checkbox" id="f_138"> 없음</label>
            </div>
        </div>

        <div class="row">
            <div class="col">
                <label class="form-label">주변인 자살</label>
                <div class="checkbox-group">
                    <label><input type="checkbox" id="f_139"> 유</label>
                    <label><input type="checkbox" id="f_140"> 무</label>
                    <label><input type="checkbox" id="f_141"> 미파악</label>
                </div>
            </div>
            <div class="col">
                <label class="form-label">자살계획 여부</label>
                <div class="checkbox-group">
                    <label><input type="checkbox" id="f_142"> 유</label>
                    <label><input type="checkbox" id="f_143"> 무</label>
                    <label><input type="checkbox" id="f_144"> 미파악</label>
                </div>
            </div>
        </div>
        
        <div class="form-group">
            <label class="form-label">자살계획 수단 (계획 있을 경우)</label>
            <div class="checkbox-group grid-col">
                <label><input type="checkbox" id="f_145"> 음독</label>
                <label><input type="checkbox" id="f_146"> 질식</label>
                <label><input type="checkbox" id="f_147"> 추락</label>
                <label><input type="checkbox" id="f_148"> 운수사고</label>
                <label><input type="checkbox" id="f_149"> 흉기</label>
                <label><input type="checkbox" id="f_150"> 화상</label>
                <label><input type="checkbox" id="f_151"> 기타</label>
                <label><input type="checkbox" id="f_152"> 미상</label>
                <label><input type="checkbox" id="f_153"> 없음</label>
            </div>
        </div>
    </div>
`;

    // --- 8. 개입결과 ---
    out += `
    <div class="section-title">8. 개입결과</div>
    <div class="card">
        <div class="form-group">
            <label class="form-label">주요조치 분류</label>
            <div class="checkbox-group">
                <label><input type="checkbox" id="f_154"> 입원치료(응급,행정,자의 등)</label>
                <label><input type="checkbox" id="f_155"> 등록관리</label>
                <label><input type="checkbox" id="f_156"> 지속상담</label>
                <label><input type="checkbox" id="f_157"> 개입종결</label><br style="width:100%; height:8px; display:block;"/>
                <label><input type="checkbox" id="f_158"> 서비스 연계 <input type="text" id="f_159" placeholder="연계기관 명"></label>
                <label><input type="checkbox" id="f_160"> 기타조치 <input type="text" id="f_161"></label>
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">결과 및 담당자 소견</label>
            <textarea id="f_166" class="form-control" rows="4"></textarea>
        </div>
    </div>

    <!-- 9. 작성 날짜(문서하단) -->
    <div class="form-group card" style="text-align:center; background:#f8fafc; border:none;">
        <label class="form-label" style="display:inline-block; margin-right:10px;">보고서 최종 작성일자</label>
        <input type="text" id="f_162" class="form-control" style="width:200px; display:inline-block;" placeholder="YYYY 년 MM 월 DD 일">
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/toastify-js"></script>
<script>
    const API_URL = \`\${(typeof window !== 'undefined' ? window.location.origin : 'http://localhost')}/api/auth\`;

    // 1~166 Payload Generate
    function getPayload() {
        const p = {};
        for(let i=1; i<=166; i++) {
            const el = document.getElementById('f_'+i);
            if(el) {
                if(el.type === 'checkbox' || el.type === 'radio') p['f_'+i] = el.checked;
                else p['f_'+i] = el.value;
            }
        }
        return p;
    }

    function triggerPreview() {
        if (window.updateTimeout) clearTimeout(window.updateTimeout);
        window.updateTimeout = setTimeout(() => {
            window.parent.postMessage({ type: 'updatePreview', payload: getPayload() }, '*');
        }, 150);
    }

    document.querySelectorAll('input, select, textarea').forEach(el => {
        el.addEventListener('input', triggerPreview);
        el.addEventListener('change', triggerPreview);
    });

    // Today Date Init Utility
    document.addEventListener('DOMContentLoaded', () => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        
        if(!document.getElementById('f_1').value) document.getElementById('f_1').value = \`\${yyyy}-\${mm}-\${dd}\`;
        if(!document.getElementById('f_162').value) document.getElementById('f_162').value = \`\${yyyy} 년 \${mm} 월 \${dd} 일\`;
        triggerPreview();
    });

    window.addEventListener('message', function (event) {
        if (event.data.action === 'save') {
           saveData(event.data.commonData);
        } else if (event.data.action === 'updateCommon') {
           triggerPreview();
        } else if (event.data.action === 'unlockInputs') {
           document.querySelectorAll('input, select, textarea').forEach(el => el.disabled = false);
        } else if (event.data.action === 'loadDoc') {
           const doc = event.data.data;
           const content = doc.content || {};
           for(let i=1; i<=166; i++) {
               const el = document.getElementById('f_'+i);
               if(el) {
                   if(el.type === 'checkbox' || el.type === 'radio') el.checked = !!content['f_'+i];
                   else el.value = content['f_'+i] || '';
               }
           }
           document.querySelectorAll('input, select, textarea').forEach(el => el.disabled = true);
           triggerPreview();
        }
    });

    function saveData(commonData) {
        const content = getPayload();
        const target_name = content.f_3 || ''; // 성명 (f_3)

        if (!target_name) {
            Toastify({ text: "대상자 성명을 입력해주세요.", style: { background: "#ef4444" }, duration: 3000 }).showToast();
            window.parent.postMessage({ type: 'saveError' }, '*');
            return;
        }

        fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'save_issued_doc',
                type: '응급개입 기록지(수정본)',
                target_name: target_name,
                title: \`응급개입기록지(\${target_name})\`,
                content: { ...commonData, ...content },
                issuer: commonData.issuer
            })
        })
        .then(res => res.json())
        .then(json => {
            if (json.result === 'success') {
                window.parent.postMessage({ type: 'saveSuccess', id: json.id }, '*');
            } else {
                Toastify({ text: "오류 발생: " + json.message, style: { background: "#ef4444" }, duration: 4000 }).showToast();
                window.parent.postMessage({ type: 'saveError' }, '*');
            }
        })
        .catch(err => {
            Toastify({ text: "서버 오류", style: { background: "#ef4444" }, duration: 4000 }).showToast();
            window.parent.postMessage({ type: 'saveError' }, '*');
        });
    }
</script>
</body>
</html>`;

    fs.writeFileSync('c:\\Users\\SKH\\Desktop\\pcserver\\apps\\doc_forms\\응급개입 기록지(수정본).html', out);
    console.log("Modern UI generated successfully!");
}
buildHtml();
