# NetSuite Script Deployment Guide
## Vendor Performance Intelligence System

This guide provides step-by-step instructions for creating script records and deployment records for all scripts in the Vendor Performance Intelligence System.

---

## Prerequisites

Before deploying scripts, ensure:
1. All script files have been deployed to NetSuite File Cabinet via `suitecloud project:deploy`
2. Custom records have been created (see CUSTOM_RECORDS_UI_GUIDE.md)
3. You have Administrator or Script Deployment permissions in NetSuite

---

## Deployment Sequence

Deploy scripts in this order to avoid dependency issues:

1. **Library Scripts** (no deployment needed, just uploaded to File Cabinet)
2. **Map/Reduce Script** (background processing)
3. **RESTlet Scripts** (API endpoints)
4. **Suitelet** (main UI)
5. **Client Script** (attached to Suitelet)

---

## 1. Map/Reduce Script: Vendor Performance Calculator

### A. Create Script Record

1. Navigate to: **Customization > Scripting > Scripts > New**
2. Click **Upload Script File**
3. Select: `/SuiteScripts/OrderItems/MapReduce/oi_mr_calculate_performance.js`
4. Click **Create Script Record**

### B. Configure Script Record

| Field | Value |
|-------|-------|
| **Name** | Vendor Performance Calculator |
| **ID** | `customscript_oi_mr_calculate_perf` |
| **Description** | Calculates vendor performance metrics daily and updates custom records |
| **Owner** | (Select script owner) |
| **Status** | Testing (change to Released after testing) |

### C. Script Parameters

Create a script parameter:

1. Click **Parameters** subtab
2. Click **Add** to create new parameter

| Field | Value |
|-------|-------|
| **ID** | `custscript_analysis_days` |
| **Type** | Integer |
| **Default Value** | 90 |
| **Display Name** | Analysis Period (Days) |
| **Description** | Number of days to analyze for performance metrics |
| **Help** | Enter the number of days to look back when calculating vendor performance (default: 90) |

3. Click **Save**

### D. Create Deployment

1. Click **Deployments** subtab
2. Click **Add**

| Field | Value |
|-------|-------|
| **Title** |  |
| **ID** | `customdeploy_oi_mr_calc_perf_daily` |
| **Status** | Testing (change to Released after testing) |
| **Log Level** | Debug (change to Error after testing) |
| **Execute As Role** | Administrator |

**Scheduled Execution Settings:**
- **Frequency**: Daily
- **Start Time**: 2:00 AM
- **Repeat**: Every 1 Days
- **End By**: (Leave blank for ongoing)

**Audience:**
- **All Roles**: Checked (script runs in background)
- **All Employees**: Checked

3. Click **Save**

### E. Testing Notes
- Run the script manually first: Deployments > Actions > Execute
- Check Execution Log for any errors
- Verify custom records are created/updated in Lists > Custom Records

---

## 2. RESTlet: Order Items Data

### A. Create Script Record

1. Navigate to: **Customization > Scripting > Scripts > New**
2. Click **Upload Script File**
3. Select: `/SuiteScripts/OrderItems/RESTlet/oi_rl_items.js`
4. Click **Create Script Record**

### B. Configure Script Record

| Field | Value |
|-------|-------|
| **Name** | Order Items RESTlet |
| **ID** | `customscript_oi_items_restlet` |
| **Description** | Provides item data with pagination, filtering, and vendor information |
| **Owner** | (Select script owner) |
| **Status** | Testing |

### C. Create Deployment

1. Click **Deployments** subtab
2. Click **Add**

| Field | Value |
|-------|-------|
| **Title** | Order Items API |
| **ID** | `customdeploy_oi_items_restlet` |
| **Status** | Testing |
| **Log Level** | Debug |
| **Execute As Role** | Administrator |

**Audience:**
- **All Roles**: Unchecked
- **Specific Roles**: Check roles that need access to the Order Items UI (typically: Administrator, Purchasing Manager, Inventory Manager)
- **All Employees**: Unchecked
- **Specific Employees**: (Optional) Add specific users if needed

