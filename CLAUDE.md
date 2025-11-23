# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a NetSuite SuiteCloud Development Framework (SDF) project for a **Vendor Performance Intelligence System** - an "Order Items" application that combines inventory reorder point management with vendor performance analytics to optimize purchase order creation.

The application helps NetSuite users:
- View items below reorder point or suggested by MRP
- Compare vendor performance metrics (on-time delivery, quality ratings, defect rates, lead times)
- Create purchase orders with vendor intelligence and alternative vendor recommendations
- Track vendor performance trends and risk assessments over time

## SuiteCloud Development Commands

### Deployment
```bash
# Validate the SDF project before deployment
suitecloud project:validate

# Deploy to NetSuite account (uses defaultAuthId from project.json)
suitecloud project:deploy

# Import objects from NetSuite
suitecloud project:import
```

### Authentication
```bash
# Set up authentication for NetSuite account
suitecloud account:setup

# The project uses "vendorPerf" as the default auth ID (see project.json)
```

## Architecture

### Application Flow

1. **Suitelet Entry Point** (`oi_sl_main.js`): Serves the main HTML/CSS interface, loads initial data (first 25 items), and injects RESTlet URLs for client-side API calls
2. **Client Script** (`oi_cs_main.js`): Handles UI interactions, vendor comparisons, and purchase order creation via RESTlet calls
3. **RESTlets** (3 files): Provide JSON APIs for items data, vendor performance, and PO creation
4. **Map/Reduce Script** (`oi_mr_calculate_performance.js`): Daily batch job that calculates vendor performance metrics and updates custom records
5. **Libraries**: Shared utilities for vendor calculations (`oi_lib_vendor.js`) and common functions (`oi_lib_common.js`)

### Custom Records Schema

The system uses 4 custom record types defined in `src/Objects/`:

1. **customrecord_vendor_performance**: Main vendor metrics (17 fields)
   - Performance: OTD%, avg lead time, quality rating, defect rate
   - Cost: price variance, cost stability, total/avg order value
   - Risk: risk score (0-100), risk level (LOW/MEDIUM/HIGH)
   - Volume: order count, frequency, last order date

2. **customrecord_vendor_trends**: Performance change tracking over time (8 fields)

3. **customrecord_vendor_risk_alerts**: Alert management with status workflow (10 fields)

4. **customrecord_perf_calc_log**: Map/Reduce execution logs for troubleshooting (10 fields)

### Key Calculation Logic

Vendor performance is calculated in the Map/Reduce script (`oi_mr_calculate_performance.js`):

- **Map Stage**: Calculate metrics for each vendor (OTD rate, lead times, quality, defects, cost variance)
- **Reduce Stage**: Save/update vendor performance records and risk scores
- **Summarize Stage**: Log results and send alerts for high-risk vendors

Risk scoring algorithm (in both `oi_mr_calculate_performance.js:549` and `oi_lib_vendor.js:17`):
- On-time delivery: 40% weight (risk if < 80%)
- Quality rating: 30% weight (risk if < 3.5/5)
- Defect rate: 20% weight (risk if > 3%)
- Price variance: 10% weight (risk if > ±5%)

### File Structure

```
src/
├── FileCabinet/
│   ├── SuiteScripts/OrderItems/
│   │   ├── Suitelet/oi_sl_main.js          # Main application entry
│   │   ├── ClientScript/oi_cs_main.js      # Client-side UI logic
│   │   ├── RESTlet/                        # JSON APIs
│   │   │   ├── oi_rl_items.js              # Items data API
│   │   │   ├── oi_rl_vendor.js             # Vendor performance API
│   │   │   └── oi_rl_purchase_order.js     # PO creation API
│   │   ├── MapReduce/                      # Batch processing
│   │   │   └── oi_mr_calculate_performance.js
│   │   ├── Library/                        # Shared utilities
│   │   │   ├── oi_lib_vendor.js            # Vendor calculations
│   │   │   └── oi_lib_common.js            # Common functions
│   │   └── CustomRecords/                  # Schema definitions
│   │       └── vendor_performance_schema.js
│   └── Templates/OrderItems/               # UI assets
│       ├── order_items_template.html
│       └── order_items_styles.css
├── Objects/                                # Custom record type definitions (XML)
│   ├── customrecord_vendor_performance.xml
│   ├── customrecord_vendor_trends.xml
│   ├── customrecord_vendor_risk_alerts.xml
│   └── customrecord_perf_calc_log.xml
└── manifest.xml                            # SDF project manifest
```

