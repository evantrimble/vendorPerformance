/**
 * NetSuite Library - Common Utilities
 * Shared utility functions for the Order Items application
 * 
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

define(['N/log', 'N/format', 'N/search', 'N/runtime'], 
function(log, format, search, runtime) {

    /**
     * Format currency values for display
     * @param {number} amount - Numeric amount
     * @param {string} currencyCode - Currency code (optional)
     * @returns {string} Formatted currency string
     */
    function formatCurrency(amount, currencyCode) {
        try {
            if (amount === null || amount === undefined || isNaN(amount)) {
                return '$0.00';
            }
            
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currencyCode || 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(amount);
        } catch (error) {
            // Fallback if Intl is not available
            return '$' + Number(amount).toFixed(2);
        }
    }

    /**
     * Format large numbers with appropriate suffixes (K, M, B)
     * @param {number} num - Number to format
     * @param {number} digits - Decimal places (default: 1)
     * @returns {string} Formatted number string
     */
    function formatNumber(num, digits) {
        digits = digits || 1;
        
        if (num === null || num === undefined || isNaN(num)) {
            return '0';
        }
        
        const si = [
            { value: 1E9, symbol: 'B' },
            { value: 1E6, symbol: 'M' },
            { value: 1E3, symbol: 'K' }
        ];
        
        for (let i = 0; i < si.length; i++) {
            if (Math.abs(num) >= si[i].value) {
                return (num / si[i].value).toFixed(digits) + si[i].symbol;
            }
        }
        
        return num.toString();
    }

    /**
     * Format date for display
     * @param {Date|string} date - Date to format
     * @param {string} formatType - Format type ('short', 'medium', 'long')
     * @returns {string} Formatted date string
     */
    function formatDate(date, formatType) {
        try {
            if (!date) return '';
            
            const dateObj = typeof date === 'string' ? new Date(date) : date;
            
            if (isNaN(dateObj.getTime())) {
                return '';
            }
            
            switch (formatType) {
                case 'short':
                    return format.format({
                        value: dateObj,
                        type: format.Type.DATE
                    });
                case 'long':
                    return format.format({
                        value: dateObj,
                        type: format.Type.DATETIME
                    });
                case 'time':
                    return format.format({
                        value: dateObj,
                        type: format.Type.TIMEOFDAY
                    });
                default:
                    return format.format({
                        value: dateObj,
                        type: format.Type.DATE
                    });
            }
        } catch (error) {
            log.debug('Error formatting date', error);
            return '';
        }
    }

    /**
     * Calculate days between two dates
     * @param {Date|string} startDate
     * @param {Date|string} endDate
     * @returns {number} Number of days
     */
    function daysBetween(startDate, endDate) {
        try {
            const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
            const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
            
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return 0;
            }
            
            const diffTime = Math.abs(end - start);
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        } catch (error) {
            log.debug('Error calculating days between dates', error);
            return 0;
        }
    }

    /**
     * Validate email address format
     * @param {string} email - Email address to validate
     * @returns {boolean} True if valid email format
     */
    function isValidEmail(email) {
        if (!email || typeof email !== 'string') {
            return false;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Sanitize HTML content to prevent XSS
     * @param {string} input - Input string to sanitize
     * @returns {string} Sanitized string
     */
    function sanitizeHTML(input) {
        if (!input || typeof input !== 'string') {
            return '';
        }
        
        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }

    /**
     * Debounce function execution
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    function debounce(func, wait) {
        let timeout;
        
        return function executedFunction() {
            const context = this;
            const args = arguments;
            
            const later = function() {
                clearTimeout(timeout);
                func.apply(context, args);
            };
            
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function execution
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @returns {Function} Throttled function
     */
    function throttle(func, limit) {
        let inThrottle;
        
        return function() {
            const args = arguments;
            const context = this;
            
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(function() {
                    inThrottle = false;
                }, limit);
            }
        };
    }

    /**
     * Deep clone an object
     * @param {Object} obj - Object to clone
     * @returns {Object} Cloned object
     */
    function deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        
        if (obj instanceof Array) {
            return obj.map(function(item) {
                return deepClone(item);
            });
        }
        
        if (typeof obj === 'object') {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
        
        return obj;
    }

    /**
     * Check if user has specific permission
     * @param {string} permission - Permission to check
     * @returns {boolean} True if user has permission
     */
    function hasPermission(permission) {
        try {
            const currentUser = runtime.getCurrentUser();
            
            // Map of common permissions to check
            const permissions = {
                'purchase_order_create': 'TRAN_PURCHORD',
                'purchase_order_edit': 'TRAN_PURCHORD',
                'purchase_order_approve': 'TRAN_PURCHORDAPPRV',
                'vendor_view': 'LIST_VENDOR',
                'vendor_edit': 'LIST_VENDOR',
                'item_view': 'LIST_ITEM',
                'item_edit': 'LIST_ITEM'
            };
            
            const permissionCode = permissions[permission];
            if (!permissionCode) {
                log.debug('Unknown permission requested', permission);
                return false;
            }
            
            // This would need to be implemented based on actual permission checking
            // For now, return true (in production, use proper permission checking)
            return true;
            
        } catch (error) {
            log.error('Error checking permission', error);
            return false;
        }
    }

    /**
     * Get user preferences for the application
     * @returns {Object} User preferences
     */
    function getUserPreferences() {
        try {
            const currentUser = runtime.getCurrentUser();
            
            // In full implementation, this would load from user preferences
            return {
                itemsPerPage: 25,
                defaultFilter: 'all',
                showVendorRatings: true,
                autoRefreshInterval: 300000, // 5 minutes
                currency: 'USD',
                dateFormat: 'MM/DD/YYYY',
                theme: 'light'
            };
        } catch (error) {
            log.error('Error getting user preferences', error);
            return getDefaultPreferences();
        }
    }

    /**
     * Get default user preferences
     * @returns {Object} Default preferences
     */
    function getDefaultPreferences() {
        return {
            itemsPerPage: 25,
            defaultFilter: 'all',
            showVendorRatings: true,
            autoRefreshInterval: 300000,
            currency: 'USD',
            dateFormat: 'MM/DD/YYYY',
            theme: 'light'
        };
    }

    /**
     * Generate unique ID for client-side operations
     * @param {string} prefix - Optional prefix
     * @returns {string} Unique ID
     */
    function generateUniqueId(prefix) {
        const timestamp = Date.now().toString(36);
        const randomNum = Math.random().toString(36).substr(2, 5);
        return (prefix || 'id') + '_' + timestamp + '_' + randomNum;
    }

    /**
     * Validate NetSuite internal ID format
     * @param {string} id - ID to validate
     * @returns {boolean} True if valid ID format
     */
    function isValidInternalId(id) {
        if (!id || typeof id !== 'string') {
            return false;
        }
        
        // NetSuite internal IDs are typically numeric
        return /^\d+$/.test(id);
    }

    /**
     * Parse search results into standardized format
     * @param {Array} searchResults - NetSuite search results
     * @param {Array} columnMappings - Column mappings configuration
     * @returns {Array} Parsed results
     */
    function parseSearchResults(searchResults, columnMappings) {
        if (!searchResults || !Array.isArray(searchResults)) {
            return [];
        }
        
        return searchResults.map(function(result) {
            const parsedResult = {
                id: result.id
            };
            
            if (columnMappings && Array.isArray(columnMappings)) {
                columnMappings.forEach(function(mapping) {
                    try {
                        if (mapping.join) {
                            parsedResult[mapping.key] = result.getValue({
                                name: mapping.column,
                                join: mapping.join
                            });
                        } else {
                            parsedResult[mapping.key] = result.getValue(mapping.column);
                        }
                        
                        // Apply transformation if specified
                        if (mapping.transform && typeof mapping.transform === 'function') {
                            parsedResult[mapping.key] = mapping.transform(parsedResult[mapping.key]);
                        }
                    } catch (error) {
                        log.debug('Error parsing column ' + mapping.column, error);
                        parsedResult[mapping.key] = null;
                    }
                });
            }
            
            return parsedResult;
        });
    }

    /**
     * Build error response object
     * @param {string} message - Error message
     * @param {string} code - Error code (optional)
     * @param {Object} details - Additional error details (optional)
     * @returns {Object} Error response
     */
    function buildErrorResponse(message, code, details) {
        return {
            success: false,
            error: {
                message: message || 'An unknown error occurred',
                code: code || 'UNKNOWN_ERROR',
                details: details || {},
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Build success response object
     * @param {*} data - Response data
     * @param {string} message - Success message (optional)
     * @returns {Object} Success response
     */
    function buildSuccessResponse(data, message) {
        return {
            success: true,
            data: data,
            message: message || null,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Log performance metrics
     * @param {string} operation - Operation name
     * @param {number} startTime - Start timestamp
     * @param {Object} metadata - Additional metadata
     */
    function logPerformance(operation, startTime, metadata) {
        try {
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            const logData = {
                operation: operation,
                duration: duration + 'ms',
                timestamp: new Date().toISOString()
            };
            
            if (metadata) {
                Object.assign(logData, metadata);
            }
            
            // Log as audit for important operations, debug for others
            if (duration > 2000) {
                log.audit('Performance Warning', logData);
            } else {
                log.debug('Performance Log', logData);
            }
        } catch (error) {
            log.error('Error logging performance', error);
        }
    }

    /**
     * Retry operation with exponential backoff
     * @param {Function} operation - Function to retry
     * @param {number} maxRetries - Maximum number of retries
     * @param {number} baseDelay - Base delay in milliseconds
     * @returns {Promise} Promise that resolves with operation result
     */
    function retryOperation(operation, maxRetries, baseDelay) {
        maxRetries = maxRetries || 3;
        baseDelay = baseDelay || 1000;
        
        return new Promise(function(resolve, reject) {
            let attempts = 0;
            
            function attempt() {
                attempts++;
                
                try {
                    const result = operation();
                    resolve(result);
                } catch (error) {
                    if (attempts >= maxRetries) {
                        reject(error);
                        return;
                    }
                    
                    const delay = baseDelay * Math.pow(2, attempts - 1);
                    log.debug('Retry attempt ' + attempts + ' after ' + delay + 'ms', error);
                    
                    setTimeout(attempt, delay);
                }
            }
            
            attempt();
        });
    }

    return {
        formatCurrency: formatCurrency,
        formatNumber: formatNumber,
        formatDate: formatDate,
        daysBetween: daysBetween,
        isValidEmail: isValidEmail,
        sanitizeHTML: sanitizeHTML,
        debounce: debounce,
        throttle: throttle,
        deepClone: deepClone,
        hasPermission: hasPermission,
        getUserPreferences: getUserPreferences,
        getDefaultPreferences: getDefaultPreferences,
        generateUniqueId: generateUniqueId,
        isValidInternalId: isValidInternalId,
        parseSearchResults: parseSearchResults,
        buildErrorResponse: buildErrorResponse,
        buildSuccessResponse: buildSuccessResponse,
        logPerformance: logPerformance,
        retryOperation: retryOperation
    };
});