3. Click **Save**
4. **IMPORTANT**: Copy the generated **External URL** - you'll need this for the Suitelet

---

## 3. RESTlet: Vendor Intelligence Data

### A. Create Script Record

1. Navigate to: **Customization > Scripting > Scripts > New**
2. Click **Upload Script File**
3. Select: `/SuiteScripts/OrderItems/RESTlet/oi_rl_vendor.js`
4. Click **Create Script Record**

### B. Configure Script Record

| Field | Value |
|-------|-------|
| **Name** | Vendor Intelligence RESTlet |
| **ID** | `customscript_oi_vendor_restlet` |
| **Description** | Provides vendor performance metrics, comparison, and risk analysis |
| **Owner** | (Select script owner) |
| **Status** | Testing |

### C. Create Deployment

1. Click **Deployments** subtab
2. Click **Add**

| Field | Value |
|-------|-------|
| **Title** | Vendor Intelligence API |
| **ID** | `customdeploy_oi_vendor_restlet` |
| **Status** | Testing |
| **Log Level** | Debug |
| **Execute As Role** | Administrator |

**Audience:** (Same as Order Items RESTlet above)

3. Click **Save**
4. **IMPORTANT**: Copy the generated **External URL**

---

## 4. RESTlet: Purchase Order Creation

### A. Create Script Record

1. Navigate to: **Customization > Scripting > Scripts > New**
2. Click **Upload Script File**
3. Select: `/SuiteScripts/OrderItems/RESTlet/oi_rl_purchase_order.js`
4. Click **Create Script Record**

### B. Configure Script Record

| Field | Value |
|-------|-------|
| **Name** | Purchase Order Creation RESTlet |
| **ID** | `customscript_oi_purchase_order_restlet` |
| **Description** | Creates purchase orders from selected items |
| **Owner** | (Select script owner) |
| **Status** | Testing |

### C. Create Deployment

1. Click **Deployments** subtab
2. Click **Add**

| Field | Value |
|-------|-------|
| **Title** | Purchase Order Creation API |
| **ID** | `customdeploy_oi_purchase_order_restlet` |
| **Status** | Testing |
| **Log Level** | Debug |
| **Execute As Role** | Current User (to preserve audit trail) |

**Audience:** (Same as above)

3. Click **Save**
4. **IMPORTANT**: Copy the generated **External URL**

---

## 5. Suitelet: Order Items Main Application

### A. Create Script Record

1. Navigate to: **Customization > Scripting > Scripts > New**
2. Click **Upload Script File**
3. Select: `/SuiteScripts/OrderItems/Suitelet/oi_sl_main.js`
4. Click **Create Script Record**

### B. Configure Script Record

| Field | Value |
|-------|-------|
| **Name** | Order Items Suitelet |
| **ID** | `customscript_oi_suitelet_main` |
| **Description** | Main application entry point for Order Items with Vendor Intelligence |
| **Owner** | (Select script owner) |
| **Status** | Testing |

### C. Create Deployment

1. Click **Deployments** subtab
2. Click **Add**

| Field | Value |
|-------|-------|
| **Title** | Order Items UI |
| **ID** | `customdeploy_oi_suitelet_main` |
| **Status** | Testing |
| **Log Level** | Debug |
| **Execute As Role** | Current User |
| **Display Type** | Inline Form (default) |

**Audience:**
- **All Roles**: Unchecked
- **Specific Roles**: Check roles that should access the UI
- **All Employees**: Unchecked

3. Click **Save**
4. Copy the generated **URL** - this is the main application URL

### D. Post-Deployment Configuration

The Suitelet needs to know the RESTlet URLs. There are two options:

**Option 1: Update Suitelet Code (Recommended)**

