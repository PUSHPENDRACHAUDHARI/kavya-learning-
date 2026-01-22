# Manage Parent Feature - Implementation Guide

## Overview
The "Manage Parent" feature has been successfully added to the Admin Panel, allowing administrators to view, search, filter, and manage parent accounts in the system.

## Frontend Changes

### 1. Sidebar Update (`frontend/src/components/Sidebar.jsx`)
- Added "Manage Parents" menu item in the Admin section
- Uses `MdSchool` icon for consistency
- Positioned below "Manage Students"

### 2. New AdminParents Component (`frontend/src/pages/Admin/AdminParents.jsx`)
A complete parent management interface with the following features:

#### Features:
- **Display Parent Information:**
  - Parent ID
  - Parent Name
  - Email
  - Phone Number
  - Associated Students (linked children)
  - Account Status (Active/Blocked)
  - Created Date

- **Search & Filter:**
  - Search by parent name
  - Search by email address
  - Search by phone number
  - Filter by status (All, Active, Blocked)

- **Pagination:**
  - 10 items per page
  - Navigation buttons (First, Previous, Next, Last)
  - Page number display and selection

- **Actions:**
  - **Block Parent:** Prevents the parent from logging in
  - **Unblock Parent:** Re-activates a blocked parent account
  - Confirmation dialogs for safety

### 3. App Router Update (`frontend/src/App.jsx`)
- Added import for `AdminParents` component
- Added route: `/admin/parents` with admin access protection

## Backend Changes

### 1. Enhanced `listUsers` Function (`backend/controllers/adminController.js`)
- Updated to populate the `children` field when fetching parents
- This ensures parent's linked students are returned with the data

### Existing Backend Endpoints Used:
- `GET /api/admin/users?role=parent` - Fetches all parents
- `PUT /api/admin/users/:id/block` - Blocks a parent account
- `PUT /api/admin/users/:id/unblock` - Unblocks a parent account

Both endpoints already existed and work seamlessly with the Admin Parents feature.

## UI/UX Implementation

### Follows Existing Patterns:
- **Layout:** Identical to AdminStudents component
- **Styling:** Uses the same admin-dark-mode.css
- **Table Design:** Consistent header and row structure
- **Buttons:** Matched styling for Block/Unblock actions
- **Status Badges:** Red for blocked, green for active

### Responsive Features:
- Search inputs update results in real-time
- Pagination resets to page 1 when filters change
- Loading state while fetching data
- Empty state message when no parents found

## Access Control
- Only Admin and Sub-Admin users with `manageStudents` permission can access this feature
- Route is protected via `ProtectedRoute` component with `requireAdmin={true}`

## Data Flow

```
User clicks "Manage Parents" in sidebar
    ↓
Navigates to /admin/parents
    ↓
AdminParents component loads
    ↓
Fetches data via GET /api/admin/users?role=parent
    ↓
Backend populates parent data with children field
    ↓
Component displays table with search/filter/pagination
    ↓
User can block/unblock parents via button clicks
    ↓
Block/Unblock requests sent to /api/admin/users/:id/block|unblock
    ↓
Table refreshes after action
```

## Usage Instructions

### Viewing Parents:
1. Navigate to Admin Panel
2. Click "Manage Parents" from the sidebar
3. View all parents in the table

### Searching/Filtering:
1. Enter parent name in "Search by name" field
2. Enter email in "Search by email" field
3. Enter phone in "Search by phone" field
4. Select status filter (All/Active/Blocked)
5. Results update automatically

### Blocking/Unblocking:
1. Find the parent in the table
2. Click "Block" button (red) to block or "Unblock" button (green) to unblock
3. Confirm the action in the popup
4. Table updates automatically

### Pagination:
1. Use page number buttons to navigate
2. Use "First" and "Last" to jump to extremes
3. Use "Previous" and "Next" for sequential navigation
4. Current page and total pages displayed

## Technical Details

### Component State:
- `parents` - Array of parent objects
- `loading` - Loading state
- `searchQuery` - Name search filter
- `emailSearch` - Email search filter
- `phoneSearch` - Phone search filter
- `statusFilter` - Account status filter
- `currentPage` - Current pagination page
- `itemsPerPage` - Items per page (10)

### API Response Structure:
```javascript
{
  data: [
    {
      _id: "parentId",
      fullName: "Parent Name",
      email: "parent@example.com",
      phone: "1234567890",
      user_status: "Active|Blocked",
      createdAt: "2024-01-01T00:00:00Z",
      children: [
        { _id: "studentId", fullName: "Student Name", email: "student@example.com" }
      ],
      address: { street, city, state, zipCode }
    }
  ],
  total: 50
}
```

## Error Handling
- Displays alerts for block/unblock failures
- Shows loading state during data fetching
- Displays "No parents found" for empty results
- Gracefully handles API errors

## Future Enhancements
- Edit parent details modal
- Delete parent functionality (with confirmation)
- Export parent data to CSV
- Advanced filters (city, address)
- Bulk operations (block multiple parents)
- Parent activity logs
- Communication history with parents
