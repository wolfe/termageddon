# Termageddon User Guide

## Overview

Termageddon is a corporate glossary management system designed to help organizations maintain consistent terminology across teams and projects, organized by perspectives. It features an approval workflow, commenting system, and rich text editing capabilities.

## Getting Started

### Accessing the System

1. Navigate to `http://localhost:4200` in your web browser
2. Log in with your credentials:
   - **Admin:** admin / admin
   - **Test User:** maria.flores / maria.flores
   - **Other Users:** <firstname>.<lastname> / <firstname>.<lastname>

### System Requirements

- Modern web browser (Chrome recommended)
- JavaScript enabled
- Backend API running on `http://localhost:8000`

## User Interface Overview

### Main Layout

The application features a clean, professional interface with:

- **Header:** Termageddon-branded navigation with user info and logout
- **Sidebar (30%):** Term list with search and filtering options
- **Main Content (70%):** Term details and editing interface
- **Navigation Tabs:** Glossary, Review Dashboard, My Drafts

### Navigation

- **Glossary:** Main term browsing and management
- **Review Dashboard:** Approve pending drafts (perspective curators and staff only)
- **My Drafts:** Personal draft management and review progress tracking
- **Logout:** Sign out of the system

## Managing Terms

### Browsing Terms

The sidebar provides several ways to find terms:

#### Search
- Type in the search box to find terms by name
- Search is case-insensitive and matches partial terms
- Results update as you type

#### Filters
- **Perspective:** Filter by business perspective (e.g., Technology, Finance)
- **Approval Status:** 
  - All: Show all terms
  - Approved: Show only approved definitions
  - Pending: Show terms awaiting approval
  - No Draft: Show terms without definitions
- **Author:** Filter by who created the definition
- **Official:** Filter by official status
- **Sort:** Order by term name, creation date, or last updated

#### Clear Filters
- Click "Clear Filters" to reset all filters
- Shows count of active filters

### Viewing Term Details

When you select a term, the main panel shows:

- **Term Name:** The term being defined
- **Perspective:** Business perspective classification
- **Status Badges:**
  - Official: Green badge for approved terms
  - Pending: Yellow badge for terms awaiting approval
  - Draft: Gray badge for unpublished versions
- **Approvers:** Avatars showing who has approved the definition
- **Content:** Rich text definition with custom links
- **Metadata:** Author and last updated information

## Creating and Editing Definitions

### Rich Text Editor

The system uses TinyMCE for rich text editing with:

#### Toolbar Options
- **Formatting:** Bold, italic, underline
- **Structure:** Blockquotes, code blocks
- **Lists:** Ordered and bullet lists
- **Indentation:** Increase/decrease indentation
- **Alignment:** Left, center, right, justify
- **Links:** Standard links and custom term links
- **Clean:** Remove formatting

#### Custom Link Management
- Click the custom link button (chain icon) to create internal references
- Select existing terms to link to
- Links automatically update if term names change
- Hover over links to see term definitions

### Creating a New Definition

1. **Select a term** from the sidebar
2. **Click "Edit"** if the term exists, or "Create Definition" if new
3. **Enter content** using the rich text editor
4. **Add custom links** to related terms as needed
5. **Save** your changes

### Editing Existing Definitions

1. **Select the term** from the sidebar
2. **Click "Edit"** button
3. **Modify content** in the rich text editor
4. **Save** your changes

### Draft Control

- Each edit updates your unpublished draft
- Previous drafts are preserved in history
- Only one draft can be active at a time
- Unpublished drafts can be edited without creating new versions

## Approval Workflow

### For Perspective Curators and Staff

#### Review Dashboard
- Access via the "Review Dashboard" link in navigation
- Shows all pending definitions requiring approval
- Filter by domain, author, or date

#### Approving Definitions
1. **Review the definition** for accuracy and completeness
2. **Check custom links** to ensure they work correctly
3. **Click "Approve"** if the definition meets standards
4. **Add comments** if changes are needed

#### Approval Requirements
- Minimum 2 approvals required for publication
- Perspective curators can approve definitions in their perspective
- Staff members can approve any definition
- Once approved, drafts can be published

### For Regular Users

#### Submitting for Review
- All new definitions start as drafts
- Request specific reviewers for your draft
- Users can track draft progress in My Drafts tab
- Edit drafts during approval process (clears approvals)

#### Viewing Status
- Check approval status in term details and My Drafts
- Pending drafts show "Pending" badge
- Approved and published drafts show "Published" badge
- Endorsed definitions show "Endorsed" badge

## My Drafts

The My Drafts tab provides a personal workspace to manage and track your draft submissions.

### Viewing Your Drafts

Access My Drafts from the main navigation to see:

- **All Your Drafts:** Every draft you've authored
- **Approval Status:** Current number of approvals vs required
- **Requested Reviewers:** Who you've asked to review
- **Approved By:** List of users who have already approved
- **Progress Indicators:** Visual feedback on draft status

### Managing Drafts

From My Drafts, you can:

