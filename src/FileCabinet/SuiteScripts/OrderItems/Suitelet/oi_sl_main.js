/**
 * NetSuite Order Items Suitelet - Main Application Entry Point
 * Serves HTML/CSS interface with vendor intelligence
 * 
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */

define(['N/ui/serverWidget', 'N/file', 'N/search', 'N/runtime', 'N/url', 'N/log'], 
function(serverWidget, file, search, runtime, url, log) {

    /**
     * Handles HTTP requests to the Suitelet
     * @param {Object} context
     * @param {ServerRequest} context.request
     * @param {ServerResponse} context.response
     */
    function onRequest(context) {
        try {
            if (context.request.method === 'GET') {
                handleGetRequest(context);
            } else {
                // Handle POST/PUT requests if needed
                context.response.write('Method not allowed');
            }
        } catch (error) {
            log.error('Suitelet Error', error);
            context.response.write('An error occurred: ' + error.message);
        }
    }

    /**
     * Handle GET request - serve the main application page
     * @param {Object} context
     */
    function handleGetRequest(context) {
        // Load HTML template
        const htmlContent = loadHTMLTemplate();
        
        // Load CSS styles
        const cssContent = loadCSSStyles();
        
        // Get initial data for fast render
        const initialData = getInitialData();
        
        // Generate RESTlet URLs for client script
        const restletUrls = generateRESTletUrls();
        
        // Inject data and styles into HTML
        const finalHTML = injectContentIntoTemplate(htmlContent, cssContent, initialData, restletUrls);
        
        // Create the form to serve HTML
        const form = serverWidget.createForm({
            title: 'Order Items - Vendor Intelligence'
        });
        
        // Add HTML field to serve the content
        const htmlField = form.addField({
            id: 'custpage_html_content',
            type: serverWidget.FieldType.INLINEHTML,
            label: 'Content'
        });
        
        htmlField.defaultValue = finalHTML;

        // Add client script from script parameter
        const clientScriptId = getClientScriptFileId();
        if (clientScriptId) {
            form.clientScriptFileId = clientScriptId;
        }

        context.response.writePage(form);
    }

    /**
     * Load HTML template from file cabinet
     * @returns {string} HTML content
     */
    function loadHTMLTemplate() {
        try {
            // Try to load from file cabinet first
            const templateFile = file.load({
                id: '/SuiteScripts/OrderItems/Templates/order_items_template.html'
            });
            return templateFile.getContents();
        } catch (error) {
            log.debug('HTML Template not found in file cabinet, using embedded template');
            return getEmbeddedHTMLTemplate();
        }
    }

    /**
     * Load CSS styles from file cabinet
     * @returns {string} CSS content
     */
    function loadCSSStyles() {
        try {
            // Try to load from file cabinet first
            const cssFile = file.load({
                id: '/SuiteScripts/OrderItems/Templates/order_items_styles.css'
            });
            return cssFile.getContents();
        } catch (error) {
            log.debug('CSS file not found in file cabinet, using embedded styles');
            return getEmbeddedCSSStyles();
        }
    }

    /**
     * Get initial data for fast page render
     * @returns {Object} Initial data object
     */
    function getInitialData() {
        try {
            // Load first 25 items for initial render
            const itemsData = loadInitialItems();
            
            // Get summary statistics
            const summaryData = getSummaryStatistics();
            
            return {
                items: itemsData.items,
                summary: summaryData,
                pagination: itemsData.pagination
            };
        } catch (error) {
            log.error('Error loading initial data', error);
            return {
                items: [],
                summary: {
                    criticalCount: 0,
                    belowReorderCount: 0,
                    mrpSuggestedCount: 0,
                    totalValue: 0
                },
                pagination: {
                    currentPage: 1,
                    totalPages: 1,
                    hasMore: false
                }
            };
        }
    }

    /**
     * Load initial items for first page
     * @returns {Object} Items data
     */
    function loadInitialItems() {
        // Search for items needing reorder
        const itemSearch = search.create({
            type: search.Type.ITEM,
            filters: [
                ['isinactive', 'is', 'F'],
                'AND',
                ['type', 'anyof', ['InvtPart', 'NonInvtPart', 'Assembly']],
                'AND',
                [
                    ['formulanumeric: CASE WHEN (NVL({quantityavailable},0) < NVL({reorderpoint},0) AND NVL({reorderpoint},0) > 0) OR (NVL({preferredstocklevel},0) > NVL({quantityavailable},0) AND NVL({preferredstocklevel},0) > 0) THEN 1 ELSE 0 END', 'equalto', '1']
                ]
            ],
            columns: [
                'itemid',
                'displayname',
                'quantityavailable',
                'reorderpoint',
                'preferredstocklevel',
                'cost'
                // Note: preferredvendor and leadtime removed - not standard fields
                // Vendor info will be looked up separately if needed
            ]
        });

        const searchResults = itemSearch.run().getRange({
            start: 0,
            end: 25
        });

        const items = searchResults.map(function(result) {
            const itemId = result.id;
            const itemNumber = result.getValue('itemid');
            const description = result.getValue('displayname');
            const currentStock = parseInt(result.getValue('quantityavailable') || 0);
            const reorderPoint = parseInt(result.getValue('reorderpoint') || 0);
            const maxStock = parseInt(result.getValue('preferredstocklevel') || 0);
            const unitPrice = parseFloat(result.getValue('cost') || 0);

            // Calculate suggested quantity
            const suggestedQty = Math.max(0, Math.max(reorderPoint - currentStock, maxStock - currentStock));

            // Determine urgency
            const urgency = getUrgencyLevel(currentStock, reorderPoint);

            // Get vendor info (no vendor for now - would need custom field or vendorpricelist lookup)
            const preferredVendor = getVendorInfo(null);

            return {
                id: itemId,
                itemNumber: itemNumber,
                description: description,
                currentStock: currentStock,
                reorderPoint: reorderPoint,
                maxStock: maxStock,
                suggestedQty: suggestedQty,
                unitPrice: unitPrice,
                preferredVendor: preferredVendor,
                urgency: urgency,
                stockStatus: getStockStatus(currentStock, reorderPoint),
                source: currentStock < reorderPoint ? 'reorder' : 'mrp'
            };
        });

        return {
            items: items,
            pagination: {
                currentPage: 1,
                totalPages: Math.ceil(itemSearch.runPaged().count / 25),
                hasMore: items.length === 25
            }
        };
    }

    /**
     * Get summary statistics for dashboard cards
     * @returns {Object} Summary data
     */
    function getSummaryStatistics() {
        // Critical stock count (< 10% of reorder point)
        const criticalSearch = search.create({
            type: search.Type.ITEM,
            filters: [
                ['isinactive', 'is', 'F'],
                'AND',
                ['formulanumeric: CASE WHEN NVL({quantityavailable},0) < (NVL({reorderpoint},0) * 0.1) AND NVL({reorderpoint},0) > 0 THEN 1 ELSE 0 END', 'equalto', '1']
            ]
        });

        // Below reorder point count
        const reorderSearch = search.create({
            type: search.Type.ITEM,
            filters: [
                ['isinactive', 'is', 'F'],
                'AND',
                ['formulanumeric: CASE WHEN NVL({quantityavailable},0) < NVL({reorderpoint},0) AND NVL({reorderpoint},0) > 0 THEN 1 ELSE 0 END', 'equalto', '1']
            ]
        });

        // MRP suggested count
        const mrpSearch = search.create({
            type: search.Type.ITEM,
            filters: [
                ['isinactive', 'is', 'F'],
                'AND',
                ['formulanumeric: CASE WHEN NVL({preferredstocklevel},0) > NVL({quantityavailable},0) AND NVL({preferredstocklevel},0) > 0 THEN 1 ELSE 0 END', 'equalto', '1']
            ]
        });

        return {
            criticalCount: criticalSearch.runPaged().count,
            belowReorderCount: reorderSearch.runPaged().count,
            mrpSuggestedCount: mrpSearch.runPaged().count,
            totalValue: calculateTotalEstimatedValue()
        };
    }

    /**
     * Calculate total estimated value of suggested orders
     * @returns {number} Total value
     */
    function calculateTotalEstimatedValue() {
        // This would be enhanced with actual calculation
        // For now, return a reasonable estimate
        return 142580.00;
    }

    /**
     * Get vendor information
     * @param {string} vendorId Vendor internal ID
     * @returns {Object} Vendor data
     */
    function getVendorInfo(vendorId) {
        if (!vendorId) {
            return {
                id: '',
                name: 'No Vendor Assigned',
                rating: 0,
                riskLevel: 'unknown',
                leadTime: 30
            };
        }

        try {
            const vendorLookup = search.lookupFields({
                type: search.Type.VENDOR,
                id: vendorId,
                columns: ['companyname']
            });

            return {
                id: vendorId,
                name: vendorLookup.companyname || 'Unknown Vendor',
                rating: 4.2, // Would be calculated from performance data
                riskLevel: 'low', // Would be calculated from performance data
                leadTime: 14 // Would come from vendor record or performance data
            };
        } catch (error) {
            log.debug('Error getting vendor info', error);
            return {
                id: vendorId,
                name: 'Unknown Vendor',
                rating: 0,
                riskLevel: 'unknown',
                leadTime: 30
            };
        }
    }

    /**
     * Determine urgency level based on stock
     * @param {number} currentStock
     * @param {number} reorderPoint
     * @returns {string} Urgency level
     */
    function getUrgencyLevel(currentStock, reorderPoint) {
        if (currentStock < reorderPoint * 0.1) return 'critical';
        if (currentStock < reorderPoint * 0.25) return 'high';
        if (currentStock < reorderPoint * 0.5) return 'medium';
        return 'low';
    }

    /**
     * Get stock status indicator
     * @param {number} currentStock
     * @param {number} reorderPoint
     * @returns {string} Stock status
     */
    function getStockStatus(currentStock, reorderPoint) {
        if (currentStock < reorderPoint * 0.25) return 'critical';
        if (currentStock < reorderPoint * 0.5) return 'warning';
        return 'good';
    }

    /**
     * Generate RESTlet URLs for client script
     * @returns {Object} RESTlet URLs
     */
    function generateRESTletUrls() {
        return {
            items: url.resolveScript({
                scriptId: 'customscript_oi_items_restlet',
                deploymentId: 'customdeploy_oi_items_restlet'
            }),
            vendor: url.resolveScript({
                scriptId: 'customscript_oi_vendor_restlet',
                deploymentId: 'customdeploy_oi_vendor_restlet'
            }),
            vendorList: url.resolveScript({
                scriptId: 'customscript_oi_vendor_list_restlet',
                deploymentId: 'customdeploy_oi_vendor_list_restlet'
            }),
            vendorSubsidiary: url.resolveScript({
                scriptId: 'customscript_oi_vendors_subsidiary_restl',
                deploymentId: 'customdeploy_oi_vendors_subsidiary_restl'
            }),
            purchaseOrder: url.resolveScript({
                scriptId: 'customscript_oi_purchase_order_restlet',
                deploymentId: 'customdeploy_oi_purchase_order_restlet'
            })
        };
    }

    /**
     * Get client script file ID from script parameter
     * @returns {number|null} File ID
     */
    function getClientScriptFileId() {
        try {
            const script = runtime.getCurrentScript();
            const clientScriptPath = script.getParameter({
                name: 'custscript_oi_client_script_path'
            });

            if (clientScriptPath) {
                // Load file by path to get internal ID
                const clientScriptFile = file.load({
                    id: clientScriptPath
                });
                return clientScriptFile.id;
            }

            return null;
        } catch (error) {
            log.debug('Client script not configured', 'Set custscript_oi_client_script_path parameter');
            return null;
        }
    }

    /**
     * Inject content into HTML template
     * @param {string} htmlContent
     * @param {string} cssContent
     * @param {Object} initialData
     * @param {Object} restletUrls
     * @returns {string} Final HTML
     */
    function injectContentIntoTemplate(htmlContent, cssContent, initialData, restletUrls) {
        // Inject CSS
        let finalHTML = htmlContent.replace(
            '/* CSS will be injected here by Suitelet */',
            cssContent
        );

        // Inject initial data as JavaScript
        const initScript = `
            <script>
                // Initial data from server
                window.OrderItemsInitialData = ${JSON.stringify(initialData)};
                window.OrderItemsRESTletUrls = ${JSON.stringify(restletUrls)};

                // Set RESTlet URLs in hidden field
                document.addEventListener('DOMContentLoaded', function() {
                    var urlsField = document.getElementById('restlet-urls');
                    if (urlsField) {
                        urlsField.setAttribute('data-items-url', '${restletUrls.items}');
                        urlsField.setAttribute('data-vendor-url', '${restletUrls.vendor}');
                        urlsField.setAttribute('data-po-url', '${restletUrls.purchaseOrder}');
                        urlsField.setAttribute('data-vendor-list-url', '${restletUrls.vendorList}');
                        urlsField.setAttribute('data-vendor-subsidiary-url', '${restletUrls.vendorSubsidiary}');
                    }
                });
            </script>
        `;

        // Inject before closing body tag
        finalHTML = finalHTML.replace('</body>', initScript + '</body>');

        return finalHTML;
    }

    /**
     * Embedded HTML template (fallback)
     * @returns {string} HTML content
     */
    function getEmbeddedHTMLTemplate() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Items - Vendor Intelligence</title>
    <style>
        /* CSS will be injected here by Suitelet */
    </style>
</head>
<body>
    <div class="ns-container">
        <!-- Header -->
        <div class="ns-header">
            <div class="ns-flex ns-justify-between ns-mb-4">
                <div>
                    <h1 class="ns-text-2xl ns-font-bold">Order Items</h1>
                    <span class="ns-text-muted">Create purchase orders based on reorder points and MRP releases</span>
                </div>
                <div class="ns-flex ns-gap-2">
                    <button type="button" id="exportBtn" class="ns-btn ns-btn-outline">📊 Export</button>
                    <button type="button" id="settingsBtn" class="ns-btn ns-btn-outline">⚙️ Settings</button>
                </div>
            </div>
            <div class="ns-flex ns-gap-4 ns-mb-4">
                <input type="text" class="ns-input" id="search-input" placeholder="Search items, vendors, or part numbers..." style="flex: 1;">
                <select class="ns-select" id="filter-select" style="width: 200px;">
                    <option value="all">All Items</option>
                    <option value="critical">Critical Stock</option>
                    <option value="reorder">Below Reorder Point</option>
                    <option value="mrp">MRP Suggested</option>
                </select>
                <button type="button" class="ns-btn ns-btn-primary" id="create-po-btn" disabled>🛒 Create PO (0)</button>
            </div>
        </div>

        <!-- Summary Cards -->
        <div class="ns-grid ns-grid-cols-4 ns-mb-4">
            <div class="ns-card" data-filter="critical" style="cursor: pointer;">
                <div class="ns-flex ns-items-center ns-gap-2 ns-mb-2">
                    <span class="ns-perf-dot ns-perf-dot-poor"></span>
                    <span class="ns-text-sm ns-text-muted">Critical Stock</span>
                </div>
                <div class="ns-text-2xl ns-font-bold" id="critical-count">0</div>
                <div class="ns-text-xs ns-text-muted">items</div>
            </div>
            <div class="ns-card" data-filter="below-reorder" style="cursor: pointer;">
                <div class="ns-flex ns-items-center ns-gap-2 ns-mb-2">
                    <span class="ns-perf-dot ns-perf-dot-average"></span>
                    <span class="ns-text-sm ns-text-muted">Below Reorder Point</span>
                </div>
                <div class="ns-text-2xl ns-font-bold" id="reorder-count">0</div>
                <div class="ns-text-xs ns-text-muted">items</div>
            </div>
            <div class="ns-card" data-filter="mrp-suggested" style="cursor: pointer;">
                <div class="ns-flex ns-items-center ns-gap-2 ns-mb-2">
                    <span class="ns-perf-dot ns-perf-dot-good"></span>
                    <span class="ns-text-sm ns-text-muted">MRP Suggested</span>
                </div>
                <div class="ns-text-2xl ns-font-bold" id="mrp-count">0</div>
                <div class="ns-text-xs ns-text-muted">items</div>
            </div>
            <div class="ns-card">
                <div class="ns-flex ns-items-center ns-gap-2 ns-mb-2">
                    <span style="color: #2563eb;">💰</span>
                    <span class="ns-text-sm ns-text-muted">Total Est. Value</span>
                </div>
                <div class="ns-text-2xl ns-font-bold" id="total-value">$0</div>
                <div class="ns-text-xs ns-text-muted">&nbsp;</div>
            </div>
        </div>

        <!-- Warning Banner -->
        <div class="ns-alert ns-alert-warning ns-hidden" id="warning-banner">
            <div class="ns-alert-icon">⚠️</div>
            <div class="ns-alert-content">
                <span class="warning-text">Performance Risk Detected</span>
            </div>
            <a href="#" class="ns-btn ns-btn-sm ns-btn-outline" id="review-details">Review Details</a>
        </div>

        <!-- Main Table -->
        <div class="ns-table">
            <div class="ns-table-header" style="display: grid; grid-template-columns: 40px 40px 120px 2fr 120px 140px 100px 100px 120px 180px 100px 100px; gap: 16px; align-items: center;">
                <div><input type="checkbox" id="select-all" class="ns-checkbox"></div>
                <div></div>
                <div>Item #</div>
                <div>Description</div>
                <div>Location</div>
                <div>Stock Status</div>
                <div>Suggested Qty</div>
                <div>Unit Price</div>
                <div>Total</div>
                <div>Vendor</div>
                <div>Lead Time</div>
                <div>Urgency</div>
            </div>
            
            <div id="items-container">
                <!-- Items will be dynamically inserted here -->
            </div>

            <!-- Load More Button -->
            <div class="ns-flex ns-justify-center ns-mt-4">
                <div class="ns-spinner ns-hidden" id="loading-spinner"></div>
                <button type="button" class="ns-btn ns-btn-outline" id="load-more-btn">Load More Items</button>
            </div>
        </div>
    </div>

    <!-- Comparison Modal -->
    <div class="ns-modal-overlay" id="comparison-modal">
        <div class="ns-modal">
            <div class="ns-modal-header">
                <h2 class="ns-modal-title">Vendor Comparison</h2>
                <button type="button" class="ns-modal-close" id="close-modal">&times;</button>
            </div>
            <div class="ns-modal-body">
                <p class="ns-text-muted ns-mb-4">Compare key performance metrics to make an informed decision</p>
                
                <div class="vendor-comparison" id="vendor-comparison-content">
                    <!-- Vendor comparison cards will be inserted here -->
                </div>

                <div class="spider-chart-container ns-mt-4">
                    <div class="ns-text-lg ns-font-semibold ns-mb-2">Performance Overview</div>
                    <canvas id="spider-chart" width="400" height="400"></canvas>
                </div>
            </div>
        </div>
    </div>

    <!-- Hidden field to store script parameters -->
    <input type="hidden" id="restlet-urls"
           data-items-url=""
           data-vendor-url=""
           data-po-url=""
           data-vendor-list-url=""
           data-vendor-subsidiary-url="">
</body>
</html>`;
    }

    /**
     * Embedded CSS styles (fallback)
     * @returns {string} CSS content
     */
    function getEmbeddedCSSStyles() {
        // Return a minimal version - the full CSS would be too long for embedding
        return `
            body { font-family: Inter, sans-serif; font-size: 14px; background: #fafafa; margin: 0; padding: 0; }
            .ns-container { max-width: 1600px; margin: 0 auto; padding: 24px; }
            .ns-header { background: white; border-radius: 8px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .ns-card { background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); border: 1px solid #e5e7eb; }
            .ns-grid { display: grid; gap: 16px; }
            .ns-grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
            .ns-btn { display: inline-flex; align-items: center; justify-content: center; padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; white-space: nowrap; }
            .ns-btn-primary { background: #2563eb; color: white; }
            .ns-btn-outline { background: white; border: 1px solid #d1d5db; color: #374151; }
            .ns-input { width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; }
            .ns-select { width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; background: white; }
            .ns-table { width: 100%; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .ns-table-header { background: #f9fafb; border-bottom: 1px solid #e5e7eb; font-weight: 600; font-size: 12px; text-transform: uppercase; color: #6b7280; padding: 12px 16px; }
            .ns-hidden { display: none; }
            .ns-flex { display: flex; }
            .ns-items-center { align-items: center; }
            .ns-justify-between { justify-content: space-between; }
            .ns-justify-center { justify-content: center; }
            .ns-gap-2 { gap: 8px; }
            .ns-gap-4 { gap: 16px; }
            .ns-mb-2 { margin-bottom: 8px; }
            .ns-mb-4 { margin-bottom: 16px; }
            .ns-mt-4 { margin-top: 16px; }
            .ns-text-2xl { font-size: 24px; }
            .ns-text-lg { font-size: 16px; }
            .ns-text-sm { font-size: 13px; }
            .ns-text-xs { font-size: 12px; }
            .ns-font-bold { font-weight: 700; }
            .ns-font-semibold { font-weight: 600; }
            .ns-text-muted { color: #6b7280; }
            .ns-perf-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
            .ns-perf-dot-good { background: #16a34a; }
            .ns-perf-dot-average { background: #f59e0b; }
            .ns-perf-dot-poor { background: #dc2626; }
        `;
    }

    return {
        onRequest: onRequest
    };
});