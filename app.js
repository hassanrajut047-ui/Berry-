// Berry Berry PRO - Frontend (No Login)
// Backend API Connection

const API_URL = 'https://berry-ashy.vercel.app/api';

const app = {
    data: {
        products: [],
        sales: [],
        customers: [],
        activities: [],
        settings: {
            companyName: 'Berry Berry Foods & Beverages',
            companyAddress: 'Sukkur, Sindh, Pakistan',
            companyPhone: '+92-XXX-XXXXXXX',
            lowStockAlert: true,
            salesAlert: true,
            stockThreshold: 20
        }
    },

    // ---------- API Helpers (No Auth) ----------
    async fetchAPI(endpoint, options) {
        options = options || {};
        const headers = {
            'Content-Type': 'application/json'
        };
        try {
            const res = await fetch(API_URL + endpoint, Object.assign({}, options, { headers: headers }));
            return await res.json();
        } catch (e) {
            this.showToast('Network error. Please check your connection.', 'error');
            return null;
        }
    },

    // ---------- Load Data ----------
    async loadData() {
        try {
            const [products, customers, sales, stats] = await Promise.all([
                this.fetchAPI('/products'),
                this.fetchAPI('/customers'),
                this.fetchAPI('/sales'),
                this.fetchAPI('/stats')
            ]);
            if (products) this.data.products = products;
            if (customers) this.data.customers = customers;
            if (sales) this.data.sales = sales;
            if (stats) {
                document.getElementById('totalProducts').textContent = stats.totalProducts || 0;
                document.getElementById('totalStock').textContent = (stats.totalStock || 0).toLocaleString();
                document.getElementById('lowStockCount').textContent = stats.lowStock || 0;
                document.getElementById('todaySales').textContent = 'Rs. ' + (stats.todaySales || 0).toLocaleString();
            }
            this.renderAll();
            this.updateDashboard();
        } catch (e) {
            this.showToast('Error loading data', 'error');
        }
    },

    // ---------- INIT ----------
    init() {
        this.loadTheme();
        this.setupEventListeners();

        // Hide login overlay immediately
        var loginOverlay = document.getElementById('loginOverlay');
        if (loginOverlay) loginOverlay.style.display = 'none';

        document.getElementById('currentUserName').textContent = 'Admin';
        document.getElementById('currentUserRole').textContent = 'admin';

        document.getElementById('saleDate').valueAsDate = new Date();

        this.loadData();
    },

    navClick(li, page) {
        this.goToPage(page);
        document.querySelectorAll('.nav-links li').forEach(function(item) {
            item.classList.remove('active');
        });
        li.classList.add('active');
    },

    goToPage(page) {
        document.querySelectorAll('.page').forEach(function(p) {
            p.classList.remove('active');
        });
        document.getElementById(page).classList.add('active');
        if (window.innerWidth <= 1024) {
            document.getElementById('sidebar').classList.remove('active');
        }
        this.renderAll();
    },

    setupEventListeners() {
        var self = this;

        document.getElementById('menuToggle').addEventListener('click', function() {
            document.getElementById('sidebar').classList.toggle('collapsed');
        });

        document.getElementById('modalOverlay').addEventListener('click', function() {
            self.closeAllModals();
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                self.closeAllModals();
                self.closeNotifications();
            }
        });

        document.addEventListener('click', function(e) {
            const wrapper = document.querySelector('.notification-wrapper');
            const panel = document.getElementById('notificationPanel');
            if (wrapper && panel && panel.classList.contains('active') && !wrapper.contains(e.target)) {
                self.closeNotifications();
            }
        });

        document.getElementById('addProductForm').addEventListener('submit', function(e) {
            self.handleAddProduct(e);
        });
        document.getElementById('addStockForm').addEventListener('submit', function(e) {
            self.handleAddStock(e);
        });
        document.getElementById('addSaleForm').addEventListener('submit', function(e) {
            self.handleAddSale(e);
        });
        document.getElementById('addCustomerForm').addEventListener('submit', function(e) {
            self.handleAddCustomer(e);
        });
        document.getElementById('companyForm').addEventListener('submit', function(e) {
            self.handleCompanySettings(e);
        });

        document.getElementById('inventorySearch').addEventListener('input', function() {
            self.renderInventory();
        });
        document.getElementById('inventoryFilter').addEventListener('change', function() {
            self.renderInventory();
        });
        document.getElementById('globalSearch').addEventListener('input', function(e) {
            self.globalSearch(e.target.value);
        });
    },

    openModal(modalId) {
        document.getElementById('modalOverlay').classList.add('active');
        document.getElementById(modalId).classList.add('active');
        this.populateSelects();
    },

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
        document.getElementById('modalOverlay').classList.remove('active');
    },

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(function(m) {
            m.classList.remove('active');
        });
        document.getElementById('modalOverlay').classList.remove('active');
    },

    populateSelects() {
        var productOptions = '';
        this.data.products.forEach(function(p) {
            productOptions += '<option value="' + p._id + '">' + p.name + ' - ' + p.size + '</option>';
        });

        var customerOptions = '';
        this.data.customers.forEach(function(c) {
            customerOptions += '<option value="' + c._id + '">' + c.name + '</option>';
        });

        var stockSelect = document.getElementById('stockProductSelect');
        if (stockSelect) stockSelect.innerHTML = '<option value="">Select Product</option>' + productOptions;

        var saleSelect = document.getElementById('saleCustomerSelect');
        if (saleSelect) saleSelect.innerHTML = '<option value="">Select Customer</option>' + customerOptions;

        document.querySelectorAll('.sale-product').forEach(function(sel) {
            sel.innerHTML = '<option value="">Select Product</option>' + productOptions;
        });
    },

    updateDashboard() {
        var totalProducts = this.data.products.length;
        var totalStock = this.data.products.reduce(function(sum, p) {
            return sum + p.stock;
        }, 0);
        var lowStock = this.data.products.filter(function(p) {
            return p.stock <= p.minStock;
        }).length;

        var today = new Date().toISOString().split('T')[0];
        var todaySales = this.data.sales.filter(function(s) {
            var saleDate = new Date(s.date).toISOString().split('T')[0];
            return saleDate === today;
        }).reduce(function(sum, s) {
            return sum + s.grandTotal;
        }, 0);

        document.getElementById('totalProducts').textContent = totalProducts;
        document.getElementById('totalStock').textContent = totalStock.toLocaleString();
        document.getElementById('lowStockCount').textContent = lowStock;
        document.getElementById('todaySales').textContent = 'Rs. ' + todaySales.toLocaleString();

        this.renderLowStockTable();
        this.renderActivityList();
        this.drawStockChart();
    },

    renderLowStockTable() {
        var tbody = document.getElementById('lowStockTable');
        var lowItems = this.data.products.filter(function(p) {
            return p.stock <= p.minStock;
        });

        tbody.innerHTML = lowItems.map(function(p) {
            var status = p.stock === 0 ? 'out-stock' : 'low-stock';
            var statusText = p.stock === 0 ? 'Out of Stock' : 'Low Stock';
            return '<tr><td><strong>' + p.name + '</strong></td><td>' + p.size + '</td><td>' + p.stock + '</td><td>' + p.minStock + '</td><td><span class="status-badge ' + status + '">' + statusText + '</span></td></tr>';
        }).join('');

        if (lowItems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-light)">All stock levels are healthy!</td></tr>';
        }
    },

    renderActivityList() {
        var container = document.getElementById('activityList');
        var icons = { sale: 'fa-cart-shopping', stock: 'fa-box', purchase: 'fa-truck', alert: 'fa-triangle-exclamation' };
        container.innerHTML = this.data.activities.slice(0, 6).map(function(a) {
            return '<div class="activity-item"><div class="activity-icon ' + a.type + '"><i class="fas ' + icons[a.type] + '"></i></div><div class="activity-details"><p>' + a.message + '</p><span>' + a.time + '</span></div></div>';
        }).join('');
    },

    drawStockChart() {
        var canvas = document.getElementById('stockChart');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var dpr = window.devicePixelRatio || 1;
        var rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        var w = rect.width, h = rect.height;
        var padding = 40;
        var chartW = w - padding * 2;
        var chartH = h - padding * 2;

        var products = this.data.products.slice(0, 6);
        var stocks = products.map(function(p) { return p.stock; });
        var maxStock = Math.max.apply(Math, stocks.concat([1]));
        var barWidth = chartW / products.length * 0.6;
        var gap = chartW / products.length;

        ctx.clearRect(0, 0, w, h);

        products.forEach(function(p, i) {
            var barH = (p.stock / maxStock) * chartH;
            var x = padding + i * gap + (gap - barWidth) / 2;
            var y = padding + chartH - barH;

            var gradient = ctx.createLinearGradient(0, y, 0, y + barH);
            gradient.addColorStop(0, '#0ea5e9');
            gradient.addColorStop(1, '#0284c7');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(x, y, barWidth, barH, 6);
            } else {
                ctx.rect(x, y, barWidth, barH);
            }
            ctx.fill();

            ctx.fillStyle = document.body.classList.contains('dark-mode') ? '#f1f5f9' : '#1e293b';
            ctx.font = 'bold 12px Poppins';
            ctx.textAlign = 'center';
            ctx.fillText(p.stock, x + barWidth / 2, y - 8);

            ctx.fillStyle = document.body.classList.contains('dark-mode') ? '#94a3b8' : '#64748b';
            ctx.font = '10px Poppins';
            ctx.fillText(p.size, x + barWidth / 2, h - 10);
        });
    },

    renderInventory() {
        var tbody = document.getElementById('inventoryTable');
        var filter = document.getElementById('inventoryFilter').value;
        var search = document.getElementById('inventorySearch').value.toLowerCase();

        var filtered = this.data.products;
        if (filter === 'low') {
            filtered = filtered.filter(function(p) { return p.stock <= p.minStock; });
        }
        if (filter === 'out') {
            filtered = filtered.filter(function(p) { return p.stock === 0; });
        }
        if (search) {
            filtered = filtered.filter(function(p) {
                return p.name.toLowerCase().includes(search) || (p.brand && p.brand.toLowerCase().includes(search));
            });
        }

        tbody.innerHTML = filtered.map(function(p) {
            var status = 'in-stock';
            var statusText = 'In Stock';
            if (p.stock === 0) { status = 'out-stock'; statusText = 'Out of Stock'; }
            else if (p.stock <= p.minStock) { status = 'low-stock'; statusText = 'Low Stock'; }

            var expiryDate = p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : 'N/A';
            var shortId = p._id ? p._id.substr(-6).toUpperCase() : 'N/A';
            return '<tr><td>#' + shortId + '</td><td><strong>' + p.name + '</strong></td><td>' + p.size + '</td><td>' + p.category + '</td><td>' + p.stock + '</td><td>' + p.minStock + '</td><td>Rs. ' + p.price + '</td><td>' + expiryDate + '</td><td><span class="status-badge ' + status + '">' + statusText + '</span></td><td><button class="btn btn-icon" onclick="app.deleteProduct(&quot;' + p._id + '&quot;)" title="Delete"><i class="fas fa-trash"></i></button></td></tr>';
        }).join('');
    },

    renderProducts() {
        var grid = document.getElementById('productsGrid');
        grid.innerHTML = this.data.products.map(function(p) {
            var badgeClass = 'success';
            var badgeText = 'In Stock';
            if (p.stock === 0) { badgeClass = 'danger'; badgeText = 'Out of Stock'; }
            else if (p.stock <= p.minStock) { badgeClass = 'warning'; badgeText = 'Low Stock'; }

            var badgeStatus = badgeClass === 'success' ? 'in-stock' : badgeClass === 'warning' ? 'low-stock' : 'out-stock';
            var brand = p.brand || 'Berry Berry';
            var desc = p.description || '';

            return '<div class="product-card"><div class="product-image"><i class="fas fa-bottle-water"></i><span class="product-badge status-badge ' + badgeStatus + '">' + badgeText + '</span></div><div class="product-info"><h4>' + p.name + '</h4><p class="brand">' + brand + ' | ' + p.category + '</p><p style="font-size:12px;color:var(--text-light)">' + p.size + ' | ' + desc + '</p><div class="product-meta"><span class="price">Rs. ' + p.price + '</span><span class="stock">' + p.stock + ' in stock</span></div></div><div class="product-actions"><button onclick="app.deleteProduct(&quot;' + p._id + '&quot;)"><i class="fas fa-trash"></i> Delete</button></div></div>';
        }).join('');
    },

    renderSales() {
        var tbody = document.getElementById('salesTable');
        var self = this;
        tbody.innerHTML = this.data.sales.map(function(s) {
            var customer = self.data.customers.find(function(c) {
                return c._id === s.customerId;
            });
            var customerName = customer ? customer.name : 'Unknown';
            var statusClass = s.status === 'paid' ? 'paid' : s.status === 'credit' ? 'credit' : 'pending';
            var dateStr = new Date(s.date).toLocaleDateString();
            var invId = s.id || s._id;
            return '<tr><td><strong>' + invId + '</strong></td><td>' + dateStr + '</td><td>' + customerName + '</td><td>' + s.items.length + ' item(s)</td><td>Rs. ' + s.grandTotal.toLocaleString() + '</td><td>' + s.paymentMethod + '</td><td><span class="status-badge ' + statusClass + '">' + s.status.toUpperCase() + '</span></td><td><button class="btn btn-icon" onclick="app.viewSale(&quot;' + s._id + '&quot;)" title="View"><i class="fas fa-eye"></i></button></td></tr>';
        }).join('');
    },

    renderCustomers() {
        var tbody = document.getElementById('customersTable');
        tbody.innerHTML = this.data.customers.map(function(c) {
            var status = c.balance > c.creditLimit ? 'over-limit' : 'good';
            var statusText = c.balance > c.creditLimit ? 'Over Limit' : 'Good';
            var orders = c.orders || 0;
            return '<tr><td><strong>' + c.name + '</strong></td><td>' + c.phone + '</td><td>' + orders + '</td><td>Rs. ' + c.balance.toLocaleString() + '</td><td>Rs. ' + c.creditLimit + '</td><td><span class="customer-status ' + status + '">' + statusText + '</span></td><td><button class="btn btn-icon btn-danger" onclick="app.deleteCustomer(&quot;' + c._id + '&quot;)" title="Delete"><i class="fas fa-trash"></i></button></td></tr>';
        }).join('');
    },

    renderAll() {
        this.renderInventory();
        this.renderProducts();
        this.renderSales();
        this.renderCustomers();
    },

    // ---------- CRUD Operations ----------
    async handleAddProduct(e) {
        e.preventDefault();
        var form = e.target;
        var newProduct = {
            name: form.name.value,
            brand: form.brand.value || 'Berry Berry',
            size: form.size.value,
            category: form.category.value,
            price: parseFloat(form.price.value),
            costPrice: parseFloat(form.costPrice.value) || 0,
            stock: parseInt(form.stock.value),
            minStock: parseInt(form.minStock.value),
            expiryDate: form.expiryDate.value || null,
            description: form.description.value
        };
        var result = await this.fetchAPI('/products', {
            method: 'POST',
            body: JSON.stringify(newProduct)
        });
        if (result) {
            this.data.products.push(result);
            this.renderAll();
            this.updateDashboard();
            this.closeModal('addProductModal');
            form.reset();
            this.showToast('Product added successfully!', 'success');
        }
    },

    async handleAddStock(e) {
        e.preventDefault();
        var form = e.target;
        var productId = form.productId.value;
        var qty = parseInt(form.quantity.value);
        var unitCost = parseFloat(form.unitCost.value) || 0;
        var product = this.data.products.find(function(p) {
            return p._id === productId;
        });
        if (product) {
            var updatedProduct = Object.assign({}, product);
            updatedProduct.stock += qty;
            if (unitCost > 0) {
                updatedProduct.costPrice = unitCost;
            }
            await this.fetchAPI('/products/' + productId, {
                method: 'PUT',
                body: JSON.stringify(updatedProduct)
            });
            product.stock = updatedProduct.stock;
            if (unitCost > 0) product.costPrice = unitCost;

            this.addActivity('stock', 'Stock added: ' + product.name + ' +' + qty + ' bottles');
            this.renderAll();
            this.updateDashboard();
            this.closeModal('addStockModal');
            form.reset();
            this.showToast('Added ' + qty + ' bottles to ' + product.name, 'success');
        }
    },

    async handleAddSale(e) {
        e.preventDefault();
        var form = e.target;
        var items = [];
        var subtotal = 0;
        var self = this;

        document.querySelectorAll('.sale-item-row').forEach(function(row) {
            var productId = row.querySelector('.sale-product').value;
            var qty = parseInt(row.querySelector('.sale-qty').value);
            var price = parseFloat(row.querySelector('.sale-price').value);
            if (productId && qty && price) {
                var total = qty * price;
                items.push({ productId: productId, qty: qty, price: price, total: total });
                subtotal += total;
            }
        });

        var discount = parseFloat(document.getElementById('saleDiscount').value) || 0;
        var grandTotal = subtotal - discount;
        var amountPaid = parseFloat(document.getElementById('saleAmountPaid').value) || 0;
        var balance = grandTotal - amountPaid;

        var saleData = {
            id: 'INV-' + Date.now(),
            date: form.date.value,
            customerId: form.customerId.value,
            items: items,
            subtotal: subtotal,
            discount: discount,
            grandTotal: grandTotal,
            paymentMethod: form.paymentMethod.value,
            amountPaid: amountPaid,
            balance: balance,
            status: balance > 0 ? 'credit' : 'paid'
        };

        var result = await this.fetchAPI('/sales', {
            method: 'POST',
            body: JSON.stringify(saleData)
        });

        if (result) {
            this.data.sales.push(result);
            var customer = this.data.customers.find(function(c) {
                return c._id === saleData.customerId;
            });
            this.addActivity('sale', 'New sale: ' + (customer ? customer.name : 'Unknown') + ' - Rs. ' + grandTotal.toLocaleString());
            await this.loadData();
            this.closeModal('addSaleModal');
            form.reset();
            this.resetSaleItems();
            this.showToast('Sale completed successfully!', 'success');

            if (customer && customer.phone) {
                var msg = 'Dear ' + customer.name + ', your invoice ' + saleData.id + ' for Rs. ' + grandTotal + ' is ready. Balance: Rs. ' + balance + '. Thank you!';
                var url = 'https://wa.me/' + customer.phone.replace(/\D/g, '') + '?text=' + encodeURIComponent(msg);
                window.open(url, '_blank');
            }
        }
    },

    async handleAddCustomer(e) {
        e.preventDefault();
        var form = e.target;
        var customer = {
            name: form.name.value,
            phone: form.phone.value,
            address: form.address.value,
            balance: parseFloat(form.balance.value) || 0,
            creditLimit: parseFloat(form.creditLimit.value) || 5000,
            orders: 0
        };
        var result = await this.fetchAPI('/customers', {
            method: 'POST',
            body: JSON.stringify(customer)
        });
        if (result) {
            this.data.customers.push(result);
            this.renderCustomers();
            this.closeModal('addCustomerModal');
            form.reset();
            this.showToast('Customer added successfully!', 'success');
        }
    },

    handleCompanySettings(e) {
        e.preventDefault();
        this.data.settings.companyName = document.getElementById('companyName').value;
        this.data.settings.companyAddress = document.getElementById('companyAddress').value;
        this.showToast('Company settings saved!', 'success');
    },

    // ---------- UI Helpers ----------
    addSaleItem() {
        if (this.data.products.length === 0) {
            this.showToast('Please add products first!', 'warning');
            return;
        }
        var container = document.getElementById('saleItems');
        var productOptions = '';
        this.data.products.forEach(function(p) {
            productOptions += '<option value="' + p._id + '">' + p.name + ' - ' + p.size + '</option>';
        });
        var row = document.createElement('div');
        row.className = 'sale-item-row';
        row.innerHTML = '<div class="form-group"><select class="sale-product" required onchange="app.updateSalePrice(this)"><option value="">Select Product</option>' + productOptions + '</select></div><div class="form-group"><input type="number" class="sale-qty" min="1" value="1" required onchange="app.calculateSaleTotal()"></div><div class="form-group"><input type="number" class="sale-price" readonly></div><div class="form-group"><input type="number" class="sale-total" readonly></div><button type="button" class="btn btn-icon btn-danger" onclick="app.removeSaleItem(this)"><i class="fas fa-trash"></i></button>';
        container.appendChild(row);
    },

    removeSaleItem(btn) {
        var rows = document.querySelectorAll('.sale-item-row');
        if (rows.length > 1) {
            btn.closest('.sale-item-row').remove();
            this.calculateSaleTotal();
        } else {
            this.showToast('At least one item is required', 'warning');
        }
    },

    resetSaleItems() {
        document.getElementById('saleItems').innerHTML = '<div class="sale-item-row"><div class="form-group"><select class="sale-product" required onchange="app.updateSalePrice(this)"><option value="">Select Product</option></select></div><div class="form-group"><input type="number" class="sale-qty" min="1" value="1" required onchange="app.calculateSaleTotal()"></div><div class="form-group"><input type="number" class="sale-price" readonly></div><div class="form-group"><input type="number" class="sale-total" readonly></div><button type="button" class="btn btn-icon btn-danger" onclick="app.removeSaleItem(this)"><i class="fas fa-trash"></i></button></div>';
        this.populateSelects();
    },

    updateSalePrice(select) {
        var product = this.data.products.find(function(p) {
            return p._id === select.value;
        });
        var row = select.closest('.sale-item-row');
        if (product) row.querySelector('.sale-price').value = product.price;
        this.calculateSaleTotal();
    },

    calculateSaleTotal() {
        var subtotal = 0;
        document.querySelectorAll('.sale-item-row').forEach(function(row) {
            var qty = parseInt(row.querySelector('.sale-qty').value) || 0;
            var price = parseFloat(row.querySelector('.sale-price').value) || 0;
            var total = qty * price;
            row.querySelector('.sale-total').value = total;
            subtotal += total;
        });
        var discount = parseFloat(document.getElementById('saleDiscount').value) || 0;
        var grandTotal = subtotal - discount;
        document.getElementById('saleSubtotal').value = subtotal;
        document.getElementById('saleGrandTotal').value = grandTotal;
        this.calculateSaleBalance();
    },

    calculateSaleBalance() {
        var grandTotal = parseFloat(document.getElementById('saleGrandTotal').value) || 0;
        var amountPaid = parseFloat(document.getElementById('saleAmountPaid').value) || 0;
        document.getElementById('saleBalance').value = grandTotal - amountPaid;
    },

    async deleteProduct(id) {
        if (!confirm('Are you sure you want to delete this product?')) return;
        var result = await this.fetchAPI('/products/' + id, { method: 'DELETE' });
        if (result) {
            this.data.products = this.data.products.filter(function(p) {
                return p._id !== id;
            });
            this.renderAll();
            this.updateDashboard();
            this.showToast('Product deleted', 'success');
        }
    },

    async deleteCustomer(id) {
        if (!confirm('Are you sure you want to delete this customer?')) return;
        var result = await this.fetchAPI('/customers/' + id, { method: 'DELETE' });
        if (result) {
            this.data.customers = this.data.customers.filter(function(c) {
                return c._id !== id;
            });
            this.renderCustomers();
            this.showToast('Customer deleted', 'success');
        }
    },

    viewSale(id) {
        var sale = this.data.sales.find(function(s) {
            return s._id === id;
        });
        if (sale) {
            var customer = this.data.customers.find(function(c) {
                return c._id === sale.customerId;
            });
            var itemsList = sale.items.map(function(item) {
                var product = this.data.products.find(function(p) {
                    return p._id === item.productId;
                });
                return (product ? product.name : 'Unknown') + ' x' + item.qty + ' = Rs. ' + item.total;
            }.bind(this)).join('\n');
            alert('Invoice: ' + (sale.id || sale._id) + 
                  '\nCustomer: ' + (customer ? customer.name : 'Unknown') + 
                  '\nDate: ' + new Date(sale.date).toLocaleDateString() +
                  '\n\nItems:\n' + itemsList +
                  '\n\nSubtotal: Rs. ' + sale.subtotal +
                  '\nDiscount: Rs. ' + sale.discount +
                  '\nGrand Total: Rs. ' + sale.grandTotal + 
                  '\nStatus: ' + sale.status.toUpperCase());
        }
    },

    generateReport(type) {
        var resultDiv = document.getElementById('reportResult');
        resultDiv.style.display = 'block';
        document.getElementById('reportTitle').textContent = type.toUpperCase() + ' Report';
        var html = '<div style="padding:20px;"><table class="data-table"><thead><tr>';
        var self = this;
        if (type === 'stock') {
            html += '<th>Product</th><th>Size</th><th>Stock</th><th>Price</th></tr></thead><tbody>';
            this.data.products.forEach(function(p) {
                html += '<tr><td>' + p.name + '</td><td>' + p.size + '</td><td>' + p.stock + '</td><td>Rs. ' + p.price + '</td></tr>';
            });
        } else if (type === 'sales') {
            html += '<th>Invoice</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead><tbody>';
            this.data.sales.forEach(function(s) {
                var c = self.data.customers.find(function(cust) {
                    return cust._id === s.customerId;
                });
                html += '<tr><td>' + (s.id || s._id) + '</td><td>' + (c ? c.name : 'Unknown') + '</td><td>Rs. ' + s.grandTotal + '</td><td>' + s.status + '</td></tr>';
            });
        } else {
            html += '<th>Report</th></tr></thead><tbody><tr><td>Report generated successfully!</td></tr>';
        }
        html += '</tbody></table></div>';
        document.getElementById('reportContent').innerHTML = html;
        resultDiv.scrollIntoView({ behavior: 'smooth' });
    },

    exportReport() {
        this.showToast('Export feature coming soon', 'warning');
    },

    exportData() {
        var data = {
            products: this.data.products,
            customers: this.data.customers,
            sales: this.data.sales,
            exportDate: new Date().toISOString()
        };
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'berry-berry-backup-' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('Data exported successfully!', 'success');
    },

    importData() {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        var self = this;
        input.onchange = function(e) {
            var file = e.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function(event) {
                try {
                    var data = JSON.parse(event.target.result);
                    self.showToast('Import feature requires backend sync - data loaded locally only', 'warning');
                } catch (err) {
                    self.showToast('Invalid JSON file', 'error');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    },

    addActivity(type, message) {
        this.data.activities.unshift({ type: type, message: message, time: 'Just now' });
        if (this.data.activities.length > 50) this.data.activities.pop();
    },

    showToast(message, type) {
        type = type || 'success';
        var container = document.getElementById('toastContainer');
        var icons = { success: 'fa-check-circle', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation' };
        var toast = document.createElement('div');
        toast.className = 'toast ' + type;
        toast.innerHTML = '<i class="fas ' + icons[type] + '"></i><div class="toast-content"><p>' + message + '</p></div>';
        container.appendChild(toast);
        setTimeout(function() {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(function() { toast.remove(); }, 300);
        }, 3000);
    },

    globalSearch(query) {
        if (!query) return;
        query = query.toLowerCase();
        var results = this.data.products.filter(function(p) {
            return p.name.toLowerCase().includes(query) ||
                   (p.brand && p.brand.toLowerCase().includes(query)) ||
                   p.category.toLowerCase().includes(query);
        });
        if (results.length > 0) {
            this.goToPage('products');
            this.showToast('Found ' + results.length + ' product(s) matching "' + query + '"', 'success');
        }
    },

    filterSales() {
        var from = document.getElementById('salesDateFrom').value;
        var to = document.getElementById('salesDateTo').value;
        if (!from && !to) {
            this.renderSales();
            return;
        }
        var tbody = document.getElementById('salesTable');
        var self = this;
        var filtered = this.data.sales.filter(function(s) {
            var saleDate = new Date(s.date).toISOString().split('T')[0];
            if (from && saleDate < from) return false;
            if (to && saleDate > to) return false;
            return true;
        });
        tbody.innerHTML = filtered.map(function(s) {
            var customer = self.data.customers.find(function(c) {
                return c._id === s.customerId;
            });
            var statusClass = s.status === 'paid' ? 'paid' : s.status === 'credit' ? 'credit' : 'pending';
            return '<tr><td><strong>' + (s.id || s._id) + '</strong></td><td>' + new Date(s.date).toLocaleDateString() + '</td><td>' + (customer ? customer.name : 'Unknown') + '</td><td>' + s.items.length + ' item(s)</td><td>Rs. ' + s.grandTotal.toLocaleString() + '</td><td>' + s.paymentMethod + '</td><td><span class="status-badge ' + statusClass + '">' + s.status.toUpperCase() + '</span></td><td><button class="btn btn-icon" onclick="app.viewSale(&quot;' + s._id + '&quot;)" title="View"><i class="fas fa-eye"></i></button></td></tr>';
        }).join('');
    },

    toggleNotifications() {
        var panel = document.getElementById('notificationPanel');
        if (panel.classList.contains('active')) {
            this.closeNotifications();
        } else {
            this.renderNotifications();
            panel.classList.add('active');
        }
    },

    closeNotifications() {
        var panel = document.getElementById('notificationPanel');
        if (panel) panel.classList.remove('active');
    },

    renderNotifications() {
        var list = document.getElementById('notificationList');
        var lowStock = this.data.products.filter(function(p) {
            return p.stock <= p.minStock;
        });
        var notifs = [];

        lowStock.forEach(function(p) {
            notifs.push({
                type: 'alert',
                icon: 'fa-triangle-exclamation',
                message: p.name + ' (' + p.size + ') is running low - ' + p.stock + ' left',
                time: 'Just now'
            });
        });

        this.data.sales.slice(0, 3).forEach(function(s) {
            var customer = this.data.customers.find(function(c) {
                return c._id === s.customerId;
            });
            notifs.push({
                type: 'sale',
                icon: 'fa-cart-shopping',
                message: 'New sale to ' + (customer ? customer.name : 'Unknown') + ' - Rs. ' + s.grandTotal.toLocaleString(),
                time: new Date(s.date).toLocaleDateString()
            });
        }.bind(this));

        if (notifs.length === 0) {
            list.innerHTML = '<div class="notification-empty"><i class="fas fa-bell-slash" style="font-size:24px;margin-bottom:8px;display:block"></i>No notifications</div>';
        } else {
            list.innerHTML = notifs.map(function(n) {
                return '<div class="notification-item ' + n.type + '"><i class="fas ' + n.icon + '"></i><div><p>' + n.message + '</p><span>' + n.time + '</span></div></div>';
            }).join('');
        }

        var badge = document.getElementById('notifBadge');
        if (badge) {
            var count = lowStock.length;
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    },

    clearNotifications() {
        var list = document.getElementById('notificationList');
        list.innerHTML = '<div class="notification-empty"><i class="fas fa-check-circle" style="font-size:24px;margin-bottom:8px;display:block;color:var(--success)"></i>All notifications cleared</div>';
        var badge = document.getElementById('notifBadge');
        if (badge) {
            badge.style.display = 'none';
        }
    },

    toggleTheme() {
        var body = document.body;
        var icon = document.getElementById('themeIcon');
        var isDark = body.classList.toggle('dark-mode');

        if (isDark) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
            localStorage.setItem('berryBerryTheme', 'dark');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
            localStorage.setItem('berryBerryTheme', 'light');
        }

        if (document.getElementById('dashboard').classList.contains('active')) {
            this.drawStockChart();
        }
    },

    loadTheme() {
        var saved = localStorage.getItem('berryBerryTheme');
        var icon = document.getElementById('themeIcon');
        if (saved === 'dark') {
            document.body.classList.add('dark-mode');
            if (icon) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', function() {
    app.init();
});