- **Edit Drafts:** Click on any draft to edit it (clears existing approvals)
- **Request Reviewers:** Add or change requested reviewers
- **Track Progress:** Monitor approval status and reviewer activity
- **Publish:** Publish drafts once they have sufficient approvals
- **View History:** See all previous versions of your draft

### Draft States

- **In Progress:** Draft not yet submitted for review
- **Pending Review:** Awaiting approvals from requested reviewers
- **Approved:** Has sufficient approvals, ready to publish
- **Published:** Active version visible in the glossary

## Comment System

### Adding Comments
1. **Select a term** with an existing definition
2. **Click "Add Comment"** button
3. **Enter your feedback** or questions
4. **Submit** the comment

### Managing Comments
- **View all comments** for a term
- **Resolve comments** when addressed
- **Unresolve comments** if issues persist
- **Filter by resolved status**

### Comment Workflow
- Comments help improve definition quality
- Authors can respond to comments
- Comments can be resolved when issues are fixed
- Resolved comments remain visible for reference

## User Roles and Permissions

### Regular Users
- View all terms and definitions
- Create and edit drafts
- Add comments
- Request reviewers for drafts
- Track draft progress in My Drafts

### Perspective Curators
- All regular user permissions
- Approve drafts in their perspective
- Access review dashboard
- Endorse definitions as official

### Staff Members
- All perspective curator permissions
- Approve drafts in any perspective
- Manage user roles
- Access admin functions

## Best Practices

### Writing Definitions
- **Be Clear:** Use simple, clear language
- **Be Complete:** Include all necessary information
- **Be Consistent:** Follow established terminology
- **Use Examples:** Include examples when helpful
- **Link Related Terms:** Use custom links to connect related concepts

### Reviewing Definitions
- **Check Accuracy:** Verify technical accuracy
- **Check Completeness:** Ensure all important aspects are covered
- **Check Clarity:** Ensure the definition is understandable
- **Check Consistency:** Verify it aligns with other definitions
- **Check Links:** Ensure custom links work correctly

### Using Comments
- **Be Specific:** Point out exact issues
- **Be Constructive:** Suggest improvements
- **Be Professional:** Maintain respectful tone
- **Resolve When Fixed:** Mark comments as resolved when addressed

## Troubleshooting

### Common Issues

#### Can't Log In
- Verify username and password
- Check that backend is running
- Clear browser cache and cookies

#### Can't Edit Definitions
- Ensure you're logged in
- Check your user permissions
- Verify the term exists

#### Links Not Working
- Check that linked terms exist
- Verify custom link syntax
- Try refreshing the page

#### Search Not Working
- Check your search terms
- Try different keywords
- Clear filters and try again

#### Approval Issues
- Verify you have domain expert or staff role
- Check that definition meets approval criteria
- Contact administrator if problems persist

### Getting Help

- **Check this guide** for common solutions
- **Contact your administrator** for permission issues
- **Report bugs** to the development team
- **Suggest improvements** through the feedback system

## Keyboard Shortcuts

- **Ctrl+F:** Focus search box
- **Ctrl+S:** Save current definition
- **Ctrl+Z:** Undo in editor
- **Ctrl+Y:** Redo in editor
- **Escape:** Close dialogs and modals

## Mobile Usage

The interface is responsive and works on:
- Tablets (iPad, Android tablets)
- Large phones (iPhone Plus, Android phablets)
- Small phones (limited functionality)

## Data Export

Currently, data export is not available through the user interface. Contact your administrator for data export needs.

## Security

- **Authentication:** All actions require valid login
- **Authorization:** Users can only access appropriate functions
- **Data Protection:** All data is encrypted in transit
- **Audit Trail:** All changes are logged with timestamps

## Performance Tips

- **Use Filters:** Narrow down results for faster loading
- **Clear Filters:** Reset filters when switching contexts
- **Refresh Periodically:** Refresh to see latest changes
- **Close Unused Tabs:** Close browser tabs to free memory

## Future Features

Planned enhancements include:
- **Version History:** View past versions of definitions
- **Bulk Operations:** Mass approve/reject definitions
- **Export Functionality:** Export glossary to various formats
- **Advanced Search:** Full-text search across definitions
- **User Management:** Admin interface for user roles
- **Notifications:** Email notifications for approvals and comments
- **API Access:** Programmatic access to glossary data

## Support

For additional support:
- **Documentation:** Refer to this guide and API documentation
- **Training:** Contact your administrator for training sessions
- **Technical Issues:** Report to the development team
- **Feature Requests:** Submit through the feedback system

## Glossary of Terms

- **Definition:** The explanation of a term
- **Perspective:** Business area classification (e.g., Technology, Finance)
- **Entry:** A term with its associated definition and metadata
- **Endorsed:** A definition that has been endorsed by a perspective curator
- **Published:** A draft that has been approved and made active
- **Pending:** A draft awaiting approval
- **Draft:** An unpublished version of a definition
- **Approver:** User who can approve drafts
- **Perspective Curator:** User with approval and endorsement rights for specific perspectives
- **Staff:** User with full system access and approval rights