1. Edit `oi_sl_main.js` in the File Cabinet
2. Find the `generateRESTletUrls()` function (around line 349)
3. Update the script IDs and deployment IDs to match:
```javascript
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
        purchaseOrder: url.resolveScript({
            scriptId: 'customscript_oi_purchase_order_restlet',
            deploymentId: 'customdeploy_oi_purchase_order_restlet'
        })
    };
}
```
4. Save the file

**Option 2: Create Script Parameters**

1. Go back to the Suitelet script record
2. Create three script parameters:

| ID | Type | Default Value | Display Name |
|----|------|---------------|--------------|
| `custscript_restlet_items_url` | Free-Form Text | (External URL from step 2) | Items RESTlet URL |
| `custscript_restlet_vendor_url` | Free-Form Text | (External URL from step 3) | Vendor RESTlet URL |
| `custscript_restlet_po_url` | Free-Form Text | (External URL from step 4) | PO RESTlet URL |

3. Update the Suitelet code to use these parameters

---

## 6. Client Script: Order Items UI Logic

### A. Create Script Record

1. Navigate to: **Customization > Scripting > Scripts > New**
2. Click **Upload Script File**
3. Select: `/SuiteScripts/OrderItems/ClientScript/oi_cs_main.js`
4. Click **Create Script Record**

### B. Configure Script Record

| Field | Value |
|-------|-------|
| **Name** | Order Items Client Script |
| **ID** | `customscript_oi_client_main` |
| **Description** | Client-side logic for Order Items UI with vendor intelligence |
| **Owner** | (Select script owner) |
| **Status** | Testing |

### C. Create Deployment

1. Click **Deployments** subtab
2. Click **Add**

| Field | Value |
|-------|-------|
| **Title** | Order Items Client Logic |
| **ID** | `customdeploy_oi_client_main` |
| **Status** | Testing |
| **Log Level** | Debug |
| **Execute As Role** | Current User |

**Applies To:**
- **Forms**: Suitelet (if available as option)
- **OR leave blank** if you'll attach it directly to the Suitelet

**Audience:**
- **All Roles**: Checked (client script applies to anyone viewing the Suitelet)

3. Click **Save**

### D. Attach to Suitelet

**Option 1: Via Suitelet Code (Current Implementation)**

The Suitelet code already references the client script at line 68:
```javascript
form.clientScriptFileId = getClientScriptFileId();
```

You need to update the `getClientScriptFileId()` function:

1. Edit `oi_sl_main.js` in File Cabinet
2. Find `getClientScriptFileId()` function (around line 370)
3. Get the Internal ID of the client script file:
   - Go to Documents > Files > File Cabinet
   - Navigate to `/SuiteScripts/OrderItems/ClientScript/`
   - Click on `oi_cs_main.js`
   - Copy the Internal ID from the URL (e.g., `12345`)
4. Update the function:
```javascript
function getClientScriptFileId() {
    return 12345; // Replace with actual file ID
}
```
5. Save the file

**Option 2: Create Script Parameter**

1. Go to the Suitelet script record
2. Add a new parameter:

| Field | Value |
|-------|-------|
| **ID** | `custscript_client_script_file_id` |
| **Type** | Integer |
| **Default Value** | (Internal ID of oi_cs_main.js) |
| **Display Name** | Client Script File ID |

3. Update the Suitelet code to use this parameter

---

## 7. Library Files (Reference Only)

These files are library modules and do NOT require script records or deployments:

1. `/SuiteScripts/OrderItems/Library/oi_lib_common.js`
   - Common utility functions
   - Used by: Map/Reduce, RESTlets, Suitelet

2. `/SuiteScripts/OrderItems/Library/oi_lib_vendor.js`
   - Vendor-specific logic
   - Used by: Map/Reduce, Vendor RESTlet

3. `/SuiteScripts/OrderItems/CustomRecords/vendor_performance_schema.js`
   - Custom record schema definitions
   - Reference file only

**Note**: Library files are imported using `define()` statements in other scripts. No deployment action needed.

---

## 8. Post-Deployment Testing Checklist