## Post-Deployment Configuration

After deploying via SDF, you must manually create Script Records in NetSuite:

1. **Suitelet**: Deploy `oi_sl_main.js` (suggested script ID: `customscript_oi_main_suitelet`)
2. **Client Script**: Deploy `oi_cs_main.js` for the Suitelet form
3. **RESTlets**: Create 3 script records:
   - `oi_rl_items.js` → `customscript_oi_items_restlet`
   - `oi_rl_vendor.js` → `customscript_oi_vendor_restlet`
   - `oi_rl_purchase_order.js` → `customscript_oi_purchase_order_restlet`
4. **Map/Reduce**: Deploy `oi_mr_calculate_performance.js` with scheduled deployment (daily recommended)
   - Script parameter: `custscript_analysis_days` (default: 90)

Update RESTlet URLs in `oi_sl_main.js:351-363` to match your deployment IDs.

## RESTlet API Specifications

### Items RESTlet (`oi_rl_items.js`)

**GET** - Retrieve paginated items with vendor information

Parameters:
- `page` (number): Page number, default 1
- `limit` (number): Items per page, default 25
- `filter` (string): all|critical|reorder|mrp
- `search` (string): Search query
- `sortBy` (string): urgency|vendor|leadtime
- `sortDir` (string): asc|desc

Response format:
```json
{
  "success": true,
  "data": {
    "items": [{
      "id": "12345",
      "itemNumber": "PART-10245",
      "description": "Hydraulic Valve Assembly",
      "currentStock": 15,
      "reorderPoint": 50,
      "maxStock": 100,
      "suggestedQty": 100,
      "unitPrice": 245.50,
      "preferredVendor": {
        "id": "vendor_123",
        "name": "Acme Hydraulics",
        "rating": 4.6,
        "riskLevel": "low",
        "leadTime": 14
      },
      "urgency": "critical",
      "source": "reorder"
    }],
    "summary": {
      "totalItems": 145,
      "criticalCount": 12,
      "belowReorderCount": 28,
      "mrpSuggestedCount": 45,
      "totalValue": 142580.00
    },
    "pagination": {
      "currentPage": 1,
      "totalPages": 6,
      "hasMore": true
    }
  }
}
```

### Vendor RESTlet (`oi_rl_vendor.js`)

**GET /details** - Single vendor detailed metrics

Parameters:
- `vendorId` (string): Vendor internal ID
- `itemId` (string): Item context for pricing
- `period` (string): 30d|90d|180d|365d

**GET /compare** - Compare multiple vendors for an item

Parameters:
- `itemId` (string): Item to compare vendors for
- `vendorIds` (array): Vendor IDs to compare

### Purchase Order RESTlet (`oi_rl_purchase_order.js`)

**POST /create** - Create purchase orders from selected items

Body:
```json
{
  "items": [{
    "itemId": "12345",
    "quantity": 100,
    "vendorId": "vendor_123"
  }],
  "groupByVendor": true,
  "notes": "Created from Order Items UI"
}
```

## Business Logic

### Urgency Classification

Items are classified by urgency based on stock levels (`oi_sl_main.js:326`):
- **CRITICAL**: currentStock < reorderPoint × 0.1 (< 10%)
- **HIGH**: currentStock < reorderPoint × 0.25 (< 25%)
- **MEDIUM**: currentStock < reorderPoint × 0.5 (< 50%)
- **LOW**: currentStock < reorderPoint but > 50%

### Risk Level Determination

Vendors are assigned risk levels based on weighted scores (`oi_lib_vendor.js:17`):
- **HIGH RISK**: OTD < 80% OR Quality < 3.5/5 OR Defects > 5%
- **MEDIUM RISK**: OTD < 85% OR Quality < 4.0/5 OR Defects > 3%
- **LOW RISK**: All metrics above thresholds

