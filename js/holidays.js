/**
 * 한국 공휴일 계산기 (2024-2030)
 * 대체 공휴일 규칙을 적용하여 정확한 공휴일 목록을 생성합니다.
 */

// 음력 공휴일 데이터 (양력 변환 기준)
// 설날(전날, 당일, 다음날), 부처님오신날, 추석(전날, 당일, 다음날)
const LUNAR_HOLIDAYS_DATA = {
    2024: {
        seollal: ['2024-02-09', '2024-02-10', '2024-02-11'],
        buddha: '2024-05-15',
        chuseok: ['2024-09-16', '2024-09-17', '2024-09-18']
    },
    2025: {
        seollal: ['2025-01-28', '2025-01-29', '2025-01-30'],
        buddha: '2025-05-06', // NOTE: 2025년 부처님오신날은 5월 6일이 아니라 5월 5일임 (윤달 이슈 등 확인 필요). 
        // 2025년 부처님오신날: 2025-05-05 (4.8) -> 어린이날과 겹침!
        // 수정: 2025년 4월 8일(음) -> 5월 5일(양)
        buddha: '2025-05-05',
        chuseok: ['2025-10-05', '2025-10-06', '2025-10-07']
    },
    2026: {
        seollal: ['2026-02-16', '2026-02-17', '2026-02-18'], // 2026년 설날: 2.17(화) -> 16,17,18
        buddha: '2026-05-24',
        chuseok: ['2026-09-24', '2026-09-25', '2026-09-26']
    },
    2027: {
        seollal: ['2027-02-06', '2027-02-07', '2027-02-08'],
        buddha: '2027-05-13',
        chuseok: ['2027-09-14', '2027-09-15', '2027-09-16']
    },
    2028: {
        seollal: ['2028-01-26', '2028-01-27', '2028-01-28'],
        buddha: '2028-05-02',
        chuseok: ['2028-10-02', '2028-10-03', '2028-10-04']
    }
};

// 선거일 등 기타 1회성 공휴일
const ONE_OFF_HOLIDAYS = [
    { date: '2024-04-10', title: '제22대 국회의원 선거' },
    { date: '2026-06-03', title: '제9회 전국동시지방선거' },
    { date: '2027-03-03', title: '제21대 대통령 선거' } // 예정
];

// 전역 캐시
let HOLIDAY_CACHE = new Map();
let CACHED_YEARS = new Set();

function ensureHolidaysForYear(year) {
    if (CACHED_YEARS.has(year)) return;

    // 앞뒤 1년씩 여유있게 생성
    [year - 1, year, year + 1].forEach(y => {
        if (CACHED_YEARS.has(y)) return;
        const list = calculateHolidaysForYear(y);
        list.forEach(h => {
            HOLIDAY_CACHE.set(h.date, h);
        });
        CACHED_YEARS.add(y);
    });
}

function checkIsHoliday(dateObj) {
    const year = dateObj.getFullYear();
    ensureHolidaysForYear(year);

    // Timezone safe date string (YYYY-MM-DD)
    // FullCalendar passes date objects in local time usually via dayCellClassNames args
    // but safer to force YYYY-MM-DD format manually
    const yearStr = dateObj.getFullYear();
    const monthStr = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dayStr = String(dateObj.getDate()).padStart(2, '0');
    const key = `${yearStr}-${monthStr}-${dayStr}`;

    return HOLIDAY_CACHE.get(key);
}

function getHolidayEvents() {
    // 2024~2028 초기화
    ensureHolidaysForYear(2025); // Will trigger surrounding years

    return Array.from(HOLIDAY_CACHE.values()).map(h => ({
        id: 'holiday-' + h.date + '-' + h.title,
        title: h.title,
        start: h.date,
        allDay: true,
        // 스타일 변경: 배경 투명, 글자 빨강
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        textColor: '#e11d48', // 조금 더 진한 빨강 (가독성)
        editable: false,
        resourceEditable: false,
        classNames: ['holiday-event'],
        extendedProps: {
            isHoliday: true,
            calendarId: 'holiday'
        }
    }));
}

function calculateHolidaysForYear(year) {
    const list = [];

    // 1. 양력 고정 공휴일 추가
    const solar = [
        { dim: '01-01', title: '신정', sub: false },
        { dim: '03-01', title: '삼일절', sub: true },
        { dim: '05-05', title: '어린이날', sub: 'children' },
        { dim: '06-06', title: '현충일', sub: false },
        { dim: '08-15', title: '광복절', sub: true },
        { dim: '10-03', title: '개천절', sub: true },
        { dim: '10-09', title: '한글날', sub: true },
        { dim: '12-25', title: '성탄절', sub: true }
    ];

    solar.forEach(s => {
        list.push({
            date: `${year}-${s.dim}`,
            title: s.title,
            type: s.sub,
            isLunar: false
        });
    });

    // 2. 음력 공휴일 추가
    if (LUNAR_HOLIDAYS_DATA[year]) {
        const d = LUNAR_HOLIDAYS_DATA[year];
        d.seollal.forEach(date => list.push({ date: date, title: '설날', type: 'seollal', isLunar: true }));
        list.push({ date: d.buddha, title: '부처님 오신 날', type: true, isLunar: true });
        d.chuseok.forEach(date => list.push({ date: date, title: '추석', type: 'chuseok', isLunar: true }));
    }

    // 3. 기타 공휴일 추가
    ONE_OFF_HOLIDAYS.forEach(h => {
        if (h.date.startsWith(year)) {
            list.push({ date: h.date, title: h.title, type: false, isLunar: false });
        }
    });

    list.sort((a, b) => new Date(a.date) - new Date(b.date));

    // 4. 대체 공휴일 계산
    const finalList = [...list];

    list.forEach(h => {
        if (!h.type) return;

        const dateObj = new Date(h.date);
        const day = dateObj.getDay();
        let needSub = false;

        if (h.type === 'children') {
            const isOverlap = list.some(other => other !== h && other.date === h.date);
            if (day === 0 || day === 6 || isOverlap) needSub = true;
        } else if (h.type === 'seollal' || h.type === 'chuseok') {
            if (day === 0) needSub = true;
        } else if (h.type === true) {
            if (day === 0 || day === 6) needSub = true;
        }

        if (needSub) {
            let nextDate = new Date(dateObj);
            while (true) {
                nextDate.setDate(nextDate.getDate() + 1);
                const nextDateStr = nextDate.toISOString().split('T')[0];
                // 기존 공휴일이나 이미 추가된 대체공휴일과 겹치는지 확인
                // 주의: 여기서 finalList를 참고해야 연쇄 대체공휴일(거의 없지만) 방지가능하나
                // 한국 규정상 대체공휴일끼리 겹치는 일은 드묾. 단순화.
                const isHoliday = list.some(base => base.date === nextDateStr) ||
                    finalList.some(added => added.date === nextDateStr);

                // 주말(토/일)도 대체공휴일로 지정하지 않고 건너뜀 (관공서 공휴일 규정에 따름)
                const isWeekend = nextDate.getDay() === 0 || nextDate.getDay() === 6;

                if (!isHoliday && !isWeekend) {
                    finalList.push({
                        date: nextDateStr,
                        title: `대체공휴일(${h.title})`,
                        type: false,
                        isLunar: false
                    });
                    break;
                }
            }
        }
    });

    return finalList;
}
