/**
 * NetSuite RESTlet for Item Vendor List
 * Returns all vendors from item's vendor sublist (lazy load on demand)
 * 
 * @NApiVersion 2.1
 * @NScriptType RESTlet
 * @NModuleScope Public
 */

define(['N/record', 'N/log', 'N/error'], 
function(record, log, error) {

    /**
     * Handle GET requests for vendor list
     * @param {Object} requestParams - Should contain itemId
     * @returns {Object} Response with vendor list
     */
    function get(requestParams) {
        try {
            const itemId = requestParams.itemId;
            
            if (!itemId) {
                throw error.create({
                    name: 'MISSING_PARAMETER',
                    message: 'itemId parameter is required'
                });
            }
            
            log.debug('Vendor List Request', 'Loading vendors for item: ' + itemId);
            
            // Get all vendors from item's vendor sublist
            const vendors = getItemVendors(itemId);
            
            return {
                success: true,
                data: {
                    itemId: itemId,
                    vendors: vendors,
                    vendorCount: vendors.length
                }
            };
            
        } catch (e) {
            log.error('Error in Vendor List RESTlet', {
                message: e.message,
                stack: e.stack,
                itemId: requestParams.itemId
            });
            
            return {
                success: false,
                error: e.message || 'Failed to load vendor list'
            };
        }
    }
    
    /**
     * Get all vendors from item's vendor sublist
     * @param {string} itemId - Internal ID of the item
     * @returns {Array} Array of vendor objects
     */
    function getItemVendors(itemId) {
        try {
            // First, determine the item type
            const itemType = getItemType(itemId);
            
            log.debug('Loading item record', {
                itemId: itemId,
                itemType: itemType
            });
            
            // Load the item record
            const itemRec = record.load({
                type: itemType,
                id: itemId,
                isDynamic: false
            });
            
            // Get vendor sublist line count
            const vendorCount = itemRec.getLineCount({
                sublistId: 'itemvendor'
            });
            
            log.debug('Vendor sublist info', {
                itemId: itemId,
                vendorCount: vendorCount
            });
            
            if (vendorCount === 0) {
                log.debug('No vendors found', 'Item has no vendors in sublist');
                return [];
            }
            
            // Read all vendors from sublist
            const vendors = [];
            
            for (var i = 0; i < vendorCount; i++) {
                const vendorId = itemRec.getSublistValue({
                    sublistId: 'itemvendor',
                    fieldId: 'vendor',
                    line: i
                });
                
                const vendorName = itemRec.getSublistText({
                    sublistId: 'itemvendor',
                    fieldId: 'vendor',
                    line: i
                });
                
                const purchasePrice = parseFloat(itemRec.getSublistValue({
                    sublistId: 'itemvendor',
                    fieldId: 'purchaseprice',
                    line: i
                }) || 0);
                
                const isPreferred = itemRec.getSublistValue({
                    sublistId: 'itemvendor',
                    fieldId: 'preferred',
                    line: i
                });
                
                // Schedule can be used to determine lead time
                const scheduleId = itemRec.getSublistValue({
                    sublistId: 'itemvendor',
                    fieldId: 'schedule',
                    line: i
                });
                
                const scheduleName = itemRec.getSublistText({
                    sublistId: 'itemvendor',
                    fieldId: 'schedule',
                    line: i
                });
                
                // Get subsidiary if using OneWorld
                const subsidiaryId = itemRec.getSublistValue({
                    sublistId: 'itemvendor',
                    fieldId: 'subsidiary',
                    line: i
                });
                
                // Calculate lead time from schedule or use default
                const leadTime = calculateLeadTimeFromSchedule(scheduleId) || 14;
                
                vendors.push({
                    id: vendorId,
                    name: vendorName || 'Unknown Vendor',
                    price: purchasePrice,
                    isPreferred: isPreferred === true || isPreferred === 'T',
                    leadTime: leadTime,
                    schedule: {
                        id: scheduleId,
                        name: scheduleName
                    },
                    subsidiary: subsidiaryId,
                    // Placeholders for performance data (TODO: get from custom records)
                    rating: 4.2,
                    riskLevel: 'low'
                });
            }
            
            log.debug('Vendors loaded successfully', {
                itemId: itemId,
                vendorCount: vendors.length,
                vendors: vendors.map(v => v.name).join(', ')
            });
            
            // Sort: preferred vendors first, then by price
            vendors.sort(function(a, b) {
                if (a.isPreferred && !b.isPreferred) return -1;
                if (!a.isPreferred && b.isPreferred) return 1;
                return a.price - b.price;
            });
            
            return vendors;
            
        } catch (e) {
            log.error('Error loading vendor sublist', {
                message: e.message,
                itemId: itemId,
                stack: e.stack
            });
            
            // Return empty array rather than crashing
            return [];
        }
    }
    
    /**
     * Determine item type from internal ID
     * @param {string} itemId
     * @returns {string} NetSuite record type constant
     */
    function getItemType(itemId) {
        try {
            // Use lookupFields to check item type without loading full record
            const itemLookup = record.lookupFields({
                type: record.Type.ITEM,
                id: itemId,
                columns: ['type']
            });
            
            const typeValue = itemLookup.type[0].value;
            
            log.debug('Item type lookup', {
                itemId: itemId,
                typeValue: typeValue
            });
            
            // Map type values to record types
            const typeMap = {
                'InvtPart': record.Type.INVENTORY_ITEM,
                'Assembly': record.Type.ASSEMBLY_ITEM,
                'NonInvtPart': record.Type.NON_INVENTORY_ITEM,
                'Service': record.Type.SERVICE_ITEM,
                'Kit': record.Type.KIT_ITEM
            };
            
            return typeMap[typeValue] || record.Type.INVENTORY_ITEM;
            
        } catch (e) {
            log.debug('Item type lookup failed, defaulting to INVENTORY_ITEM', e.message);
            // Default to inventory item if lookup fails
            return record.Type.INVENTORY_ITEM;
        }
    }
    
    /**
     * Calculate lead time from schedule
     * TODO: Implement actual schedule parsing if needed
     * @param {string} scheduleId
     * @returns {number|null} Lead time in days
     */
    function calculateLeadTimeFromSchedule(scheduleId) {
        // For now, return null to use default
        // In future, could load schedule record and calculate lead time
        return null;
    }

    /**
     * POST not supported
     */
    function post(requestBody) {
        return {
            success: false,
            error: 'POST method not supported'
        };
    }

    /**
     * PUT not supported
     */
    function put(requestBody) {
        return {
            success: false,
            error: 'PUT method not supported'
        };
    }

    /**
     * DELETE not supported
     */
    function doDelete(requestBody) {
        return {
            success: false,
            error: 'DELETE method not supported'
        };
    }

    return {
        get: get,
        post: post,
        put: put,
        delete: doDelete
    };
});