# Airrands Admin Dashboard

A complete admin dashboard for managing runners, sellers, and payments in the Airrands app.

## Features

- **Authentication**: Secure admin login with Firebase Auth
- **Runners Management**: View, validate, and verify runner applications
- **Sellers Management**: Review and approve seller registrations
- **Payments Management**: Monitor and approve payments made to the app
- **Modern UI**: Built with Tailwind CSS for a clean, responsive design
- **Real-time Data**: Connected to Firebase Firestore for live updates

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Auth, Firestore)
- **Authentication**: Firebase Authentication

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the admin directory with your Firebase configuration:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_DATABASE_URL=your_database_url
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 3. Firebase Setup

1. **Create Admin Users**: In your Firebase console, create admin users in the `admins` collection:
   ```javascript
   // Example admin document structure
   {
     "uid": "admin_user_id",
     "email": "admin@example.com",
     "name": "Admin User",
     "role": "admin",
     "createdAt": timestamp
   }
   ```

2. **Firestore Collections**: Ensure your Firestore has the following collections:
   - `runners` - Runner applications
   - `sellers` - Seller applications  
   - `payments` - Payment records
   - `admins` - Admin users

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the admin dashboard.

## Usage

### Authentication
- Access the login page at `/login`
- Use admin credentials to sign in
- Only users in the `admins` collection can access the dashboard

### Dashboard Overview
- View statistics for runners, sellers, and payments
- Quick access to pending approvals
- Real-time data updates

### Managing Runners
- View all runner applications
- Filter by status (pending, approved, rejected)
- Approve or reject pending applications
- View runner details and documents

### Managing Sellers
- Review seller applications
- Filter by business type and status
- Approve or reject pending sellers
- View business information and documents

### Managing Payments
- Monitor all payments made to the app
- Filter by payment status
- Approve or reject pending payments
- View payment details and user information

## File Structure

```
admin/
├── app/
│   ├── dashboard/
│   │   ├── layout.tsx          # Dashboard layout with sidebar
│   │   │   └── page.tsx        # Main dashboard overview
│   │   ├── runners/
│   │   │   └── page.tsx        # Runners management
│   │   ├── sellers/
│   │   │   └── page.tsx        # Sellers management
│   │   └── payments/
│   │       └── page.tsx        # Payments management
│   ├── login/
│   │   └── page.tsx            # Admin login page
│   ├── layout.tsx              # Root layout with AuthProvider
│   ├── page.tsx                # Home page with redirects
│   └── globals.css             # Global styles with Tailwind
├── components/
│   └── Sidebar.tsx             # Navigation sidebar
├── contexts/
│   └── AuthContext.tsx         # Authentication context
├── lib/
│   └── firebase.ts             # Firebase configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── postcss.config.js           # PostCSS configuration
└── package.json
```

## Security

- **Admin-only Access**: Only users in the `admins` collection can access the dashboard
- **Route Protection**: All dashboard routes are protected
- **Firebase Security Rules**: Ensure proper Firestore security rules are configured

## Deployment

### Vercel (Recommended)
1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms
- Build the project: `npm run build`
- Start production server: `npm start`

## Customization

### Styling
- Modify `tailwind.config.js` for custom colors and themes
- Update `globals.css` for additional custom styles

### Features
- Add new management pages in `app/dashboard/`
- Extend the sidebar navigation in `components/Sidebar.tsx`
- Modify authentication logic in `contexts/AuthContext.tsx`

## Support

For issues or questions, please refer to the main Airrands project documentation or create an issue in the repository.
