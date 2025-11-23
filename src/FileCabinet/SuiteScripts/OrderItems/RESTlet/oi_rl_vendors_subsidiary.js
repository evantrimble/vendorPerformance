/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 * 
 * Restlet: Subsidiary-Specific Vendor Lookup
 * Purpose: Get all available vendors for items based on their location/subsidiary
 * 
 * Endpoint: /app/site/hosting/restlet.nl?script=customscript_oi_rl_vendors_sub&deploy=1
 * Method: POST
 * 
 * Request Body:
 * {
 *   "items": [
 *     {"itemId": 123, "locationId": 5},
 *     {"itemId": 456, "locationId": 8}
 *   ]
 * }
 * 
 * Response:
 * {
 *   "123": [
 *     {
 *       "id": "789",
 *       "name": "Custom Products",
 *       "price": 100.00,
 *       "isPreferred": true,
 *       "currency": "USD",
 *       "currencySymbol": "$"
 *     }
 *   ],
 *   "456": [...]
 * }
 */

define(['N/query', 'N/log'], function(query, log) {
    
    /**
     * Main POST handler - orchestrates the vendor lookup process
     */
    function post(requestBody) {
        try {
            log.debug('Vendor Lookup Request', 'Processing vendor lookup for items');
            
            // Parse request
            const items = requestBody.items;
            if (!items || !Array.isArray(items) || items.length === 0) {
                return {
                    success: false,
                    error: 'Invalid request: items array required'
                };
            }
            
            log.debug('Items Received', `Processing ${items.length} items`);
            
            // Step 1: Get location → subsidiary mapping
            const locationSubMap = getLocationSubsidiaryMap();
            log.debug('Location Map', `Loaded ${Object.keys(locationSubMap).length} locations`);
            
            // Step 2: Group items by subsidiary
            const itemsBySubsidiary = groupItemsBySubsidiary(items, locationSubMap);
            log.debug('Items by Subsidiary', itemsBySubsidiary);
            
            // Step 3: Get all vendors for each subsidiary (batched)
            const allVendorData = getVendorsForSubsidiaries(itemsBySubsidiary);
            log.debug('Vendor Data Retrieved', `Retrieved vendors for ${Object.keys(allVendorData).length} items`);

            return {
                success: true,
                vendors: allVendorData,
                locationSubsidiaryMap: locationSubMap  // Include this so client knows which subsidiary each location belongs to
            };
            
        } catch (e) {
            log.error('Vendor Lookup Error', e.toString());
            return {
                success: false,
                error: e.toString()
            };
        }
    }
    
    /**
     * Get mapping of all location IDs to their subsidiary IDs
     * Returns: { "locationId": "subsidiaryId", ... }
     */
    function getLocationSubsidiaryMap() {
        const locationMap = {};
        
        try {
            const suiteQLQuery = `
                SELECT 
                    location.id as LocationId,
                    location.name as LocationName,
                    location.subsidiary as SubsidiaryId
                FROM location
                WHERE location.isinactive = 'F'
            `;
            
            const resultSet = query.runSuiteQL({
                query: suiteQLQuery
            });
            
            const results = resultSet.asMappedResults();
            
            results.forEach(function(result) {
                const locId = result.locationid;
                const subId = result.subsidiaryid;
                locationMap[locId] = subId;
                log.debug('Location Mapped', `${result.locationname} (${locId}) → Subsidiary ${subId}`);
            });
            
            log.debug('Location Mapping Complete', `Mapped ${results.length} locations to subsidiaries`);
            log.debug('Location Map', JSON.stringify(locationMap));
            
        } catch (e) {
            log.error('Location Mapping Error', e.toString());
            log.error('Error Stack', e.stack || 'No stack trace');
            throw new Error('Failed to load location-subsidiary mapping: ' + e.toString());
        }
        
        return locationMap;
    }
    
    /**
     * Group items by their subsidiary
     * Returns: { "subsidiaryId": [itemId1, itemId2, ...], ... }
     */
    function groupItemsBySubsidiary(items, locationSubMap) {
        const itemsBySubsidiary = {};
        
        items.forEach(function(item) {
            const subsidiaryId = locationSubMap[item.locationId];
            
            if (!subsidiaryId) {
                log.audit('Missing Subsidiary', `Item ${item.itemId}: Location ${item.locationId} not found in subsidiary map`);
                return; // Skip this item
            }
            
            if (!itemsBySubsidiary[subsidiaryId]) {
                itemsBySubsidiary[subsidiaryId] = [];
            }
            
            // Only add if not already in list
            if (itemsBySubsidiary[subsidiaryId].indexOf(item.itemId) === -1) {
                itemsBySubsidiary[subsidiaryId].push(item.itemId);
                log.debug('Item Grouped', `Item ${item.itemId} → Location ${item.locationId} → Subsidiary ${subsidiaryId}`);
            }
        });
        
        // Log summary
        Object.keys(itemsBySubsidiary).forEach(function(subId) {
            log.audit('Subsidiary Group', `Subsidiary ${subId}: ${itemsBySubsidiary[subId].length} items - [${itemsBySubsidiary[subId].join(', ')}]`);
        });
        
        return itemsBySubsidiary;
    }
    
    /**
     * Get all vendors for items grouped by subsidiary (batched query per subsidiary)
     * Returns: { "itemId": [vendor1, vendor2, ...], ... }
     */
    function getVendorsForSubsidiaries(itemsBySubsidiary) {
        const allVendorData = {};
        
        // Process each subsidiary separately
        Object.keys(itemsBySubsidiary).forEach(function(subsidiaryId) {
            const itemIds = itemsBySubsidiary[subsidiaryId];
            
            log.debug('Processing Subsidiary', `Subsidiary ${subsidiaryId}: ${itemIds.length} items`);
            
            try {
                const vendors = getVendorsForSubsidiary(itemIds, subsidiaryId);
                
                // Merge results into allVendorData
                Object.keys(vendors).forEach(function(itemId) {
                    allVendorData[itemId] = vendors[itemId];
                });
                
            } catch (e) {
                log.error('Subsidiary Vendor Query Error', `Subsidiary ${subsidiaryId}: ${e.toString()}`);
                // Continue with other subsidiaries even if one fails
            }
        });
        
        return allVendorData;
    }
    
    /**
     * Get all vendors for a list of items in a specific subsidiary
     * Returns: { "itemId": [vendor1, vendor2, ...], ... }
     */
    function getVendorsForSubsidiary(itemIds, subsidiaryId) {
        const vendorsByItem = {};
        
        if (itemIds.length === 0) {
            return vendorsByItem;
        }
        
        try {
            // Build the IN clause for item IDs
            const itemIdList = itemIds.join(',');
            
            // Note: ItemVendor table field names are case-sensitive in SuiteQL
            // Using BUILTIN.DF() to get display values for debugging
            const suiteQLQuery = `
                SELECT 
                    ItemVendor.item as ItemId,
                    ItemVendor.vendor as VendorId,
                    Vendor.companyname as VendorName,
                    ItemVendor.purchaseprice as VendorPrice,
                    ItemVendor.preferredvendor as IsPreferred,
                    ItemVendor.subsidiary as SubsidiaryId,
                    Currency.symbol as CurrencySymbol,
                    Currency.name as CurrencyName,
                    Vendor.currency as VendorCurrency
                FROM ItemVendor
                INNER JOIN Vendor ON Vendor.id = ItemVendor.vendor
                LEFT JOIN Currency ON Currency.id = Vendor.currency
                WHERE ItemVendor.item IN (${itemIdList})
                  AND ItemVendor.subsidiary = ${subsidiaryId}
                  AND Vendor.isinactive = 'F'
                ORDER BY ItemVendor.item, ItemVendor.preferredvendor DESC, Vendor.companyname
            `;
            
            log.debug('=== DETAILED QUERY DEBUG ===', 'About to execute query');

            // Break query into chunks to avoid truncation
            var queryParts = suiteQLQuery.split('WHERE');
            log.debug('Query Part 1 - SELECT/FROM', queryParts[0]);

            if (queryParts.length > 1) {
                var whereParts = queryParts[1].split('AND');
                log.debug('Query Part 2 - WHERE clause count', whereParts.length + ' conditions');

                whereParts.forEach(function(part, index) {
                    log.debug('Query WHERE condition ' + index, part.trim());
                });
            }

            // Also log the parameters separately to confirm they exist
            log.debug('Query Param - itemIdList', itemIdList);
            log.debug('Query Param - subsidiaryId', subsidiaryId);
            log.debug('Query Param - subsidiaryId type', typeof subsidiaryId);

            const resultSet = query.runSuiteQL({
                query: suiteQLQuery
            });

            const results = resultSet.asMappedResults();

            log.debug('Raw Query Results', JSON.stringify(results, null, 2));
            log.debug('Number of Results', results.length);

            results.forEach(function(result, index) {
                log.debug('Result ' + index,
                    'Item: ' + result.itemid +
                    ', Vendor: ' + result.vendorid +
                    ', VendorName: ' + result.vendorname +
                    ', Subsidiary: ' + result.subsidiaryid +
                    ', Price: ' + result.vendorprice +
                    ', Preferred: ' + result.ispreferred
                );
            });
            
            // Organize results by item + subsidiary (composite key)
            results.forEach(function(result) {
                const itemId = result.itemid ? result.itemid.toString() : null;
                const subsidiaryIdFromResult = result.subsidiaryid ? result.subsidiaryid.toString() : null;

                if (!itemId) {
                    log.error('Missing Item ID', JSON.stringify(result));
                    return;
                }

                // Create composite key: itemId-subsidiaryId
                // This ensures each item+subsidiary combination gets its own vendor list
                const compositeKey = itemId + '-' + subsidiaryIdFromResult;

                if (!vendorsByItem[compositeKey]) {
                    vendorsByItem[compositeKey] = [];
                }

                const vendorPrice = result.vendorprice ? parseFloat(result.vendorprice) : null;

                vendorsByItem[compositeKey].push({
                    id: result.vendorid ? result.vendorid.toString() : '',
                    name: result.vendorname || 'Unknown Vendor',
                    price: vendorPrice,
                    isPreferred: result.ispreferred === 'T',
                    currency: result.currencyname || 'USD',
                    currencySymbol: result.currencysymbol || '$'
                });

                log.debug('Vendor Added', `Item: ${itemId}, Subsidiary: ${subsidiaryIdFromResult}, Vendor: ${result.vendorname}, Price: ${vendorPrice}, Preferred: ${result.ispreferred}`);
            });
            
            // Log items with no vendors found
            itemIds.forEach(function(itemId) {
                const compositeKey = itemId + '-' + subsidiaryId;
                if (!vendorsByItem[compositeKey]) {
                    log.audit('No Vendors Found', `Item ${itemId} has no vendors for subsidiary ${subsidiaryId} (composite key: ${compositeKey})`);
                }
            });
            
        } catch (e) {
            log.error('Vendor Query Error', `Subsidiary ${subsidiaryId}: ${e.toString()}`);
            log.error('Error Stack', e.stack || 'No stack trace');
            throw e;
        }
        
        return vendorsByItem;
    }
    
    return {
        post: post
    };
});