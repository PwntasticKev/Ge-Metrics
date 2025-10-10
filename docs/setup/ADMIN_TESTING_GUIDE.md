# 🔐 Admin Functionality Testing Guide

## ✅ **Setup Complete:**
- ✅ Database schema analyzed
- ✅ Authentication mismatch fixed (added role to user context)
- ✅ User ID 1 (Kevin) set as admin in employees table
- ✅ Admin routes and components identified

---

## 🧪 **Testing Checklist:**

### 1. **Authentication & Route Protection**
**Login as user ID 1 and test:**

- [ ] **Login Process**: Log in as Kevin (user@ge-metrics-test.com)
- [ ] **Admin Route Access**: Navigate to `/admin` - should be accessible
- [ ] **Non-Admin Protection**: Create/test with non-admin user - should redirect to `/access-denied`
- [ ] **User Object**: Check browser console - user object should have `role: 'admin'`

### 2. **Admin Dashboard (`/admin`)**
**Test main admin page:**

- [ ] **Page Loads**: Admin dashboard displays without errors
- [ ] **User List**: Table shows all users from database
- [ ] **TRPC Call**: `trpc.admin.getAllUsers.useQuery()` returns data
- [ ] **User Info**: Displays name, email, username, verified status, join date

### 3. **Admin Components Testing**
**Navigate and test each admin section:**

#### **User Management** (`/admin/user-management`)
- [ ] **Component Loads**: No React errors
- [ ] **User CRUD**: Can view/edit user details
- [ ] **Role Management**: Can assign/remove roles
- [ ] **Status Toggle**: Can activate/deactivate users

#### **Employee Management** (`/admin/employee-management`)  
- [ ] **Employee List**: Shows all employees from employees table
- [ ] **Role Assignment**: Can set admin/support/moderator roles
- [ ] **Permissions**: Can view/edit employee permissions
- [ ] **Department Management**: Can assign departments

#### **Security Logs** (`/admin/security-logs`)
- [ ] **Audit Trail**: Shows entries from audit_log table  
- [ ] **User Actions**: Logs login/logout/admin actions
- [ ] **IP Tracking**: Shows user IP addresses and timestamps
- [ ] **Search/Filter**: Can filter logs by user/action/date

#### **Billing Dashboard** (`/admin/billing-dashboard`)
- [ ] **Subscription Overview**: Shows all user subscriptions
- [ ] **Revenue Metrics**: Displays billing statistics  
- [ ] **Stripe Integration**: Shows subscription statuses
- [ ] **User Billing**: Can view individual user billing

#### **System Settings** (`/admin/system-settings`)
- [ ] **Configuration**: Can view/edit system settings
- [ ] **Feature Flags**: Can enable/disable features
- [ ] **Maintenance Mode**: Can toggle maintenance
- [ ] **API Settings**: Can configure API limits

#### **Cron Jobs** (`/admin/cron-jobs`)
- [ ] **Job Status**: Shows background job statuses
- [ ] **Scheduling**: Can view job schedules
- [ ] **Logs**: Shows job execution logs
- [ ] **Manual Trigger**: Can manually run jobs

#### **Formula Documentation** (`/admin/formula-documentation`)
- [ ] **Math Display**: Shows profit calculation formulas
- [ ] **Documentation**: Clear explanation of algorithms
- [ ] **Examples**: Working examples with real data

### 4. **Database Operations Testing**
**Verify TRPC admin procedures work:**

- [ ] **Read Operations**: Can fetch all data tables
- [ ] **Write Operations**: Can create/update records  
- [ ] **Delete Operations**: Can remove users/data (with confirmation)
- [ ] **Transaction Safety**: Database operations are atomic

### 5. **Permission System Testing**
**Test role-based access:**

- [ ] **Admin Access**: Full access to all admin features
- [ ] **Support Role**: Limited access (if applicable)
- [ ] **Moderator Role**: Specific permissions (if applicable)
- [ ] **Permission Inheritance**: Roles work as expected

### 6. **Security Testing**
**Verify admin security:**

- [ ] **CSRF Protection**: Admin actions protected from CSRF
- [ ] **Rate Limiting**: Admin endpoints have rate limits
- [ ] **Input Validation**: All admin forms validate input
- [ ] **SQL Injection**: No direct SQL in admin operations
- [ ] **XSS Protection**: Admin interface sanitizes input

---

## 🚨 **Common Issues to Check:**

### **Authentication Issues:**
- User context missing role field → ✅ Fixed
- AdminRoute not recognizing admin users → ✅ Fixed  
- TRPC admin procedures failing auth → Should work now

### **Database Issues:**
- Missing employees table entries → ✅ Fixed for user ID 1
- Incorrect role assignments → ✅ Admin role assigned
- Foreign key constraints → Should be handled by schema

### **Frontend Issues:**
- Admin components not loading → Check for missing imports
- TRPC queries failing → Check network tab for errors
- Route protection not working → Verify user.role in context

---

## 🎯 **Next Steps:**

1. **Login as admin user** (Kevin - user@ge-metrics-test.com)
2. **Navigate to `/admin`** and verify access
3. **Test each admin section** systematically
4. **Check browser console** for any errors
5. **Verify database operations** work correctly

---

## 📞 **If Issues Found:**

1. **Check browser console** for errors
2. **Check network tab** for failed API calls
3. **Verify database** has correct employee record
4. **Check server logs** for backend errors
5. **Test with different browsers** if needed

---

**Ready to test! 🚀**