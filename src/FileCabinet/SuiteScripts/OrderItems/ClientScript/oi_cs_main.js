/**
 * NetSuite Client Script for Order Items with Vendor Intelligence
 * VERSION: 3.14 - MRP Order Dates Display
 *
 * Changes in v3.14:
 * - NEW: MRP items now display "Order: Dec 3" instead of stock numbers
 * - NEW: Added formatDateMonthDay() function for compact date display (no year)
 * - Enhanced: Conditional display logic - MRP items show dates, reorder items show stock
 * - Fixed: Issue #2 - MRP order dates now properly displayed
 *
 * Changes in v3.13:
 * - Fixed: Compare Vendors URL parameter construction
 *
 * Changes in v3.12:
 * - Fixed: Quality rating now displays 2 decimal places (4.39 instead of 4.393435494294163)
 * - Fixed: OTD percentage displays 1 decimal place (87.5% instead of 87.5000%)
 * - Fixed: All numeric metrics now properly formatted
 * 
 * Changes in v3.11:
 * - Fixed: MRP count now displays correctly (was always showing 0)
 * - Fixed: Total Est. Value now calculates from actual items instead of hard-coded $142,580
 * - Enhanced: Total value shows "selected / total" format when items are selected
 * - Fixed: Large numbers now display with comma separators (e.g., $200,000 instead of $200000)
 * - Enhanced: All value updates (quantity, price, vendor changes) now update total in real-time
 * 
 * Changes in v3.10:
 * - Fixed: Now sends item location to PO RESTlet (was defaulting to Boston)
 * - Enhanced: Better error handling and logging in PO creation
 * 
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */

