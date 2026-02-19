
import { DOC_DEFINITIONS } from './definitions.js';

export class DocEngine {
    constructor(formContainerId, previewContainerId) {
        this.formContainer = document.getElementById(formContainerId);
        this.previewContainer = document.getElementById(previewContainerId);
        this.currentDoc = null;
        this.data = {};
        this.isReadOnly = false;

        // Common Data
        this.commonData = {
            issueDate: new Date().toISOString().split('T')[0],
            issuer: ''
        };
    }

    init(user) {
        if (user) {
            this.commonData.issuer = user.name;
        }
        document.getElementById('issuer').value = this.commonData.issuer;
        document.getElementById('issueDate').value = this.commonData.issueDate;

        // Bind Common Inputs
        document.getElementById('issuer').addEventListener('input', () => this.updatePreview());
        document.getElementById('issueDate').addEventListener('input', () => this.updatePreview());
    }

    async loadDocument(docKey) {
        const def = DOC_DEFINITIONS[docKey];
        if (!def) return;
        this.currentDoc = def;
        this.data = {}; // Reset data

        // 1. Render Form
        this.renderForm(def);

        // 2. Load Template
        try {
            const res = await fetch(def.templateUrl);
            const html = await res.text();
            this.previewContainer.innerHTML = html;
        } catch (e) {
            this.previewContainer.innerHTML = `<div style="color:red">템플릿 로드 실패: ${e.message}</div>`;
        }

        // 3. Initial Preview Update
        this.updatePreview();
    }

    renderForm(def) {
        this.formContainer.innerHTML = '';

        const row = document.createElement('div');
        row.className = 'row';
        let currentRow = row;

        let rowBuffer = [];

        def.fields.forEach(field => {
            if (field.type === 'separator') {
                if (rowBuffer.length > 0) { this.flushRow(rowBuffer); rowBuffer = []; }
                const hr = document.createElement('hr');
                hr.style.cssText = "border:0; border-top:1px dashed #e2e8f0; margin:15px 0;";
                this.formContainer.appendChild(hr);
                return;
            }

            // Add to buffer
            rowBuffer.push(field);

            // Flush if full width or buffer size >= 2 (assuming 2 cols max for now simplicity)
            if (field.width === 'full' || rowBuffer.length >= 2) {
                this.flushRow(rowBuffer);
                rowBuffer = [];
            }
        });
        if (rowBuffer.length > 0) this.flushRow(rowBuffer);
    }

    flushRow(fields) {
        if (fields.length === 1 && fields[0].width === 'full') {
            const field = fields[0];
            const group = document.createElement('div');
            group.className = 'form-group';
            group.innerHTML = this.buildFieldHtml(field);
            this.formContainer.appendChild(group);
        } else {
            const row = document.createElement('div');
            row.className = 'row';
            row.style.marginTop = "10px";
            fields.forEach(f => {
                const col = document.createElement('div');
                col.className = 'col';
                col.innerHTML = this.buildFieldHtml(f);
                row.appendChild(col);
            });
            this.formContainer.appendChild(row);
        }

        // Bind Events
        fields.forEach(f => this.bindFieldEvents(f));
    }

    buildFieldHtml(field) {
        let label = `<label class="form-label">${field.label}</label>`;
        let control = '';

        if (field.type === 'text') {
            control = `<input type="text" id="${field.id}" class="form-control" placeholder="${field.placeholder || ''}" value="${field.value || ''}">`;
        } else if (field.type === 'date') {
            control = `<input type="date" id="${field.id}" class="form-control" value="${new Date().toISOString().split('T')[0]}">`;
        } else if (field.type === 'select') {
            const opts = field.options.map(o => `<option value="${o}">${o}</option>`).join('');
            control = `<select id="${field.id}" class="form-control">${opts}</select>`;
        } else if (field.type === 'textarea') {
            control = `<textarea id="${field.id}" class="form-control" rows="${field.rows || 3}" placeholder="${field.placeholder || ''}"></textarea>`;
            if (field.hasAutoBtn) {
                control += `<div style="text-align:right; margin-top:5px;"><button class="btn btn-secondary" id="btn_auto_${field.id}" style="font-size:12px; padding:4px 8px; display:inline-flex; width:auto;"><i class="fas fa-magic"></i> ${field.autoBtnLabel}</button></div>`;
            }
        } else if (field.type === 'checkbox_group') {
            control = `<div class="checkbox-group">`;
            field.options.forEach(opt => {
                control += `<label class="checkbox-label"><input type="checkbox" name="${field.id}" value="${opt}"> ${opt}</label>`;
            });
            if (field.hasOther) {
                control += `<label class="checkbox-label"><input type="checkbox" name="${field.id}" value="${field.otherLabel || '기타'}"> ${field.otherLabel}</label>`;
                control += `<input type="text" id="${field.id}_other" class="form-control" placeholder="${field.otherPlaceholder}" style="width: auto; flex:1;">`;
            }
            control += `</div>`;
        } else if (field.type === 'custom_scores') {
            control = `<div class="checkbox-group">`;
            field.items.forEach(item => {
                control += `<label class="checkbox-label"><input type="checkbox" id="${item.id}"> ${item.label}</label>`;
                control += `<input type="text" id="${item.scoreId}" class="form-control score-input"> 점`;
                control += `<span style="margin-right:15px;"></span>`;
            });
            control += `</div>`;
        }
        return label + control;
    }

