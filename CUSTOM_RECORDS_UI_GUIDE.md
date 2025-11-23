# Custom Records - Detailed UI Creation Guide

## Prerequisites
1. Log into NetSuite as Administrator
2. Navigate to: **Setup > Customization > Lists, Records, & Fields > Record Types > New**

---

## Custom Record 1: Vendor Performance Metrics

### Basic Settings
- **Record Name**: Vendor Performance Metrics
- **ID**: customrecord_vendor_performance
- **Description**: Store calculated vendor performance metrics and trends for vendor intelligence system
- **Access Type**: Use Permission List
- **Include Name Field**: No (unchecked)
- **Show ID**: Yes (checked)
- **Allow Attachments**: No
- **Allow Inline Editing**: No
- **Allow Mobile Access**: Yes
- **Allow UI Access**: Yes

### Fields to Create

After saving the record, click **New Field** for each:

#### 1. Vendor
- **Label**: Vendor
- **ID**: custrecord_vp_vendor
- **Type**: List/Record
- **List/Record**: Vendor
- **Help**: Reference to the vendor record this performance data applies to
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: Yes (checked)

#### 2. Item
- **Label**: Item
- **ID**: custrecord_vp_item
- **Type**: List/Record
- **List/Record**: Item
- **Help**: Optional item-specific metrics (leave blank for overall vendor metrics)
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: No

#### 3. Calculation Date
- **Label**: Calculation Date
- **ID**: custrecord_vp_calculation_date
- **Type**: Date
- **Help**: Date when these metrics were calculated
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: Yes (checked)

#### 4. Analysis Period (Days)
- **Label**: Analysis Period (Days)
- **ID**: custrecord_vp_analysis_period_days
- **Type**: Integer Number
- **Default Value**: 90
- **Help**: Number of days analyzed for these metrics (e.g., 90)
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: No

#### 5. On-Time Delivery Rate
- **Label**: On-Time Delivery Rate
- **ID**: custrecord_vp_otd_percent
- **Type**: Percent
- **Help**: Percentage of deliveries made on or before due date
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: Yes (checked)

#### 6. Average Lead Time (Days)
- **Label**: Average Lead Time (Days)
- **ID**: custrecord_vp_avg_lead_time
- **Type**: Integer Number
- **Help**: Average actual lead time from PO to receipt
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: No

#### 7. Average Quoted Lead Time (Days)
- **Label**: Average Quoted Lead Time (Days)
- **ID**: custrecord_vp_quoted_lead_time
- **Type**: Integer Number
- **Help**: Average quoted lead time for comparison
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: No

#### 8. Quality Rating
- **Label**: Quality Rating
- **ID**: custrecord_vp_quality_rating
- **Type**: Decimal Number
- **Help**: Quality rating on 1-5 scale based on receipts and returns
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: Yes (checked)

#### 9. Defect Rate
- **Label**: Defect Rate
- **ID**: custrecord_vp_defect_rate
- **Type**: Percent
- **Help**: Percentage of items received with defects or requiring returns
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: No

#### 10. Price Variance
- **Label**: Price Variance
- **ID**: custrecord_vp_price_variance
- **Type**: Percent
- **Help**: Price variance vs historical average (positive = increase)
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: No

#### 11. Cost Stability Score
- **Label**: Cost Stability Score
- **ID**: custrecord_vp_cost_stability
- **Type**: Percent
- **Help**: Score indicating price stability over time (higher = more stable)
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: No

#### 12. Risk Score
- **Label**: Risk Score
- **ID**: custrecord_vp_risk_score
- **Type**: Integer Number
- **Help**: Overall risk score 0-100 (higher = more risk)
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: Yes (checked)

#### 13. Risk Level
- **Label**: Risk Level
- **ID**: custrecord_vp_risk_level
- **Type**: List/Record
- **List**: Custom List (create new)
  - **List Name**: Vendor Risk Levels
  - **Values to add**:
    - Low
    - Medium
    - High
- **Help**: Categorized risk level
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: Yes (checked)

#### 14. Total Orders Analyzed
- **Label**: Total Orders Analyzed
- **ID**: custrecord_vp_total_orders
- **Type**: Integer Number
- **Help**: Number of purchase orders included in analysis
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: No

#### 15. Total Order Value
- **Label**: Total Order Value
- **ID**: custrecord_vp_total_value
- **Type**: Currency
- **Help**: Total value of orders in analysis period
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: No

#### 16. Average Order Value
- **Label**: Average Order Value
- **ID**: custrecord_vp_avg_order_value
- **Type**: Currency
- **Help**: Average value per purchase order
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: No

#### 17. Avg Response Time (Hours)
- **Label**: Avg Response Time (Hours)
- **ID**: custrecord_vp_response_time_hours
- **Type**: Decimal Number
- **Help**: Average response time to communications
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: No

#### 18. Last Order Date
- **Label**: Last Order Date
- **ID**: custrecord_vp_last_order_date
- **Type**: Date
- **Help**: Date of most recent purchase order
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: No

