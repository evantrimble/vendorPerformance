/**
 * NetSuite Custom Record Schemas Documentation
 * Defines the structure for vendor performance tracking records
 * 
 * This file documents the custom records needed for the Order Items
 * vendor intelligence system. These records must be created manually
 * in NetSuite before the application can store performance data.
 */

/**
 * CUSTOM RECORD TYPE: Vendor Performance Metrics
 * 
 * Purpose: Store calculated vendor performance metrics and trends
 * Record Type ID: customrecord_vendor_performance
 * 
 * This record stores the core performance metrics for each vendor,
 * calculated by the Map/Reduce script and used by the RESTlets
 * to provide vendor intelligence in the UI.
 */
const VENDOR_PERFORMANCE_RECORD = {
    recordType: 'customrecord_vendor_performance',
    name: 'Vendor Performance Metrics',
    description: 'Stores vendor performance metrics calculated from transaction history',
    
    fields: [
        {
            fieldId: 'custrecord_vp_vendor',
            fieldType: 'list',
            label: 'Vendor',
            listRecord: 'vendor',
            required: true,
            description: 'Reference to the vendor record'
        },
        {
            fieldId: 'custrecord_vp_item',
            fieldType: 'list',
            label: 'Item',
            listRecord: 'item',
            required: false,
            description: 'Optional item-specific metrics (leave blank for overall vendor metrics)'
        },
        {
            fieldId: 'custrecord_vp_calculation_date',
            fieldType: 'date',
            label: 'Calculation Date',
            required: true,
            description: 'Date when these metrics were calculated'
        },
        {
            fieldId: 'custrecord_vp_analysis_period_days',
            fieldType: 'integer',
            label: 'Analysis Period (Days)',
            required: true,
            description: 'Number of days analyzed for these metrics (e.g., 90)'
        },
        
        // Delivery Performance Metrics
        {
            fieldId: 'custrecord_vp_otd_percent',
            fieldType: 'percent',
            label: 'On-Time Delivery Rate',
            required: true,
            description: 'Percentage of deliveries made on or before due date'
        },
        {
            fieldId: 'custrecord_vp_avg_lead_time',
            fieldType: 'integer',
            label: 'Average Lead Time (Days)',
            required: true,
            description: 'Average actual lead time from PO to receipt'
        },
        {
            fieldId: 'custrecord_vp_quoted_lead_time',
            fieldType: 'integer',
            label: 'Average Quoted Lead Time (Days)',
            required: false,
            description: 'Average quoted lead time for comparison'
        },
        
        // Quality Metrics
        {
            fieldId: 'custrecord_vp_quality_rating',
            fieldType: 'float',
            label: 'Quality Rating',
            required: true,
            description: 'Quality rating on 1-5 scale based on receipts and returns'
        },
        {
            fieldId: 'custrecord_vp_defect_rate',
            fieldType: 'percent',
            label: 'Defect Rate',
            required: true,
            description: 'Percentage of items received with defects or requiring returns'
        },
        
        // Cost Performance Metrics
        {
            fieldId: 'custrecord_vp_price_variance',
            fieldType: 'percent',
            label: 'Price Variance',
            required: true,
            description: 'Price variance vs historical average (positive = increase)'
        },
        {
            fieldId: 'custrecord_vp_cost_stability',
            fieldType: 'percent',
            label: 'Cost Stability Score',
            required: false,
            description: 'Score indicating price stability over time (higher = more stable)'
        },
        
        // Risk Assessment
        {
            fieldId: 'custrecord_vp_risk_score',
            fieldType: 'integer',
            label: 'Risk Score',
            required: true,
            description: 'Overall risk score 0-100 (higher = more risk)'
        },
        {
            fieldId: 'custrecord_vp_risk_level',
            fieldType: 'list',
            label: 'Risk Level',
            listValues: ['Low', 'Medium', 'High'],
            required: true,
            description: 'Categorized risk level'
        },
        
        // Volume Metrics
        {
            fieldId: 'custrecord_vp_total_orders',
            fieldType: 'integer',
            label: 'Total Orders Analyzed',
            required: true,
            description: 'Number of purchase orders included in analysis'
        },
        {
            fieldId: 'custrecord_vp_total_value',
            fieldType: 'currency',
            label: 'Total Order Value',
            required: false,
            description: 'Total value of orders in analysis period'
        },
        {
            fieldId: 'custrecord_vp_avg_order_value',
            fieldType: 'currency',
            label: 'Average Order Value',
            required: false,
            description: 'Average value per purchase order'
        },
        
        // Communication Metrics
        {
            fieldId: 'custrecord_vp_response_time_hours',
            fieldType: 'float',
            label: 'Avg Response Time (Hours)',
            required: false,
            description: 'Average response time to communications'
        },
        
        // Tracking Fields
        {
            fieldId: 'custrecord_vp_last_order_date',
            fieldType: 'date',
            label: 'Last Order Date',
            required: false,
            description: 'Date of most recent purchase order'
        },
        {
            fieldId: 'custrecord_vp_order_frequency',
            fieldType: 'float',
            label: 'Order Frequency (per month)',
            required: false,
            description: 'Average number of orders per month'
        }
    ],
    
    // Indexes for performance
    indexes: [
        {
            name: 'vendor_calc_date',
            fields: ['custrecord_vp_vendor', 'custrecord_vp_calculation_date']
        },
        {
            name: 'vendor_item',
            fields: ['custrecord_vp_vendor', 'custrecord_vp_item']
        },
        {
            name: 'risk_level',
            fields: ['custrecord_vp_risk_level', 'custrecord_vp_calculation_date']
        }
    ]
};

