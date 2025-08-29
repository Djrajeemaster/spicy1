# Admin Panel Enhancements

This document outlines the new admin features added to enhance the administrative capabilities of the platform.

## New Admin Features

### 1. Analytics Dashboard (`/admin/analytics`)
- **User Growth Charts**: Visual representation of user registration trends
- **Content Metrics**: Track deals, comments, and engagement
- **Activity Heatmaps**: User activity patterns by hour
- **Category Distribution**: Popular content categories
- **Real-time Stats**: Current online users and system metrics

### 2. Content Moderation Queue (`/admin/moderation`)
- **Unified Moderation**: Review deals, comments, and user reports in one place
- **Filtering Options**: Filter by content type (deals, comments, reports)
- **Quick Actions**: One-click approve/reject with elevation requirements
- **Report Details**: View report reasons and context
- **Bulk Operations**: Handle multiple items at once

### 3. Admin Communication System (`/admin/communication`)
- **Announcements**: Send system-wide announcements to users
- **Target Audiences**: Send to specific user groups (verified, business, moderators, all)
- **Announcement Types**: Info, warning, urgent with visual indicators
- **Push Notifications**: Optional push notifications for announcements
- **Engagement Tracking**: View announcement views and engagement metrics

### 4. Audit Log & Activity Tracking (`/admin/audit-log`)
- **Complete Audit Trail**: Track all admin actions with detailed logs
- **Search & Filtering**: Find specific actions by admin, type, or date range
- **IP Tracking**: Record IP addresses for security
- **Metadata Storage**: Additional context for each action
- **Export Capabilities**: Export audit logs for compliance

### 5. Enhanced Dashboard (`/admin/dashboard`)
- **System Overview**: Key metrics and health indicators
- **Recent Activity Feed**: Latest user registrations and admin actions
- **Quick Actions**: Fast access to common admin tasks
- **System Status**: Monitor database, API, and service health
- **Performance Metrics**: Real-time system performance indicators

## Technical Implementation

### Database Changes
- **New Tables**: `admin_announcements`, `system_notifications`, `user_reports`, `deal_likes`
- **Enhanced Columns**: Added `ip_address`, `user_agent`, `metadata` to `admin_actions`
- **Analytics Support**: User activity tracking with `last_seen` column
- **Proper Indexing**: Optimized queries for large datasets

### Edge Functions
- `admin-send-announcement`: Handle announcement creation and distribution
- `admin-approve-content`: Unified content approval system
- `admin-reject-content`: Content rejection with logging

### Services
- `adminAnalyticsService`: Data aggregation and chart data
- `adminModerationService`: Content moderation workflows
- `adminCommunicationService`: Announcement system
- `adminAuditService`: Audit log management
- `adminDashboardService`: Dashboard data aggregation

## Security Features

### Admin Elevation
- All sensitive operations require admin elevation tokens
- Time-limited elevation sessions (configurable TTL)
- Secure token validation

### Audit Trail
- Complete logging of all admin actions
- IP address and user agent tracking
- Immutable audit records
- Metadata storage for context

### Role-Based Access
- Different features available to different admin levels
- Granular permissions for moderation vs full admin
- Secure RLS policies

## Usage Guidelines

### Setting Up Analytics
1. User activity tracking automatically updates `last_seen` timestamps
2. Content metrics are calculated in real-time
3. Charts require the `react-native-chart-kit` package for mobile

### Content Moderation Workflow
1. Items appear in moderation queue based on status
2. Admin reviews content with full context
3. Approve/reject actions are logged with elevation
4. Users receive notifications of decisions

### Communication Best Practices
1. Use appropriate announcement types (info/warning/urgent)
2. Target specific audiences when relevant
3. Consider push notification impact
4. Track engagement metrics

### Audit Log Maintenance
1. Regularly review admin activity
2. Export logs for compliance requirements
3. Monitor for unusual admin behavior
4. Use search/filtering for investigations

## Installation Instructions

1. **Install Chart Dependencies** (for mobile apps):
   ```bash
   npm install react-native-chart-kit react-native-svg
   ```

2. **Run SQL Migrations**:
   ```bash
   supabase db push
   # or manually run: supabase/sql/20250828_admin_enhancements.sql
   ```

3. **Deploy Edge Functions**:
   ```bash
   supabase functions deploy admin-send-announcement admin-approve-content admin-reject-content
   ```

4. **Update Admin Navigation**:
   - New routes are automatically available in `/admin/`
   - Update your navigation to include new features

## Configuration Options

### Analytics Settings
- Time ranges: 7d, 30d, 90d
- Chart types: Line, Bar, Pie charts
- Data refresh intervals

### Moderation Settings
- Auto-approval rules
- Escalation workflows  
- Notification preferences

### Communication Settings
- Default announcement types
- Push notification templates
- Audience targeting rules

## Monitoring & Alerts

### System Health
- Database connection monitoring
- API endpoint health checks
- Storage service availability
- Cache performance

### Admin Activity
- Unusual admin behavior detection
- Failed elevation attempts
- High-volume action alerts
- Security event notifications

## Future Enhancements

### Planned Features
- Advanced analytics with ML insights
- Automated moderation rules
- A/B testing for announcements
- Advanced report correlation
- Integration with external monitoring tools

### Performance Optimizations
- Caching for frequently accessed data
- Background processing for heavy analytics
- Optimized database queries
- CDN integration for assets

## Support & Troubleshooting

### Common Issues
1. **Chart rendering issues**: Ensure `react-native-chart-kit` is properly installed
2. **Elevation token errors**: Check token expiry and permissions
3. **Missing data**: Verify RLS policies and user permissions
4. **Performance issues**: Review database indexes and query optimization

### Debug Mode
Enable debug logging by setting appropriate environment variables in your Edge Functions.

### Contact
For technical support or feature requests, please create an issue in the repository or contact the development team.