### Smart Recommendations

The system triggers alerts for:
1. **Risk Alert**: Any selected vendor with HIGH risk level
2. **Consolidation Opportunity**: 3+ items from same vendor
3. **Cost Savings**: Alternative vendor >5% cheaper with comparable performance
4. **Lead Time Optimization**: Alternative vendor >30% faster delivery

## Client Script State Management

The client script (`oi_cs_main.js`) maintains application state:

```javascript
State Objects:
- selectedItems: Set() - Track selected item IDs for PO creation
- expandedRows: Set() - Track which vendor detail rows are expanded
- currentPage: number - Pagination tracking for infinite scroll
- filters: object - Active filter states (critical/reorder/mrp/search)
- vendorCache: Map() - Cache vendor performance data to reduce API calls
```

Key event handlers:
- Checkbox changes (item selection)
- Expand/collapse vendor detail panels
- Filter dropdowns and search input (debounced at 300ms)
- Create PO button
- Vendor comparison modal
- Infinite scroll (triggers when 100px from bottom)

## UI/UX Design System

### Color Palette
- Primary Blue: `#2563eb`
- Success Green: `#16a34a`
- Warning Yellow: `#f59e0b`
- Danger Red: `#dc2626`
- Neutral Gray: `#6b7280`

All CSS classes use `ns-` prefix for namespace safety.

### Interaction Patterns
- **Row Expansion**: Click chevron to expand vendor performance panel with slide animation
- **Multi-select**: Checkboxes with "Select All" option in header
- **Hover States**: Tooltips on vendor ratings and risk indicators
- **Loading States**: Skeleton screens for initial load, spinners for async operations
- **Modal Behavior**: Click outside to close, ESC key support
- **Infinite Scroll**: Auto-load next page when scrolled to bottom

### Performance Targets
- Initial page load: < 2 seconds
- Expand vendor details: < 500ms
- Search response: < 300ms (after debounce)
- Infinite scroll load: < 800ms
- PO creation: < 3 seconds

## Development Sequence

For iterative development and testing, build components in this order:

1. **HTML/CSS Templates** - `order_items_template.html` and `order_items_styles.css` (provided from Figma)
2. **Suitelet** - Serve HTML interface with embedded initial data
3. **Items RESTlet** - Display real item data with pagination
4. **Client Script** - Implement interactions and state management
5. **Vendor RESTlet** - Add vendor intelligence and comparison
6. **PO RESTlet** - Enable purchase order creation
7. **Map/Reduce** - Background performance calculations
8. **Testing** - Verify all functionality with real data

## NetSuite-Specific Considerations

### Governance Limits
- **RESTlets**: 5,000 usage units per request
- **Client Scripts**: 1,000 usage units per execution
- **Map/Reduce**: 10,000 units per stage invocation

Be efficient with searches and record operations. Use pagination and caching.

### Browser Compatibility
- Target **ES5** for maximum NetSuite compatibility
- jQuery is available in NetSuite - use when beneficial
- Avoid modern JS features (async/await, arrow functions) in client scripts unless polyfilled

### Permissions
- Scripts execute with current user's permissions unless "Execute as Admin" is enabled
- Test with restricted roles to verify permission handling
- Check user permissions before displaying sensitive actions

### Caching Strategy
- Use browser `sessionStorage` for vendor performance data
- Cache RESTlet responses client-side where appropriate
- Clear cache on significant actions (PO creation, data refresh)

## Provided Files

The following files were created from Figma design exports and should be used as-is:

1. **`order_items_template.html`** - Complete HTML structure with all UI components
2. **`order_items_styles.css`** - Full design system with ns- prefixed classes
3. **`oi_cs_main.js`** - Partial client script framework (needs completion)

These files contain the exact visual design including colors, spacing, components, and interaction patterns.

## NetSuite API Version

All scripts use `@NApiVersion 2.1` (SuiteScript 2.1).

## Dependencies

- NetSuite feature: **CUSTOMRECORDS** (required - see `manifest.xml:6`)
- SuiteCloud CLI installed and configured
- jQuery (available in NetSuite by default)
