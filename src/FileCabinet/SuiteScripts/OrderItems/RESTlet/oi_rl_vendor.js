/**
 * NetSuite RESTlet for Vendor Intelligence Data
 * Handles vendor performance metrics, comparison, and risk analysis
 * 
 * VERSION: 3.0 - Mock Data Implementation for Demo
 * CHANGELOG:
 *   v3.0 - Added mock vendor performance data for presentation demo
 *        - All real data calculation functions preserved (commented) for Phase 2
 *        - Added complete vendor profiles with realistic metrics
 *        - Added Grainger vendor profile
 *   v2.0 - Enhanced diagnostics
 *   v1.0 - Initial implementation
 * 
 * @NApiVersion 2.1
 * @NScriptType RESTlet
 * @NModuleScope Public
 */

define(['N/search', 'N/log', 'N/runtime', 'N/format'], 
function(search, log, runtime, format) {

    // ============================================================================
    // MOCK DATA FOR DEMO - PHASE 1
    // ============================================================================
    // This section provides realistic vendor performance data for demo purposes
    // In Phase 2, this will be replaced with real calculations from NetSuite data
    // ============================================================================

    /**
     * Generate mock vendor performance data
     * Returns complete vendor performance profile for demo
     * 
     * @param {string} vendorName - Name of the vendor
     * @param {string} vendorId - Vendor internal ID
     * @returns {Object} Complete vendor performance data
     */
    function generateMockVendorPerformance(vendorName, vendorId) {
        // Define realistic vendor profiles for demo
        const vendorProfiles = {
            'Custom Products': {
                onTimeDelivery: 78.5,        // Below 80% - shows risk!
                qualityRating: 4.39,          // Good but not excellent
                defectRate: 2.8,             // Acceptable
                avgLeadTime: 9,
                quotedLeadTime: 14,
                priceVariance: 1.2,          // Prices slightly increasing
                responseTime: 6,             // Hours to respond to inquiries
                totalOrders: 16,
                lastOrderDate: '2024-10-15',
                otdTrend: -3.2,              // Declining (bad)
                priceTrend: 1.5,             // Increasing (bad)
                qualityTrend: -0.2,          // Slight decline
                leadTimeTrend: 2             // Getting slower
            },
            'Core4Solutions': {
                onTimeDelivery: 87.5,        // Good
                qualityRating: 4.42,         // Good
                defectRate: 1.2,             // Low
                avgLeadTime: 20,
                quotedLeadTime: 14,
                priceVariance: -2.3,         // Prices improving
                responseTime: 4,
                totalOrders: 59,
                lastOrderDate: '2024-10-18',
                otdTrend: -0.8,              // Slight decline
                priceTrend: -0.3,            // Slight improvement
                qualityTrend: 0.1,           // Stable/improving
                leadTimeTrend: -1            // Getting faster
            },
            'GlobalTech Supply': {
                onTimeDelivery: 96.8,        // EXCELLENT! Over 95%
                qualityRating: 4.85,         // Excellent
                defectRate: 0.5,             // Very low
                avgLeadTime: 10,
                quotedLeadTime: 12,
                priceVariance: -3.5,         // Great pricing
                responseTime: 2,             // Very responsive
                totalOrders: 124,
                lastOrderDate: '2024-10-20',
                otdTrend: 2.3,               // Improving (great)
                priceTrend: -2.1,            // Prices improving (great)
                qualityTrend: 0.3,           // Getting better
                leadTimeTrend: -2            // Getting faster
            },
            'FastParts Inc': {
                onTimeDelivery: 92.0,        // Very good
                qualityRating: 4.65,         // Very good
                defectRate: 1.0,
                avgLeadTime: 7,
                quotedLeadTime: 10,
                priceVariance: 0.8,
                responseTime: 3,
                totalOrders: 88,
                lastOrderDate: '2024-10-19',
                otdTrend: 1.5,
                priceTrend: 0.2,
                qualityTrend: 0.2,
                leadTimeTrend: 0
            },
            'Precision Parts Co': {
                onTimeDelivery: 89.5,        // Good
                qualityRating: 4.52,         // Good
                defectRate: 1.5,
                avgLeadTime: 8,
                quotedLeadTime: 10,
                priceVariance: -1.8,
                responseTime: 4,
                totalOrders: 67,
                lastOrderDate: '2024-10-17',
                otdTrend: 0.5,
                priceTrend: -1.2,
                qualityTrend: 0.1,
                leadTimeTrend: -1
            },
            'Budget Components': {
                onTimeDelivery: 65.0,        // Poor - way below 80%
                qualityRating: 3.85,         // Below average
                defectRate: 4.5,             // High
                avgLeadTime: 18,
                quotedLeadTime: 14,
                priceVariance: 5.2,          // Prices increasing significantly
                responseTime: 12,            // Slow to respond
                totalOrders: 42,
                lastOrderDate: '2024-10-10',
                otdTrend: -5.0,              // Getting much worse
                priceTrend: 3.5,             // Prices increasing (bad)
                qualityTrend: -0.5,          // Declining quality
                leadTimeTrend: 3             // Getting slower
            },
            'Grainger': {
                onTimeDelivery: 93.2,        // Very good, reliable
                qualityRating: 4.68,         // High quality
                defectRate: 0.8,             // Low defects
                avgLeadTime: 5,              // Fast delivery
                quotedLeadTime: 7,
                priceVariance: 1.5,          // Slight price premium
                responseTime: 2,             // Very responsive
                totalOrders: 156,            // High volume
                lastOrderDate: '2024-10-21',
                otdTrend: 1.2,               // Steady improvement
                priceTrend: 0.8,             // Slight price increase
                qualityTrend: 0.2,           // Maintaining quality
                leadTimeTrend: -1            // Getting faster
            },
            'null': {
                // Default for vendors with no name or "null" vendor
                onTimeDelivery: 75.0,
                qualityRating: 3.90,
                defectRate: 3.0,
                avgLeadTime: 15,
                quotedLeadTime: 14,
                priceVariance: 0.5,
                responseTime: 8,
                totalOrders: 25,
                lastOrderDate: '2024-10-05',
                otdTrend: -1.0,
                priceTrend: 0.5,
                qualityTrend: 0.0,
                leadTimeTrend: 1
            }
        };
        
        // Get profile or use default
        const profile = vendorProfiles[vendorName] || {
            onTimeDelivery: 85.0,
            qualityRating: 4.20,
            defectRate: 1.5,
            avgLeadTime: 12,
            quotedLeadTime: 14,
            priceVariance: -0.5,
            responseTime: 5,
            totalOrders: 45,
            lastOrderDate: '2024-10-12',
            otdTrend: 0.5,
            priceTrend: -0.5,
            qualityTrend: 0.1,
            leadTimeTrend: 0
        };
        
        // Determine if vendor has risks based on thresholds
        const hasRisks = profile.onTimeDelivery < 80 || 
                        profile.defectRate > 3.5 || 
                        profile.qualityRating < 4.0;
        
        const risks = [];
        
        // Build risk array based on performance
        if (profile.onTimeDelivery < 80) {
            risks.push({
                type: 'delivery',
                severity: 'high',
                message: 'On-time delivery rate below 80% (' + profile.onTimeDelivery + '%)'
            });
        } else if (profile.onTimeDelivery < 90) {
            risks.push({
                type: 'delivery',
                severity: 'medium',
                message: 'On-time delivery rate below 90% (' + profile.onTimeDelivery + '%)'
            });
        }
        
        if (profile.qualityRating < 4.0) {
            risks.push({
                type: 'quality',
                severity: 'high',
                message: 'Quality rating below 4.0 (' + profile.qualityRating.toFixed(2) + ')'
            });
        }
        
        if (profile.defectRate > 3.0) {
            risks.push({
                type: 'quality',
                severity: profile.defectRate > 5 ? 'high' : 'medium',
                message: 'Elevated defect rate (' + profile.defectRate.toFixed(1) + '%)'
            });
        }
        
        if (profile.avgLeadTime > profile.quotedLeadTime * 1.2) {
            risks.push({
                type: 'leadtime',
                severity: 'medium',
                message: 'Actual lead time exceeds quoted time'
            });
        }
        
        // Return complete vendor data structure
        return {
            success: true,
            data: {
                vendor: {
                    id: vendorId,
                    name: vendorName,
                    performance: {
                        totalOrders: profile.totalOrders,
                        onTimeDelivery: profile.onTimeDelivery,
                        qualityRating: profile.qualityRating,
                        defectRate: profile.defectRate,
                        avgLeadTime: profile.avgLeadTime,
                        quotedLeadTime: profile.quotedLeadTime,
                        priceVariance: profile.priceVariance,
                        responseTime: profile.responseTime,
                        lastOrderDate: profile.lastOrderDate
                    },
                    trends: {
                        otdTrend: profile.otdTrend,
                        priceTrend: profile.priceTrend,
                        qualityTrend: profile.qualityTrend,
                        leadTimeTrend: profile.leadTimeTrend
                    },
                    risks: risks,
                    hasRisk: hasRisks,
                    lastUpdated: new Date().toISOString()
                }
            }
        };
    }

    // ============================================================================
    // RESTLET HANDLERS
    // ============================================================================

    /**
     * Handle GET requests for vendor data
     * @param {Object} requestParams
     * @returns {Object} Response with vendor data
     */
    function doGet(requestParams) {
        log.audit('VENDOR RESTLET', '=== GET REQUEST START ===');
        log.audit('Request Params', JSON.stringify(requestParams));
        
        try {
            const action = requestParams.action || 'details';
            log.audit('Action', action);
            
            if (action === 'details') {
                log.audit('VENDOR RESTLET', 'Calling getVendorDetails...');
                const result = getVendorDetails(requestParams);
                log.audit('VENDOR RESTLET', 'getVendorDetails completed successfully');
                return result;
            } else if (action === 'compare') {
                log.audit('VENDOR RESTLET', 'Calling compareVendors...');
                const result = compareVendors(requestParams);
                log.audit('VENDOR RESTLET', 'compareVendors completed successfully');
                return result;
            } else {
                log.error('VENDOR RESTLET', 'Invalid action: ' + action);
                return {
                    success: false,
                    error: 'Invalid action. Use "details" or "compare"'
                };
            }
            
        } catch (error) {
            log.error('VENDOR RESTLET ERROR', {
                message: error.message,
                name: error.name,
                stack: error.stack,
                toString: error.toString()
            });
            
            return {
                success: false,
                error: error.message || 'An error occurred while retrieving vendor data'
            };
        } finally {
            log.audit('VENDOR RESTLET', '=== GET REQUEST END ===');
        }
    }

    /**
     * Get detailed vendor performance metrics
     * PHASE 1: Returns mock data for demo
     * PHASE 2: Will use real NetSuite data
     * 
     * @param {Object} params
     * @returns {Object} Vendor details response
     */
    function getVendorDetails(params) {
        log.audit('getVendorDetails', 'Starting with params: ' + JSON.stringify(params));
        
        const vendorId = params.vendorId;
        
        if (!vendorId) {
            log.error('getVendorDetails', 'Missing vendorId parameter');
            return {
                success: false,
                error: 'vendorId parameter is required'
            };
        }

        try {
            // Get vendor name from NetSuite
            log.audit('getVendorDetails', 'Getting vendor basic info...');
            const vendorInfo = getVendorBasicInfo(vendorId);
            log.audit('getVendorDetails', 'Vendor info: ' + JSON.stringify(vendorInfo));
            
            // PHASE 1: Return mock data
            const mockData = generateMockVendorPerformance(vendorInfo.name, vendorId);
            log.audit('getVendorDetails', 'Mock data generated for vendor: ' + vendorInfo.name);
            return mockData;
            
        } catch (error) {
            log.error('getVendorDetails ERROR', {
                message: error.message,
                name: error.name,
                stack: error.stack,
                vendorId: vendorId
            });
            throw error;
        }
    }

    /* ============================================================================
     * PHASE 2: REAL DATA CALCULATION FUNCTIONS (Currently Commented Out)
     * ============================================================================
     * These functions will be uncommented and integrated in Phase 2 to replace
     * mock data with real calculations from NetSuite transaction data
     * ============================================================================
     
    // ORIGINAL getVendorDetails - Will replace Phase 1 version
    function getVendorDetails(params) {
        log.audit('getVendorDetails', 'Starting with params: ' + JSON.stringify(params));
        
        const vendorId = params.vendorId;
        const itemId = params.itemId;
        const period = params.period || '90d';
        
        log.audit('getVendorDetails', 'vendorId: ' + vendorId + ', itemId: ' + itemId + ', period: ' + period);
        
        if (!vendorId) {
            log.error('getVendorDetails', 'Missing vendorId parameter');
            return {
                success: false,
                error: 'vendorId parameter is required'
            };
        }

        try {
            // Get vendor basic information
            log.audit('getVendorDetails', 'Getting vendor basic info...');
            const vendorInfo = getVendorBasicInfo(vendorId);
            log.audit('getVendorDetails', 'Vendor info: ' + JSON.stringify(vendorInfo));
            
            // Get performance metrics
            log.audit('getVendorDetails', 'Getting performance metrics...');
            const performanceMetrics = getVendorPerformanceMetrics(vendorId, period);
            log.audit('getVendorDetails', 'Performance metrics retrieved');
            
            // Get performance trends
            log.audit('getVendorDetails', 'Getting performance trends...');
            const performanceTrends = getVendorPerformanceTrends(vendorId, period);
            log.audit('getVendorDetails', 'Performance trends retrieved');
            
            // Get risk indicators
            log.audit('getVendorDetails', 'Getting risk indicators...');
            const riskIndicators = getVendorRiskIndicators(vendorId, performanceMetrics);
            log.audit('getVendorDetails', 'Risk indicators retrieved');
            
            // Build response
            const response = {
                success: true,
                data: {
                    vendor: {
                        id: vendorId,
                        name: vendorInfo.name,
                        performance: performanceMetrics,
                        trends: performanceTrends,
                        risks: riskIndicators.risks,
                        hasRisk: riskIndicators.hasRisk,
                        lastUpdated: new Date().toISOString()
                    }
                }
            };

            log.audit('getVendorDetails', 'Response built successfully for vendor: ' + vendorInfo.name);
            return response;
            
        } catch (error) {
            log.error('getVendorDetails ERROR', {
                message: error.message,
                name: error.name,
                stack: error.stack,
                vendorId: vendorId
            });
            throw error;
        }
    }
    */

    /**
     * Compare multiple vendors for an item
     * @param {Object} params
     * @returns {Object} Comparison response
     */
    function compareVendors(params) {
        log.audit('compareVendors', 'Starting with params: ' + JSON.stringify(params));
        
        const itemId = params.itemId;
        const vendorIds = params.vendorIds ? params.vendorIds.split(',') : [];
        
        if (!itemId) {
            return {
                success: false,
                error: 'itemId parameter is required'
            };
        }

        try {
            // If no vendor IDs provided, find alternative vendors for the item
            const vendorsToCompare = vendorIds.length > 0 ? vendorIds : findAlternativeVendors(itemId);
            
            if (vendorsToCompare.length === 0) {
                return {
                    success: false,
                    error: 'No vendors found for comparison'
                };
            }

            // Get detailed data for each vendor
            const vendorComparisons = vendorsToCompare.map(function(vendorId) {
                const vendorInfo = getVendorBasicInfo(vendorId);
                
                // PHASE 1: Use mock data
                const mockData = generateMockVendorPerformance(vendorInfo.name, vendorId);
                const performanceMetrics = mockData.data.vendor.performance;
                
                /* PHASE 2: Use real data
                const performanceMetrics = getVendorPerformanceMetrics(vendorId, '90d');
                */
                
                return {
                    id: vendorId,
                    name: vendorInfo.name,
                    performance: performanceMetrics,
                    overallScore: calculateOverallScore(performanceMetrics)
                };
            });

            // Determine best option
            const bestVendor = findBestVendor(vendorComparisons);
            const reasoning = generateRecommendationReasoning(vendorComparisons, bestVendor);

            const response = {
                success: true,
                data: {
                    comparison: {
                        vendors: vendorComparisons,
                        bestOption: bestVendor.id,
                        reasoning: reasoning
                    }
                }
            };

            log.audit('compareVendors', vendorComparisons.length + ' vendors compared successfully');
            return response;
            
        } catch (error) {
            log.error('compareVendors ERROR', {
                message: error.message,
                name: error.name,
                stack: error.stack,
                itemId: itemId
            });
            throw error;
        }
    }

    /**
     * Get vendor basic information
     * @param {string} vendorId
     * @returns {Object} Basic vendor info
     */
    function getVendorBasicInfo(vendorId) {
        log.debug('getVendorBasicInfo', 'Looking up vendor: ' + vendorId);
        
        try {
            const vendorFields = search.lookupFields({
                type: search.Type.VENDOR,
                id: vendorId,
                columns: ['companyname', 'email', 'phone', 'address1', 'city', 'state']
            });

            log.debug('getVendorBasicInfo', 'Vendor fields retrieved: ' + JSON.stringify(vendorFields));

            return {
                id: vendorId,
                name: vendorFields.companyname || 'Unknown Vendor',
                email: vendorFields.email || '',
                phone: vendorFields.phone || '',
                address: [vendorFields.address1, vendorFields.city, vendorFields.state]
                    .filter(Boolean).join(', ')
            };
        } catch (error) {
            log.error('getVendorBasicInfo ERROR', {
                message: error.message,
                vendorId: vendorId
            });
            
            // Return fallback data instead of crashing
            return {
                id: vendorId,
                name: 'Vendor ' + vendorId,
                email: '',
                phone: '',
                address: ''
            };
        }
    }

    /* ============================================================================
     * PHASE 2: PERFORMANCE CALCULATION FUNCTIONS (Preserved for Future Use)
     * ============================================================================
     
    function getVendorPerformanceMetrics(vendorId, period) {
        log.debug('getVendorPerformanceMetrics', 'vendorId: ' + vendorId + ', period: ' + period);
        
        try {
            // Query the custom record created by Map/Reduce script
            const perfSearch = search.create({
                type: 'customrecord_vendor_performance',
                filters: [
                    ['custrecord_vp_vendor', 'anyof', vendorId]
                ],
                columns: [
                    'custrecord_vp_otd_percent',
                    'custrecord_vp_avg_lead_time',
                    'custrecord_vp_quoted_lead_time',
                    'custrecord_vp_quality_rating',
                    'custrecord_vp_defect_rate',
                    'custrecord_vp_price_variance',
                    'custrecord_vp_response_time_hours',
                    'custrecord_vp_total_orders',
                    'custrecord_vp_last_order_date',
                    'custrecord_vp_calculation_date'
                ]
            });

            const results = perfSearch.run().getRange({ start: 0, end: 1 });

            if (results && results.length > 0) {
                log.debug('getVendorPerformanceMetrics', 'Found custom record for vendor');
                const result = results[0];

                // Convert decimal percentages back to percentages for display
                const otdPercent = parseFloat(result.getValue('custrecord_vp_otd_percent')) || 0;
                const defectRate = parseFloat(result.getValue('custrecord_vp_defect_rate')) || 0;
                const priceVariance = parseFloat(result.getValue('custrecord_vp_price_variance')) || 0;

                return {
                    onTimeDelivery: Math.round(otdPercent * 100),
                    qualityRating: parseFloat(result.getValue('custrecord_vp_quality_rating')) || 0,
                    defectRate: Math.round(defectRate * 100 * 10) / 10,
                    avgLeadTime: parseInt(result.getValue('custrecord_vp_avg_lead_time')) || 0,
                    quotedLeadTime: parseInt(result.getValue('custrecord_vp_quoted_lead_time')) || 0,
                    priceVariance: Math.round(priceVariance * 100 * 10) / 10,
                    responseTime: parseFloat(result.getValue('custrecord_vp_response_time_hours')) || 0,
                    totalOrders: parseInt(result.getValue('custrecord_vp_total_orders')) || 0,
                    lastOrderDate: result.getValue('custrecord_vp_last_order_date') || null
                };
            }

            // Fallback: Calculate from transactions
            log.debug('getVendorPerformanceMetrics', 'No custom record found, calculating from transactions');
            const dateFilter = getPeriodDateFilter(period);
            const metrics = calculatePerformanceFromTransactions(vendorId, dateFilter);
            return metrics;

        } catch (error) {
            log.error('getVendorPerformanceMetrics ERROR', {
                message: error.message,
                vendorId: vendorId
            });
            
            // Return fallback metrics instead of crashing
            const dateFilter = getPeriodDateFilter(period);
            return calculatePerformanceFromTransactions(vendorId, dateFilter);
        }
    }

    function calculatePerformanceFromTransactions(vendorId, dateFilter) {
        log.debug('calculatePerformanceFromTransactions', 'vendorId: ' + vendorId);
        
        try {
            // Get purchase orders for this vendor in the period
            const poSearch = search.create({
                type: search.Type.PURCHASE_ORDER,
                filters: [
                    ['entity', 'anyof', vendorId],
                    'AND',
                    ['mainline', 'is', 'T'],
                    'AND',
                    ['trandate', 'within'].concat(dateFilter.range)
                ],
                columns: [
                    'trandate',
                    'duedate',
                    'total',
                    'status'
                ]
            });

            // Get item receipts for delivery performance
            const irSearch = search.create({
                type: search.Type.ITEM_RECEIPT,
                filters: [
                    ['entity', 'anyof', vendorId],
                    'AND',
                    ['mainline', 'is', 'T'],
                    'AND',
                    ['trandate', 'within'].concat(dateFilter.range)
                ],
                columns: [
                    'trandate',
                    'createdfrom.duedate',
                    'createdfrom.trandate'
                ]
            });

            const poResults = poSearch.run().getRange({ start: 0, end: 1000 });
            const irResults = irSearch.run().getRange({ start: 0, end: 1000 });

            log.debug('calculatePerformanceFromTransactions', 'Found ' + poResults.length + ' POs and ' + irResults.length + ' receipts');

            // Calculate on-time delivery
            let onTimeDeliveries = 0;
            let totalDeliveries = irResults.length;
            
            irResults.forEach(function(result) {
                const deliveryDate = result.getValue('trandate');
                const dueDate = result.getValue({ name: 'duedate', join: 'createdfrom' });
                
                if (deliveryDate && dueDate) {
                    const deliveryDateTime = format.parse({
                        value: deliveryDate,
                        type: format.Type.DATE
                    }).getTime();
                    
                    const dueDatetime = format.parse({
                        value: dueDate,
                        type: format.Type.DATE
                    }).getTime();
                    
                    if (deliveryDateTime <= dueDatetime) {
                        onTimeDeliveries++;
                    }
                }
            });

            const onTimeDeliveryRate = totalDeliveries > 0 ? (onTimeDeliveries / totalDeliveries) * 100 : 95;

            // Calculate average lead time
            let totalLeadTime = 0;
            let leadTimeCount = 0;
            
            irResults.forEach(function(result) {
                const deliveryDate = result.getValue('trandate');
                const orderDate = result.getValue({ name: 'trandate', join: 'createdfrom' });
                
                if (deliveryDate && orderDate) {
                    const deliveryDateTime = format.parse({
                        value: deliveryDate,
                        type: format.Type.DATE
                    }).getTime();
                    
                    const orderDateTime = format.parse({
                        value: orderDate,
                        type: format.Type.DATE
                    }).getTime();
                    
                    const leadDays = Math.ceil((deliveryDateTime - orderDateTime) / (1000 * 60 * 60 * 24));
                    totalLeadTime += leadDays;
                    leadTimeCount++;
                }
            });

            const avgLeadTime = leadTimeCount > 0 ? Math.round(totalLeadTime / leadTimeCount) : 14;

            // Generate other metrics (would be calculated from additional data in full implementation)
            return {
                onTimeDelivery: Math.round(onTimeDeliveryRate),
                qualityRating: 4.0 + (Math.random() * 1.0), // Mock: 4.0-5.0
                defectRate: Math.random() * 3, // Mock: 0-3%
                avgLeadTime: avgLeadTime,
                quotedLeadTime: avgLeadTime + Math.floor(Math.random() * 5), // Mock quoted time
                priceVariance: (Math.random() - 0.5) * 10, // Mock: -5% to +5%
                responseTime: Math.floor(Math.random() * 8) + 2, // Mock: 2-10 hours
                totalOrders: poResults.length,
                lastOrderDate: poResults.length > 0 ? poResults[0].getValue('trandate') : null
            };
        } catch (error) {
            log.error('calculatePerformanceFromTransactions ERROR', {
                message: error.message,
                vendorId: vendorId
            });
            
            // Return default metrics if calculation fails
            return {
                onTimeDelivery: 92,
                qualityRating: 4.2,
                defectRate: 1.5,
                avgLeadTime: 14,
                quotedLeadTime: 14,
                priceVariance: -2.3,
                responseTime: 4,
                totalOrders: 15,
                lastOrderDate: format.format({
                    value: new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)),
                    type: format.Type.DATE
                })
            };
        }
    }

    function getVendorPerformanceTrends(vendorId, period) {
        log.debug('getVendorPerformanceTrends', 'vendorId: ' + vendorId);
        
        try {
            // Query trend records for this vendor (if Phase 2 is implemented)
            const trendSearch = search.create({
                type: 'customrecord_vendor_trends',
                filters: [
                    ['custrecord_vt_vendor', 'anyof', vendorId]
                ],
                columns: [
                    search.createColumn({
                        name: 'custrecord_vt_snapshot_date',
                        sort: search.Sort.DESC
                    }),
                    'custrecord_vt_otd_percent',
                    'custrecord_vt_quality_rating',
                    'custrecord_vt_avg_lead_time',
                    'custrecord_vt_price_variance'
                ]
            });

            const results = trendSearch.run().getRange({ start: 0, end: 2 });

            if (results && results.length >= 2) {
                // Compare latest two snapshots to calculate trends
                const latest = results[0];
                const previous = results[1];

                const latestOtd = parseFloat(latest.getValue('custrecord_vt_otd_percent')) || 0;
                const previousOtd = parseFloat(previous.getValue('custrecord_vt_otd_percent')) || 0;

                const latestQuality = parseFloat(latest.getValue('custrecord_vt_quality_rating')) || 0;
                const previousQuality = parseFloat(previous.getValue('custrecord_vt_quality_rating')) || 0;

                const latestLeadTime = parseInt(latest.getValue('custrecord_vt_avg_lead_time')) || 0;
                const previousLeadTime = parseInt(previous.getValue('custrecord_vt_avg_lead_time')) || 0;

                const latestPrice = parseFloat(latest.getValue('custrecord_vt_price_variance')) || 0;
                const previousPrice = parseFloat(previous.getValue('custrecord_vt_price_variance')) || 0;

                return {
                    otdTrend: Math.round((latestOtd - previousOtd) * 100 * 10) / 10,
                    priceTrend: Math.round((latestPrice - previousPrice) * 100 * 10) / 10,
                    qualityTrend: Math.round((latestQuality - previousQuality) * 10) / 10,
                    leadTimeTrend: latestLeadTime - previousLeadTime
                };
            }

            // No trend data available yet
            log.debug('getVendorPerformanceTrends', 'No trend data available for vendor: ' + vendorId);
            return {
                otdTrend: 0,
                priceTrend: 0,
                qualityTrend: 0,
                leadTimeTrend: 0
            };

        } catch (error) {
            log.debug('getVendorPerformanceTrends ERROR', {
                message: error.message,
                vendorId: vendorId
            });
            
            // Return neutral trends if calculation fails
            return {
                otdTrend: 0,
                priceTrend: 0,
                qualityTrend: 0,
                leadTimeTrend: 0
            };
        }
    }

    function getVendorRiskIndicators(vendorId, performanceMetrics) {
        const risks = [];
        let hasRisk = false;

        // Check on-time delivery risk
        if (performanceMetrics.onTimeDelivery < 80) {
            risks.push({
                type: 'delivery',
                severity: 'high',
                message: 'On-time delivery rate below 80% (' + performanceMetrics.onTimeDelivery + '%)'
            });
            hasRisk = true;
        } else if (performanceMetrics.onTimeDelivery < 90) {
            risks.push({
                type: 'delivery',
                severity: 'medium',
                message: 'On-time delivery rate below 90% (' + performanceMetrics.onTimeDelivery + '%)'
            });
            hasRisk = true;
        }

        // Check quality risk
        if (performanceMetrics.qualityRating < 3.5) {
            risks.push({
                type: 'quality',
                severity: 'high',
                message: 'Quality rating below 3.5 (' + performanceMetrics.qualityRating.toFixed(1) + ')'
            });
            hasRisk = true;
        } else if (performanceMetrics.qualityRating < 4.0) {
            risks.push({
                type: 'quality',
                severity: 'medium',
                message: 'Quality rating below 4.0 (' + performanceMetrics.qualityRating.toFixed(1) + ')'
            });
            hasRisk = true;
        }

        // Check defect rate risk
        if (performanceMetrics.defectRate > 5) {
            risks.push({
                type: 'quality',
                severity: 'high',
                message: 'High defect rate (' + performanceMetrics.defectRate.toFixed(1) + '%)'
            });
            hasRisk = true;
        } else if (performanceMetrics.defectRate > 3) {
            risks.push({
                type: 'quality',
                severity: 'medium',
                message: 'Elevated defect rate (' + performanceMetrics.defectRate.toFixed(1) + '%)'
            });
            hasRisk = true;
        }

        // Check lead time risk
        if (performanceMetrics.avgLeadTime > performanceMetrics.quotedLeadTime * 1.5) {
            risks.push({
                type: 'leadtime',
                severity: 'medium',
                message: 'Actual lead time significantly exceeds quoted time'
            });
            hasRisk = true;
        }

        return {
            risks: risks,
            hasRisk: hasRisk
        };
    }

    function getPeriodDateFilter(period) {
        const today = new Date();
        let startDate;

        switch (period) {
            case '30d':
                startDate = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
                break;
            case '90d':
                startDate = new Date(today.getTime() - (90 * 24 * 60 * 60 * 1000));
                break;
            case '180d':
                startDate = new Date(today.getTime() - (180 * 24 * 60 * 60 * 1000));
                break;
            case '365d':
                startDate = new Date(today.getTime() - (365 * 24 * 60 * 60 * 1000));
                break;
            default:
                startDate = new Date(today.getTime() - (90 * 24 * 60 * 60 * 1000));
        }

        return {
            range: [
                format.format({ value: startDate, type: format.Type.DATE }),
                format.format({ value: today, type: format.Type.DATE })
            ]
        };
    }
    
    ============================================================================ */

    /**
     * Find alternative vendors for an item
     * @param {string} itemId
     * @returns {Array} Array of vendor IDs
     */
    function findAlternativeVendors(itemId) {
        try {
            // Search for vendor price records for this item
            const vendorPriceSearch = search.create({
                type: 'vendorpricelist',
                filters: [
                    ['item', 'anyof', itemId]
                ],
                columns: [
                    'vendor'
                ]
            });

            const results = vendorPriceSearch.run().getRange({ start: 0, end: 10 });
            const vendorIds = results.map(function(result) {
                return result.getValue('vendor');
            }).filter(function(vendorId, index, self) {
                return vendorId && self.indexOf(vendorId) === index; // Remove duplicates and nulls
            });

            return vendorIds.slice(0, 3); // Limit to 3 vendors for comparison
        } catch (error) {
            log.debug('findAlternativeVendors ERROR', {
                message: error.message,
                itemId: itemId
            });
            // Return empty array - no alternatives found
            return [];
        }
    }

    /**
     * Calculate overall vendor score
     * @param {Object} performanceMetrics
     * @returns {number} Overall score (0-100)
     */
    function calculateOverallScore(performanceMetrics) {
        // Weighted scoring: OTD=40%, Quality=30%, Defects=20%, Price=10%
        const otdScore = performanceMetrics.onTimeDelivery;
        const qualityScore = (performanceMetrics.qualityRating / 5) * 100;
        const defectScore = Math.max(0, 100 - (performanceMetrics.defectRate * 10));
        const priceScore = Math.max(0, 100 - Math.abs(performanceMetrics.priceVariance * 5));

        const overallScore = (otdScore * 0.4) + (qualityScore * 0.3) + (defectScore * 0.2) + (priceScore * 0.1);
        
        return Math.round(overallScore);
    }

    /**
     * Find the best vendor from comparison
     * @param {Array} vendorComparisons
     * @returns {Object} Best vendor
     */
    function findBestVendor(vendorComparisons) {
        return vendorComparisons.reduce(function(best, current) {
            return current.overallScore > best.overallScore ? current : best;
        });
    }

    /**
     * Generate recommendation reasoning
     * @param {Array} vendorComparisons
     * @param {Object} bestVendor
     * @returns {string} Reasoning text
     */
    function generateRecommendationReasoning(vendorComparisons, bestVendor) {
        const performance = bestVendor.performance;
        const reasons = [];

        if (performance.onTimeDelivery >= 95) {
            reasons.push('excellent on-time delivery (' + performance.onTimeDelivery + '%)');
        } else if (performance.onTimeDelivery >= 90) {
            reasons.push('good on-time delivery (' + performance.onTimeDelivery + '%)');
        }

        if (performance.qualityRating >= 4.5) {
            reasons.push('high quality rating (' + performance.qualityRating.toFixed(1) + ')');
        } else if (performance.qualityRating >= 4.0) {
            reasons.push('good quality rating (' + performance.qualityRating.toFixed(1) + ')');
        }

        if (performance.defectRate <= 1) {
            reasons.push('low defect rate (' + performance.defectRate.toFixed(1) + '%)');
        }

        if (Math.abs(performance.priceVariance) <= 3) {
            reasons.push('stable pricing');
        }

        const reasonText = reasons.length > 0 ? 
            'Recommended based on ' + reasons.join(', ') : 
            'Best overall performance among available options';

        return reasonText + '. Overall score: ' + bestVendor.overallScore + '/100.';
    }

    /**
     * Handle POST requests (not implemented for this RESTlet)
     * @param {Object} requestBody
     * @returns {Object} Error response
     */
    function doPost(requestBody) {
        log.audit('VENDOR RESTLET', 'POST request received (not supported)');
        return {
            success: false,
            error: 'POST method not supported for vendor endpoint'
        };
    }

    /**
     * Handle PUT requests (not implemented for this RESTlet)
     * @param {Object} requestBody
     * @returns {Object} Error response
     */
    function doPut(requestBody) {
        log.audit('VENDOR RESTLET', 'PUT request received (not supported)');
        return {
            success: false,
            error: 'PUT method not supported for vendor endpoint'
        };
    }

    /**
     * Handle DELETE requests (not implemented for this RESTlet)
     * @param {Object} requestBody
     * @returns {Object} Error response
     */
    function doDelete(requestBody) {
        log.audit('VENDOR RESTLET', 'DELETE request received (not supported)');
        return {
            success: false,
            error: 'DELETE method not supported for vendor endpoint'
        };
    }

    return {
        get: doGet,
        post: doPost,
        put: doPut,
        delete: doDelete
    };
});