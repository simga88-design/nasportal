const eventBus = require('./eventBus');
const notificationService = require('../services/notificationService');
const docService = require('../services/docService');

// Listen to various events and dispatch to services

eventBus.on('approval:requested', (data) => {
    // data: { title, approval_id, typeLabel, nextApproverId }
    notificationService.sendInternalNotification(data.nextApproverId, 'APPROVAL', '결재 요청', `[${data.typeLabel || '전자결재'}] ${data.title}`, `./apps/approval.html?id=${data.approval_id}`);
});

eventBus.on('approval:completed', (data) => {
    // data: { drafter_id, title, approval_id, linkedDocId }
    notificationService.sendInternalNotification(data.drafter_id, 'APPROVAL', '결재 완료', `[${data.title}] 문서가 최종 승인되었습니다.`, `./apps/approval.html?id=${data.approval_id}`);
    docService.syncLinkedDocStatus(data.linkedDocId, '결재 완료');
});

eventBus.on('approval:rejected', (data) => {
    // data: { drafter_id, title, approval_id, comment, linkedDocId, prevApproverIds }
    const rejectMsg = `[${data.title}] 문서가 반려되었습니다.\n사유: ${data.comment || '없음'}`;
    notificationService.sendInternalNotification(data.drafter_id, 'APPROVAL', '결재 반려', rejectMsg, `./apps/approval.html?id=${data.approval_id}`);

    // Notify previous approvers
    (data.prevApproverIds || []).forEach(pId => {
        if (pId !== data.drafter_id) {
            notificationService.sendInternalNotification(pId, 'APPROVAL', '결재 반려 안내 (참조)', `[${data.title}] 내가 결재했던 문서가 다음 단계에서 반려되었습니다.\n사유: ${data.comment || '없음'}`, `./apps/approval.html?id=${data.approval_id}`);
        }
    });

    docService.syncLinkedDocStatus(data.linkedDocId, '결재 반려');
});

eventBus.on('approval:withdrawn', (data) => {
    // data: { approval_id, linkedDocId }
    docService.syncLinkedDocStatus(data.linkedDocId, '결재 회수');
});

eventBus.on('approval:created', (data) => {
    // data: { approval_id, linkedDocId }
    docService.syncLinkedDocStatus(data.linkedDocId, '결재중');
});

// Circulation Events
eventBus.on('circulation:created', (data) => {
    // data: { author, title, docId, readers }
    (data.readers || []).forEach(rId => {
        notificationService.sendInternalNotification(rId, 'CIRC', '새 공람 문서', `[공람] ${data.author}님이 새 공람을 등록했습니다.`, './apps/circulation.html');
    });
});

eventBus.on('circulation:unread_reminder', (data) => {
    // data: { unreadUserIds, title }
    (data.unreadUserIds || []).forEach(uId => {
        notificationService.sendInternalNotification(uId, 'CIRC', '공람 미확인 알림', `[알림] '${data.title}' 문서가 아직 미확인 상태입니다. 내용 확인 바랍니다.`, './apps/circulation.html');
    });
});

// Inquiry Events
eventBus.on('inquiry:answered', (data) => {
    // data: { drafterId, title, inquiryId }
    notificationService.sendInternalNotification(data.drafterId, 'INQ', '기안 문의 답변 등록', `[${data.title}] 문의에 대한 답변이 등록되었습니다.`, `./apps/circulation.html?focus=${data.inquiryId}`);
});

// Board Events
eventBus.on('notice:created', (data) => {
    (data.userIds || []).forEach(userId => {
        notificationService.sendInternalNotification(userId, data.notiType, data.titlePrefix, data.messageBody, './apps/notice.html');
    });
});

console.log('[EventBus] Subscribers registered successfully');