/**
 * CUSTOM RECORD TYPE: Vendor Performance Trends
 * 
 * Purpose: Store historical trend data for vendor performance
 * Record Type ID: customrecord_vendor_trends
 * 
 * This record stores trend comparisons between periods to show
 * whether vendor performance is improving or declining.
 */
const VENDOR_TRENDS_RECORD = {
    recordType: 'customrecord_vendor_trends',
    name: 'Vendor Performance Trends',
    description: 'Historical trend data comparing vendor performance periods',
    
    fields: [
        {
            fieldId: 'custrecord_vt_vendor',
            fieldType: 'list',
            label: 'Vendor',
            listRecord: 'vendor',
            required: true,
            description: 'Reference to the vendor record'
        },
        {
            fieldId: 'custrecord_vt_comparison_date',
            fieldType: 'date',
            label: 'Comparison Date',
            required: true,
            description: 'Date when this trend comparison was calculated'
        },
        {
            fieldId: 'custrecord_vt_current_period_days',
            fieldType: 'integer',
            label: 'Current Period (Days)',
            required: true,
            description: 'Length of current analysis period'
        },
        {
            fieldId: 'custrecord_vt_previous_period_days',
            fieldType: 'integer',
            label: 'Previous Period (Days)',
            required: true,
            description: 'Length of previous analysis period for comparison'
        },
        
        // Trend Calculations (percentage change from previous period)
        {
            fieldId: 'custrecord_vt_otd_trend',
            fieldType: 'percent',
            label: 'OTD Trend',
            required: true,
            description: 'Change in on-time delivery rate (positive = improvement)'
        },
        {
            fieldId: 'custrecord_vt_quality_trend',
            fieldType: 'float',
            label: 'Quality Trend',
            required: true,
            description: 'Change in quality rating (positive = improvement)'
        },
        {
            fieldId: 'custrecord_vt_defect_trend',
            fieldType: 'percent',
            label: 'Defect Rate Trend',
            required: true,
            description: 'Change in defect rate (negative = improvement)'
        },
        {
            fieldId: 'custrecord_vt_price_trend',
            fieldType: 'percent',
            label: 'Price Trend',
            required: true,
            description: 'Change in price variance (negative = improvement)'
        },
        {
            fieldId: 'custrecord_vt_leadtime_trend',
            fieldType: 'integer',
            label: 'Lead Time Trend (Days)',
            required: true,
            description: 'Change in average lead time (negative = improvement)'
        },
        
        // Overall Trend Indicators
        {
            fieldId: 'custrecord_vt_overall_trend',
            fieldType: 'list',
            label: 'Overall Trend',
            listValues: ['Improving', 'Stable', 'Declining'],
            required: true,
            description: 'Overall performance trend assessment'
        },
        {
            fieldId: 'custrecord_vt_risk_change',
            fieldType: 'integer',
            label: 'Risk Score Change',
            required: true,
            description: 'Change in risk score (negative = improvement)'
        }
    ]
};