    bindFieldEvents(field) {
        const update = () => this.updatePreview();

        if (field.type === 'checkbox_group') {
            document.querySelectorAll(`input[name="${field.id}"]`).forEach(el => el.addEventListener('change', update));
            if (field.hasOther) document.getElementById(`${field.id}_other`).addEventListener('input', update);
        } else if (field.type === 'custom_scores') {
            field.items.forEach(item => {
                document.getElementById(item.id).addEventListener('change', update);
                document.getElementById(item.scoreId).addEventListener('input', update);
            });
        } else {
            const el = document.getElementById(field.id);
            if (el) {
                el.addEventListener('input', update);
                el.addEventListener('change', update);
            }
        }

        if (field.hasAutoBtn) {
            document.getElementById(`btn_auto_${field.id}`).onclick = () => {
                const text = this.currentDoc.generateContent(this.collectData());
                document.getElementById(field.id).value = text;
                update();
            };
        }
    }

    collectData() {
        const data = {};
        if (!this.currentDoc) return data;

        this.currentDoc.fields.forEach(f => {
            if (f.type === 'checkbox_group') {
                data[f.id] = Array.from(document.querySelectorAll(`input[name="${f.id}"]:checked`)).map(c => c.value);
                if (f.hasOther) data[`${f.id}_other`] = document.getElementById(`${f.id}_other`).value;
            } else if (f.type === 'custom_scores') {
                f.items.forEach(item => {
                    data[item.id] = document.getElementById(item.id).checked;
                    data[item.scoreId] = document.getElementById(item.scoreId).value;
                });
            } else {
                data[f.id] = document.getElementById(f.id).value;
            }
        });

        // Common
        data.issuer = document.getElementById('issuer').value;
        data.issueDate = document.getElementById('issueDate').value;

        return data;
    }

    updatePreview(docIdOverride) {
        if (!this.currentDoc) return;
        const data = this.collectData();
        const mapping = this.currentDoc.mapping;

        // Simple Mapping
        for (const [key, target] of Object.entries(mapping)) {
            let val = data[key];
            let elId = target;

            if (typeof target === 'object') {
                elId = target.target;
                if (target.transform === 'date_ko') {
                    val = this.formatDate(val);
                }
            }

            const el = document.getElementById(elId);
            if (el) el.innerText = val || '';
        }

        // Custom Logic
        if (this.currentDoc.onUpdate) {
            this.currentDoc.onUpdate(data, docIdOverride);
        }

        // QR Code
        const qrId = (this.currentDoc.id === 'voucher') ? 'qr_voucher' : 'qr_confirmation';
        this.renderQR(qrId, docIdOverride || 'PREVIEW-MODE');
    }

    renderQR(elId, text) {
        const el = document.getElementById(elId);
        if (!el) return;
        el.innerHTML = '';
        if (text) {
            new QRCode(el, { text: text, width: 60, height: 60, colorDark: "#000000", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.H });
        }
    }

    formatDate(str) {
        if (!str) return '____년  __월  __일';
        const d = new Date(str);
        return `${d.getFullYear()}년  ${d.getMonth() + 1}월  ${d.getDate()}일`;
    }

    // Fill form for ReadOnly
    fillForm(content) {
        this.currentDoc.fields.forEach(f => {
            if (f.type === 'checkbox_group') {
                const vals = content[f.id] || [];
                document.querySelectorAll(`input[name="${f.id}"]`).forEach(c => c.checked = vals.includes(c.value));
                if (f.hasOther) document.getElementById(`${f.id}_other`).value = content[`${f.id}_other`] || '';
            } else if (f.type === 'custom_scores') {
                f.items.forEach(item => {
                    document.getElementById(item.id).checked = content[item.id];
                    document.getElementById(item.scoreId).value = content[item.scoreId];
                });
            } else {
                if (document.getElementById(f.id)) document.getElementById(f.id).value = content[f.id] || '';
            }
        });
        document.getElementById('issuer').value = content.issuer;
        document.getElementById('issueDate').value = content.issueDate;

        this.updatePreview();
    }
}