#### 19. Order Frequency (per month)
- **Label**: Order Frequency (per month)
- **ID**: custrecord_vp_order_frequency
- **Type**: Decimal Number
- **Help**: Average number of orders per month
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: No

---

## Custom Record 2: Vendor Performance Trends

### Basic Settings
- **Record Name**: Vendor Performance Trends
- **ID**: customrecord_vendor_trends
- **Description**: Historical trend data comparing vendor performance between periods
- **Access Type**: Use Permission List
- **Include Name Field**: No (unchecked)
- **Show ID**: Yes (checked)
- **Allow Attachments**: No
- **Allow Inline Editing**: No
- **Allow Mobile Access**: No
- **Allow UI Access**: Yes

### Fields to Create

#### 1. Vendor
- **Label**: Vendor
- **ID**: custrecord_vt_vendor
- **Type**: List/Record
- **List/Record**: Vendor
- **Help**: Vendor being tracked
- **Show in List**: Yes (checked)

#### 2. Comparison Date
- **Label**: Comparison Date
- **ID**: custrecord_vt_comparison_date
- **Type**: Date
- **Help**: Date of trend comparison
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: Yes (checked)

#### 3. Current Period (Days)
- **Label**: Current Period (Days)
- **ID**: custrecord_vt_current_period_days
- **Type**: Integer Number
- **Default Value**: 90
- **Help**: Days in current comparison period
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: No

#### 4. Previous Period (Days)
- **Label**: Previous Period (Days)
- **ID**: custrecord_vt_previous_period_days
- **Type**: Integer Number
- **Default Value**: 90
- **Help**: Days in previous comparison period
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: No

#### 5. OTD Trend
- **Label**: OTD Trend
- **ID**: custrecord_vt_otd_trend
- **Type**: Percent
- **Help**: Change in on-time delivery rate (positive = improvement)
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: Yes (checked)

#### 6. Quality Trend
- **Label**: Quality Trend
- **ID**: custrecord_vt_quality_trend
- **Type**: Percent
- **Help**: Change in quality rating (positive = improvement)
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: Yes (checked)

#### 7. Defect Rate Trend
- **Label**: Defect Rate Trend
- **ID**: custrecord_vt_defect_trend
- **Type**: Percent
- **Help**: Change in defect rate (negative = improvement)
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: No

#### 8. Price Trend
- **Label**: Price Trend
- **ID**: custrecord_vt_price_trend
- **Type**: Percent
- **Help**: Change in price variance
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: No

#### 9. Lead Time Trend
- **Label**: Lead Time Trend
- **ID**: custrecord_vt_leadtime_trend
- **Type**: Percent
- **Help**: Change in lead time (negative = improvement)
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: No

#### 10. Overall Trend
- **Label**: Overall Trend
- **ID**: custrecord_vt_overall_trend
- **Type**: List/Record
- **List**: Custom List (create new)
  - **List Name**: Vendor Trend Direction
  - **Values to add**:
    - Improving
    - Stable
    - Declining
- **Help**: Overall performance trend direction
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: Yes (checked)

#### 11. Risk Score Change
- **Label**: Risk Score Change
- **ID**: custrecord_vt_risk_change
- **Type**: Integer Number
- **Help**: Change in risk score (negative = less risky)
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: No

---

## Custom Record 3: Vendor Risk Alerts

### Basic Settings
- **Record Name**: Vendor Risk Alerts
- **ID**: customrecord_vendor_risk_alerts
- **Description**: Risk alerts and notifications for vendor performance issues
- **Access Type**: Use Permission List
- **Include Name Field**: No (unchecked)
- **Show ID**: Yes (checked)
- **Allow Attachments**: Yes (checked)
- **Allow Inline Editing**: Yes (checked)
- **Allow Mobile Access**: Yes (checked)
- **Allow UI Access**: Yes (checked)

### Fields to Create

#### 1. Vendor
- **Label**: Vendor
- **ID**: custrecord_vra_vendor
- **Type**: List/Record
- **List/Record**: Vendor
- **Help**: Vendor with risk alert
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: Yes (checked)

#### 2. Alert Date
- **Label**: Alert Date
- **ID**: custrecord_vra_alert_date
- **Type**: Date and Time (Time Zone)
- **Help**: When the alert was generated
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: Yes (checked)

#### 3. Alert Type
- **Label**: Alert Type
- **ID**: custrecord_vra_alert_type
- **Type**: List/Record
- **List**: Custom List (create new)
  - **List Name**: Vendor Alert Types
  - **Values to add**:
    - On-Time Delivery
    - Quality Issue
    - Defect Rate
    - Price Variance
    - Lead Time
    - Other
- **Help**: Category of risk alert
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: Yes (checked)

#### 4. Severity
- **Label**: Severity
- **ID**: custrecord_vra_severity
- **Type**: List/Record
- **List**: Custom List (create new)
  - **List Name**: Alert Severity Levels
  - **Values to add**:
    - Low
    - Medium
    - High
    - Critical