/**
 * CUSTOM RECORD TYPE: Vendor Risk Alerts
 * 
 * Purpose: Store and manage risk alerts for vendors
 * Record Type ID: customrecord_vendor_risk_alerts
 * 
 * This record tracks risk alerts generated when vendor performance
 * falls below acceptable thresholds.
 */
const VENDOR_RISK_ALERTS_RECORD = {
    recordType: 'customrecord_vendor_risk_alerts',
    name: 'Vendor Risk Alerts',
    description: 'Risk alerts and notifications for vendor performance issues',
    
    fields: [
        {
            fieldId: 'custrecord_vra_vendor',
            fieldType: 'list',
            label: 'Vendor',
            listRecord: 'vendor',
            required: true,
            description: 'Vendor associated with this alert'
        },
        {
            fieldId: 'custrecord_vra_alert_date',
            fieldType: 'datetime',
            label: 'Alert Date',
            required: true,
            description: 'When this alert was generated'
        },
        {
            fieldId: 'custrecord_vra_alert_type',
            fieldType: 'list',
            label: 'Alert Type',
            listValues: ['On-Time Delivery', 'Quality Rating', 'Defect Rate', 'Price Variance', 'Multiple Issues'],
            required: true,
            description: 'Type of performance issue triggering alert'
        },
        {
            fieldId: 'custrecord_vra_severity',
            fieldType: 'list',
            label: 'Severity',
            listValues: ['Low', 'Medium', 'High', 'Critical'],
            required: true,
            description: 'Alert severity level'
        },
        {
            fieldId: 'custrecord_vra_description',
            fieldType: 'textarea',
            label: 'Alert Description',
            required: true,
            description: 'Detailed description of the performance issue'
        },
        {
            fieldId: 'custrecord_vra_threshold_value',
            fieldType: 'float',
            label: 'Threshold Value',
            required: false,
            description: 'The threshold value that was breached'
        },
        {
            fieldId: 'custrecord_vra_actual_value',
            fieldType: 'float',
            label: 'Actual Value',
            required: false,
            description: 'The actual performance value that triggered alert'
        },
        {
            fieldId: 'custrecord_vra_status',
            fieldType: 'list',
            label: 'Status',
            listValues: ['Active', 'Acknowledged', 'Resolved', 'Dismissed'],
            required: true,
            defaultValue: 'Active',
            description: 'Current status of this alert'
        },
        {
            fieldId: 'custrecord_vra_acknowledged_by',
            fieldType: 'list',
            label: 'Acknowledged By',
            listRecord: 'employee',
            required: false,
            description: 'Employee who acknowledged this alert'
        },
        {
            fieldId: 'custrecord_vra_acknowledged_date',
            fieldType: 'datetime',
            label: 'Acknowledged Date',
            required: false,
            description: 'When this alert was acknowledged'
        },
        {
            fieldId: 'custrecord_vra_resolution_notes',
            fieldType: 'textarea',
            label: 'Resolution Notes',
            required: false,
            description: 'Notes about how this issue was resolved'
        }
    ]
};

/**
 * CUSTOM RECORD TYPE: Performance Calculation Log
 * 
 * Purpose: Track performance calculation runs and results
 * Record Type ID: customrecord_perf_calc_log
 * 
 * This record logs each run of the performance calculation script
 * for monitoring and troubleshooting purposes.
 */