### Phase 1: Basic Functionality
- [ ] Verify Map/Reduce script can run manually
- [ ] Check Map/Reduce creates/updates custom records
- [ ] Test each RESTlet with REST client (Postman/Insomnia):
  - [ ] Items RESTlet: GET with filter parameters
  - [ ] Vendor RESTlet: GET with vendorId
  - [ ] PO RESTlet: POST with item data
- [ ] Access Suitelet URL and verify page loads
- [ ] Check browser console for JavaScript errors

### Phase 2: Integration Testing
- [ ] Verify items load in the Suitelet UI
- [ ] Test search and filter functionality
- [ ] Expand vendor details panel
- [ ] Compare vendors for an item
- [ ] Select items and create a purchase order
- [ ] Verify PO is created in NetSuite

### Phase 3: Performance Testing
- [ ] Test with 100+ items
- [ ] Check page load time (should be < 3 seconds)
- [ ] Verify pagination works correctly
- [ ] Test concurrent users (3-5 users)

### Phase 4: Error Handling
- [ ] Test with no vendors assigned to items
- [ ] Test with items that have no reorder point
- [ ] Verify error messages display correctly
- [ ] Check script execution logs for errors

---

## 9. Moving to Production

Once testing is complete:

1. **Update All Script Records**:
   - Change Status: Testing → **Released**
   - Change Log Level: Debug → **Error**

2. **Update Audience Settings**:
   - Review role-based access
   - Remove test users if needed
   - Add production roles

3. **Schedule Map/Reduce**:
   - Verify scheduled execution time works for your timezone
   - Consider business hours and transaction volume

4. **Create Monitoring**:
   - Set up saved searches for:
     - Script execution failures
     - Custom record creation counts
     - High-risk vendor alerts
   - Configure email alerts for critical issues

5. **Documentation**:
   - Update CLAUDE.md with actual script IDs and deployment IDs
   - Document any custom configurations
   - Create user guide for end users

---

## 10. Troubleshooting Guide

### Issue: Suitelet shows blank page
**Causes:**
- Client script file ID is incorrect
- RESTlet URLs are not configured
- JavaScript errors in browser console

**Solution:**
1. Check browser console for errors
2. Verify client script file ID
3. Test RESTlets independently
4. Check Suitelet execution log

### Issue: RESTlets return errors
**Causes:**
- Audience/role permissions
- Missing custom records
- Script governance limits

**Solution:**
1. Check user has required role
2. Verify custom records exist
3. Review script execution log
4. Check governance usage in execution log

### Issue: Map/Reduce doesn't create records
**Causes:**
- Custom record types not created
- Custom lists not created
- Data access permissions

**Solution:**
1. Verify all custom records exist
2. Create required custom lists:
   - `customlist_vp_vendor_risk_levels`
   - `customlist_vt_vendor_trend_direction`
   - `customlist_vr_vendor_risk_alert_types`
   - `customlist_vra_severity`
   - `customlist_vra_alert_status`
   - `customlist_pcl_status`
3. Check script execution log for specific errors
4. Verify Execute As Role has permissions

### Issue: Performance is slow
**Causes:**
- Too many records loading at once
- Inefficient searches
- No pagination

**Solution:**
1. Reduce items per page (default 25)
2. Add indexes to custom record fields
3. Optimize saved searches
4. Enable browser caching

---

## 11. Script ID Reference

Quick reference table for all script IDs:

| Script Type | File | Script ID | Deployment ID |
|-------------|------|-----------|---------------|
| Map/Reduce | oi_mr_calculate_performance.js | `customscript_oi_mr_calculate_perf` | `customdeploy_oi_mr_calc_perf_daily` |
| RESTlet | oi_rl_items.js | `customscript_oi_items_restlet` | `customdeploy_oi_items_restlet` |
| RESTlet | oi_rl_vendor.js | `customscript_oi_vendor_restlet` | `customdeploy_oi_vendor_restlet` |
| RESTlet | oi_rl_purchase_order.js | `customscript_oi_purchase_order_restlet` | `customdeploy_oi_purchase_order_restlet` |
| Suitelet | oi_sl_main.js | `customscript_oi_suitelet_main` | `customdeploy_oi_suitelet_main` |
| Client Script | oi_cs_main.js | `customscript_oi_client_main` | `customdeploy_oi_client_main` |

