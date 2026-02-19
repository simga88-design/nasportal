/**
 * DataManager.js
 * 중앙 데이터 관리 모듈 (Client-Side Caching & Pre-fetching)
 * 
 * 기능:
 * 1. GAS 서버 데이터 요청 및 로컬 스토리지 캐싱
 * 2. Stale-While-Revalidate 패턴 구현 (캐시 우선 표시 -> 백그라운드 갱신)
 */

const DataManager = {
    CACHE_KEYS: {
        MEMBERS: 'jc_portal_members',
        TEAMS: 'jc_portal_teams',
        NOTICES: 'jc_portal_notices',
        EVENTS_PREFIX: 'jc_portal_events_' // + YYYY_MM
    },

    // pendingRequests stores promises for ongoing network fetches to prevent duplicates
    pendingRequests: {},

    /**
     * 기본 캐싱 로직
     * @param {string} key 캐시 키
     * @param {object} payload GAS 요청 바디
     * @param {function} callback 데이터가 준비되면 호출되는 콜백 (캐시 데이터로 1번, 서버 데이터로 2번 호출될 수 있음)
     */
    async fetchData(key, payload, callback) {
        // 1. 캐시 확인 및 즉시 반환
        const cached = localStorage.getItem(key);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                console.log(`[DataManager] Cache Hit: ${key}`);
                if (callback) callback(parsed, true); // true = isCache
            } catch (e) {
                console.error('[DataManager] Cache parse error', e);
            }
        }

        // 2. 네트워크 요청 (Background)
        // 동일한 키에 대한 요청이 이미 진행 중이면 새 요청 대신 기존 요청을 기다림
        if (this.pendingRequests[key]) {
            console.log(`[DataManager] Request already pending for: ${key}. Waiting...`);
            try {
                const result = await this.pendingRequests[key];
                if (callback && result) callback(result, false);
                return;
            } catch (e) {
                // 부모 요청 실패 시 에러 전파 생략 (부모에서 이미 로그 남김)
                return;
            }
        }

        const fetchWithRetry = async (retryCount = 0) => {
            try {
                console.log(`[DataManager] Fetching network (${retryCount > 0 ? 'Retry ' + retryCount : 'initial'}): ${key}`);
                const res = await fetch(BASE_URL, {
                    method: 'POST',
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

                const json = await res.json();

                if (json.result === 'success') {
                    const newStr = JSON.stringify(json);
                    if (cached !== newStr) {
                        try {
                            localStorage.setItem(key, newStr);
                            console.log(`[DataManager] Cache Updated: ${key}`);
                        } catch (storageErr) {
                            console.warn(`[DataManager] Failed to update cache for ${key}. Storage might be full.`, storageErr);
                        }
                        if (callback) callback(json, false);
                    } else {
                        console.log(`[DataManager] Data unchanged: ${key}`);
                    }
                    return json;
                } else {
                    throw new Error(json.message || 'Unknown server error');
                }
            } catch (e) {
                if (retryCount < 1) { // 1번만 재시도
                    console.warn(`[DataManager] Fetch failed, retrying... (${e.message})`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return fetchWithRetry(retryCount + 1);
                }
                throw e;
            }
        };

        this.pendingRequests[key] = fetchWithRetry();

        try {
            await this.pendingRequests[key];
        } catch (e) {
            console.error(`[DataManager] Final Network error for ${key}:`, e);
            // 에러 발생 시에도 콜백을 호출하여 UI 상태(로딩 등) 해제 유도
            if (callback) {
                callback({ result: 'error', message: '네트워크 연결 실패 (서버 응답 없음)' }, false);
            }
        } finally {
            delete this.pendingRequests[key];
        }
    },

    /**
     * 전체 직원 데이터 가져오기/갱신 (로그인 직후 호출 추천)
     */
    async syncGlobalData() {
        console.log('[DataManager] Syncing Global Data...');
        // Members
        await this.fetchData(this.CACHE_KEYS.MEMBERS, { action: 'get_members' });
        // Teams
        await this.fetchData(this.CACHE_KEYS.TEAMS, { action: 'get_teams' });
    },

    getMembers(callback) {
        return this.fetchData(this.CACHE_KEYS.MEMBERS, { action: 'get_members' }, callback);
    },

    getTeams(callback) {
        return this.fetchData(this.CACHE_KEYS.TEAMS, { action: 'get_teams' }, callback);
    },

    getNotices(callback) {
        return this.fetchData(this.CACHE_KEYS.NOTICES, { action: 'get_notices' }, callback);
    },

    /**
     * 월별 일정 가져오기
     * @param {string} yearMonth 'YYYY-MM'
     */
    getEvents(yearMonth, callback) {
        // 현재는 전체 로딩 방식이므로 일단 'get_events' 사용
        // 추후 GAS 스크립트에 월별 필터링 기능 추가 시 payload 변경 필요
        // 현재는 전체 로딩 후 클라이언트 필터링 전략 사용
        // 키는 하나로 통일: EVENTS_ALL
        const key = 'jc_portal_events_all';
        return this.fetchData(key, { action: 'get_events' }, callback);
    }
};
