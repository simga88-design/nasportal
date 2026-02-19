// js/store.js

// Centralized state manager for frontend components
const listeners = {};

const state = {
    currentUser: null,
    members: [],
    teams: [],
    approvals: [],
    users: [],
    notifications: [],
    draftData: null,
    activeTab: 'todo'
};

const store = new Proxy(state, {
    set(target, property, value) {
        target[property] = value;

        if (listeners[property]) {
            // Use setTimeout to decouple rendering from state mutations slightly, preventing blocking 
            // but we can also do it synchronously. For simplicity, we choose sync for now.
            listeners[property].forEach(callback => callback(value));
        }
        return true;
    }
});

const subscribe = (property, callback) => {
    if (!listeners[property]) {
        listeners[property] = [];
    }
    listeners[property].push(callback);

    // Initial call to supply the current state if it exists
    if (store[property] !== undefined) {
        callback(store[property]);
    }
};

window.AppStore = { state: store, subscribe };