---

## 12. Custom Lists Required

Before deploying scripts, create these custom lists:

### customlist_vp_vendor_risk_levels
**Path**: Lists > Custom Lists > New

| Value | Name | Description |
|-------|------|-------------|
| 1 | Low | Vendor performance is good |
| 2 | Medium | Some performance concerns |
| 3 | High | Significant performance issues |

### customlist_vt_vendor_trend_direction
**Path**: Lists > Custom Lists > New

| Value | Name | Description |
|-------|------|-------------|
| 1 | Improving | Performance is getting better |
| 2 | Stable | Performance is consistent |
| 3 | Declining | Performance is getting worse |

### customlist_vr_vendor_risk_alert_types
**Path**: Lists > Custom Lists > New

| Value | Name | Description |
|-------|------|-------------|
| 1 | Late Delivery | Deliveries are consistently late |
| 2 | Quality Issue | Quality rating has dropped |
| 3 | Price Increase | Significant price increase |
| 4 | High Defect Rate | Defect rate exceeds threshold |
| 5 | Lead Time Variance | Actual lead time exceeds quoted |

### customlist_vra_severity
**Path**: Lists > Custom Lists > New

| Value | Name | Description |
|-------|------|-------------|
| 1 | Low | Minor concern |
| 2 | Medium | Moderate concern |
| 3 | High | Immediate attention required |
| 4 | Critical | Urgent action required |

### customlist_vra_alert_status
**Path**: Lists > Custom Lists > New

| Value | Name | Description |
|-------|------|-------------|
| 1 | New | Alert just created |
| 2 | Acknowledged | Alert has been seen |
| 3 | In Progress | Being addressed |
| 4 | Resolved | Issue resolved |
| 5 | Closed | Alert closed |

### customlist_pcl_status
**Path**: Lists > Custom Lists > New

| Value | Name | Description |
|-------|------|-------------|
| 1 | Running | Calculation in progress |
| 2 | Completed | Calculation successful |
| 3 | Failed | Calculation failed |
| 4 | Partial | Some records processed |

---

## 13. Additional Configuration

### Template Files Location

Ensure template files are in the correct location:
- **HTML Template**: `/SuiteScripts/OrderItems/Templates/order_items_template.html`
- **CSS File**: `/SuiteScripts/OrderItems/Templates/order_items_styles.css`

If files are in a different location, update the Suitelet code:
- Function: `loadHTMLTemplate()` - line 78-87
- Function: `loadCSSStyles()` - line 94-104

### Navigation Menu Entry (Optional)

To add a menu item for easy access:

1. Navigate to: **Setup > Company > Enable Features**
2. Go to **SuiteCloud** tab
3. Check **Manage SuiteScript and Workflow Triggers From Lists Menu** (if not already checked)
4. Click **Save**

Then:
1. Navigate to: **Customization > Lists, Records, & Fields > List/Record > Create Custom**
2. Create custom menu entry:
   - **Label**: Order Items - Vendor Intelligence
   - **Type**: Link
   - **URL**: (Suitelet URL from deployment)
   - **Available To**: (Select roles)

---

## Support and Maintenance

- **Execution Logs**: System > Saved Searches > Search > Script Execution Logs
- **Script Deployment Status**: Customization > Scripting > Script Deployments
- **Performance Monitoring**: System > Governance > Script Execution Logs
- **Custom Record Maintenance**: Lists > Custom Records

For issues, refer to:
- NetSuite Help Center: help.netsuite.com
- SuiteScript API Documentation: docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/
- Project Documentation: CLAUDE.md
