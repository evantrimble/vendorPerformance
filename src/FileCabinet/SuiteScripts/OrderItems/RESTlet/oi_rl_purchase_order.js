/**
 * NetSuite RESTlet for Purchase Order Creation
 * Handles creating purchase orders from selected items
 *
 * @NApiVersion 2.1
 * @NScriptType RESTlet
 * @NModuleScope Public
 *
 * Version History:
 * v2.1 (2025-11-24) - CRITICAL FIX: Convert string IDs to integers for NetSuite dynamic records
 *                   - Added parseInt() for vendor, location, item, quantity, currency, terms
 *                   - Fixes "Invalid Field Value" and "Please enter value(s) for: Location" errors
 *                   - NetSuite's isDynamic: true requires integer IDs, not strings
 * v2.0 (2025-10-21) - Enhanced error handling with detailed item/vendor info
 *                   - Added support for edited prices (rate parameter)
 *                   - Added support for location parameter
 *                   - Improved validation messages with item names
 *                   - Better logging for debugging vendor issues
 *                   - Added helper functions for error messages
 * v1.0 (2025-10-20) - Initial release
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Upload this file to FileCabinet: SuiteScripts/OrderItems/RESTlet/
 * 2. Create Script Record: customscript_oi_purchase_order_restlet
 * 3. Create Deployment: customdeploy_oi_purchase_order_restlet
 * 4. Set Status: Testing or Released
 * 5. Verify all 4 HTTP methods are enabled (GET, POST, PUT, DELETE)
 */