- **Help**: Severity level of the alert
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: Yes (checked)

#### 5. Description
- **Label**: Description
- **ID**: custrecord_vra_description
- **Type**: Free-Form Text
- **Help**: Description of the risk issue
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: No

#### 6. Threshold Value
- **Label**: Threshold Value
- **ID**: custrecord_vra_threshold_value
- **Type**: Decimal Number
- **Help**: Expected threshold value
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: No

#### 7. Actual Value
- **Label**: Actual Value
- **ID**: custrecord_vra_actual_value
- **Type**: Decimal Number
- **Help**: Actual measured value
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: No

#### 8. Status
- **Label**: Status
- **ID**: custrecord_vra_status
- **Type**: List/Record
- **List**: Custom List (create new)
  - **List Name**: Alert Status
  - **Values to add**:
    - Active
    - Acknowledged
    - Resolved
    - Dismissed
- **Help**: Current status of the alert
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: Yes (checked)

#### 9. Acknowledged By
- **Label**: Acknowledged By
- **ID**: custrecord_vra_acknowledged_by
- **Type**: List/Record
- **List/Record**: Employee
- **Help**: Employee who acknowledged the alert
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: No

#### 10. Acknowledged Date
- **Label**: Acknowledged Date
- **ID**: custrecord_vra_acknowledged_date
- **Type**: Date and Time (Time Zone)
- **Help**: When the alert was acknowledged
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: No

#### 11. Resolution Notes
- **Label**: Resolution Notes
- **ID**: custrecord_vra_resolution_notes
- **Type**: Free-Form Text
- **Help**: Notes on how the alert was resolved
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: No

---

## Custom Record 4: Performance Calculation Log

### Basic Settings
- **Record Name**: Performance Calculation Log
- **ID**: customrecord_perf_calc_log
- **Description**: Log of performance calculation script executions for monitoring and troubleshooting
- **Access Type**: Use Permission List
- **Include Name Field**: No (unchecked)
- **Show ID**: Yes (checked)
- **Allow Attachments**: No
- **Allow Inline Editing**: No
- **Allow Mobile Access**: No
- **Allow UI Access**: Yes (checked)

### Fields to Create

#### 1. Execution Date
- **Label**: Execution Date
- **ID**: custrecord_pcl_execution_date
- **Type**: Date and Time (Time Zone)
- **Help**: When the calculation script was executed
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: Yes (checked)

#### 2. Analysis Period (Days)
- **Label**: Analysis Period (Days)
- **ID**: custrecord_pcl_analysis_period
- **Type**: Integer Number
- **Default Value**: 90
- **Help**: Number of days analyzed in this run
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: Yes (checked)

#### 3. Vendors Processed
- **Label**: Vendors Processed
- **ID**: custrecord_pcl_vendors_processed
- **Type**: Integer Number
- **Help**: Number of vendors processed in this run
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: Yes (checked)

#### 4. High Risk Vendors Found
- **Label**: High Risk Vendors Found
- **ID**: custrecord_pcl_high_risk_vendors
- **Type**: Integer Number
- **Help**: Number of high-risk vendors identified
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: Yes (checked)

#### 5. Error Count
- **Label**: Error Count
- **ID**: custrecord_pcl_errors
- **Type**: Integer Number
- **Help**: Number of errors encountered during processing
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: Yes (checked)

#### 6. Execution Time (Seconds)
- **Label**: Execution Time (Seconds)
- **ID**: custrecord_pcl_execution_time
- **Type**: Integer Number
- **Help**: Total execution time for the calculation
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: No

#### 7. Status
- **Label**: Status
- **ID**: custrecord_pcl_status
- **Type**: List/Record
- **List**: Custom List (create new)
  - **List Name**: Calculation Status
  - **Values to add**:
    - Success
    - Partial Success
    - Failed
    - Running
- **Help**: Overall status of the calculation run
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: Yes (checked)

#### 8. Error Details
- **Label**: Error Details
- **ID**: custrecord_pcl_error_details
- **Type**: Free-Form Text
- **Help**: Detailed error information if any errors occurred
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: No

#### 9. Records Created
- **Label**: Records Created
- **ID**: custrecord_pcl_records_created
- **Type**: Integer Number
- **Help**: Number of performance records created
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: No

#### 10. Records Updated
- **Label**: Records Updated
- **ID**: custrecord_pcl_records_updated
- **Type**: Integer Number
- **Help**: Number of performance records updated
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: No

#### 11. Alerts Generated
- **Label**: Alerts Generated
- **ID**: custrecord_pcl_alerts_generated
- **Type**: Integer Number
- **Help**: Number of risk alerts generated
- **Display**: Normal Entry
- **Store Value**: Yes (checked)
- **Show in List**: No

---

## After Creating All Records

Once all custom records are created:

1. Go to your project directory
2. Run: `suitecloud object:import`
3. Select the 4 custom record types you just created
4. This will pull the correctly-formatted XML into your SDF project

The imported XML will be properly formatted and deployable to other environments.
