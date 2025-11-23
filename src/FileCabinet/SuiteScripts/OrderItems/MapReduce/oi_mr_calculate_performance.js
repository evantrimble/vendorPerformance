/**
 * NetSuite Map/Reduce Script for Vendor Performance Calculation
 * Calculates daily vendor performance metrics and updates custom records
 * 
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 */

define(['N/search', 'N/record', 'N/log', 'N/format', 'N/runtime'], 
function(search, record, log, format, runtime) {

    /**
     * Get input data - all vendors with recent transaction activity
     * @returns {Array|Object|Search|RecordRef} Input data for map stage
     */
    function getInputData() {
        log.debug('Map/Reduce Started', 'Getting input data for vendor performance calculation');
        
        try {
            // Get date range for analysis (default: last 90 days)
            const scriptParams = runtime.getCurrentScript();
            const analysisDays = scriptParams.getParameter('custscript_analysis_days') || 90;
            
            const endDate = new Date();
            const startDate = new Date(endDate.getTime() - (analysisDays * 24 * 60 * 60 * 1000));
            
            log.debug('Analysis Period', 'From: ' + startDate + ' To: ' + endDate);
            
            // Search for vendors with purchase orders in the analysis period
            const vendorSearch = search.create({
                type: search.Type.PURCHASE_ORDER,
                filters: [
                    ['mainline', 'is', 'T'],
                    'AND',
                    ['trandate', 'within', 
                     format.format({ value: startDate, type: format.Type.DATE }),
                     format.format({ value: endDate, type: format.Type.DATE })
                    ]
                ],
                columns: [
                    search.createColumn({
                        name: 'entity',
                        summary: search.Summary.GROUP
                    }),
                    search.createColumn({
                        name: 'internalid',
                        join: 'vendor',
                        summary: search.Summary.GROUP
                    }),
                    search.createColumn({
                        name: 'companyname',
                        join: 'vendor',
                        summary: search.Summary.GROUP
                    })
                ]
            });

            const vendorResults = vendorSearch.run().getRange({ start: 0, end: 1000 });
            
            log.debug('Input Data', 'Found ' + vendorResults.length + ' vendors with transactions');
            
            // Return vendor data for processing
            return vendorResults.map(function(result) {
                return {
                    vendorId: result.getValue({ name: 'entity', summary: search.Summary.GROUP }),
                    vendorName: result.getValue({ name: 'companyname', join: 'vendor', summary: search.Summary.GROUP }) || 'Unknown Vendor',
                    analysisPeriod: {
                        startDate: format.format({ value: startDate, type: format.Type.DATE }),
                        endDate: format.format({ value: endDate, type: format.Type.DATE }),
                        days: analysisDays
                    }
                };
            });
            
        } catch (error) {
            log.error('Error in getInputData', error);
            return [];
        }
    }

    /**
     * Map stage - calculate performance metrics for each vendor
     * @param {Object} context
     * @param {string} context.key - The key from input data
     * @param {string} context.value - The value from input data
     */
    function map(context) {
        try {
            const vendorData = JSON.parse(context.value);
            const vendorId = vendorData.vendorId;
            
            log.debug('Processing Vendor', 'ID: ' + vendorId + ', Name: ' + vendorData.vendorName);
            
            // Calculate performance metrics
            const performanceMetrics = calculateVendorMetrics(vendorData);
            
            // Emit the results
            context.write({
                key: vendorId,
                value: {
                    vendorId: vendorId,
                    vendorName: vendorData.vendorName,
                    metrics: performanceMetrics,
                    calculationDate: new Date().toISOString(),
                    analysisPeriod: vendorData.analysisPeriod
                }
            });
            
        } catch (error) {
            log.error('Error in map stage for vendor', error);
        }
    }

    /**
     * Reduce stage - aggregate and save performance data
     * @param {Object} context
     * @param {string} context.key - Vendor ID
     * @param {Array} context.values - Array of performance data
     */
    function reduce(context) {
        try {
            const vendorId = context.key;
            const performanceData = JSON.parse(context.values[0]); // Should only be one value per vendor
            
            log.debug('Reducing Vendor', 'ID: ' + vendorId);
            
            // Save or update vendor performance record
            const saveResult = saveVendorPerformanceRecord(performanceData);
            
            // Update vendor risk score
            updateVendorRiskScore(vendorId, performanceData.metrics);
            
            // Emit summary for the summarize stage
            context.write({
                key: 'summary',
                value: {
                    vendorId: vendorId,
                    vendorName: performanceData.vendorName,
                    riskLevel: calculateRiskLevel(performanceData.metrics),
                    recordId: saveResult.recordId,
                    updated: saveResult.updated
                }
            });
            
        } catch (error) {
            log.error('Error in reduce stage for vendor ' + context.key, error);
        }
    }

    /**
     * Summarize stage - log results and send alerts if needed
     * @param {Object} context
     */
    function summarize(context) {
        log.debug('Map/Reduce Summary', 'Starting summarize stage');
        
        let processedVendors = 0;
        let highRiskVendors = [];
        let errors = [];
        
        // Process map stage errors
        context.mapSummary.errors.iterator().each(function(key, error) {
            log.error('Map Error for key: ' + key, error);
            errors.push({ stage: 'map', key: key, error: error });
            return true;
        });
        
        // Process reduce stage errors
        context.reduceSummary.errors.iterator().each(function(key, error) {
            log.error('Reduce Error for key: ' + key, error);
            errors.push({ stage: 'reduce', key: key, error: error });
            return true;
        });
        
        // Process successful reduce outputs
        context.reduceSummary.keys.iterator().each(function(key) {
            processedVendors++;
            return true;
        });
        
        // Analyze reduce output for high-risk vendors
        context.output.iterator().each(function(key, value) {
            const summary = JSON.parse(value);
            if (summary.riskLevel === 'high') {
                highRiskVendors.push({
                    vendorId: summary.vendorId,
                    vendorName: summary.vendorName
                });
            }
            return true;
        });
        
        // Log summary
        log.audit('Map/Reduce Completed', {
            processedVendors: processedVendors,
            highRiskVendors: highRiskVendors.length,
            errors: errors.length,
            inputSummary: context.inputSummary,
            mapSummary: context.mapSummary,
            reduceSummary: context.reduceSummary
        });
        
        // Send alerts for high-risk vendors if any
        if (highRiskVendors.length > 0) {
            sendHighRiskVendorAlert(highRiskVendors);
        }
        
        // Update last calculation timestamp
        updateLastCalculationTimestamp();
    }

    /**
     * Calculate comprehensive vendor performance metrics
     * @param {Object} vendorData
     * @returns {Object} Performance metrics
     */
    function calculateVendorMetrics(vendorData) {
        const vendorId = vendorData.vendorId;
        const period = vendorData.analysisPeriod;
        
        // Get purchase orders for this vendor
        const purchaseOrders = getPurchaseOrderData(vendorId, period);
        
        // Get item receipts for delivery performance
        const itemReceipts = getItemReceiptData(vendorId, period);
        
        // Get vendor bills for cost analysis
        const vendorBills = getVendorBillData(vendorId, period);
        
        // Calculate metrics
        const metrics = {
            // Delivery Performance
            onTimeDeliveryRate: calculateOnTimeDeliveryRate(purchaseOrders, itemReceipts),
            avgActualLeadTime: calculateAverageLeadTime(purchaseOrders, itemReceipts),
            avgQuotedLeadTime: calculateQuotedLeadTime(purchaseOrders),
            
            // Quality Metrics
            qualityRating: calculateQualityRating(vendorId, period),
            defectRate: calculateDefectRate(vendorId, period),
            
            // Cost Performance
            priceVariance: calculatePriceVariance(purchaseOrders, vendorBills),
            costStability: calculateCostStability(vendorBills),
            
            // Volume Metrics
            totalOrders: purchaseOrders.length,
            totalValue: calculateTotalOrderValue(purchaseOrders),
            avgOrderValue: calculateAverageOrderValue(purchaseOrders),
            
            // Response Metrics
            responseTime: calculateResponseTime(vendorId, period),
            
            // Calculated fields
            lastOrderDate: getLastOrderDate(purchaseOrders),
            orderFrequency: calculateOrderFrequency(purchaseOrders, period.days)
        };
        
        // Calculate overall risk score
        metrics.riskScore = calculateOverallRiskScore(metrics);
        
        return metrics;
    }

    /**
     * Get purchase order data for vendor
     * @param {string} vendorId
     * @param {Object} period
     * @returns {Array} Purchase order results
     */
    function getPurchaseOrderData(vendorId, period) {
        try {
            const poSearch = search.create({
                type: search.Type.PURCHASE_ORDER,
                filters: [
                    ['entity', 'anyof', vendorId],
                    'AND',
                    ['mainline', 'is', 'T'],
                    'AND',
                    ['trandate', 'within', period.startDate, period.endDate]
                ],
                columns: [
                    'trandate',
                    'duedate',
                    'total',
                    'status',
                    'tranid'
                ]
            });
            
            return poSearch.run().getRange({ start: 0, end: 1000 });
        } catch (error) {
            log.error('Error getting PO data for vendor ' + vendorId, error);
            return [];
        }
    }

    /**
     * Get item receipt data for vendor
     * @param {string} vendorId
     * @param {Object} period
     * @returns {Array} Item receipt results
     */
    function getItemReceiptData(vendorId, period) {
        try {
            const irSearch = search.create({
                type: search.Type.ITEM_RECEIPT,
                filters: [
                    ['entity', 'anyof', vendorId],
                    'AND',
                    ['mainline', 'is', 'T'],
                    'AND',
                    ['trandate', 'within', period.startDate, period.endDate]
                ],
                columns: [
                    'trandate',
                    'createdfrom',
                    search.createColumn({
                        name: 'trandate',
                        join: 'createdfrom'
                    }),
                    search.createColumn({
                        name: 'duedate',
                        join: 'createdfrom'
                    })
                ]
            });
            
            return irSearch.run().getRange({ start: 0, end: 1000 });
        } catch (error) {
            log.error('Error getting IR data for vendor ' + vendorId, error);
            return [];
        }
    }

    /**
     * Get vendor bill data for vendor
     * @param {string} vendorId
     * @param {Object} period
     * @returns {Array} Vendor bill results
     */
    function getVendorBillData(vendorId, period) {
        try {
            const billSearch = search.create({
                type: search.Type.VENDOR_BILL,
                filters: [
                    ['entity', 'anyof', vendorId],
                    'AND',
                    ['mainline', 'is', 'T'],
                    'AND',
                    ['trandate', 'within', period.startDate, period.endDate]
                ],
                columns: [
                    'trandate',
                    'total',
                    'createdfrom'
                ]
            });
            
            return billSearch.run().getRange({ start: 0, end: 1000 });
        } catch (error) {
            log.error('Error getting bill data for vendor ' + vendorId, error);
            return [];
        }
    }

    /**
     * Calculate on-time delivery rate
     * @param {Array} purchaseOrders
     * @param {Array} itemReceipts
     * @returns {number} On-time delivery percentage
     */
    function calculateOnTimeDeliveryRate(purchaseOrders, itemReceipts) {
        if (itemReceipts.length === 0) return 95; // Default for vendors with no receipts
        
        let onTimeDeliveries = 0;
        
        itemReceipts.forEach(function(receipt) {
            const deliveryDate = receipt.getValue('trandate');
            const dueDate = receipt.getValue({ name: 'duedate', join: 'createdfrom' });
            
            if (deliveryDate && dueDate) {
                const deliveryTime = new Date(deliveryDate).getTime();
                const dueTime = new Date(dueDate).getTime();
                
                if (deliveryTime <= dueTime) {
                    onTimeDeliveries++;
                }
            }
        });
        
        return Math.round((onTimeDeliveries / itemReceipts.length) * 100);
    }

    /**
     * Calculate average actual lead time
     * @param {Array} purchaseOrders
     * @param {Array} itemReceipts
     * @returns {number} Average lead time in days
     */
    function calculateAverageLeadTime(purchaseOrders, itemReceipts) {
        if (itemReceipts.length === 0) return 14;
        
        let totalLeadTime = 0;
        let count = 0;
        
        itemReceipts.forEach(function(receipt) {
            const deliveryDate = receipt.getValue('trandate');
            const orderDate = receipt.getValue({ name: 'trandate', join: 'createdfrom' });
            
            if (deliveryDate && orderDate) {
                const deliveryTime = new Date(deliveryDate).getTime();
                const orderTime = new Date(orderDate).getTime();
                const leadDays = Math.ceil((deliveryTime - orderTime) / (1000 * 60 * 60 * 24));
                
                totalLeadTime += leadDays;
                count++;
            }
        });
        
        return count > 0 ? Math.round(totalLeadTime / count) : 14;
    }

    /**
     * Calculate quoted lead time average
     * @param {Array} purchaseOrders
     * @returns {number} Average quoted lead time
     */
    function calculateQuotedLeadTime(purchaseOrders) {
        // This would require additional fields or logic
        // For now, return a reasonable default
        return 14;
    }

    /**
     * Calculate quality rating (mock implementation)
     * @param {string} vendorId
     * @param {Object} period
     * @returns {number} Quality rating (1-5)
     */
    function calculateQualityRating(vendorId, period) {
        // In full implementation, this would analyze:
        // - Item receipt quality notes
        // - Return transactions
        // - Quality inspection results
        // For now, return a mock rating
        return 4.0 + (Math.random() * 1.0);
    }

    /**
     * Calculate defect rate (mock implementation)
     * @param {string} vendorId
     * @param {Object} period
     * @returns {number} Defect rate percentage
     */
    function calculateDefectRate(vendorId, period) {
        // Mock implementation - would analyze return transactions
        return Math.random() * 3; // 0-3%
    }

    /**
     * Calculate price variance
     * @param {Array} purchaseOrders
     * @param {Array} vendorBills
     * @returns {number} Price variance percentage
     */
    function calculatePriceVariance(purchaseOrders, vendorBills) {
        // Mock implementation - would compare PO prices to historical averages
        return (Math.random() - 0.5) * 10; // -5% to +5%
    }

    /**
     * Calculate cost stability
     * @param {Array} vendorBills
     * @returns {number} Cost stability score
     */
    function calculateCostStability(vendorBills) {
        // Mock implementation - would analyze price variation over time
        return 85 + (Math.random() * 15); // 85-100%
    }

    /**
     * Calculate total order value
     * @param {Array} purchaseOrders
     * @returns {number} Total value
     */
    function calculateTotalOrderValue(purchaseOrders) {
        return purchaseOrders.reduce(function(total, po) {
            return total + (parseFloat(po.getValue('total')) || 0);
        }, 0);
    }

    /**
     * Calculate average order value
     * @param {Array} purchaseOrders
     * @returns {number} Average order value
     */
    function calculateAverageOrderValue(purchaseOrders) {
        if (purchaseOrders.length === 0) return 0;
        const totalValue = calculateTotalOrderValue(purchaseOrders);
        return totalValue / purchaseOrders.length;
    }

    /**
     * Calculate response time (mock implementation)
     * @param {string} vendorId
     * @param {Object} period
     * @returns {number} Response time in hours
     */
    function calculateResponseTime(vendorId, period) {
        // Mock implementation - would analyze email/communication response times
        return Math.floor(Math.random() * 12) + 2; // 2-14 hours
    }

    /**
     * Get last order date
     * @param {Array} purchaseOrders
     * @returns {string|null} Last order date
     */
    function getLastOrderDate(purchaseOrders) {
        if (purchaseOrders.length === 0) return null;
        
        const lastOrder = purchaseOrders.reduce(function(latest, current) {
            const currentDate = new Date(current.getValue('trandate'));
            const latestDate = new Date(latest.getValue('trandate'));
            return currentDate > latestDate ? current : latest;
        });
        
        return lastOrder.getValue('trandate');
    }

    /**
     * Calculate order frequency
     * @param {Array} purchaseOrders
     * @param {number} periodDays
     * @returns {number} Orders per month
     */
    function calculateOrderFrequency(purchaseOrders, periodDays) {
        if (purchaseOrders.length === 0) return 0;
        const ordersPerDay = purchaseOrders.length / periodDays;
        return Math.round(ordersPerDay * 30 * 10) / 10; // Orders per month, rounded to 1 decimal
    }

    /**
     * Calculate overall risk score
     * @param {Object} metrics
     * @returns {number} Risk score (0-100, higher = more risk)
     */
    function calculateOverallRiskScore(metrics) {
        // Weighted risk calculation
        let riskScore = 0;
        
        // On-time delivery risk (40% weight)
        if (metrics.onTimeDeliveryRate < 80) riskScore += 40;
        else if (metrics.onTimeDeliveryRate < 90) riskScore += 20;
        
        // Quality risk (30% weight)
        if (metrics.qualityRating < 3.5) riskScore += 30;
        else if (metrics.qualityRating < 4.0) riskScore += 15;
        
        // Defect rate risk (20% weight)
        if (metrics.defectRate > 5) riskScore += 20;
        else if (metrics.defectRate > 3) riskScore += 10;
        
        // Price variance risk (10% weight)
        if (Math.abs(metrics.priceVariance) > 10) riskScore += 10;
        else if (Math.abs(metrics.priceVariance) > 5) riskScore += 5;
        
        return Math.min(riskScore, 100);
    }

    /**
     * Calculate risk level from metrics
     * @param {Object} metrics
     * @returns {string} Risk level
     */
    function calculateRiskLevel(metrics) {
        if (metrics.riskScore >= 50) return 'high';
        if (metrics.riskScore >= 25) return 'medium';
        return 'low';
    }

    /**
     * Save vendor performance record
     * @param {Object} performanceData
     * @returns {Object} Save result
     */
    function saveVendorPerformanceRecord(performanceData) {
        try {
            const vendorId = performanceData.vendorId;
            const metrics = performanceData.metrics;
            const period = performanceData.analysisPeriod;

            // Check if record exists for this vendor
            const existingRecordId = findExistingPerformanceRecord(vendorId);

            let perfRecord;
            let isUpdate = false;

            if (existingRecordId) {
                // Update existing record
                perfRecord = record.load({
                    type: 'customrecord_vendor_performance',
                    id: existingRecordId
                });
                isUpdate = true;
                log.debug('Updating Performance Record', 'Vendor: ' + vendorId + ', Record ID: ' + existingRecordId);
            } else {
                // Create new record
                perfRecord = record.create({
                    type: 'customrecord_vendor_performance'
                });
                perfRecord.setValue('custrecord_vp_vendor', vendorId);
                log.debug('Creating Performance Record', 'Vendor: ' + vendorId);
            }

            // Set all performance fields
            perfRecord.setValue('custrecord_vp_calculation_date', new Date());
            perfRecord.setValue('custrecord_vp_analysis_period_days', period.days);
            perfRecord.setValue('custrecord_vp_otd_percent', metrics.onTimeDeliveryRate / 100); // Convert to decimal
            perfRecord.setValue('custrecord_vp_avg_lead_time', metrics.avgActualLeadTime.toString());
            perfRecord.setValue('custrecord_vp_quoted_lead_time', metrics.avgQuotedLeadTime.toString());
            perfRecord.setValue('custrecord_vp_quality_rating', metrics.qualityRating);
            perfRecord.setValue('custrecord_vp_defect_rate', metrics.defectRate / 100); // Convert to decimal
            perfRecord.setValue('custrecord_vp_price_variance', metrics.priceVariance / 100); // Convert to decimal
            perfRecord.setValue('custrecord_vp_cost_stability', metrics.costStability / 100); // Convert to decimal
            perfRecord.setValue('custrecord_vp_risk_score', metrics.riskScore);

            // Set risk level (custom list value)
            const riskLevel = getRiskLevelListValue(metrics.riskScore);
            if (riskLevel) {
                perfRecord.setValue('custrecord_vp_risk_level', riskLevel);
            }

            perfRecord.setValue('custrecord_vp_total_orders', metrics.totalOrders);
            perfRecord.setValue('custrecord_vp_total_value', metrics.totalValue);
            perfRecord.setValue('custrecord_vp_avg_order_value', metrics.avgOrderValue);
            perfRecord.setValue('custrecord_vp_response_time_hours', metrics.responseTime);

            if (metrics.lastOrderDate) {
                perfRecord.setValue('custrecord_vp_last_order_date', format.parse({
                    value: metrics.lastOrderDate,
                    type: format.Type.DATE
                }));
            }

            perfRecord.setValue('custrecord_vp_order_frequency', metrics.orderFrequency);

            // Save the record
            const recordId = perfRecord.save();

            log.audit('Vendor Performance Saved', {
                vendorId: vendorId,
                vendorName: performanceData.vendorName,
                recordId: recordId,
                isUpdate: isUpdate,
                onTimeDelivery: metrics.onTimeDeliveryRate,
                qualityRating: metrics.qualityRating,
                riskScore: metrics.riskScore
            });

            return {
                recordId: recordId,
                updated: isUpdate
            };
        } catch (error) {
            log.error('Error saving vendor performance record', error);
            return {
                recordId: null,
                updated: false
            };
        }
    }

    /**
     * Find existing performance record for vendor
     * @param {string} vendorId
     * @returns {string|null} Record internal ID
     */
    function findExistingPerformanceRecord(vendorId) {
        try {
            const perfSearch = search.create({
                type: 'customrecord_vendor_performance',
                filters: [
                    ['custrecord_vp_vendor', 'anyof', vendorId]
                ],
                columns: ['internalid']
            });

            const results = perfSearch.run().getRange({ start: 0, end: 1 });

            if (results && results.length > 0) {
                return results[0].id;
            }

            return null;
        } catch (error) {
            log.debug('Error finding existing record', error);
            return null;
        }
    }

    /**
     * Get custom list value for risk level
     * @param {number} riskScore
     * @returns {string|null} Custom list value ID
     */
    function getRiskLevelListValue(riskScore) {
        try {
            // Search for the custom list values
            const listSearch = search.create({
                type: 'customlist_vp_vendor_risk_levels',
                filters: [],
                columns: ['name', 'internalid']
            });

            const results = listSearch.run().getRange({ start: 0, end: 10 });

            // Match risk score to list value
            let targetName;
            if (riskScore >= 50) {
                targetName = 'High';
            } else if (riskScore >= 25) {
                targetName = 'Medium';
            } else {
                targetName = 'Low';
            }

            for (let i = 0; i < results.length; i++) {
                const name = results[i].getValue('name');
                if (name && name.toLowerCase() === targetName.toLowerCase()) {
                    return results[i].id;
                }
            }

            return null;
        } catch (error) {
            log.debug('Error getting risk level list value', error);
            return null;
        }
    }

    /**
     * Update vendor risk score
     * @param {string} vendorId
     * @param {Object} metrics
     */
    function updateVendorRiskScore(vendorId, metrics) {
        try {
            // In full implementation, this might update the vendor record
            // or a related risk assessment record
            log.debug('Vendor Risk Updated', 'Vendor: ' + vendorId + ', Risk Score: ' + metrics.riskScore);
        } catch (error) {
            log.error('Error updating vendor risk score', error);
        }
    }

    /**
     * Send alert for high-risk vendors
     * @param {Array} highRiskVendors
     */
    function sendHighRiskVendorAlert(highRiskVendors) {
        try {
            log.audit('High Risk Vendors Alert', 'Found ' + highRiskVendors.length + ' high-risk vendors: ' + 
                     highRiskVendors.map(function(v) { return v.vendorName; }).join(', '));
            
            // In full implementation, this would send emails or create tasks
        } catch (error) {
            log.error('Error sending high-risk vendor alert', error);
        }
    }

    /**
     * Update last calculation timestamp
     */
    function updateLastCalculationTimestamp() {
        try {
            // In full implementation, this would update a configuration record
            log.debug('Performance Calculation Complete', 'Timestamp: ' + new Date().toISOString());
        } catch (error) {
            log.error('Error updating calculation timestamp', error);
        }
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
});