define(['N/record', 'N/search', 'N/log', 'N/runtime', 'N/format'],
function(record, search, log, runtime, format) {

    const SCRIPT_VERSION = '2.1';

    /**
     * Handle POST requests for PO creation
     * @param {Object} requestBody
     * @returns {Object} Response with created PO information
     */
    function doPost(requestBody) {
        try {
            log.audit('PO RESTlet POST', 'Version: ' + SCRIPT_VERSION + ', Items: ' + 
                     (requestBody && requestBody.items ? requestBody.items.length : 0));
            
            // Validate request body
            const validationResult = validateCreateRequest(requestBody);
            if (!validationResult.isValid) {
                log.error('Validation Failed', validationResult.error);
                return {
                    success: false,
                    error: validationResult.error
                };
            }

            // Process items and group by vendor if requested
            const itemGroups = groupItemsByVendor(requestBody.items, requestBody.groupByVendor);
            
            log.debug('Item Groups', 'Created ' + Object.keys(itemGroups).length + ' vendor group(s)');
            
            // Create purchase orders
            const createdPOs = [];
            const errors = [];
            
            for (let vendorId in itemGroups) {
                try {
                    const poResult = createPurchaseOrder(vendorId, itemGroups[vendorId], requestBody);
                    createdPOs.push(poResult);
                    log.audit('PO Created', 'Vendor: ' + vendorId + ', PO#: ' + poResult.number);
                } catch (error) {
                    log.error('Error creating PO for vendor ' + vendorId, error);
                    errors.push({
                        vendorId: vendorId,
                        vendorName: getVendorName(vendorId),
                        error: error.message,
                        stack: error.stack,
                        itemCount: itemGroups[vendorId].length
                    });
                }
            }

            // Build response
            const response = {
                success: createdPOs.length > 0,
                data: {
                    purchaseOrders: createdPOs,
                    errors: errors
                }
            };

            if (createdPOs.length === 0) {
                const errorDetail = errors.length > 0 ? 
                    ' Check logs for details. First error: ' + errors[0].error : '';
                response.error = 'No purchase orders were created successfully.' + errorDetail;
            }

            log.audit('PO Creation Complete', 'Created: ' + createdPOs.length + ' POs, Errors: ' + errors.length);
            return response;
            
        } catch (error) {
            log.error('PO RESTlet Error', error);
            return {
                success: false,
                error: error.message || 'An error occurred while creating purchase orders'
            };
        }
    }

    /**
     * Validate the create PO request
     * @param {Object} requestBody
     * @returns {Object} Validation result
     */
    function validateCreateRequest(requestBody) {
        if (!requestBody) {
            return { isValid: false, error: 'Request body is required' };
        }

        if (!requestBody.items || !Array.isArray(requestBody.items) || requestBody.items.length === 0) {
            return { isValid: false, error: 'Items array is required and must not be empty' };
        }

        // Validate each item with detailed error messages
        for (let i = 0; i < requestBody.items.length; i++) {
            const item = requestBody.items[i];
            
            if (!item.itemId) {
                return { 
                    isValid: false, 
                    error: 'Item ID is required for item at index ' + i 
                };
            }
            
            if (!item.quantity || item.quantity <= 0) {
                const itemInfo = getItemName(item.itemId);
                return { 
                    isValid: false, 
                    error: 'Valid quantity is required for item at index ' + i + ' (' + itemInfo + ')' 
                };
            }
            
            if (!item.vendorId) {
                const itemInfo = getItemName(item.itemId);
                return {
                    isValid: false,
                    error: 'Vendor ID is required for item at index ' + i + ' (' + itemInfo + '). ' +
                           'Please ensure a vendor is selected for this item.'
                };
            }

            if (!item.subsidiary) {
                const itemInfo = getItemName(item.itemId);
                return {
                    isValid: false,
                    error: 'Subsidiary is required for item at index ' + i + ' (' + itemInfo + '). ' +
                           'Subsidiary must be provided to ensure correct PO creation.'
                };
            }

            // Log the validated item
            log.debug('Validated Item ' + i, 'ItemId: ' + item.itemId +
                     ', VendorId: ' + item.vendorId + ', Qty: ' + item.quantity +
                     (item.rate ? ', Rate: $' + item.rate : '') +
                     (item.location ? ', Location: ' + item.location : '') +
                     (item.subsidiary ? ', Subsidiary: ' + item.subsidiary : ''));
        }

        return { isValid: true };
    }

    /**
     * Group items by vendor for PO creation
     * @param {Array} items
     * @param {boolean} groupByVendor
     * @returns {Object} Items grouped by vendor ID
     */
    function groupItemsByVendor(items, groupByVendor) {
        const groups = {};
        
        if (groupByVendor === false) {
            // Create separate PO for each item
            items.forEach(function(item, index) {
                const key = item.vendorId + '_' + index;
                groups[key] = [item];
            });
        } else {
            // Group by vendor (default behavior)
            items.forEach(function(item) {
                if (!groups[item.vendorId]) {
                    groups[item.vendorId] = [];
                }
                groups[item.vendorId].push(item);
            });
        }
        
        return groups;
    }

    /**
     * Create a purchase order for a vendor
     * @param {string} vendorId
     * @param {Array} items - Array with: itemId, quantity, rate (optional), location (optional)
     * @param {Object} requestData - May contain: location, notes
     * @returns {Object} Created PO information
     */
    function createPurchaseOrder(vendorId, items, requestData) {
        log.audit('Creating PO', 'Vendor: ' + vendorId + ', Items: ' + items.length);
        
        // Get vendor information
        const vendorInfo = getVendorInfo(vendorId);
        log.debug('Vendor Info', JSON.stringify(vendorInfo));

        // Get subsidiary from item data (MUST be set at record creation time)
        let subsidiary = null;
        if (items[0] && items[0].subsidiary) {
            subsidiary = parseInt(items[0].subsidiary, 10);
            log.debug('Using subsidiary from item data', 'Subsidiary ID: ' + subsidiary);
        } else {
            log.error('Missing subsidiary', 'Item data does not include subsidiary. PO creation will fail.');
        }

        // Get location from item data
        let location = null;
        if (requestData && requestData.location) {
            location = parseInt(requestData.location, 10);
            log.debug('Using location from request', 'Location ID: ' + location);
        } else if (items[0] && items[0].location) {
            location = parseInt(items[0].location, 10);
            log.debug('Using location from first item', 'Location ID: ' + location);
        } else {
            location = getDefaultLocation();
            if (location) {
                location = parseInt(location, 10);
                log.debug('Using default location', 'Location ID: ' + location);
            }
        }

        // Create the purchase order record with subsidiary and vendor set at creation time
        // CRITICAL: In OneWorld, subsidiary MUST be set via defaultValues
        // Setting vendor in defaultValues may help with location validation
        const purchaseOrder = record.create({
            type: record.Type.PURCHASE_ORDER,
            isDynamic: true,
            defaultValues: {
                subsidiary: subsidiary,
                entity: parseInt(vendorId, 10)
            }
        });

        log.debug('PO Record Created', 'Subsidiary: ' + subsidiary + ', Vendor: ' + vendorId + ' (set via defaultValues)');

        // Set transaction date
        purchaseOrder.setValue('trandate', new Date());

        // 3. Set terms and currency (subsidiary-dependent)
        if (vendorInfo.terms) {
            try {
                purchaseOrder.setValue('terms', parseInt(vendorInfo.terms, 10));
                log.debug('Set Terms', vendorInfo.terms);
            } catch (e) {
                log.debug('Could not set terms', e.message);
            }
        }

        if (vendorInfo.currency) {
            try {
                purchaseOrder.setValue('currency', parseInt(vendorInfo.currency, 10));
                log.debug('Set Currency', vendorInfo.currency);
            } catch (e) {
                log.debug('Could not set currency', e.message);
            }
        }

        // Set location AFTER subsidiary and vendor are established
        if (location) {
            try {
                purchaseOrder.setValue('location', location);
                log.debug('Set header location successfully', 'Location: ' + location + ', Subsidiary: ' + subsidiary + ', Vendor: ' + vendorId);
            } catch (e) {
                log.error('Failed to set header location', 'Location: ' + location + ', Subsidiary: ' + subsidiary + ', Vendor: ' + vendorId + ', Error: ' + e.message);
                throw e; // Re-throw since location is required
            }
        } else {
            log.error('No location available', 'Cannot create PO without location');
            throw new Error('Location is required for PO creation');
        }

        // Add memo/notes
        const memo = (requestData && requestData.notes) ? requestData.notes : 
                     'Created from Order Items UI - ' + format.format({
                         value: new Date(),
                         type: format.Type.DATETIME
                     });
        purchaseOrder.setValue('memo', memo);

        // Add line items
        let totalAmount = 0;
        
        items.forEach(function(item, lineNum) {
            // Get item details for description
            const itemDetails = getItemDetails(item.itemId);
            
            log.debug('Adding Line ' + lineNum, 'Item: ' + itemDetails.itemNumber + ' (' + item.itemId + ')');
            
            // Determine the rate to use
            // Priority: 1. User-edited rate from request, 2. Item cost from record
            let rate = 0;
            if (item.rate !== undefined && item.rate !== null && item.rate > 0) {
                rate = parseFloat(item.rate);
                log.debug('Using edited rate', 'Line: ' + lineNum + ', Item: ' + itemDetails.itemNumber + 
                         ', Edited Rate: $' + rate);
            } else if (itemDetails.cost > 0) {
                rate = itemDetails.cost;
                log.debug('Using item cost', 'Line: ' + lineNum + ', Item: ' + itemDetails.itemNumber + 
                         ', Cost: $' + rate);
            } else {
                log.debug('No rate available', 'Line: ' + lineNum + ', Item: ' + itemDetails.itemNumber);
            }
            
            // Add line
            purchaseOrder.selectNewLine('item');
            purchaseOrder.setCurrentSublistValue('item', 'item', parseInt(item.itemId, 10));
            purchaseOrder.setCurrentSublistValue('item', 'quantity', parseInt(item.quantity, 10));
            
            // Set rate if we have one
            if (rate > 0) {
                purchaseOrder.setCurrentSublistValue('item', 'rate', rate);
            }

            // Set inventory location on line if provided (for inventory items)
            if (item.location) {
                try {
                    purchaseOrder.setCurrentSublistValue('item', 'inventorylocation', parseInt(item.location, 10));
                    log.debug('Set line inventory location', 'Line: ' + lineNum + ', Inventory Location: ' + item.location);
                } catch (e) {
                    log.debug('Could not set line inventory location', 'Item: ' + item.itemId + ', Error: ' + e.message);
                }
            }

            // Set description if available
            if (itemDetails.description) {
                purchaseOrder.setCurrentSublistValue('item', 'description', itemDetails.description);
            }
            
            // Commit the line
            purchaseOrder.commitLine('item');
            
            totalAmount += (item.quantity * rate);
            
            log.debug('Line Added Successfully', 'Line: ' + lineNum + ', Item: ' + itemDetails.itemNumber + 
                     ', Qty: ' + item.quantity + ', Rate: $' + rate + ', Total: $' + (item.quantity * rate).toFixed(2));
        });

        // Save the purchase order
        log.debug('Saving PO', 'Total Amount: $' + totalAmount.toFixed(2));
        const poId = purchaseOrder.save();
        
        // Get the generated PO number
        const poRecord = record.load({
            type: record.Type.PURCHASE_ORDER,
            id: poId
        });
        
        const poNumber = poRecord.getValue('tranid');
        
        log.audit('PO Created Successfully', 'ID: ' + poId + ', Number: ' + poNumber + 
                 ', Vendor: ' + vendorInfo.name + ', Total: $' + totalAmount.toFixed(2));
        
        return {
            id: poId,
            number: poNumber,
            vendor: vendorInfo.name,
            vendorId: vendorId,
            total: totalAmount,
            itemCount: items.length,
            status: 'Pending Approval'
        };
    }

    /**
     * Get vendor information
     * @param {string} vendorId
     * @returns {Object} Vendor details
     */
    function getVendorInfo(vendorId) {
        try {
            const vendorFields = search.lookupFields({
                type: search.Type.VENDOR,
                id: vendorId,
                columns: ['companyname', 'terms', 'currency']
            });

            return {
                id: vendorId,
                name: vendorFields.companyname || 'Unknown Vendor',
                terms: vendorFields.terms ? vendorFields.terms[0].value : null,
                currency: vendorFields.currency ? vendorFields.currency[0].value : null
            };
        } catch (error) {
            log.error('Error getting vendor info for ' + vendorId, error);
            return {
                id: vendorId,
                name: 'Unknown Vendor',
                terms: null,
                currency: null
            };
        }
    }

    /**
     * Get vendor name only (lightweight version for error messages)
     * @param {string} vendorId
     * @returns {string} Vendor name
     */
    function getVendorName(vendorId) {
        try {
            const vendorFields = search.lookupFields({
                type: search.Type.VENDOR,
                id: vendorId,
                columns: ['companyname']
            });
            return vendorFields.companyname || 'Unknown Vendor';
        } catch (error) {
            return 'Unknown Vendor (ID: ' + vendorId + ')';
        }
    }

    /**
     * Get item name only (lightweight version for error messages)
     * @param {string} itemId
     * @returns {string} Item name/number
     */
    function getItemName(itemId) {
        try {
            const itemFields = search.lookupFields({
                type: search.Type.ITEM,
                id: itemId,
                columns: ['itemid', 'displayname']
            });
            return itemFields.itemid || itemFields.displayname || 'Unknown Item';
        } catch (error) {
            return 'Unknown Item (ID: ' + itemId + ')';
        }
    }

    /**
     * Get item details
     * @param {string} itemId
     * @returns {Object} Item details
     */
    function getItemDetails(itemId) {
        try {
            const itemFields = search.lookupFields({
                type: search.Type.ITEM,
                id: itemId,
                columns: ['itemid', 'displayname', 'cost', 'description', 'unitstype']
            });

            return {
                id: itemId,
                itemNumber: itemFields.itemid || '',
                name: itemFields.displayname || '',
                description: itemFields.description || '',
                cost: parseFloat(itemFields.cost || 0),
                unitsType: itemFields.unitstype ? itemFields.unitstype[0].value : null
            };
        } catch (error) {
            log.error('Error getting item details for ' + itemId, error);
            return {
                id: itemId,
                itemNumber: 'Unknown',
                name: 'Unknown Item',
                description: '',
                cost: 0,
                unitsType: null
            };
        }
    }

    /**
     * Get default location for POs
     * Priority: 1. User's default location, 2. First active location
     * @returns {string|null} Location ID
     */
    function getDefaultLocation() {
        try {
            // Try to get the user's default location
            const currentUser = runtime.getCurrentUser();
            const userLocation = currentUser.location;
            
            if (userLocation) {
                log.debug('Found user location', userLocation);
                return userLocation;
            }

            // If no user location, find the first active location
            const locationSearch = search.create({
                type: search.Type.LOCATION,
                filters: [
                    ['isinactive', 'is', 'F']
                ],
                columns: ['internalid', 'name']
            });

            const locationResults = locationSearch.run().getRange({
                start: 0,
                end: 1
            });

            if (locationResults.length > 0) {
                const locationId = locationResults[0].id;
                const locationName = locationResults[0].getValue('name');
                log.debug('Found first active location', 'ID: ' + locationId + ', Name: ' + locationName);
                return locationId;
            }

            log.debug('No location found', 'Will proceed without location');
            return null;
        } catch (error) {
            log.error('Error getting default location', error);
            return null;
        }
    }

    /**
     * Handle GET requests for PO status/info
     * @param {Object} requestParams
     * @returns {Object} Response with PO information
     */
    function doGet(requestParams) {
        try {
            const poId = requestParams.poId;
            
            if (!poId) {
                return {
                    success: false,
                    error: 'Purchase Order ID is required'
                };
            }

            // Load PO record
            const poRecord = record.load({
                type: record.Type.PURCHASE_ORDER,
                id: poId
            });

            // Get basic PO information
            const poInfo = {
                id: poId,
                number: poRecord.getValue('tranid'),
                vendor: poRecord.getText('entity'),
                vendorId: poRecord.getValue('entity'),
                total: poRecord.getValue('total'),
                status: poRecord.getText('status'),
                trandate: poRecord.getValue('trandate'),
                duedate: poRecord.getValue('duedate'),
                memo: poRecord.getValue('memo'),
                itemCount: poRecord.getLineCount('item')
            };

            return {
                success: true,
                data: {
                    purchaseOrder: poInfo
                }
            };

        } catch (error) {
            log.error('Error retrieving PO information', error);
            return {
                success: false,
                error: error.message || 'Error retrieving purchase order information'
            };
        }
    }

    /**
     * Handle PUT requests for PO updates
     * @param {Object} requestBody
     * @returns {Object} Response
     */
    function doPut(requestBody) {
        try {
            const poId = requestBody.poId;
            const updates = requestBody.updates;
            
            if (!poId) {
                return {
                    success: false,
                    error: 'Purchase Order ID is required'
                };
            }

            if (!updates) {
                return {
                    success: false,
                    error: 'Updates object is required'
                };
            }

            // Load and update the PO
            const poRecord = record.load({
                type: record.Type.PURCHASE_ORDER,
                id: poId
            });

            // Apply updates
            if (updates.memo !== undefined) {
                poRecord.setValue('memo', updates.memo);
            }
            
            if (updates.duedate !== undefined) {
                poRecord.setValue('duedate', new Date(updates.duedate));
            }

            // Save the record
            const updatedPoId = poRecord.save();

            return {
                success: true,
                data: {
                    updatedPoId: updatedPoId,
                    message: 'Purchase order updated successfully'
                }
            };

        } catch (error) {
            log.error('Error updating PO', error);
            return {
                success: false,
                error: error.message || 'Error updating purchase order'
            };
        }
    }

    /**
     * Handle DELETE requests (cancel PO)
     * @param {Object} requestParams
     * @returns {Object} Response
     */
    function doDelete(requestParams) {
        try {
            const poId = requestParams.poId;
            
            if (!poId) {
                return {
                    success: false,
                    error: 'Purchase Order ID is required'
                };
            }

            // Load the PO and check if it can be cancelled
            const poRecord = record.load({
                type: record.Type.PURCHASE_ORDER,
                id: poId
            });

            const currentStatus = poRecord.getValue('status');
            
            // Check if PO can be cancelled (not received, billed, etc.)
            if (currentStatus === 'fullyReceived' || currentStatus === 'fullyBilled') {
                return {
                    success: false,
                    error: 'Cannot cancel a purchase order that has been received or billed'
                };
            }

            // Cancel the PO by setting status to cancelled
            poRecord.setValue('status', 'cancelled');
            const cancelledPoId = poRecord.save();

            return {
                success: true,
                data: {
                    cancelledPoId: cancelledPoId,
                    message: 'Purchase order cancelled successfully'
                }
            };

        } catch (error) {
            log.error('Error cancelling PO', error);
            return {
                success: false,
                error: error.message || 'Error cancelling purchase order'
            };
        }
    }

    return {
        get: doGet,
        post: doPost,
        put: doPut,
        delete: doDelete
    };
});