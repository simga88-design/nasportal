class Modal {
    static init() {
        if (!document.getElementById('global-modal-container')) {
            const container = document.createElement('div');
            container.id = 'global-modal-container';
            container.className = 'modal-overlay';
            container.style.display = 'none';
            container.innerHTML = `
                <div class="modal-box">
                    <h3 id="modal-title">알림</h3>
                    <div id="modal-body" class="modal-body"></div>
                    <div id="modal-input-container" style="display:none;">
                        <input type="text" id="modal-input" class="modal-input">
                    </div>
                    <div class="modal-buttons" id="modal-buttons">
                        <button id="btn-cancel" class="btn-gray">취소</button>
                        <button id="btn-ok" class="btn-blue">확인</button>
                    </div>
                </div>
            `;
            document.body.appendChild(container);
            
            // ESC key handler
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && document.getElementById('global-modal-container').style.display === 'flex') {
                    // Default to Cancel behavior
                   if(Modal.currentReject) Modal.currentReject('cancelled');
                   Modal.close();
                }
                // Enter key for swift submission (except textarea, but we only have input text for prompt)
                if (e.key === 'Enter' && document.getElementById('global-modal-container').style.display === 'flex') {
                    document.getElementById('btn-ok').click();
                }
            });
        }

        if (!document.getElementById('global-toast-container')) {
             const toastContainer = document.createElement('div');
             toastContainer.id = 'global-toast-container';
             toastContainer.className = 'toast-container';
             document.body.appendChild(toastContainer);
        }
    }

    static show(title, body, type = 'alert', defaultValue = '') {
        return new Promise((resolve, reject) => {
            Modal.init(); // Ensure DOM exists
            
            const container = document.getElementById('global-modal-container');
            const titleEl = document.getElementById('modal-title');
            const bodyEl = document.getElementById('modal-body');
            const inputContainer = document.getElementById('modal-input-container');
            const inputEl = document.getElementById('modal-input');
            const btnOk = document.getElementById('btn-ok');
            const btnCancel = document.getElementById('btn-cancel');

            titleEl.innerText = title; // '알림', '확인', '입력' etc.
            bodyEl.innerHTML = body; // Support HTML content
            
            // Reset state
            inputContainer.style.display = 'none';
            btnCancel.style.display = 'none';
            inputEl.value = '';
            
            // Clone buttons to remove old event listeners
            const newBtnOk = btnOk.cloneNode(true);
            const newBtnCancel = btnCancel.cloneNode(true);
            btnOk.parentNode.replaceChild(newBtnOk, btnOk);
            btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);

            // Store current reject for ESC key
            Modal.currentReject = reject;

            if (type === 'confirm') {
                newBtnCancel.style.display = 'inline-block';
                newBtnOk.innerText = '확인';
                
                newBtnOk.onclick = () => { Modal.close(); resolve(true); };
                newBtnCancel.onclick = () => { Modal.close(); resolve(false); };
            } else if (type === 'prompt') {
                newBtnCancel.style.display = 'inline-block';
                inputContainer.style.display = 'block';
                inputEl.value = defaultValue;
                newBtnOk.innerText = '확인';

                newBtnOk.onclick = () => { 
                    const val = inputEl.value; 
                    Modal.close(); 
                    resolve(val); 
                };
                newBtnCancel.onclick = () => { Modal.close(); resolve(null); };

                setTimeout(() => inputEl.focus(), 100); 
            } else {
                // Alert
                newBtnOk.innerText = '확인';
                newBtnOk.onclick = () => { Modal.close(); resolve(); };
            }

            container.style.display = 'flex';
            if (type !== 'prompt') newBtnOk.focus();
        });
    }

    static close() {
        const container = document.getElementById('global-modal-container');
        if(container) container.style.display = 'none';
        Modal.currentReject = null;
    }

    static async alert(message, title = '알림') {
        return Modal.show(title, message, 'alert');
    }

    static async confirm(message, title = '확인') {
        return Modal.show(title, message, 'confirm');
    }

    static async prompt(message, defaultValue = '', title = '입력') {
        return Modal.show(title, message, 'prompt', defaultValue);
    }

    static toast(message, type = 'info') {
        Modal.init();
        const container = document.getElementById('global-toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerText = message;
        
        container.appendChild(toast);
        
        // Animation
        setTimeout(() => toast.classList.add('show'), 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Make it global
window.Modal = Modal;