define(['N/runtime', 'N/url', 'N/ui/dialog'],
function(runtime, url, dialog) {
    
    // State management (replacing React useState)
    const state = {
        selectedItems: new Set(),
        expandedRows: new Set(),
        filterStatus: 'all',
        searchQuery: '',
        items: [],
        currentPage: 1,
        itemsPerPage: 25,
        isLoading: false,
        comparisonModal: null,
        editedItems: {}, // Track edited quantities, prices, and vendor selections
        vendorCache: new Map(), // Cache vendor lists to avoid repeated API calls
        vendorDetailsCache: {} // Cache detailed vendor performance data from expansions
    };

    // DOM References
    let dom = {};

    /**
     * Initialize the application
     * @param {Object} context
     */
    function pageInit(context) {
        console.log('Order Items UI initialized - Version 3.12 (Fixed Vendor Metrics Formatting)');
        
        // Cache DOM references
        cacheDOMReferences();
        
        // Setup event listeners
        setupEventListeners();
        
        // Load initial data
        loadOrderItems();
        
        // Initialize tooltips
        initializeTooltips();
    }

    /**
     * Cache frequently used DOM elements
     */
    function cacheDOMReferences() {
        dom = {
            itemsContainer: document.getElementById('items-container'),
            searchInput: document.getElementById('search-input'),
            filterSelect: document.getElementById('filter-select'),
            createPOBtn: document.getElementById('create-po-btn'),
            loadMoreBtn: document.getElementById('load-more-btn'),
            spinner: document.getElementById('loading-spinner'),
            warningBanner: document.getElementById('warning-banner'),
            selectedCount: document.getElementById('selected-count'),
            criticalCount: document.getElementById('critical-count'),
            reorderCount: document.getElementById('reorder-count'),
            mrpCount: document.getElementById('mrp-count'),
            totalValue: document.getElementById('total-value'),
            comparisonModal: document.getElementById('comparison-modal')
        };
    }

    /**
     * Setup all event listeners
     */
    function setupEventListeners() {
        // Search functionality
        if (dom.searchInput) {
            dom.searchInput.addEventListener('input', debounce(handleSearch, 300));
        }

        // Filter dropdown
        if (dom.filterSelect) {
            dom.filterSelect.addEventListener('change', handleFilterChange);
        }

        // Create PO button - PASS EVENT PARAMETER
        if (dom.createPOBtn) {
            dom.createPOBtn.addEventListener('click', handleCreatePO);
        }

        // Load more button
        if (dom.loadMoreBtn) {
            dom.loadMoreBtn.addEventListener('click', loadMoreItems);
        }

        // Event delegation for dynamic content
        if (dom.itemsContainer) {
            dom.itemsContainer.addEventListener('click', handleItemsContainerClick);
            dom.itemsContainer.addEventListener('change', handleItemsContainerChange);
        }

        // Modal close buttons
        document.querySelectorAll('.ns-modal-close').forEach(function(btn) {
            btn.addEventListener('click', closeModal);
        });

        // Close modal on overlay click
        document.querySelectorAll('.ns-modal-overlay').forEach(function(overlay) {
            overlay.addEventListener('click', function(e) {
                if (e.target === this) closeModal();
            });
        });

        // Setup infinite scroll
        setupInfiniteScroll();

        // Summary card click handlers
        document.querySelectorAll('[data-filter]').forEach(function(card) {
            if (card.dataset.filter !== 'total-value') {
                card.addEventListener('click', function() {
                    handleSummaryCardClick(card.dataset.filter);
                });
            }
        });

        // Header select-all checkbox
        const selectAllCheckbox = document.getElementById('select-all');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', function(e) {
                toggleAllItems(e.target.checked);
            });
        }

        // Handle vendor dropdown changes
        document.addEventListener('change', function(e) {
            if (e.target.classList.contains('vendor-select')) {
                const itemId = e.target.dataset.itemId;
                const locationId = e.target.dataset.locationId;
                const vendorId = e.target.value;
                const selectedOption = e.target.options[e.target.selectedIndex];
                const vendorPrice = parseFloat(selectedOption.dataset.price) || 0;

                // Find vendor from cache
                const vendors = state.vendorCache.get(itemId);
                const vendor = vendors ? vendors.find(function(v) { return v.id === vendorId; }) : null;

                if (vendor) {
                    // Pass the SELECT element directly so we can find the specific row
                    selectVendorForRow(e.target, itemId, locationId, vendor);
                }
            }
        });
    }

    /**
     * Handle summary card clicks to filter
     */
    function handleSummaryCardClick(filter) {
        const filterMap = {
            'critical': 'critical',
            'below-reorder': 'reorder',
            'mrp-suggested': 'mrp'
        };
        
        if (filterMap[filter]) {
            dom.filterSelect.value = filterMap[filter];
            state.filterStatus = filterMap[filter];
            state.currentPage = 1;
            loadOrderItems();
        }
    }

    /**
     * Handle clicks within items container (event delegation)
     */
    function handleItemsContainerClick(e) {
        // Expand/collapse row
        if (e.target.closest('.expand-btn')) {
            e.preventDefault();
            const btn = e.target.closest('.expand-btn');
            const itemId = btn.dataset.itemId;
            toggleRowExpansion(itemId);
        }

        // Compare vendors button
        if (e.target.closest('.compare-vendors-btn')) {
            e.preventDefault(); // CRITICAL: Prevent form submission
            const btn = e.target.closest('.compare-vendors-btn');
            const itemId = btn.dataset.itemId;
            showVendorComparison(itemId);
        }

        // Click on vendor name - TRIGGERS LAZY LOAD
        if (e.target.closest('.vendor-name-clickable')) {
            e.preventDefault();
            const span = e.target.closest('.vendor-name-clickable');
            const itemId = span.dataset.itemId;
            showVendorSelector(itemId);
        }

        // Select vendor from dropdown
        if (e.target.closest('.select-vendor-option')) {
            e.preventDefault();
            const option = e.target.closest('.select-vendor-option');
            const itemId = option.dataset.itemId;
            const vendorId = option.dataset.vendorId;
            selectVendor(itemId, vendorId);
        }

        // Select vendor from panel
        if (e.target.closest('.select-vendor-btn')) {
            const btn = e.target.closest('.select-vendor-btn');
            const itemId = btn.dataset.itemId;
            const vendorId = btn.dataset.vendorId;
            selectVendor(itemId, vendorId);
        }
    }

    /**
     * Handle changes within items container (checkboxes and inputs)
     */
    function handleItemsContainerChange(e) {
        if (e.target.type === 'checkbox' && e.target.classList.contains('item-checkbox')) {
            const compositeKey = e.target.dataset.compositeKey;
            toggleItemSelection(compositeKey, e.target.checked);
        }

        // Handle quantity changes
        if (e.target.classList.contains('editable-quantity')) {
            // Find the row to get composite key
            const row = e.target.closest('.ns-table-row');
            if (row) {
                const compositeKey = row.dataset.rowId;
                const newQuantity = parseInt(e.target.value) || 0;
                updateItemQuantity(compositeKey, newQuantity);
            }
        }

        // Handle price changes
        if (e.target.classList.contains('editable-price')) {
            // Find the row to get composite key
            const row = e.target.closest('.ns-table-row');
            if (row) {
                const compositeKey = row.dataset.rowId;
                const newPrice = parseFloat(e.target.value) || 0;
                updateItemPrice(compositeKey, newPrice);
            }
        }

        // Select all checkbox
        if (e.target.id === 'select-all') {
            toggleAllItems(e.target.checked);
        }
    }

    /**
     * Toggle select all items
     */
    function toggleAllItems(selectAll) {
        const checkboxes = document.querySelectorAll('.item-checkbox');
        checkboxes.forEach(function(checkbox) {
            checkbox.checked = selectAll;
            const compositeKey = checkbox.dataset.compositeKey;
            toggleItemSelection(compositeKey, selectAll);
        });
    }

    /**
     * Toggle row expansion
     */
    function toggleRowExpansion(itemId) {
        const row = document.querySelector('[data-row-id="' + itemId + '"]');
        const panel = document.getElementById('panel-' + itemId);
        const expandBtn = row.querySelector('.expand-btn');
        
        if (state.expandedRows.has(itemId)) {
            state.expandedRows.delete(itemId);
            row.classList.remove('expanded');
            panel.classList.remove('show');
            expandBtn.innerHTML = '▶';
        } else {
            state.expandedRows.add(itemId);
            row.classList.add('expanded');
            panel.classList.add('show');
            expandBtn.innerHTML = '▼';
            
            // Load vendor details if not already loaded
            if (!panel.dataset.loaded) {
                loadVendorDetails(itemId);
            }
        }
    }

    /**
     * Toggle item selection (now uses composite key)
     * @param {string} compositeKey - Format: "itemId-locationId"
     * @param {boolean} isSelected
     */
    function toggleItemSelection(compositeKey, isSelected) {
        const row = document.querySelector('[data-row-id="' + compositeKey + '"]');

        if (isSelected) {
            state.selectedItems.add(compositeKey);
            if (row) row.classList.add('selected');
        } else {
            state.selectedItems.delete(compositeKey);
            if (row) row.classList.remove('selected');
        }

        updateSelectionUI();
        checkForRiskyVendors();
    }

    /**
     * Update UI based on selection
     * v3.11: Now updates total value display
     */
    function updateSelectionUI() {
        const count = state.selectedItems.size;
        
        // Update button text with formatted count
        if (dom.createPOBtn) {
            dom.createPOBtn.textContent = '🛒 Create PO (' + formatNumber(count) + ')';
            dom.createPOBtn.disabled = count === 0;
        }
        
        // Update selected count display
        if (dom.selectedCount) {
            dom.selectedCount.textContent = formatNumber(count);
        }
        
        // v3.11: Update total value to show selected/total
        updateTotalValueDisplay();
    }

    /**
     * Check for risky vendors and show warning
     */
    function checkForRiskyVendors() {
        const riskyItems = Array.from(state.selectedItems).filter(function(compositeKey) {
            const itemId = compositeKey.split('-')[0];
            const item = state.items.find(function(i) { return i.id === itemId; });
            return item && item.vendorRisk;
        });

        if (riskyItems.length > 0 && dom.warningBanner) {
            const riskyVendors = riskyItems.map(function(compositeKey) {
                const itemId = compositeKey.split('-')[0];
                const item = state.items.find(function(i) { return i.id === itemId; });
                return item.vendor;
            }).filter(function(vendor, index, self) {
                return self.indexOf(vendor) === index;
            });

            dom.warningBanner.querySelector('.warning-text').textContent =
                'Performance Risk: ' + riskyItems.length + ' selected item(s) have vendors with issues (' + riskyVendors.join(', ') + ')';
            dom.warningBanner.classList.remove('ns-hidden');
        } else if (dom.warningBanner) {
            dom.warningBanner.classList.add('ns-hidden');
        }
    }

    /**
     * Update item quantity (now uses composite key)
     * v3.11: Now updates total value display
     * @param {string} compositeKey - Format: "itemId-locationId"
     * @param {number} newQuantity
     */
    function updateItemQuantity(compositeKey, newQuantity) {
        if (!state.editedItems[compositeKey]) {
            state.editedItems[compositeKey] = {};
        }
        state.editedItems[compositeKey].quantity = Math.max(1, newQuantity);

        // Update total display
        updateItemTotal(compositeKey);
    }

    /**
     * Update item price (now uses composite key)
     * v3.11: Now updates total value display
     * @param {string} compositeKey - Format: "itemId-locationId"
     * @param {number} newPrice
     */
    function updateItemPrice(compositeKey, newPrice) {
        if (!state.editedItems[compositeKey]) {
            state.editedItems[compositeKey] = {};
        }
        state.editedItems[compositeKey].price = Math.max(0, newPrice);

        // Update total display
        updateItemTotal(compositeKey);
    }

    /**
     * v3.13: NEW - Utility function to append query parameters to URL
     * Properly handles existing query parameters
     */
    function appendQueryParams(baseUrl, params) {
        const separator = baseUrl.indexOf('?') !== -1 ? '&' : '?';
        const queryString = Object.keys(params)
            .map(function(key) {
                return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
            })
            .join('&');
        return baseUrl + separator + queryString;
    }

    /**
     * Show vendor selector dropdown (ENHANCED WITH LAZY LOAD)
     * Loads vendors lazily when user clicks "Change Vendor"
     */
    function showVendorSelector(itemId) {
        const item = state.items.find(function(i) { return i.id === itemId; });
        if (!item) {
            console.error('Item not found:', itemId);
            return;
        }
        
        const dropdown = document.getElementById('vendor-dropdown-' + itemId);
        if (!dropdown) {
            console.error('Dropdown element not found for item:', itemId);
            return;
        }
        
        // Check if dropdown is already open - if so, close it instead
        if (dropdown.style.display === 'block') {
            dropdown.style.display = 'none';
            return;
        }
        
        // Check if we already have vendors cached
        if (state.vendorCache.has(itemId)) {
            console.log('Using cached vendors for item:', itemId);
            const vendors = state.vendorCache.get(itemId);
            displayVendorOptions(itemId, vendors, dropdown);
            return;
        }
        
        // Show loading state
        dropdown.innerHTML = '<div style="padding: 12px; text-align: center; color: #6b7280;">' +
                             '<span class="ns-spinner"></span> Loading vendors...</div>';
        dropdown.style.display = 'block';
        dropdown.style.position = 'absolute';
        dropdown.style.background = 'white';
        dropdown.style.border = '1px solid #d1d5db';
        dropdown.style.borderRadius = '6px';
        dropdown.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
        dropdown.style.zIndex = '1000';
        dropdown.style.minWidth = '300px';
        
        // Load vendors from API
        loadVendorOptions(itemId)
            .then(function(vendors) {
                // Cache for future use
                state.vendorCache.set(itemId, vendors);
                
                // Display the options
                displayVendorOptions(itemId, vendors, dropdown);
            })
            .catch(function(error) {
                console.error('Error loading vendors:', error);
                dropdown.innerHTML = '<div style="padding: 12px; color: #dc2626;">' +
                                     '⚠️ Error loading vendors. Please try again.</div>';
            });
    }

    /**
     * Load vendor options from RESTlet API (LAZY LOAD)
     * @param {string} itemId
     * @returns {Promise<Array>} Promise that resolves to vendor array
     */
    function loadVendorOptions(itemId) {
        return new Promise(function(resolve, reject) {
            // Get RESTlet URL from window object (injected by Suitelet)
            let restletUrl = window.OrderItemsRESTletUrls && window.OrderItemsRESTletUrls.vendorList;
            
            if (!restletUrl) {
                // Fallback to resolving URL
                try {
                    restletUrl = url.resolveScript({
                        scriptId: 'customscript_oi_vendor_list_restlet',
                        deploymentId: 'customdeploy_oi_vendor_list_restlet'
                    });
                } catch (e) {
                    console.error('Failed to resolve vendor list RESTlet URL:', e);
                    reject(new Error('Vendor list RESTlet not configured'));
                    return;
                }
            }
            
            // Add query parameter
            const fullUrl = appendQueryParams(restletUrl, { itemId: itemId });

            console.log('Loading vendors from:', fullUrl);
            
            fetch(fullUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'same-origin'
            })
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status + ': ' + response.statusText);
                }
                return response.json();
            })
            .then(function(data) {
                if (data.success && data.data && data.data.vendors) {
                    console.log('Loaded ' + data.data.vendors.length + ' vendors for item ' + itemId);
                    resolve(data.data.vendors);
                } else {
                    throw new Error(data.error || 'Invalid response from vendor list API');
                }
            })
            .catch(function(error) {
                console.error('Error in loadVendorOptions:', error);
                reject(error);
            });
        });
    }

    /**
     * Load ALL vendors for ALL items using batch subsidiary-aware RESTlet
     * Called once after items finish loading to populate all vendor dropdowns
     */
    function loadAllVendorsForItems() {
        console.log('Loading vendors for all items (batch mode)');

        // Collect all item/location pairs
        const itemRequests = state.items.map(function(item) {
            return {
                itemId: item.id,
                locationId: item.location ? item.location.id : null
            };
        }).filter(function(req) {
            return req.locationId !== null; // Skip items without location
        });

        if (itemRequests.length === 0) {
            console.log('No items with locations found');
            return;
        }

        console.log('Requesting vendors for ' + itemRequests.length + ' items');
        console.log('Items being sent to RESTlet:', itemRequests);
        console.log('Sample item data:', state.items[0]);

        // Get RESTlet URL for subsidiary-aware vendor lookup
        let restletUrl = window.OrderItemsRESTletUrls && window.OrderItemsRESTletUrls.vendorSubsidiary;

        if (!restletUrl) {
            console.error('Vendor subsidiary RESTlet URL not configured');
            return;
        }

        // Make POST request with all items
        fetch(restletUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                items: itemRequests
            })
        })
        .then(function(response) {
            if (!response.ok) {
                throw new Error('HTTP ' + response.status + ': ' + response.statusText);
            }
            return response.json();
        })
        .then(function(data) {
            if (data.success && data.vendors) {
                console.log('Received vendor data for items:', Object.keys(data.vendors).length);
                console.log('Location→Subsidiary map:', data.locationSubsidiaryMap);
                populateAllVendorDropdowns(data.vendors, data.locationSubsidiaryMap);
            } else {
                throw new Error(data.error || 'Invalid response from vendor subsidiary API');
            }
        })
        .catch(function(error) {
            console.error('Error loading vendors (batch):', error);
            // Show error in all dropdowns using composite key
            state.items.forEach(function(item) {
                const locationId = item.location ? item.location.id : 'noloc';
                const compositeKey = item.id + '-' + locationId;
                const select = document.getElementById('vendor-select-' + compositeKey);
                if (select) {
                    select.innerHTML = '<option value="">Error loading vendors</option>';
                    select.disabled = false;
                }
            });
        });
    }

    /**
     * Populate all vendor dropdowns with fetched data
     * Uses TWO composite keys:
     *   - UI key (itemId-locationId) for dropdown IDs
     *   - Data key (itemId-subsidiaryId) for vendor lookups
     * @param {Object} vendorsData - Object mapping "itemId-subsidiaryId" to array of vendors
     * @param {Object} locationSubsidiaryMap - Maps location IDs to subsidiary IDs
     */
    function populateAllVendorDropdowns(vendorsData, locationSubsidiaryMap) {
        state.items.forEach(function(item, itemIndex) {
            const locationId = item.location ? item.location.id : 'noloc';
            const rowCompositeKey = item.id + '-' + locationId;

            // Map this item's location to its subsidiary
            const subsidiaryId = locationSubsidiaryMap[item.location.id];

            // Build the RESTlet composite key: itemId-subsidiaryId
            const vendorDataKey = item.id + '-' + subsidiaryId;

            // Look up vendors using the RESTlet's composite key
            const vendors = vendorsData[vendorDataKey];

            console.log('Row:', rowCompositeKey, '→ Looking up vendors with key:', vendorDataKey, '→ Found:', vendors ? vendors.length : 0, 'vendors');

            const select = document.getElementById('vendor-select-' + rowCompositeKey);

            if (!select) {
                console.warn('Dropdown not found for row composite key:', rowCompositeKey);
                return;
            }

            if (!vendors || vendors.length === 0) {
                select.innerHTML = '<option value="">No vendors available</option>';
                select.disabled = true;
                return;
            }

            // Build options HTML
            let optionsHTML = '';
            vendors.forEach(function(vendor) {
                const priceDisplay = (vendor.price !== null && vendor.price !== undefined) ?
                    vendor.currencySymbol + vendor.price.toFixed(2) : 'No price';
                const label = vendor.name + ' - ' + priceDisplay;
                const selected = vendor.isPreferred ? 'selected' : '';

                optionsHTML += '<option value="' + vendor.id + '" ' + selected + ' ' +
                              'data-price="' + (vendor.price || 0) + '" ' +
                              'data-currency="' + vendor.currency + '">' +
                              label +
                              (vendor.isPreferred ? ' ★' : '') +
                              '</option>';
            });

            select.innerHTML = optionsHTML;
            select.disabled = false;

            // Update unit price field with preferred vendor's price
            // Use composite key to find the correct price input for this specific row
            const preferredVendor = vendors.find(function(v) { return v.isPreferred; });
            if (preferredVendor && preferredVendor.price) {
                // Find the row that contains this specific dropdown
                const row = select.closest('.ns-table-row');
                if (row) {
                    const priceInput = row.querySelector('.editable-price');
                    if (priceInput) {
                        priceInput.value = preferredVendor.price.toFixed(2);
                        // Trigger change event to update total
                        priceInput.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
            }

            // Cache vendors for this item (same vendors for all locations in same subsidiary)
            state.vendorCache.set(item.id, vendors);
        });

        console.log('All vendor dropdowns populated');
    }

    /**
     * Display vendor options in the dropdown
     * @param {string} itemId
     * @param {Array} vendors - Array of vendor objects
     * @param {HTMLElement} dropdown - The dropdown element
     */
    function displayVendorOptions(itemId, vendors, dropdown) {
        const item = state.items.find(function(i) { return i.id === itemId; });
        const editedData = state.editedItems[itemId] || {};
        const currentVendor = editedData.vendor || item.preferredVendor;
        
        if (!vendors || vendors.length === 0) {
            dropdown.innerHTML = '<div style="padding: 12px; color: #6b7280;">' +
                                 'No vendors available for this item</div>';
            dropdown.style.display = 'block';
            return;
        }
        
        if (vendors.length === 1) {
            dropdown.innerHTML = '<div style="padding: 12px; color: #6b7280;">' +
                                 'Only one vendor available: ' + vendors[0].name + '</div>';
            dropdown.style.display = 'block';
            return;
        }
        
        // Build vendor options HTML
        const optionsHTML = vendors.map(function(vendor) {
            const isSelected = vendor.id === currentVendor.id;
            const priceDisplay = vendor.price ? '$' + vendor.price.toFixed(2) : 'No price';
            const ratingDisplay = vendor.rating ? vendor.rating.toFixed(1) : '-';
            
            return '<div class="select-vendor-option ' + (isSelected ? 'selected' : '') + '" ' +
                        'data-item-id="' + itemId + '" ' +
                        'data-vendor-id="' + vendor.id + '" ' +
                        'style="padding: 10px 12px; cursor: pointer; border-bottom: 1px solid #e5e7eb; ' +
                        'transition: background-color 0.15s ease; ' +
                        (isSelected ? 'background: #e0f2fe;' : '') + '">' +
                        '<div style="display: flex; justify-content: space-between; align-items: center;">' +
                            '<div style="flex: 1;">' +
                                '<div style="font-weight: 500; font-size: 14px;">' + 
                                    vendor.name + 
                                    (vendor.isPreferred ? ' <span style="color: #16a34a; font-size: 12px;">★ Preferred</span>' : '') +
                                '</div>' +
                                '<div style="font-size: 12px; color: #6b7280; margin-top: 2px;">' +
                                    priceDisplay + ' • ' + vendor.leadTime + ' days • ⭐ ' + ratingDisplay +
                                '</div>' +
                            '</div>' +
                            (isSelected ? '<div style="color: #2563eb; font-weight: 600; font-size: 18px;">✓</div>' : '') +
                        '</div>' +
                    '</div>';
        }).join('');
        
        dropdown.innerHTML = optionsHTML;
        dropdown.style.display = 'block';
        dropdown.style.position = 'absolute';
        dropdown.style.background = 'white';
        dropdown.style.border = '1px solid #d1d5db';
        dropdown.style.borderRadius = '6px';
        dropdown.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
        dropdown.style.zIndex = '1000';
        dropdown.style.minWidth = '300px';
        dropdown.style.maxHeight = '400px';
        dropdown.style.overflowY = 'auto';
        dropdown.style.marginTop = '4px';
        
        // Add hover effects
        const options = dropdown.querySelectorAll('.select-vendor-option');
        options.forEach(function(option) {
            option.addEventListener('mouseenter', function() {
                if (!this.classList.contains('selected')) {
                    this.style.background = '#f3f4f6';
                }
            });
            option.addEventListener('mouseleave', function() {
                if (!this.classList.contains('selected')) {
                    this.style.background = '';
                }
            });
        });
        
        // Close dropdown when clicking outside
        setTimeout(function() {
            document.addEventListener('click', function closeDropdown(e) {
                if (!dropdown.contains(e.target) && !e.target.closest('.vendor-name-clickable')) {
                    dropdown.style.display = 'none';
                    document.removeEventListener('click', closeDropdown);
                }
            });
        }, 0);
    }

    /**
     * Select a vendor for a specific row (handles duplicate items with different locations)
     * @param {HTMLElement} selectElement - The dropdown element that changed
     * @param {string} itemId - The item ID
     * @param {string} locationId - The location ID
     * @param {Object} vendor - The vendor object
     */
    function selectVendorForRow(selectElement, itemId, locationId, vendor) {
        // Find the specific row containing this dropdown
        const row = selectElement.closest('.ns-table-row');
        if (!row) {
            console.error('Could not find row for vendor selection');
            return;
        }

        // Update state for this specific row
        // Use composite key to track edits for item+location combinations
        const compositeKey = itemId + '-' + locationId;
        if (!state.editedItems[compositeKey]) {
            state.editedItems[compositeKey] = {};
        }
        state.editedItems[compositeKey].vendor = vendor;

        // Update the price input in this specific row
        const priceInput = row.querySelector('.editable-price');
        if (priceInput && vendor.price) {
            priceInput.value = vendor.price.toFixed(2);
            // Trigger change event to update total
            priceInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        console.log('Vendor changed for item ' + itemId + ' at location ' + locationId + ' to ' + vendor.name);
    }

    /**
     * Select a vendor (LEGACY - kept for backward compatibility)
     * v3.11: Now updates total value display
     * @param {string} itemId
     * @param {string} vendorId
     */
    function selectVendor(itemId, vendorId) {
        const item = state.items.find(function(i) { return i.id === itemId; });
        if (!item) return;
        
        // Get vendor from cache (it should be there after lazy load)
        const vendors = state.vendorCache.get(itemId);
        if (!vendors) {
            console.error('Vendor cache not found for item:', itemId);
            return;
        }
        
        const vendor = vendors.find(function(v) { return v.id === vendorId; });
        if (!vendor) {
            console.error('Vendor not found:', vendorId);
            return;
        }
        
        // Update state
        if (!state.editedItems[itemId]) {
            state.editedItems[itemId] = {};
        }
        state.editedItems[itemId].vendor = vendor;
        
        // Hide dropdown
        const dropdown = document.getElementById('vendor-dropdown-' + itemId);
        if (dropdown) {
            dropdown.style.display = 'none';
        }
        
        // Update the display
        updateVendorDisplay(itemId, vendor);
        
        // Recalculate total with new vendor price
        updateItemTotal(itemId);
        
        console.log('Vendor changed for item ' + itemId + ' to ' + vendor.name);
    }

    /**
     * Update vendor tooltip with latest data
     * Called after loading detailed vendor data or changing vendor
     * @param {string} itemId
     */
    function updateVendorTooltip(itemId) {
        const item = state.items.find(function(i) { return i.id === itemId; });
        if (!item) return;
        
        const editedData = state.editedItems[itemId] || {};
        const currentVendor = editedData.vendor || item.preferredVendor;
        
        const vendorNameSpan = document.querySelector('[data-row-id="' + itemId + '"] .vendor-name-clickable');
        if (vendorNameSpan) {
            // Preserve the vendor name text, just update the tooltip HTML
            vendorNameSpan.innerHTML = currentVendor.name + createVendorTooltipHTML(currentVendor, itemId);
        }
    }

    /**
     * Update vendor display in the table (without full row re-render)
     * @param {string} itemId
     * @param {Object} vendor
     */
    function updateVendorDisplay(itemId, vendor) {
        const row = document.querySelector('[data-row-id="' + itemId + '"]');
        if (!row) return;
        
        const vendorNameSpan = row.querySelector('.vendor-name-clickable');
        if (!vendorNameSpan) return;
        
        // Update vendor name and tooltip
        vendorNameSpan.innerHTML = vendor.name + createVendorTooltipHTML(vendor, itemId);
        
        // Update rating
        const ratingSpan = row.querySelector('.ns-vendor-rating span:last-child');
        if (ratingSpan) {
            ratingSpan.textContent = vendor.rating ? vendor.rating.toFixed(2) : '0.00';
        }
        
        // Update risk badge if needed
        const vendorCell = row.querySelector('.ns-vendor-cell');
        const existingRiskBadge = vendorCell.querySelector('.ns-badge-vendor-risk');
        if (vendor.riskLevel === 'high' && !existingRiskBadge) {
            const ratingContainer = vendorCell.querySelector('.ns-vendor-rating');
            if (ratingContainer) {
                ratingContainer.insertAdjacentHTML('afterend', '<span class="ns-badge-vendor-risk">Risk</span>');
            }
        } else if (vendor.riskLevel !== 'high' && existingRiskBadge) {
            existingRiskBadge.remove();
        }
    }

    /**
     * Update item total after vendor, quantity, or price change (now uses composite key)
     * v3.11: Now uses formatCurrency and updates total value display
     * @param {string} compositeKey - Format: "itemId-locationId"
     */
    function updateItemTotal(compositeKey) {
        // Parse composite key to find matching item
        const parts = compositeKey.split('-');
        const itemId = parts[0];
        const locationId = parts.length > 1 ? parts[1] : 'noloc';

        const item = state.items.find(function(i) {
            const iLoc = i.location ? i.location.id : 'noloc';
            return i.id === itemId && iLoc === locationId;
        });

        if (!item) return;

        const editedData = state.editedItems[compositeKey] || {};
        const quantity = editedData.quantity !== undefined ? editedData.quantity : item.suggestedQty;
        const selectedVendor = editedData.vendor || item.preferredVendor;

        // Use edited price if available, otherwise use vendor price or item price
        let unitPrice;
        if (editedData.price !== undefined) {
            unitPrice = editedData.price;
        } else {
            unitPrice = selectedVendor.price || item.unitPrice;
        }

        const total = quantity * unitPrice;

        // Update the UI cells with proper formatting
        const row = document.querySelector('[data-row-id="' + compositeKey + '"]');
        if (row) {
            const cells = row.querySelectorAll('.ns-table-cell');
            
            // Update unit price input (column 8) - only if not manually edited
            if (cells[7] && editedData.price === undefined) {
                const priceInput = cells[7].querySelector('.editable-price');
                if (priceInput) {
                    priceInput.value = unitPrice.toFixed(2);
                }
            }
            
            // Update total (column 9) with proper currency formatting
            if (cells[8]) {
                cells[8].textContent = formatCurrency(total);
            }
        }
        
        // v3.11: Update the total value display in summary card
        updateTotalValueDisplay();
    }

    /**
     * Load order items from NetSuite
     */
    function loadOrderItems(append) {
        append = append || false;

        if (state.isLoading) return;

        state.isLoading = true;
        showLoadingState(true);

        // Prepare request parameters
        const params = {
            page: append ? state.currentPage + 1 : state.currentPage,
            limit: state.itemsPerPage,
            filter: state.filterStatus,
            search: state.searchQuery
        };

        // Get RESTlet URL from window object (injected by Suitelet)
        let restletUrl = window.OrderItemsRESTletUrls && window.OrderItemsRESTletUrls.items;

        // Fallback to resolving URL if not found in window
        if (!restletUrl) {
            restletUrl = url.resolveScript({
                scriptId: 'customscript_oi_items_restlet',
                deploymentId: 'customdeploy_oi_items_restlet'
            });
        }

        // Append query parameters
        restletUrl = appendQueryParams(restletUrl, params);

        fetch(restletUrl, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            if (data.success) {
                if (append) {
                    state.items = state.items.concat(data.data.items);
                    state.currentPage++;
                } else {
                    state.items = data.data.items;
                }

                renderItems(data.data.items, append);
                updateSummaryCards(data.data.summary);

                // Load vendors for all items (batch)
                if (!append) {
                    loadAllVendorsForItems();
                }
            } else {
                throw new Error(data.error || 'Failed to load items');
            }
        })
        .catch(function(error) {
            console.error('Error loading items:', error);
            dialog.alert({
                title: 'Error',
                message: 'Failed to load order items. Please refresh the page.'
            });
        })
        .finally(function() {
            state.isLoading = false;
            showLoadingState(false);
        });
    }

    /**
     * Render items to the DOM
     */
    function renderItems(items, append) {
        append = append || false;
        
        const html = items.map(function(item) {
            return createItemRowHTML(item);
        }).join('');
        
        if (append) {
            dom.itemsContainer.insertAdjacentHTML('beforeend', html);
        } else {
            dom.itemsContainer.innerHTML = html;
        }
    }

    /**
     * Create vendor performance tooltip HTML
     * v3.12: Now formats quality rating to 2 decimals
     */
    function createVendorTooltipHTML(vendor, itemId) {
        // Check if we have detailed performance data cached
        const cachedDetails = state.vendorDetailsCache && state.vendorDetailsCache[itemId];
        const detailedData = cachedDetails || (vendor.performance ? vendor : null);
        
        // Build tooltip with whatever data we have
        if (detailedData && detailedData.performance) {
            // We have detailed performance data - show full metrics
            const perf = detailedData.performance;
            
            const otdClass = perf.onTimeDelivery >= 95 ? 'good' : (perf.onTimeDelivery >= 85 ? 'average' : 'poor');
            const qualityClass = perf.qualityRating >= 4.5 ? 'good' : (perf.qualityRating >= 3.5 ? 'average' : 'poor');
            const leadTimeClass = perf.avgLeadTime <= perf.quotedLeadTime ? 'good' : 'average';
            
            // v3.12: Format numbers properly
            const otdFormatted = parseFloat(perf.onTimeDelivery).toFixed(1);
            const qualityFormatted = parseFloat(perf.qualityRating).toFixed(2);
            const defectFormatted = parseFloat(perf.defectRate).toFixed(1);
            
            return '<div class="vendor-tooltip">' +
                   '<div class="vendor-tooltip-header">' + vendor.name + ' Performance</div>' +
                   '<div class="vendor-tooltip-metrics">' +
                       '<div class="vendor-tooltip-metric">' +
                           '<div class="vendor-tooltip-metric-label">On-Time Delivery</div>' +
                           '<div class="vendor-tooltip-metric-value ' + otdClass + '">' + 
                               otdFormatted + '%' +
                           '</div>' +
                       '</div>' +
                       '<div class="vendor-tooltip-metric">' +
                           '<div class="vendor-tooltip-metric-label">Quality Rating</div>' +
                           '<div class="vendor-tooltip-metric-value ' + qualityClass + '">' + 
                               qualityFormatted + '/5.0' +
                           '</div>' +
                       '</div>' +
                       '<div class="vendor-tooltip-metric">' +
                           '<div class="vendor-tooltip-metric-label">Avg Lead Time</div>' +
                           '<div class="vendor-tooltip-metric-value ' + leadTimeClass + '">' + 
                               perf.avgLeadTime + ' days' +
                           '</div>' +
                       '</div>' +
                       '<div class="vendor-tooltip-metric">' +
                           '<div class="vendor-tooltip-metric-label">Defect Rate</div>' +
                           '<div class="vendor-tooltip-metric-value ' + (perf.defectRate <= 2 ? 'good' : 'poor') + '">' + 
                               defectFormatted + '%' +
                           '</div>' +
                       '</div>' +
                   '</div>' +
                   '<div class="vendor-tooltip-footer">Based on ' + perf.totalOrders + ' orders • Click to change</div>' +
                   '</div>';
        } else {
            // Simple tooltip with basic data from items RESTlet
            const ratingClass = vendor.rating >= 4.5 ? 'good' : (vendor.rating >= 3.5 ? 'average' : 'poor');
            const riskBadge = vendor.riskLevel === 'high' ? 
                '<div style="margin-top: 8px; padding: 6px; background: #fef3c7; border-radius: 4px; font-size: 11px; color: #92400e;">' +
                '⚠️ Performance risk identified' +
                '</div>' : '';
            
            return '<div class="vendor-tooltip">' +
                   '<div class="vendor-tooltip-header">' + vendor.name + '</div>' +
                   '<div class="vendor-tooltip-metrics">' +
                       '<div class="vendor-tooltip-metric">' +
                           '<div class="vendor-tooltip-metric-label">Rating</div>' +
                           '<div class="vendor-tooltip-metric-value ' + ratingClass + '">' + 
                               (vendor.rating ? vendor.rating.toFixed(1) : 'N/A') + '/5.0' +
                           '</div>' +
                       '</div>' +
                       '<div class="vendor-tooltip-metric">' +
                           '<div class="vendor-tooltip-metric-label">Lead Time</div>' +
                           '<div class="vendor-tooltip-metric-value">' + 
                               (vendor.leadTime || 'N/A') +
                           '</div>' +
                       '</div>' +
                   '</div>' +
                   riskBadge +
                   '<div class="vendor-tooltip-footer">Expand row for detailed metrics • Click to change</div>' +
                   '</div>';
        }
    }

    /**
     * Create HTML for a single item row
     * UPDATED: 12 columns with Location and Stock Status separated
     */
    function createItemRowHTML(item) {
        const urgencyClass = getUrgencyClass(item.urgency);
        const stockClass = getStockClass(item.stockStatus);
        
        // Get edited values or defaults
        const editedData = state.editedItems[item.id] || {};
        const quantity = editedData.quantity !== undefined ? editedData.quantity : item.suggestedQty;
        const selectedVendor = editedData.vendor || item.preferredVendor;
        
        // Use edited price if available, otherwise vendor/item price
        let unitPrice;
        if (editedData.price !== undefined) {
            unitPrice = editedData.price;
        } else {
            unitPrice = selectedVendor.price || item.unitPrice;
        }
        
        const total = (quantity * unitPrice).toFixed(2);

        const locationName = (item.location && item.location.name) ? item.location.name : 'All Locations';
        const locationStock = (item.stockDetails && item.stockDetails.location) ? 
            item.stockDetails.location.available : 0;
        const globalStock = (item.stockDetails && item.stockDetails.global) ? 
            item.stockDetails.global.available : 0;

        // UPDATED: 12 columns - Location (col 5) and Stock Status (col 6) separated
        const locationId = item.location ? item.location.id : 'noloc';
        const compositeKey = item.id + '-' + locationId;

        return '<div class="ns-table-row" data-row-id="' + compositeKey + '">' +
                // Column 1: Checkbox (40px)
                '<div class="ns-table-cell">' +
                    '<input type="checkbox" class="item-checkbox ns-checkbox" ' +
                           'data-item-id="' + item.id + '" ' +
                           'data-location-id="' + locationId + '" ' +
                           'data-composite-key="' + compositeKey + '">' +
                '</div>' +
                // Column 2: Expand button (40px)
                '<div class="ns-table-cell">' +
                    '<button class="expand-btn ns-btn-ghost" data-item-id="' + item.id + '">▶</button>' +
                '</div>' +
                // Column 3: Item # (120px)
                '<div class="ns-table-cell">' + item.itemNumber + '</div>' +
                // Column 4: Description (2fr - flexible)
                '<div class="ns-table-cell">' + item.description + '</div>' +
                // Column 5: Location (120px) - NEW SEPARATED COLUMN
                '<div class="ns-table-cell">' + locationName + '</div>' +
                // Column 6: Stock Status / Order Date (140px) - Shows date for MRP, stock for reorder items
                '<div class="ns-table-cell">' +
                    (item.source === 'mrp' ?
                        // MRP items: Show order date (compact format)
                        (item.mrpOrderByDate ?
                            '<div class="ns-mrp-date">' +
                                '<span>Order: ' + formatDateMonthDay(item.mrpOrderByDate) + '</span>' +
                            '</div>' :
                            '<div class="ns-mrp-date"><span>—</span></div>' // MRP with no date
                        ) :
                        // Reorder items: Show stock status
                        '<div class="ns-stock-indicator">' +
                            '<span class="ns-stock-dot ' + stockClass + '"></span>' +
                            '<span>' + formatNumber(locationStock) + ' / ' + formatNumber(globalStock) + '</span>' +
                        '</div>'
                    ) +
                '</div>' +
                // Column 7: Suggested Qty (100px)
                '<div class="ns-table-cell">' +
                    '<input type="number" class="ns-input ns-input-sm editable-quantity" ' +
                           'data-item-id="' + item.id + '" ' +
                           'value="' + quantity + '" ' +
                           'min="1" ' +
                           'style="width: 80px;">' +
                '</div>' +
                // Column 8: Unit Price (100px)
                '<div class="ns-table-cell">' +
                    '<input type="number" class="ns-input ns-input-sm editable-price" ' +
                           'data-item-id="' + item.id + '" ' +
                           'value="' + unitPrice.toFixed(2) + '" ' +
                           'min="0" ' +
                           'step="0.01" ' +
                           'style="width: 90px;">' +
                '</div>' +
                // Column 9: Total (120px) - v3.11: Now formatted with commas
                '<div class="ns-table-cell">' + formatCurrency(total) + '</div>' +
                // Column 10: Vendor (240px - dropdown always visible)
                '<div class="ns-table-cell">' +
                    '<select class="ns-input vendor-select" id="vendor-select-' + item.id + '-' + (item.location ? item.location.id : 'noloc') + '" ' +
                            'data-item-id="' + item.id + '" ' +
                            'data-location-id="' + (item.location ? item.location.id : '') + '" disabled>' +
                        '<option value="">Loading vendors...</option>' +
                    '</select>' +
                '</div>' +
                // Column 11: Lead Time (100px)
                '<div class="ns-table-cell">' + selectedVendor.leadTime + ' days</div>' +
                // Column 12: Urgency (120px - increased from 100px to prevent wrapping)
                '<div class="ns-table-cell">' +
                    '<span class="ns-badge ' + urgencyClass + '">' + item.urgency.toUpperCase() + '</span>' +
                '</div>' +
            '</div>' +
            '<div id="panel-' + item.id + '" class="ns-vendor-panel">' +
                '<!-- Vendor panel content will be loaded dynamically -->' +
            '</div>';
    }

    /**
     * Load vendor details for expanded panel
     */
    function loadVendorDetails(itemId) {
        const panel = document.getElementById('panel-' + itemId);
        const item = state.items.find(function(i) { return i.id === itemId; });
        
        if (!item || !panel) return;
        
        panel.innerHTML = '<div class="ns-skeleton" style="height: 200px;"></div>';

        let restletUrl = window.OrderItemsRESTletUrls && window.OrderItemsRESTletUrls.vendor;

        if (!restletUrl) {
            restletUrl = url.resolveScript({
                scriptId: 'customscript_oi_vendor_restlet',
                deploymentId: 'customdeploy_oi_vendor_restlet'
            });
        }

        const fullUrl = appendQueryParams(restletUrl, {
            vendorId: item.preferredVendor.id,
            itemId: itemId,
            action: 'details'
        });

        fetch(fullUrl, {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'same-origin'
        })
        .then(function(response) {
            if (!response.ok) {
                throw new Error('HTTP ' + response.status + ': ' + response.statusText);
            }
            return response.json();
        })
        .then(function(data) {
            if (data.success && data.data && data.data.vendor) {
                // Cache the detailed vendor data for tooltips
                state.vendorDetailsCache[itemId] = data.data.vendor;
                
                panel.innerHTML = createVendorPanelHTML(data.data.vendor, item);
                panel.dataset.loaded = 'true';
                
                // Update the tooltip with detailed data now that we have it
                updateVendorTooltip(itemId);
            } else {
                throw new Error(data.error || 'Invalid response format');
            }
        })
        .catch(function(error) {
            console.error('Error loading vendor details:', error);
            panel.innerHTML = '<div class="ns-alert ns-alert-danger" style="margin: 10px;">' +
                '<strong>Failed to load vendor details</strong><br>' +
                'Error: ' + error.message +
                '</div>';
        });
    }

    /**
     * Create vendor panel HTML
     * v3.12: Now formats all numbers properly (quality rating to 2 decimals, percentages to 1 decimal)
     */
    function createVendorPanelHTML(vendorData, item) {
        const performance = vendorData.performance;
        const trends = vendorData.trends;
        
        // v3.12: Format numbers properly
        const otdPercent = parseFloat(performance.onTimeDelivery || 0).toFixed(1);
        const qualityRating = parseFloat(performance.qualityRating || 0).toFixed(2);
        const defectRate = parseFloat(performance.defectRate || 0).toFixed(1);
        const priceTrend = parseFloat(trends.priceTrend || 0).toFixed(1);
        const otdTrend = parseFloat(trends.otdTrend || 0).toFixed(1);
        
        return '<div class="ns-flex ns-justify-between ns-mb-4">' +
                '<div>' +
                    '<h3 class="ns-text-lg ns-font-semibold">' +
                        'Vendor Performance: ' + item.preferredVendor.name +
                    '</h3>' +
                    '<p class="ns-text-sm ns-text-muted">' +
                        'Based on ' + performance.totalOrders + ' completed orders' +
                    '</p>' +
                '</div>' +
                '<div class="ns-flex ns-gap-2">' +
                    '<button class="ns-btn ns-btn-outline compare-vendors-btn" data-item-id="' + item.id + '">' +
                        '📊 Compare Vendors' +
                    '</button>' +
                '</div>' +
            '</div>' +
            
            '<div class="ns-metrics-grid">' +
                '<div class="ns-metric-card">' +
                    '<div class="ns-metric-label">' +
                        '<span class="ns-perf-dot ' + getPerformanceDotClass(performance.onTimeDelivery) + '"></span>' +
                        'On-Time Delivery' +
                    '</div>' +
                    '<div class="ns-metric-value">' + otdPercent + '%</div>' +
                    '<div class="ns-metric-trend ' + (trends.otdTrend > 0 ? 'ns-trend-up' : 'ns-trend-down') + '">' +
                        (trends.otdTrend > 0 ? '↑' : '↓') + ' ' + Math.abs(otdTrend) + '% vs last period' +
                    '</div>' +
                    '<div class="ns-progress">' +
                        '<div class="ns-progress-fill ' + getProgressClass(performance.onTimeDelivery) + '" ' +
                             'style="width: ' + otdPercent + '%"></div>' +
                    '</div>' +
                '</div>' +
                
                '<div class="ns-metric-card">' +
                    '<div class="ns-metric-label">⭐ Quality Rating</div>' +
                    '<div class="ns-metric-value">' + qualityRating + '</div>' +
                    '<div class="ns-metric-trend">Defect rate: ' + defectRate + '%</div>' +
                '</div>' +
                
                '<div class="ns-metric-card">' +
                    '<div class="ns-metric-label">⏱ Avg Lead Time</div>' +
                    '<div class="ns-metric-value">' + performance.avgLeadTime + ' days</div>' +
                    '<div class="ns-metric-trend">Quoted: ' + performance.quotedLeadTime + ' days</div>' +
                '</div>' +
                
                '<div class="ns-metric-card">' +
                    '<div class="ns-metric-label">📈 Price Trend</div>' +
                    '<div class="ns-metric-value ' + (trends.priceTrend < 0 ? 'ns-text-success' : 'ns-text-danger') + '">' +
                        (trends.priceTrend > 0 ? '+' : '') + priceTrend + '%' +
                    '</div>' +
                    '<div class="ns-metric-trend">vs. 6-month average</div>' +
                '</div>' +
            '</div>' +
            
            (vendorData.risks && vendorData.risks.length > 0 ? createRiskAlertHTML(vendorData.risks) : '');
    }

    /**
     * Create risk alert HTML
     */
    function createRiskAlertHTML(risks) {
        return '<div class="ns-alert ns-alert-warning ns-mt-4">' +
                '<div class="ns-alert-icon">⚠️</div>' +
                '<div class="ns-alert-content">' +
                    '<div class="ns-alert-title">Vendor Performance Risks Identified</div>' +
                    '<ul class="ns-mt-2">' +
                        risks.map(function(risk) { return '<li>' + risk.message + '</li>'; }).join('') +
                    '</ul>' +
                    '<div class="ns-alert-actions">' +
                        '<button class="ns-btn ns-btn-sm ns-btn-outline">View Alternatives</button>' +
                    '</div>' +
                '</div>' +
            '</div>';
    }

    /**
     * Show vendor comparison modal
     */
    function showVendorComparison(itemId) {
        const item = state.items.find(function(i) { return i.id === itemId; });
        if (!item) return;
        
        let restletUrl = window.OrderItemsRESTletUrls && window.OrderItemsRESTletUrls.vendor;

        if (!restletUrl) {
            restletUrl = url.resolveScript({
                scriptId: 'customscript_oi_vendor_restlet',
                deploymentId: 'customdeploy_oi_vendor_restlet'
            });
        }

        const fullUrl = appendQueryParams(restletUrl, {
            action: 'compare',
            itemId: itemId,
            vendorIds: [item.preferredVendor.id].join(',')
        });

        fetch(fullUrl, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            if (data.success) {
                showComparisonModal(data.data);
            } else {
                throw new Error(data.error || 'Failed to load comparison');
            }
        })
        .catch(function(error) {
            console.error('Error loading comparison:', error);
            dialog.alert({
                title: 'Error',
                message: 'Failed to load vendor comparison data.'
            });
        });
    }

    /**
     * Display comparison modal
     */
    function showComparisonModal(data) {
        const modalBody = dom.comparisonModal.querySelector('.ns-modal-body');
        modalBody.innerHTML = createComparisonHTML(data);
        dom.comparisonModal.classList.add('show');
        
        if (window.Chart) {
            initializeSpiderChart(data);
        }
    }

    /**
     * Create comparison HTML
     */
    function createComparisonHTML(data) {
        const comparison = data.comparison;
        
        return '<p class="ns-text-muted ns-mb-4">Compare key performance metrics to make an informed decision</p>' +
            '<div class="vendor-comparison ns-grid ns-grid-cols-2 ns-gap-4">' +
                comparison.vendors.map(function(vendor) {
                    return '<div class="ns-card">' +
                        '<h4 class="ns-font-semibold ns-mb-2">' + vendor.name + '</h4>' +
                        '<div class="ns-text-sm ns-text-muted">Performance Summary</div>' +
                        '<div class="ns-metrics-grid" style="grid-template-columns: 1fr 1fr;">' +
                            '<div class="ns-metric-card">' +
                                '<div class="ns-metric-label">OTD</div>' +
                                '<div class="ns-metric-value ns-text-lg">' + vendor.performance.onTimeDelivery + '%</div>' +
                            '</div>' +
                            '<div class="ns-metric-card">' +
                                '<div class="ns-metric-label">Quality</div>' +
                                '<div class="ns-metric-value ns-text-lg">' + vendor.performance.qualityRating + '</div>' +
                            '</div>' +
                        '</div>' +
                        (vendor.id === comparison.bestOption ? 
                            '<div class="ns-badge ns-badge-success ns-mt-2">Recommended</div>' : '') +
                    '</div>';
                }).join('') +
            '</div>' +
            '<div class="ns-mt-4">' +
                '<div class="ns-text-lg ns-font-semibold ns-mb-2">Recommendation</div>' +
                '<p class="ns-text-sm">' + comparison.reasoning + '</p>' +
            '</div>';
    }

    /**
     * Create purchase orders
     */
    function handleCreatePO(e) {
        e.preventDefault(); // CRITICAL: Prevent form submission
        
        if (state.selectedItems.size === 0) return;
        
        const selectedItemIds = Array.from(state.selectedItems);
        
        dialog.confirm({
            title: 'Create Purchase Orders',
            message: 'Create purchase orders for ' + formatNumber(selectedItemIds.length) + ' selected items?'
        }).then(function(result) {
            if (result) {
                createPurchaseOrders(selectedItemIds);
            }
        });
    }

    /**
     * Call backend to create POs
     * FIXED v3.10: Now sends location data to backend
     * FIXED v3.14: Now handles composite keys for item+location combinations
     */
    function createPurchaseOrders(compositeKeys) {
        showLoadingState(true);

        let restletUrl = window.OrderItemsRESTletUrls && window.OrderItemsRESTletUrls.purchaseOrder;

        if (!restletUrl) {
            restletUrl = url.resolveScript({
                scriptId: 'customscript_oi_purchase_order_restlet',
                deploymentId: 'customdeploy_oi_purchase_order_restlet'
            });
        }

        const items = compositeKeys.map(function(compositeKey) {
            // Parse composite key: "itemId-locationId"
            const parts = compositeKey.split('-');
            const itemId = parts[0];
            const locationId = parts.length > 1 ? parts[1] : null;

            // Find the specific item instance with matching location
            const item = state.items.find(function(i) {
                const iLoc = i.location ? i.location.id : 'noloc';
                return i.id === itemId && iLoc === locationId;
            });

            if (!item) {
                console.error('Could not find item for composite key:', compositeKey);
                return null;
            }

            // Get edited data using composite key
            const editedData = state.editedItems[compositeKey] || {};

            const quantity = editedData.quantity !== undefined ? editedData.quantity : item.suggestedQty;
            const selectedVendor = editedData.vendor || item.preferredVendor;

            // Use edited price if available, otherwise use vendor price
            let rate;
            if (editedData.price !== undefined) {
                rate = editedData.price;
            } else {
                rate = selectedVendor.price;
            }

            // FIXED v3.10: Include location data
            return {
                itemId: itemId,
                quantity: quantity,
                vendorId: selectedVendor.id,
                rate: rate,
                location: item.location ? item.location.id : null
            };
        }).filter(function(item) {
            return item !== null; // Remove any nulls from items not found
        });
        
        console.log('Creating PO with items:', items);
        
        fetch(restletUrl, {
            method: 'POST',
            body: JSON.stringify({
                items: items,
                groupByVendor: true,
                notes: 'Created from Order Items UI'
            }),
            headers: { 'Content-Type': 'application/json' }
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(result) {
            showLoadingState(false);
            
            if (result.success) {
                dialog.alert({
                    title: 'Success',
                    message: 'Created ' + result.data.purchaseOrders.length + ' purchase order(s). PO Numbers: ' +
                           result.data.purchaseOrders.map(function(po) { return po.number; }).join(', ')
                });

                state.selectedItems.clear();
                state.editedItems = {};
                loadOrderItems();
            } else {
                throw new Error(result.error || 'Failed to create purchase orders');
            }
        })
        .catch(function(error) {
            showLoadingState(false);
            console.error('Error creating POs:', error);
            dialog.alert({
                title: 'Error',
                message: 'Failed to create purchase orders. ' + error.message
            });
        });
    }

    /**
     * Setup infinite scroll
     */
    function setupInfiniteScroll() {
        if (!window.IntersectionObserver) return;
        
        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting && !state.isLoading) {
                    loadMoreItems();
                }
            });
        }, {
            root: null,
            rootMargin: '100px',
            threshold: 0.1
        });

        if (dom.loadMoreBtn) {
            observer.observe(dom.loadMoreBtn);
        }
    }

    /**
     * Load more items
     */
    function loadMoreItems() {
        loadOrderItems(true);
    }

    /**
     * Handle search input
     */
    function handleSearch(e) {
        state.searchQuery = e.target.value;
        state.currentPage = 1;
        loadOrderItems();
    }

    /**
     * Handle filter change
     */
    function handleFilterChange(e) {
        state.filterStatus = e.target.value;
        state.currentPage = 1;
        loadOrderItems();
    }

    /**
     * Update summary cards
     * v3.11: Fixed MRP count display
     * @param {Object} summary - Summary data from server
     */
    function updateSummaryCards(summary) {
        // Update counts from server with proper formatting
        if (dom.criticalCount) {
            dom.criticalCount.textContent = formatNumber(summary.criticalCount);
        }
        if (dom.reorderCount) {
            dom.reorderCount.textContent = formatNumber(summary.belowReorderCount);
        }
        
        // v3.11 FIX: MRP count was being sent but not displayed
        if (dom.mrpCount) {
            dom.mrpCount.textContent = formatNumber(summary.mrpSuggestedCount);
        }
        
        // v3.11: Calculate actual total value from loaded items instead of using server value
        updateTotalValueDisplay();
    }

    /**
     * v3.11: NEW FUNCTION - Calculate and display total value with selected/total format
     * Shows "selected / total" when items are selected
     * Shows just "total" when no items selected
     */
    function updateTotalValueDisplay() {
        if (!dom.totalValue) return;
        
        // Calculate total value of ALL loaded items using composite keys
        const totalValue = state.items.reduce(function(sum, item) {
            const locationId = item.location ? item.location.id : 'noloc';
            const compositeKey = item.id + '-' + locationId;
            const editedData = state.editedItems[compositeKey] || {};
            const quantity = editedData.quantity !== undefined ? editedData.quantity : item.suggestedQty;
            const selectedVendor = editedData.vendor || item.preferredVendor;

            let unitPrice;
            if (editedData.price !== undefined) {
                unitPrice = editedData.price;
            } else {
                unitPrice = selectedVendor.price || item.unitPrice;
            }

            return sum + (quantity * unitPrice);
        }, 0);

        // If items are selected, show selected value / total value
        if (state.selectedItems.size > 0) {
            const selectedValue = Array.from(state.selectedItems).reduce(function(sum, compositeKey) {
                // Parse composite key to find matching item
                const parts = compositeKey.split('-');
                const itemId = parts[0];
                const locationId = parts.length > 1 ? parts[1] : 'noloc';

                const item = state.items.find(function(i) {
                    const iLoc = i.location ? i.location.id : 'noloc';
                    return i.id === itemId && iLoc === locationId;
                });

                if (!item) return sum;

                const editedData = state.editedItems[compositeKey] || {};
                const quantity = editedData.quantity !== undefined ? editedData.quantity : item.suggestedQty;
                const selectedVendor = editedData.vendor || item.preferredVendor;

                let unitPrice;
                if (editedData.price !== undefined) {
                    unitPrice = editedData.price;
                } else {
                    unitPrice = selectedVendor.price || item.unitPrice;
                }

                return sum + (quantity * unitPrice);
            }, 0);
            
            // Show as "selected / total"
            dom.totalValue.innerHTML = formatCurrency(selectedValue) + 
                                       ' <span style="color: #6b7280; font-size: 0.9em;">/ ' + 
                                       formatCurrency(totalValue) + '</span>';
        } else {
            // Show just total
            dom.totalValue.textContent = formatCurrency(totalValue);
        }
    }

    /**
     * Utility Functions
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction() {
            const args = arguments;
            const later = function() {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function getUrgencyClass(urgency) {
        const classes = {
            critical: 'ns-badge-critical',
            high: 'ns-badge-high',
            medium: 'ns-badge-medium',
            low: 'ns-badge-low'
        };
        return classes[urgency] || 'ns-badge-low';
    }

    function getStockClass(status) {
        const classes = {
            critical: 'ns-stock-critical',
            warning: 'ns-stock-warning',
            good: 'ns-stock-good'
        };
        return classes[status] || 'ns-stock-good';
    }

    function getPerformanceClass(value) {
        if (value >= 95) return 'good';
        if (value >= 85) return 'average';
        return 'poor';
    }

    function getPerformanceDotClass(value) {
        if (value >= 95) return 'ns-perf-dot-good';
        if (value >= 85) return 'ns-perf-dot-average';
        return 'ns-perf-dot-poor';
    }

    function getProgressClass(value) {
        if (value >= 95) return 'ns-progress-good';
        if (value >= 85) return 'ns-progress-average';
        return 'ns-progress-poor';
    }

    /**
     * v3.11: UPDATED - Format currency with comma separators
     * Now properly formats large numbers like $200,000 instead of $200000
     */
    function formatCurrency(amount) {
        return '$' + Number(amount).toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    }

    /**
     * v3.11: NEW FUNCTION - Format numbers with comma separators
     * For count displays (12 items, 1,234 items, etc.)
     */
    function formatNumber(num) {
        return Number(num).toLocaleString('en-US');
    }

    /**
     * v3.14: NEW FUNCTION - Format dates for MRP order display (short format)
     * Converts NetSuite date strings to compact format like "Dec 3"
     * @param {string} dateString - Date in format YYYY-MM-DD or MM/DD/YYYY
     * @returns {string} Formatted date like "Dec 3"
     */
    function formatDateMonthDay(dateString) {
        if (!dateString) return '';

        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString; // Return original if invalid

            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            return months[date.getMonth()] + ' ' + date.getDate();
        } catch (e) {
            console.error('Error formatting date:', e);
            return dateString;
        }
    }

    function showLoadingState(show) {
        if (dom.spinner) {
            if (show) {
                dom.spinner.classList.remove('ns-hidden');
            } else {
                dom.spinner.classList.add('ns-hidden');
            }
        }
        if (dom.loadMoreBtn) {
            dom.loadMoreBtn.disabled = show;
        }
    }

    function closeModal(e) {
        if (e) {
            e.preventDefault();
        }
        document.querySelectorAll('.ns-modal-overlay').forEach(function(modal) {
            modal.classList.remove('show');
        });
    }

    function initializeTooltips() {
        document.querySelectorAll('[data-tooltip]').forEach(function(el) {
            el.setAttribute('title', el.dataset.tooltip);
        });
    }

    /**
     * Initialize spider chart using Chart.js (if available)
     */
    function initializeSpiderChart(data) {
        const canvas = document.getElementById('spider-chart');
        if (canvas && window.Chart) {
            new Chart(canvas, {
                type: 'radar',
                data: {
                    labels: ['On-Time Delivery', 'Quality', 'Price', 'Lead Time', 'Communication'],
                    datasets: data.comparison.vendors.map(function(vendor) {
                        return {
                            label: vendor.name,
                            data: [
                                vendor.performance.onTimeDelivery,
                                vendor.performance.qualityRating * 20,
                                100 - Math.abs(vendor.performance.priceVariance * 10),
                                100 - (vendor.performance.avgLeadTime * 2),
                                vendor.performance.responseScore || 80
                            ],
                            borderColor: vendor.id === data.comparison.bestOption ? '#16a34a' : '#6b7280',
                            backgroundColor: vendor.id === data.comparison.bestOption ? 
                                'rgba(22, 163, 74, 0.2)' : 'rgba(107, 114, 128, 0.2)'
                        };
                    })
                },
                options: {
                    scales: {
                        r: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });
        }
    }

    // Public API
    return {
        pageInit: pageInit,
        fieldChanged: function(context) {},
        postSourcing: function(context) {},
        sublistChanged: function(context) {},
        lineInit: function(context) {},
        validateField: function(context) { return true; },
        validateLine: function(context) { return true; },
        validateInsert: function(context) { return true; },
        validateDelete: function(context) { return true; },
        saveRecord: function(context) { return true; }
    };
});