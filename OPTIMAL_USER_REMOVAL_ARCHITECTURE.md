# Optimal User Removal & Management Architecture

## 🎯 **Core Principles**

### **1. Data Integrity**
- **NEVER** update `profiles.gym_id` to `null`
- Use `user_roles.is_active = false` as the single source of truth
- Preserve all historical data and relationships

### **2. User Experience Flow**
- **Active Users**: Normal gym access
- **Inactive Users**: Clear messaging + options to create new gym or wait for reactivation
- **Staff Management**: Separate views for active/inactive staff with reactivation capabilities

### **3. Permission-Based Access**
- Only users with `staff.delete` can deactivate users
- Only users with `staff.update` can reactivate users
- Clear separation of concerns

## 🏗️ **Architecture Components**

### **A. Middleware Enhancement**
```typescript
// Current: INNER JOIN (fails for inactive users)
user_roles!inner(is_active = true)

// New: LEFT JOIN (handles inactive users gracefully)
user_roles!left(is_active = true)
```

### **B. User State Detection**
```typescript
interface UserState {
  isActive: boolean;        // has active role in any gym
  hasGym: boolean;          // has gym_id in profile
  canCreateGym: boolean;    // eligible to create new gym
  isDeactivated: boolean;   // explicitly deactivated (not just no gym)
}
```

### **C. Staff Management Views**
- **Active Staff**: Current working staff
- **Inactive Staff**: Deactivated staff (with reactivation option)
- **All Staff**: Combined view with status indicators

## 🔄 **User Flow States**

### **State 1: Active User (Normal Flow)**
```
User Login → hasGym: true, isActive: true → Dashboard
```

### **State 2: Inactive User (Removed from Gym)**
```
User Login → hasGym: true, isActive: false → InactiveUserPage
```

**InactiveUserPage Options:**
1. **Create New Gym**: If eligible (not banned, subscription allows)
2. **Request Reactivation**: Contact gym owner
3. **Join Another Gym**: Via invitation

### **State 3: No Gym User (New User)**
```
User Login → hasGym: false, isActive: false → OnboardingPage
```

## 🎛️ **Staff Management Interface**

### **Active Staff View**
- List all active staff members
- Role management
- Deactivate option (for users with `staff.delete`)

### **Inactive Staff View** 
- List all inactive staff members
- Reactivation option (for users with `staff.update`)
- Permanent removal option (for owners only)

### **Combined Staff View**
- Toggle between Active/Inactive/All
- Status indicators
- Bulk actions

## 🛡️ **Permission Matrix**

| Action | Owner | Manager | Staff | Trainer | Member |
|--------|-------|---------|-------|---------|--------|
| Deactivate Staff | ✅ | ❌ | ❌ | ❌ | ❌ |
| Reactivate Staff | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create New Gym | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Inactive Staff | ✅ | ✅ | ❌ | ❌ | ❌ |

## 🔧 **Implementation Plan**

### **Phase 1: Core Infrastructure**
1. Fix middleware to handle inactive users
2. Create `InactiveUserPage` component
3. Update `deleteUserFromGym` to NOT update profile

### **Phase 2: Staff Management**
1. Add inactive staff queries
2. Create staff management interface
3. Add reactivation functionality

### **Phase 3: Enhanced UX**
1. Add clear messaging for inactive users
2. Implement gym creation eligibility
3. Add reactivation request system

## 📊 **Database Schema (No Changes Needed)**

```sql
-- Keep existing schema - it's already optimal
profiles: {
  id, gym_id, ...  -- gym_id stays intact
}

user_roles: {
  user_id, gym_id, role_id, is_active, ...  -- is_active is the control
}
```

## 🎯 **Benefits of This Architecture**

### **1. Data Integrity**
- No orphaned data
- Complete audit trail
- Easy to reactivate users

### **2. User Experience**
- Clear messaging for inactive users
- Multiple options for resolution
- No confusing redirects

### **3. Staff Management**
- Clear separation of active/inactive
- Easy reactivation process
- Proper permission controls

### **4. Scalability**
- Handles multiple gym scenarios
- Supports complex role hierarchies
- Future-proof design

### **5. Business Logic**
- Preserves subscription relationships
- Maintains billing connections
- Supports multi-gym users

## 🚀 **Next Steps**

1. **Update middleware** to handle inactive users
2. **Create InactiveUserPage** component
3. **Simplify deleteUserFromGym** (remove profile update)
4. **Add staff management views**
5. **Implement reactivation flow**
