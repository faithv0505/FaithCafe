// Delivery Status Tracking System
class DeliveryTracker {
    constructor() {
        this.currentOrder = null;
        this.orders = [];
        this.init();
    }

    async init() {
        await this.loadOrders();
        this.loadCurrentOrder();
        this.displayOrderHistory();
        this.startAutoRefresh();
    }

    async loadOrders() {
        try {
            // Load from cache (which persists during session)
            this.orders = await getOrders();
            console.log('Loaded orders from cache for customer:', this.orders);
        } catch (error) {
            console.error('Error loading orders:', error);
            this.orders = [];
        }
    }

    loadCurrentOrder() {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            this.showNoOrdersMessage();
            return;
        }

        console.log('Current user:', currentUser.username);
        console.log('All orders:', this.orders);

        // Get orders for current user
        const userOrders = this.orders.filter(order => order.customer === currentUser.username);
        console.log('User orders:', userOrders);
        
        if (userOrders.length === 0) {
            this.showNoOrdersMessage();
            return;
        }

        // Get the most recent order that's not delivered or cancelled
        const activeOrders = userOrders.filter(order => 
            order.status !== 'delivered' && order.status !== 'cancelled'
        );
        
        console.log('Active orders:', activeOrders);

        // Show the most recent active order, or the most recent order if no active ones
        this.currentOrder = activeOrders.length > 0 
            ? activeOrders.reduce((latest, order) => 
                new Date(order.orderTime) > new Date(latest.orderTime) ? order : latest
              )
            : userOrders.reduce((latest, order) => 
                new Date(order.orderTime) > new Date(latest.orderTime) ? order : latest
              );

        console.log('Current order to display:', this.currentOrder);

