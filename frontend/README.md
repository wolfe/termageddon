# Termageddon Frontend

Angular 17 frontend for the Termageddon glossary management system with Termageddon branding.

## Features

- **Login & Authentication** with token-based auth
- **Glossary Browser** with advanced search and filtering
- **Term List** with search by term, perspective filter, approval status, author, and official status
- **Term Detail View** with approval status and metadata
- **Rich Text Editor** using Quill.js for creating/editing definitions
- **Custom Link Management** for internal term references
- **Review Dashboard** for approving pending definitions
- **Comment System** for collaborative feedback
- **Termageddon Brand Colors** (#E31937 red, #003A70 blue)
- **Slack-like Density** for efficient use of screen space
- **Tailwind CSS** for styling
- **Standalone Components** (Angular 17 architecture)

## Tech Stack

- Angular 17
- Tailwind CSS 3.x
- TypeScript 5.x
- Quill.js (for future WYSIWYG editor)
- RxJS for reactive programming

## Installation

### Prerequisites

- Node.js 18+ and npm
- Backend API running on `http://localhost:8000`

### Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Start the development server:**

   ```bash
   npm start
   ```

   Or:

   ```bash
   ng serve
   ```

   Application will be available at: `http://localhost:4200`

## Project Structure

```
frontend/src/app/
├── components/
│   ├── login/              # Login page
│   ├── main-layout/        # Main app layout with nav
│   ├── glossary-view/      # Container for term list & detail
│   ├── term-list/          # Sidebar with searchable term list
│   └── term-detail/        # Main content area showing term definition
├── guards/
│   └── auth.guard.ts       # Route guard for authentication
├── models/
│   └── index.ts            # TypeScript interfaces
├── services/
│   ├── auth.service.ts     # Authentication service
│   ├── auth.interceptor.ts # HTTP interceptor for token
│   ├── glossary.service.ts # API calls for glossary data
│   ├── comment.service.ts  # Comment management
│   └── permission.service.ts # Permission checks
├── app.component.ts        # Root component
├── app.config.ts           # App configuration
└── app.routes.ts           # Route definitions
```

## API Integration

The frontend connects to the Django backend API at `http://localhost:8000/api/`:

- **Authentication:** Token-based auth with interceptor
- **Endpoints:**
  - `/auth/login/` - User login
  - `/auth/logout/` - User logout
  - `/auth/me/` - Current user info
  - `/perspectives/` - Perspective list
  - `/terms/` - Term list with search
  - `/entries/` - Entry list with advanced filters
  - `/entry-versions/` - Version management
  - `/comments/` - Comment system

## User Credentials

Test with these credentials from the backend:

- **Admin:** admin / admin
- **Test User:** maria.flores / maria.flores
- **Other Users:** <firstname>.<lastname> / <firstname>.<lastname>

## Features

### Login Page
- Clean, branded login form
- Form validation
- Error messaging
- Auto-redirect after successful login

### Main Layout
- Termageddon red header (#E31937)
- User info display
- Navigation links
- Logout button

### Glossary View (30/70 Split)
- **Left Sidebar (30%):**
  - Search box for terms
  - Perspective filter dropdown
  - Approval status filter
  - Author filter
  - Official status filter
  - Sort options
  - Clear filters button
  - Scrollable term list
  - Visual indicators for approval status
  - Highlighting for selected term

- **Right Panel (70%):**
  - Term name and perspective
  - Official/approval status badges
  - Approver avatars (initials)
  - Rich text content with custom links
  - Author and timestamp metadata
  - Comment system

## Styling

### Termageddon Brand Colors

```scss
$termageddon-red: #E31937;
$termageddon-blue: #003A70;
$termageddon-gray-light: #F5F5F5;
$termageddon-gray-dark: #333333;
```

### Tailwind Configuration

Custom Tailwind theme extends default colors with Termageddon brand palette.

### Dense UI

- Base font size: 14px
- Compact padding (4px, 8px, 12px scale)
- Tight line height (1.4)
- Minimal whitespace between elements

## Development

### Running Tests

```bash
ng test
```

### Building for Production

```bash
ng build --configuration production
```

Output will be in `dist/frontend/`.

### Linting

```bash
ng lint
```

## Browser Support

Optimized for **Chrome** (as requested). Modern JavaScript features are used without legacy browser support.

## State Management

- **AuthService:** Manages authentication tokens in localStorage
- **PermissionService:** Manages current user state via BehaviorSubject
- **Component-level state:** For UI interactions

## Security

- **Token Storage:** Tokens stored in localStorage
- **HTTP Interceptor:** Automatically adds Authorization header
- **Auth Guard:** Protects routes requiring authentication
- **HTML Sanitization:** Safe HTML rendering with DomSanitizer

## API Error Handling

- HTTP errors are caught and displayed to users
- Network failures show user-friendly messages
- 401 errors redirect to login
- Validation errors displayed inline

## Future Enhancements

The following features are designed but not yet implemented:

- **Version History:** View past versions of definitions
- **Bulk Operations:** Mass approve/reject definitions
- **Export Functionality:** Export glossary to various formats
- **Advanced Search:** Full-text search across definitions
- **User Management:** Admin interface for user roles

## Troubleshooting

**Issue:** CORS errors when calling API
- **Solution:** Ensure backend CORS settings include `http://localhost:4200`

**Issue:** 401 Unauthorized errors
- **Solution:** Check that token is stored in localStorage and backend is running

**Issue:** Blank screen after login
- **Solution:** Check browser console for errors, ensure backend API is accessible

**Issue:** npm install fails
- **Solution:** Delete `node_modules` and `package-lock.json`, run `npm install` again

## Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run unit tests
- `npm run lint` - Run linter

## Environment Configuration

API URL is currently hardcoded to `http://localhost:8000/api`. For production, update the `API_URL` constant in each service file or use Angular environment files.

## Contributing

Follow Angular style guide and maintain the Termageddon brand identity in all UI components.

## License

This project is for educational purposes.