const PERFORMANCE_CALC_LOG_RECORD = {
    recordType: 'customrecord_perf_calc_log',
    name: 'Performance Calculation Log',
    description: 'Log of performance calculation script executions',
    
    fields: [
        {
            fieldId: 'custrecord_pcl_execution_date',
            fieldType: 'datetime',
            label: 'Execution Date',
            required: true,
            description: 'When the calculation script was executed'
        },
        {
            fieldId: 'custrecord_pcl_analysis_period',
            fieldType: 'integer',
            label: 'Analysis Period (Days)',
            required: true,
            description: 'Number of days analyzed in this run'
        },
        {
            fieldId: 'custrecord_pcl_vendors_processed',
            fieldType: 'integer',
            label: 'Vendors Processed',
            required: true,
            description: 'Number of vendors processed in this run'
        },
        {
            fieldId: 'custrecord_pcl_high_risk_vendors',
            fieldType: 'integer',
            label: 'High Risk Vendors Found',
            required: true,
            description: 'Number of high-risk vendors identified'
        },
        {
            fieldId: 'custrecord_pcl_errors',
            fieldType: 'integer',
            label: 'Error Count',
            required: true,
            description: 'Number of errors encountered during processing'
        },
        {
            fieldId: 'custrecord_pcl_execution_time',
            fieldType: 'integer',
            label: 'Execution Time (Seconds)',
            required: false,
            description: 'Total execution time for the calculation'
        },
        {
            fieldId: 'custrecord_pcl_status',
            fieldType: 'list',
            label: 'Status',
            listValues: ['Success', 'Partial Success', 'Failed'],
            required: true,
            description: 'Overall status of the calculation run'
        },
        {
            fieldId: 'custrecord_pcl_error_details',
            fieldType: 'longtext',
            label: 'Error Details',
            required: false,
            description: 'Detailed error information if any errors occurred'
        }
    ]
};

/**
 * Setup Instructions for NetSuite Administrators
 * 
 * To implement this vendor performance system, create the following
 * custom records in NetSuite with the field definitions above:
 * 
 * 1. Create Custom Record Types:
 *    - Go to Customization > Lists, Records, & Fields > Record Types > New
 *    - Create each record type using the specifications above
 *    - Set appropriate permissions for roles that need access
 * 
 * 2. Create Custom Fields:
 *    - For each record type, create the fields as specified
 *    - Pay attention to field types and validation requirements
 *    - Set up list values for list/select fields
 * 
 * 3. Set up Indexes:
 *    - Create indexes on the specified field combinations
 *    - This will improve search performance for large datasets
 * 
 * 4. Configure Permissions:
 *    - Grant appropriate view/edit permissions to relevant roles
 *    - Scripts will need full access to create/update records
 * 
 * 5. Set up Workflows (Optional):
 *    - Create workflows to send notifications for high-risk alerts
 *    - Set up automatic status updates based on business rules
 */

/**
 * Sample Data Structure Examples
 * 
 * These examples show what the data looks like when populated:
 */
const SAMPLE_VENDOR_PERFORMANCE_RECORD = {
    custrecord_vp_vendor: 'vendor_123',
    custrecord_vp_calculation_date: '2024-10-08',
    custrecord_vp_analysis_period_days: 90,
    custrecord_vp_otd_percent: 94.5,
    custrecord_vp_avg_lead_time: 12,
    custrecord_vp_quoted_lead_time: 14,
    custrecord_vp_quality_rating: 4.6,
    custrecord_vp_defect_rate: 1.2,
    custrecord_vp_price_variance: -2.3,
    custrecord_vp_risk_score: 15,
    custrecord_vp_risk_level: 'Low',
    custrecord_vp_total_orders: 45,
    custrecord_vp_total_value: 125000.00,
    custrecord_vp_response_time_hours: 4.2
};

const SAMPLE_RISK_ALERT_RECORD = {
    custrecord_vra_vendor: 'vendor_456',
    custrecord_vra_alert_date: '2024-10-08 14:30:00',
    custrecord_vra_alert_type: 'On-Time Delivery',
    custrecord_vra_severity: 'High',
    custrecord_vra_description: 'On-time delivery rate has dropped to 78% over the last 30 days, below the 85% threshold.',
    custrecord_vra_threshold_value: 85.0,
    custrecord_vra_actual_value: 78.2,
    custrecord_vra_status: 'Active'
};

// Export the schema definitions for reference
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        VENDOR_PERFORMANCE_RECORD,
        VENDOR_TRENDS_RECORD,
        VENDOR_RISK_ALERTS_RECORD,
        PERFORMANCE_CALC_LOG_RECORD
    };
}