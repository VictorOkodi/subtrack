// Subscription Reminder App - Main Logic
class SubscriptionManager {
    constructor() {
        this.subscriptions = [];
        this.editingId = null;
        this.storageKey = 'subscriptions_data';
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.setupEventListeners();
        this.render();
    }

    setupEventListeners() {
        const form = document.getElementById('subscriptionForm');
        form.addEventListener('submit', (e) => this.handleAddSubscription(e));

        const resetBtn = document.getElementById('resetBtn');
        resetBtn.addEventListener('click', () => this.resetForm());

        const serviceButtons = document.querySelectorAll('.service-btn');
        serviceButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleServiceSelect(e));
        });

        const editForm = document.getElementById('editForm');
        editForm.addEventListener('submit', (e) => this.handleEditSubscription(e));

        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-edit')) {
                const id = e.target.closest('.btn-edit').dataset.id;
                this.openEditModal(id);
            }
            if (e.target.closest('.btn-delete')) {
                const id = e.target.closest('.btn-delete').dataset.id;
                this.deleteSubscription(id);
            }
        });
    }

    handleServiceSelect(e) {
        e.preventDefault();
        const btn = e.target;
        const serviceName = btn.dataset.service;
        const input = document.getElementById('serviceName');
        
        btn.classList.toggle('active');
        if (btn.classList.contains('active')) {
            input.value = serviceName;
        } else {
            input.value = '';
        }
    }

    handleAddSubscription(e) {
        e.preventDefault();
        
        const serviceName = document.getElementById('serviceName').value.trim();
        const cost = parseFloat(document.getElementById('cost').value);
        const dueDate = parseInt(document.getElementById('dueDate').value);
        const category = document.getElementById('category').value;
        const notes = document.getElementById('notes').value.trim();

        if (!serviceName || !cost || !dueDate || !category) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        if (dueDate < 1 || dueDate > 31) {
            this.showNotification('Due date must be between 1-31', 'error');
            return;
        }

        const subscription = {
            id: Date.now(),
            serviceName,
            cost,
            dueDate,
            category,
            notes,
            createdDate: new Date().toISOString()
        };

        this.subscriptions.push(subscription);
        this.saveToStorage();
        this.render();
        this.resetForm();
        this.showNotification(`${serviceName} added successfully!`, 'success');
    }

    handleEditSubscription(e) {
        e.preventDefault();

        const serviceName = document.getElementById('editServiceName').value.trim();
        const cost = parseFloat(document.getElementById('editCost').value);
        const dueDate = parseInt(document.getElementById('editDueDate').value);
        const category = document.getElementById('editCategory').value;
        const notes = document.getElementById('editNotes').value.trim();

        if (!serviceName || !cost || !dueDate || !category) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        const subscription = this.subscriptions.find(s => s.id === this.editingId);
        if (subscription) {
            subscription.serviceName = serviceName;
            subscription.cost = cost;
            subscription.dueDate = dueDate;
            subscription.category = category;
            subscription.notes = notes;
            
            this.saveToStorage();
            this.render();
            this.closeModal();
            this.showNotification('Subscription updated successfully!', 'success');
        }
    }

    openEditModal(id) {
        const subscription = this.subscriptions.find(s => s.id === id);
        if (!subscription) return;

        this.editingId = id;
        document.getElementById('editServiceName').value = subscription.serviceName;
        document.getElementById('editCost').value = subscription.cost;
        document.getElementById('editDueDate').value = subscription.dueDate;
        document.getElementById('editCategory').value = subscription.category;
        document.getElementById('editNotes').value = subscription.notes;

        document.getElementById('editModal').classList.add('active');
    }

    deleteSubscription(id) {
        const subscription = this.subscriptions.find(s => s.id === id);
        if (!subscription) return;

        if (confirm(`Are you sure you want to delete ${subscription.serviceName}?`)) {
            this.subscriptions = this.subscriptions.filter(s => s.id !== id);
            this.saveToStorage();
            this.render();
            this.showNotification('Subscription deleted', 'success');
        }
    }

    getSubscriptionStatus(dueDate) {
        const today = new Date();
        const currentDay = today.getDate();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        let daysUntilDue;
        if (dueDate >= currentDay) {
            daysUntilDue = dueDate - currentDay;
        } else {
            const nextMonth = new Date(currentYear, currentMonth + 1, dueDate);
            daysUntilDue = Math.ceil((nextMonth - today) / (1000 * 60 * 60 * 24));
        }

        if (daysUntilDue < 0) {
            return { status: 'overdue', daysUntilDue: Math.abs(daysUntilDue) };
        } else if (daysUntilDue <= 3) {
            return { status: 'due-soon', daysUntilDue };
        } else {
            return { status: 'upcoming', daysUntilDue };
        }
    }

    calculateStats() {
        let totalCost = 0;
        let dueSoon = 0;
        let overdue = 0;

        this.subscriptions.forEach(sub => {
            totalCost += sub.cost;
            const status = this.getSubscriptionStatus(sub.dueDate);
            if (status.status === 'due-soon') dueSoon++;
            if (status.status === 'overdue') overdue++;
        });

        document.getElementById('totalSubs').textContent = this.subscriptions.length;
        document.getElementById('totalCost').textContent = totalCost.toFixed(2);
        document.getElementById('dueSoon').textContent = dueSoon;
        document.getElementById('overdue').textContent = overdue;
    }

    formatDate(daysUntilDue) {
        if (daysUntilDue === 0) return 'Today';
        if (daysUntilDue === 1) return 'Tomorrow';
        return `In ${daysUntilDue} days`;
    }

    getBadgeClass(status) {
        if (status === 'overdue') return 'badge-overdue';
        if (status === 'due-soon') return 'badge-due-soon';
        return 'badge-upcoming';
    }

    getBadgeText(status, daysUntilDue) {
        if (status === 'overdue') return `Overdue ${daysUntilDue}d`;
        if (status === 'due-soon') return 'Due Soon';
        return 'Upcoming';
    }

    render() {
        this.calculateStats();

        const container = document.getElementById('subscriptionsList');
        
        if (this.subscriptions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📭</div>
                    <div class="empty-state-text">No subscriptions yet</div>
                    <p style="font-size: 0.9rem;">Add your first subscription to get started!</p>
                </div>
            `;
            return;
        }

        const sorted = [...this.subscriptions].sort((a, b) => {
            const statusA = this.getSubscriptionStatus(a.dueDate);
            const statusB = this.getSubscriptionStatus(b.dueDate);
            
            const priorityMap = { 'overdue': 0, 'due-soon': 1, 'upcoming': 2 };
            const priorityDiff = priorityMap[statusA.status] - priorityMap[statusB.status];
            
            if (priorityDiff !== 0) return priorityDiff;
            return statusA.daysUntilDue - statusB.daysUntilDue;
        });

        container.innerHTML = sorted.map(sub => {
            const status = this.getSubscriptionStatus(sub.dueDate);
            const daysText = this.formatDate(status.daysUntilDue);
            const badgeClass = this.getBadgeClass(status.status);
            const badgeText = this.getBadgeText(status.status, status.daysUntilDue);

            return `
                <div class="subscription-card ${status.status}">
                    <div class="subscription-info">
                        <div class="subscription-name">${this.escapeHtml(sub.serviceName)}</div>
                        <div class="subscription-details">
                            <div class="detail-item">💰 $${sub.cost.toFixed(2)}/month</div>
                            <div class="detail-item">📅 Due on the ${this.getOrdinal(sub.dueDate)}</div>
                            <div class="detail-item">🏷️ ${sub.category}</div>
                            <div class="detail-item">${daysText}</div>
                            ${sub.notes ? `<div class="detail-item">📝 ${this.escapeHtml(sub.notes)}</div>` : ''}
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span class="badge ${badgeClass}">${badgeText}</span>
                        <div class="subscription-actions">
                            <button class="btn-sm btn-edit" data-id="${sub.id}">Edit</button>
                            <button class="btn-sm btn-delete" data-id="${sub.id}">Delete</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getOrdinal(num) {
        const j = num % 10;
        const k = num % 100;
        
        if (j === 1 && k !== 11) return num + 'st';
        if (j === 2 && k !== 12) return num + 'nd';
        if (j === 3 && k !== 13) return num + 'rd';
        return num + 'th';
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    resetForm() {
        document.getElementById('subscriptionForm').reset();
        document.querySelectorAll('.service-btn').forEach(btn => btn.classList.remove('active'));
        const resetBtn = document.getElementById('resetBtn');
        resetBtn.disabled = true;
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.subscriptions));
        } catch (error) {
            console.error('Failed to save to storage:', error);
        }
    }

    loadFromStorage() {
        try {
            const data = localStorage.getItem(this.storageKey);
            this.subscriptions = data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Failed to load from storage:', error);
            this.subscriptions = [];
        }
    }
}

// Global functions for modal
function closeModal() {
    document.getElementById('editModal').classList.remove('active');
}

document.addEventListener('DOMContentLoaded', () => {
    window.subscriptionManager = new SubscriptionManager();

    document.getElementById('editModal').addEventListener('click', (e) => {
        if (e.target.id === 'editModal') {
            closeModal();
        }
    });
});