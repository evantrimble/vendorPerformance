/**
 * NetSuite Library - Vendor Performance Utilities
 * Shared functions for vendor performance calculations and risk analysis
 * 
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

define(['N/search', 'N/record', 'N/log', 'N/format'], 
function(search, record, log, format) {

    /**
     * Calculate vendor risk level based on performance metrics
     * @param {Object} metrics - Performance metrics object
     * @returns {string} Risk level: 'low', 'medium', or 'high'
     */
    function calculateRiskLevel(metrics) {
        const factors = [];
        
        // On-time delivery risk
        if (metrics.onTimeDelivery < 80) {
            factors.push({ factor: 'otd', severity: 'high', weight: 0.4 });
        } else if (metrics.onTimeDelivery < 90) {
            factors.push({ factor: 'otd', severity: 'medium', weight: 0.2 });
        }
        
        // Quality risk
        if (metrics.qualityRating < 3.5) {
            factors.push({ factor: 'quality', severity: 'high', weight: 0.3 });
        } else if (metrics.qualityRating < 4.0) {
            factors.push({ factor: 'quality', severity: 'medium', weight: 0.15 });
        }
        
        // Defect rate risk
        if (metrics.defectRate > 5) {
            factors.push({ factor: 'defects', severity: 'high', weight: 0.2 });
        } else if (metrics.defectRate > 3) {
            factors.push({ factor: 'defects', severity: 'medium', weight: 0.1 });
        }
        
        // Price variance risk
        if (Math.abs(metrics.priceVariance) > 10) {
            factors.push({ factor: 'price', severity: 'medium', weight: 0.1 });
        }
        
        // Calculate total risk score
        const totalRisk = factors.reduce(function(sum, factor) {
            return sum + factor.weight;
        }, 0);
        
        if (totalRisk >= 0.5) return 'high';
        if (totalRisk >= 0.25) return 'medium';
        return 'low';
    }

    /**
     * Calculate overall vendor score (0-100)
     * @param {Object} metrics - Performance metrics object
     * @returns {number} Overall score
     */
    function calculateOverallScore(metrics) {
        // Weighted scoring components
        const otdScore = Math.min(metrics.onTimeDelivery || 0, 100);
        const qualityScore = Math.min((metrics.qualityRating || 0) * 20, 100);
        const defectScore = Math.max(100 - ((metrics.defectRate || 0) * 10), 0);
        const priceScore = Math.max(100 - Math.abs(metrics.priceVariance || 0), 0);
        
        // Weighted average: OTD=40%, Quality=30%, Defects=20%, Price=10%
        const overallScore = (otdScore * 0.4) + (qualityScore * 0.3) + (defectScore * 0.2) + (priceScore * 0.1);
        
        return Math.round(overallScore);
    }

    /**
     * Get vendor performance trends by comparing periods
     * @param {string} vendorId - Vendor internal ID
     * @param {string} currentPeriod - Current period (e.g., '90d')
     * @param {string} previousPeriod - Previous period (e.g., '90d')
     * @returns {Object} Trend analysis
     */
    function calculatePerformanceTrends(vendorId, currentPeriod, previousPeriod) {
        try {
            const currentMetrics = getVendorMetricsForPeriod(vendorId, currentPeriod);
            const previousMetrics = getVendorMetricsForPeriod(vendorId, previousPeriod, true);
            
            return {
                otdTrend: calculateTrendChange(previousMetrics.onTimeDelivery, currentMetrics.onTimeDelivery),
                qualityTrend: calculateTrendChange(previousMetrics.qualityRating, currentMetrics.qualityRating),
                defectTrend: calculateTrendChange(previousMetrics.defectRate, currentMetrics.defectRate, true), // Reverse for defects
                priceTrend: calculateTrendChange(previousMetrics.priceVariance, currentMetrics.priceVariance, true),
                leadTimeTrend: calculateTrendChange(previousMetrics.avgLeadTime, currentMetrics.avgLeadTime, true)
            };
        } catch (error) {
            log.error('Error calculating performance trends for vendor ' + vendorId, error);
            return {
                otdTrend: 0,
                qualityTrend: 0,
                defectTrend: 0,
                priceTrend: 0,
                leadTimeTrend: 0
            };
        }
    }

    /**
     * Calculate trend change percentage
     * @param {number} previousValue
     * @param {number} currentValue
     * @param {boolean} reverse - If true, negative change is good (for defects, lead time)
     * @returns {number} Percentage change
     */
    function calculateTrendChange(previousValue, currentValue, reverse) {
        if (!previousValue || previousValue === 0) return 0;
        
        const change = ((currentValue - previousValue) / previousValue) * 100;
        return reverse ? -change : change;
    }

    /**
     * Get vendor metrics for a specific period
     * @param {string} vendorId
     * @param {string} period
     * @param {boolean} isPrevious - If true, gets previous period
     * @returns {Object} Metrics for the period
     */
    function getVendorMetricsForPeriod(vendorId, period, isPrevious) {
        // This would query actual performance records in full implementation
        // For now, return mock data with some variation
        const baseMetrics = {
            onTimeDelivery: 92 + (Math.random() * 8),
            qualityRating: 4.0 + (Math.random() * 1.0),
            defectRate: Math.random() * 3,
            priceVariance: (Math.random() - 0.5) * 6,
            avgLeadTime: 12 + Math.floor(Math.random() * 8)
        };
        
        if (isPrevious) {
            // Add some variation for previous period
            baseMetrics.onTimeDelivery += (Math.random() - 0.5) * 10;
            baseMetrics.qualityRating += (Math.random() - 0.5) * 0.5;
            baseMetrics.defectRate += (Math.random() - 0.5) * 1;
            baseMetrics.priceVariance += (Math.random() - 0.5) * 4;
            baseMetrics.avgLeadTime += Math.floor((Math.random() - 0.5) * 4);
        }
        
        return baseMetrics;
    }

    /**
     * Find alternative vendors for an item
     * @param {string} itemId - Item internal ID
     * @param {string} excludeVendorId - Vendor to exclude from results
     * @returns {Array} Array of alternative vendor objects
     */
    function findAlternativeVendors(itemId, excludeVendorId) {
        try {
            // Search vendor price list for this item
            const vendorPriceSearch = search.create({
                type: 'vendorpricelist',
                filters: [
                    ['item', 'anyof', itemId],
                    'AND',
                    ['vendor', 'noneof', excludeVendorId || '']
                ],
                columns: [
                    'vendor',
                    'purchaseprice',
                    'minimumquantity',
                    'quantitybreak1',
                    'quantitybreak2'
                ]
            });

            const results = vendorPriceSearch.run().getRange({ start: 0, end: 10 });
            
            return results.map(function(result) {
                const vendorId = result.getValue('vendor');
                const vendorName = result.getText('vendor');
                const price = parseFloat(result.getValue('purchaseprice') || 0);
                
                return {
                    vendorId: vendorId,
                    vendorName: vendorName,
                    price: price,
                    minQuantity: parseInt(result.getValue('minimumquantity') || 1),
                    // Get performance metrics for this vendor
                    performance: getVendorPerformanceSummary(vendorId)
                };
            }).filter(function(vendor, index, self) {
                // Remove duplicates based on vendor ID
                return index === self.findIndex(function(v) { return v.vendorId === vendor.vendorId; });
            });
            
        } catch (error) {
            log.error('Error finding alternative vendors for item ' + itemId, error);
            return [];
        }
    }

    /**
     * Get vendor performance summary
     * @param {string} vendorId
     * @returns {Object} Performance summary
     */
    function getVendorPerformanceSummary(vendorId) {
        try {
            // In full implementation, this would query performance records
            // For now, return calculated mock data
            const metrics = getVendorMetricsForPeriod(vendorId, '90d');
            
            return {
                onTimeDelivery: Math.round(metrics.onTimeDelivery),
                qualityRating: Math.round(metrics.qualityRating * 10) / 10,
                defectRate: Math.round(metrics.defectRate * 10) / 10,
                riskLevel: calculateRiskLevel(metrics),
                overallScore: calculateOverallScore(metrics),
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            log.error('Error getting performance summary for vendor ' + vendorId, error);
            return {
                onTimeDelivery: 85,
                qualityRating: 4.0,
                defectRate: 2.0,
                riskLevel: 'medium',
                overallScore: 75,
                lastUpdated: new Date().toISOString()
            };
        }
    }

    /**
     * Compare vendors and recommend best option
     * @param {Array} vendors - Array of vendor objects with performance data
     * @param {Object} criteria - Comparison criteria weights
     * @returns {Object} Comparison result with recommendation
     */
    function compareVendors(vendors, criteria) {
        criteria = criteria || {
            onTimeDelivery: 0.3,
            quality: 0.25,
            price: 0.25,
            defects: 0.2
        };
        
        // Score each vendor
        const scoredVendors = vendors.map(function(vendor) {
            const performance = vendor.performance || {};
            
            // Calculate weighted score
            let score = 0;
            score += (performance.onTimeDelivery || 85) * criteria.onTimeDelivery;
            score += (performance.qualityRating || 4.0) * 20 * criteria.quality;
            score += Math.max(0, 100 - (performance.defectRate || 2) * 10) * criteria.defects;
            
            // Price scoring (lower price = higher score)
            if (vendor.price && vendor.price > 0) {
                const minPrice = Math.min.apply(Math, vendors.map(function(v) { return v.price || Infinity; }));
                const priceScore = minPrice > 0 ? (minPrice / vendor.price) * 100 : 100;
                score += priceScore * criteria.price;
            }
            
            return Object.assign({}, vendor, {
                comparisonScore: Math.round(score),
                recommendation: {
                    score: Math.round(score),
                    rank: 0 // Will be set after sorting
                }
            });
        });
        
        // Sort by score and assign ranks
        scoredVendors.sort(function(a, b) { return b.comparisonScore - a.comparisonScore; });
        scoredVendors.forEach(function(vendor, index) {
            vendor.recommendation.rank = index + 1;
        });
        
        // Generate recommendation reasoning
        const bestVendor = scoredVendors[0];
        const reasoning = generateRecommendationReasoning(bestVendor, criteria);
        
        return {
            vendors: scoredVendors,
            recommendation: {
                vendorId: bestVendor.vendorId,
                vendorName: bestVendor.vendorName,
                score: bestVendor.comparisonScore,
                reasoning: reasoning
            }
        };
    }

    /**
     * Generate recommendation reasoning text
     * @param {Object} vendor - Best vendor
     * @param {Object} criteria - Comparison criteria
     * @returns {string} Reasoning text
     */
    function generateRecommendationReasoning(vendor, criteria) {
        const performance = vendor.performance || {};
        const reasons = [];
        
        // Check each criteria and add strong points
        if (criteria.onTimeDelivery > 0.2 && performance.onTimeDelivery >= 95) {
            reasons.push('excellent on-time delivery (' + performance.onTimeDelivery + '%)');
        }
        
        if (criteria.quality > 0.2 && performance.qualityRating >= 4.5) {
            reasons.push('high quality rating (' + performance.qualityRating + '/5)');
        }
        
        if (criteria.defects > 0.15 && performance.defectRate <= 1) {
            reasons.push('low defect rate (' + performance.defectRate + '%)');
        }
        
        if (criteria.price > 0.2 && vendor.price) {
            reasons.push('competitive pricing');
        }
        
        const reasonText = reasons.length > 0 ? 
            'Recommended due to ' + reasons.join(', ') : 
            'Best overall performance among available options';
        
        return reasonText + ' (Score: ' + vendor.comparisonScore + '/100)';
    }

    /**
     * Validate vendor performance data
     * @param {Object} metrics - Performance metrics to validate
     * @returns {Object} Validation result
     */
    function validatePerformanceMetrics(metrics) {
        const errors = [];
        
        // Validate on-time delivery
        if (typeof metrics.onTimeDelivery !== 'number' || metrics.onTimeDelivery < 0 || metrics.onTimeDelivery > 100) {
            errors.push('On-time delivery must be a number between 0 and 100');
        }
        
        // Validate quality rating
        if (typeof metrics.qualityRating !== 'number' || metrics.qualityRating < 0 || metrics.qualityRating > 5) {
            errors.push('Quality rating must be a number between 0 and 5');
        }
        
        // Validate defect rate
        if (typeof metrics.defectRate !== 'number' || metrics.defectRate < 0 || metrics.defectRate > 100) {
            errors.push('Defect rate must be a number between 0 and 100');
        }
        
        // Validate lead times
        if (metrics.avgLeadTime && (typeof metrics.avgLeadTime !== 'number' || metrics.avgLeadTime < 0)) {
            errors.push('Average lead time must be a positive number');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Format vendor performance data for display
     * @param {Object} metrics - Raw performance metrics
     * @returns {Object} Formatted metrics
     */
    function formatPerformanceMetrics(metrics) {
        return {
            onTimeDelivery: {
                value: Math.round(metrics.onTimeDelivery || 0),
                display: Math.round(metrics.onTimeDelivery || 0) + '%',
                status: (metrics.onTimeDelivery || 0) >= 95 ? 'excellent' : 
                       (metrics.onTimeDelivery || 0) >= 90 ? 'good' : 
                       (metrics.onTimeDelivery || 0) >= 80 ? 'fair' : 'poor'
            },
            qualityRating: {
                value: Math.round((metrics.qualityRating || 0) * 10) / 10,
                display: (Math.round((metrics.qualityRating || 0) * 10) / 10) + '/5',
                status: (metrics.qualityRating || 0) >= 4.5 ? 'excellent' : 
                       (metrics.qualityRating || 0) >= 4.0 ? 'good' : 
                       (metrics.qualityRating || 0) >= 3.5 ? 'fair' : 'poor'
            },
            defectRate: {
                value: Math.round((metrics.defectRate || 0) * 10) / 10,
                display: (Math.round((metrics.defectRate || 0) * 10) / 10) + '%',
                status: (metrics.defectRate || 0) <= 1 ? 'excellent' : 
                       (metrics.defectRate || 0) <= 3 ? 'good' : 
                       (metrics.defectRate || 0) <= 5 ? 'fair' : 'poor'
            },
            avgLeadTime: {
                value: Math.round(metrics.avgLeadTime || 0),
                display: Math.round(metrics.avgLeadTime || 0) + ' days',
                status: (metrics.avgLeadTime || 0) <= 7 ? 'excellent' : 
                       (metrics.avgLeadTime || 0) <= 14 ? 'good' : 
                       (metrics.avgLeadTime || 0) <= 21 ? 'fair' : 'poor'
            },
            overallScore: {
                value: calculateOverallScore(metrics),
                display: calculateOverallScore(metrics) + '/100',
                riskLevel: calculateRiskLevel(metrics)
            }
        };
    }

    return {
        calculateRiskLevel: calculateRiskLevel,
        calculateOverallScore: calculateOverallScore,
        calculatePerformanceTrends: calculatePerformanceTrends,
        findAlternativeVendors: findAlternativeVendors,
        getVendorPerformanceSummary: getVendorPerformanceSummary,
        compareVendors: compareVendors,
        validatePerformanceMetrics: validatePerformanceMetrics,
        formatPerformanceMetrics: formatPerformanceMetrics
    };
});