# MyCycle+ - Reward-Based Recycling Management System

MyCycle+ is a sustainability-focused platform designed to enhance Malaysia's recycling participation through a reward-based system and digital convenience. The solution addresses public apathy, logistical inefficiencies, and accessibility issues in traditional recycling.

## Project Structure

```
MyCycle+/
├── apps/
│   ├── donor-mobile/          # React Native app for donors (Expo)
│   ├── collector-mobile/      # React Native app for collectors (Expo)
│   ├── admin-web/             # React web app for admin dashboard (Vite)
│   └── sponsor-web/           # React web app for sponsor portal (Vite)
├── package.json               # Main workspace configuration
└── README.md                  # This file
```

## Features

### Mobile Applications
- **Donor App**: Schedule pickups, earn rewards, track recycling activity
- **Collector App**: Manage routes, track collections, optimize efficiency

### Web Applications  
- **Admin Dashboard**: Operations oversight, analytics, user management
- **Sponsor Portal**: Reward program integration, engagement monitoring

## Prerequisites

- Node.js (v16 or higher)
- npm (v8 or higher)
- React Native development environment:
  - Android Studio (for Android development)
  - Xcode (for iOS development, macOS only)

## ✅ Quick Start

**📦 Install all dependencies:**
```bash
npm run install:all
```

**🚀 Start all applications for development:**
```bash
npm run start:all
```

**📱 For mobile testing on same device:**
```bash
npm run start:mobile    # Starts both Donor and Collector apps
```

**💻 For web applications:**
```bash
npm run start:web       # Starts both Admin and Sponsor portals
```

## Individual App Commands

### Mobile Apps (React Native with Expo)

**Donor Mobile App:**
```bash
npm run start:donor          # Start Expo dev server
npm run android:donor        # Run on Android
npm run ios:donor           # Run on iOS
npm run web:donor           # Run in browser
```

**Collector Mobile App:**
```bash
npm run start:collector      # Start Expo dev server
npm run android:collector    # Run on Android  
npm run ios:collector       # Run on iOS
npm run web:collector       # Run in browser
```

### Web Apps (React with Vite)

**Admin Dashboard:**
```bash
npm run start:admin         # Start development server (http://localhost:5173)
npm run build:admin         # Build for production
```

**Sponsor Portal:**
```bash
npm run start:sponsor       # Start development server (http://localhost:5174)
npm run build:sponsor       # Build for production
```

## 🎯 Development Testing

### Concurrent Mobile Testing
Both mobile emulators can run simultaneously on the same device:
1. Start both mobile apps: `npm run start:mobile`
2. Use different ports for Metro bundlers
3. Test donor-collector interactions

### Port Configuration
- **Donor Mobile**: Expo dev server on default port
- **Collector Mobile**: Expo dev server on alternate port
- **Admin Web**: Vite dev server on port 5173
- **Sponsor Web**: Vite dev server on port 5174

## 🎨 UI Themes

Each application has a distinct color theme:
- **Donor App**: Green theme (#2E7D32) - Environmental focus
- **Collector App**: Blue theme (#1565C0) - Professional efficiency
- **Admin Dashboard**: Purple theme (#6A1B9A) - Authority and control
- **Sponsor Portal**: Orange theme (#FF8F00) - Partnership and engagement

## Key Technologies

- **Mobile**: React Native with Expo
- **Web**: React with Vite + TypeScript
- **Development**: Concurrently for multi-app management
- **Styling**: StyleSheet (React Native), CSS3 (Web)
- **Navigation**: React Navigation (Mobile), React Router (Web) - *to be implemented*

## Next Steps

### Phase 1: Core Features
- [ ] Implement authentication system
- [ ] Add state management (Redux/Context API)
- [ ] Set up navigation systems
- [ ] Create component libraries

### Phase 2: Integration
- [ ] Backend API integration
- [ ] Real-time features (WebSocket/Socket.io)
- [ ] Push notifications
- [ ] Location services

### Phase 3: Advanced Features
- [ ] AI-powered route optimization
- [ ] IoT device integration
- [ ] Advanced analytics
- [ ] Gamification elements

## 🚧 Current Status

✅ **Project Structure**: Complete  
✅ **Mobile Apps**: Basic UI implemented  
✅ **Web Apps**: Basic UI implemented  
✅ **Development Environment**: Configured  
✅ **Concurrent Testing**: Ready  

**Ready for development!** All applications can be run simultaneously for comprehensive testing and development. 