        if (this.currentOrder) {
            this.displayCurrentOrder();
        } else {
            this.showNoOrdersMessage();
        }
    }

    displayCurrentOrder() {
        if (!this.currentOrder) {
            this.showNoOrdersMessage();
            return;
        }

        console.log('Displaying current order:', this.currentOrder);

        // Update order number
        const orderNumberElement = document.getElementById('current-order-number');
        if (orderNumberElement) {
            orderNumberElement.textContent = this.currentOrder.id;
        }
        
        // Update order items
        this.displayOrderItems();
        
        // Update delivery information
        this.updateDeliveryInfo();
        
        // Update progress steps
        this.updateProgressSteps();
        
        // Update ETA
        this.updateETA();
    }

    displayOrderItems() {
        const itemsList = document.getElementById('order-items-list');
        const totalAmount = document.getElementById('order-total-amount');
        
        if (!itemsList || !this.currentOrder) return;

        let itemsHTML = '';
        let total = 0;

        this.currentOrder.items.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            itemsHTML += `
                <div class="order-item">
                    <span class="item-name">${item.quantity}x ${item.name}</span>
                    <span class="item-price">₱${itemTotal.toFixed(2)}</span>
                </div>
            `;
        });

        itemsList.innerHTML = itemsHTML;
        if (totalAmount) {
            totalAmount.textContent = total.toFixed(2);
        }
    }

    updateDeliveryInfo() {
        const user = getCurrentUser();
        
        if (user) {
            const deliveryAddress = document.getElementById('delivery-address');
            const contactNumber = document.getElementById('contact-number');
            
            if (deliveryAddress) {
                deliveryAddress.textContent = this.currentOrder.deliveryAddress || user.address || 'Not specified';
            }
            if (contactNumber) {
                contactNumber.textContent = this.currentOrder.contactNumber || user.contactNumber || 'Not specified';
            }
        }

        // Show rider info if assigned
        const riderName = document.getElementById('rider-name');
        const riderContact = document.getElementById('rider-contact');
        
        if (riderName && riderContact) {
            if (this.currentOrder.rider) {
                riderName.textContent = this.currentOrder.rider.name;
                riderContact.textContent = this.currentOrder.rider.contact;
            } else if (this.currentOrder.status === 'ready' || this.currentOrder.status === 'pickedup' || this.currentOrder.status === 'delivered') {
                riderName.textContent = 'Assigning rider...';
                riderContact.textContent = '-';
            } else {
                riderName.textContent = 'Rider will be assigned when order is ready';
                riderContact.textContent = '-';
            }
        }
    }

    updateProgressSteps() {
        if (!this.currentOrder) return;

        const status = this.currentOrder.status;
        const steps = ['placed', 'preparing', 'ready', 'pickedup', 'delivered'];
        
        steps.forEach((step, index) => {
            const stepElement = document.getElementById(`step-${step}`);
            const timeElement = document.getElementById(`step${index + 1}-time`);
            
            if (stepElement) {
                if (steps.indexOf(status) >= index) {
                    stepElement.classList.add('active');
                    if (this.currentOrder[`${step}Time`]) {
                        timeElement.textContent = this.formatTime(this.currentOrder[`${step}Time`]);
                    } else {
                        timeElement.textContent = '-';
                    }
                } else {
                    stepElement.classList.remove('active');
                    timeElement.textContent = '-';
                }
            }
        });
    }

    updateETA() {
        if (!this.currentOrder) return;

        const status = this.currentOrder.status;
        let eta = '15-20 minutes';
        
        switch(status) {
            case 'placed':
                eta = '15-20 minutes';
                break;
            case 'preparing':
                eta = '10-15 minutes';
                break;
            case 'ready':
                eta = '5-10 minutes';
                break;
            case 'pickedup':
                eta = 'Arriving soon';
                break;
            case 'delivered':
                eta = 'Delivered';
                break;
        }
        
        const etaElement = document.getElementById('eta-time');
        if (etaElement) {
            etaElement.textContent = eta;
        }
    }

    displayOrderHistory() {
        const historyList = document.getElementById('order-history-list');
        if (!historyList) return;

        const currentUser = getCurrentUser();
        if (!currentUser) {
            historyList.innerHTML = '<p class="no-orders">Please login to view order history.</p>';
            return;
        }

        // Filter orders for current user
        const userOrders = this.orders.filter(order => order.customer === currentUser.username);

        if (userOrders.length === 0) {
            historyList.innerHTML = '<p class="no-orders">No previous orders found.</p>';
            return;
        }

        let historyHTML = '';
        
        // Sort orders by most recent first
        const sortedOrders = userOrders.sort((a, b) => new Date(b.orderTime) - new Date(a.orderTime));
        
        sortedOrders.forEach(order => {
            // Only show delivered or cancelled orders in history
            if (order.status === 'delivered' || order.status === 'cancelled') {
                historyHTML += this.createOrderHistoryCard(order);
            }
        });

        historyList.innerHTML = historyHTML || '<p class="no-orders">No completed orders yet.</p>';
    }

    createOrderHistoryCard(order) {
        const total = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const statusClass = order.status === 'cancelled' ? 'cancelled' : 'delivered';
        const statusText = order.status === 'cancelled' ? 'Cancelled' : 'Delivered';
        
        return `
            <div class="order-history-card ${statusClass}">
                <div class="history-card-header">
                    <span class="order-id">Order #${order.id}</span>
                    <span class="order-date">${new Date(order.orderTime).toLocaleDateString()}</span>
                </div>
                <div class="history-items">
                    ${order.items.slice(0, 2).map(item => 
                        `<span class="history-item">${item.quantity}x ${item.name}</span>`
                    ).join('')}
                    ${order.items.length > 2 ? `<span class="more-items">+${order.items.length - 2} more</span>` : ''}
                </div>
                <div class="history-footer">
                    <span class="order-total">₱${total.toFixed(2)}</span>
                    <span class="order-status ${statusClass}">${statusText}</span>
                </div>
            </div>
        `;
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    showNoOrdersMessage() {
        const trackingSection = document.querySelector('.tracking-section');
        if (trackingSection) {
            trackingSection.innerHTML = `
                <div class="no-orders-message">
                    <div class="no-orders-icon">📦</div>
                    <h3>No Active Orders</h3>
                    <p>You don't have any active orders at the moment.</p>
                    <a href="menu.html" class="btn">Order Now</a>
                </div>
            `;
        }
    }

    // Add auto-refresh to check for status updates from staff
    startAutoRefresh() {
        // Refresh orders every 10 seconds to check for updates from staff
        setInterval(async () => {
            console.log('Auto-refreshing orders...');
            await this.loadOrders();
            this.loadCurrentOrder();
            this.displayOrderHistory();
        }, 10000);
    }
}

// Initialize delivery tracker when page loads
document.addEventListener('DOMContentLoaded', function() {
    new DeliveryTracker();
});