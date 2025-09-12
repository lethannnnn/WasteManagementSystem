# MyCycle+ Reward-Based Recycling Management System

## 1. Introduction

MyCycle+ is a comprehensive, reward-based recycling management system designed to revolutionize waste management by incentivizing sustainable practices. Our mission is to foster a circular economy by connecting donors, collectors, and sponsors through a seamless, technology-driven platform. The system encourages recycling by rewarding users with points that can be redeemed for valuable rewards, creating a win-win for individuals, communities, and the environment.

## 2. System Modules and Features

The MyCycle+ ecosystem is composed of four dedicated applications, each tailored to a specific user role.

### 2.1. Donor Mobile App (React Native)
- **Pickup Scheduling:** Donors can schedule on-demand pickups for their recyclable materials using an interactive custom map to select precise pickup locations.
- **Real-time Tracking:** Track assigned collector location in real-time during pickup, similar to ride-sharing apps like Grab.
- **Pickup Status Monitoring:** View pickup status updates (scheduled, en route, in progress, completed) with live notifications.
- **Collector Rating:** Rate and provide feedback for collectors after pickup completion.
- **Reward Management:** Track reward points earned from recycling activities.
- **Redemption Catalog:** Browse and redeem rewards, such as e-wallet credits and vouchers from sponsors.
- **History & Analytics:** View personal recycling history and environmental impact metrics.
- **Gamification:** Engage with leaderboards and earn achievement badges to stay motivated.

### 2.2. Collector Mobile App (React Native)
- **Route Assignments:** Receive real-time alerts and notifications when pickup routes are assigned by admin.
- **Vehicle Management:** View assigned vehicle details including vehicle number, maximum weight capacity, and starting garage location.
- **Live Navigation:** GPS-enabled turn-by-turn navigation to pickup destinations, similar to Grab driver experience.
- **Pickup Execution:** 
  - Scan waste materials using AI-powered classification for automatic waste type identification
  - Input actual weight measurements for recyclable materials
  - Update pickup status in real-time (en route, arrived, in progress, completed)
- **Route Optimization:** Follow AI-optimized routes using Hybrid DRL-GA algorithm for maximum efficiency.
- **Status Management:** Update availability status (active, off-duty, busy) and view personal performance ratings.
- **Donor Communication:** In-app communication channel to coordinate with donors during pickup.

### 2.3. Admin Web Portal (React)
- **User & Account Management:** 
  - Oversee all user accounts (donors, collectors, sponsors)
  - Create and manage collector accounts (collectors cannot self-register)
  - Manage user roles and permissions
- **AI-Powered Route Management:**
  - View AI-generated route suggestions (fastest route, best route, fuel-efficient route) using Hybrid DRL-GA algorithm
  - Assign collectors to optimized pickup routes based on multiple factors
  - Route assignment interface showing collector availability, ratings, and vehicle specifications
- **Collector Management:**
  - View collector status (active, off-duty, busy) and performance ratings (star ratings)
  - Manage vehicle fleet including vehicle numbers, maximum weight capacity, and garage assignments
  - Monitor collector performance metrics and pickup completion rates
- **Real-time Monitoring:** Track active pickups and collector locations in real-time on admin dashboard.
- **Reward & Redemption Oversight:** Manage the rewards catalog and approve redemption requests.
- **System Analytics:** Access comprehensive dashboards and generate reports on system usage, recycling rates, route efficiency, and overall performance.
- **Content Management:** Manage app content, notifications, and user communications.

### 2.4. Sponsor Web Portal (React)
- **Business Registration:** Sponsors can register their business and undergo OCR-based identity verification.
- **Reward Submission:** Submit and manage rewards to be included in the redemption catalog.
- **Contribution Analytics:** View dashboards and analytics on their contributions and the impact of their sponsored rewards.

## 2.5. System Workflow and Process Integration

### 2.5.1. Pickup Scheduling and Route Optimization Workflow

**Step 1: Donor Pickup Request**
- Donors use the interactive custom map to select precise pickup locations
- Schedule pickup with estimated waste type and quantity
- System generates pickup request with location coordinates and requirements

**Step 2: AI Route Optimization**
- AI system (Hybrid DRL-GA algorithm) analyzes all pending pickup requests
- Generates multiple route suggestions considering:
  - Distance optimization (fastest route)
  - Fuel efficiency (best environmental route)
  - Vehicle capacity constraints
  - Traffic patterns and time windows
  - Collector availability and ratings

**Step 3: Admin Route Assignment**
- Admin reviews AI-generated route options on the web portal
- Views collector assignment interface displaying:
  - Collector status (active/off-duty) and star ratings
  - Vehicle specifications (vehicle number, maximum weight capacity)
  - Starting garage locations
  - Estimated route completion time
- Admin assigns optimal collector-vehicle combination to each route

**Step 4: Collector Notification and Navigation**
- Assigned collector receives real-time alert/notification on mobile app
- Collector views route details, vehicle information, and starting garage location
- GPS-enabled navigation guides collector to pickup destinations (Grab-like experience)

**Step 5: Pickup Execution**
- Collector arrives at donor location and updates status to "arrived"
- Uses mobile app to scan waste materials for AI-powered classification (YOLOv5)
- Inputs actual weight measurements for recyclable materials
- Updates pickup status to "completed" and proceeds to next route destination

**Step 6: Real-time Tracking and Communication**
- Donors track collector location in real-time on their mobile app
- Live status updates throughout the pickup process
- In-app communication between donor and collector for coordination

**Step 7: Completion and Feedback**
- Upon pickup completion, donors receive notification
- Donors can rate collector performance (star rating system)
- Points are automatically awarded to donor based on recycled material weight and type
- System updates analytics and performance metrics for all stakeholders

### 2.5.2. Role-Based Access and Security
- **Donors:** Can only schedule pickups and track their own requests
- **Collectors:** Cannot self-register; accounts created by admin only
- **Admin:** Full system oversight with route optimization and assignment capabilities
- **Sponsors:** Limited access to reward management and analytics for their contributions

## 3. System Architecture and Technology Stack

MyCycle+ is built on a modern, scalable architecture to ensure reliability and performance.

- **Application Architecture:** The system is designed as a set of interconnected applications, allowing for independent development, deployment, and scaling of each component.
- **Development Methodology:** We follow an Agile (Sprint-based) methodology to facilitate iterative development and rapid delivery of features.

### 3.1. Technical Components
- **Frontend (Mobile):** React Native for cross-platform (iOS & Android) development.
- **Frontend (Web):** React.js with Vite for a fast and modern development experience.
- **Backend:** A Node.js backend (e.g., using a framework like NestJS or Express.js) is recommended to maintain a consistent TypeScript/JavaScript-based technology stack across the project.
- **Database:** PostgreSQL serves as the primary relational database for storing all entity data, including users, pickups, rewards, and transactions.
- **AI/ML:**
    - **Route Optimization:** Hybrid DRL-GA algorithm providing multiple route suggestions (fastest, most fuel-efficient, optimal capacity utilization) with real-time traffic consideration.
    - **Waste Classification:** YOLOv5 for real-time object detection and automatic waste type identification during pickup.
    - **Verification:** CNN-based architectures for Optical Character Recognition (OCR) for sponsor identity verification.
    - **Predictive Analytics:** Machine learning models for demand forecasting and collector performance optimization.
- **Cloud & DevOps:**
    - **Real-time Services:** Firebase for real-time data synchronization and push notifications.
    - **Deployment:** Containerization with Docker and orchestration with Kubernetes are planned for scalable deployment.

## 4. Security
Security is a top priority. The system implements multiple layers of protection:
- **Role-Based Access Control (RBAC):** 
  - Ensures users can only access features relevant to their role
  - Collectors cannot self-register; accounts must be created by admin
  - Hierarchical permissions with admin having full system oversight
  - Donors limited to their own pickup requests and tracking
- **Data Protection:** Password hashing, email verification, and end-to-end data encryption.
- **Input Validation:** Rigorous validation to prevent common vulnerabilities like SQL injection and XSS.
- **Secure Authentication:** JWT (JSON Web Tokens) for managing user sessions securely.
- **Real-time Security:** Secure WebSocket connections for live tracking and notifications.
- **Geolocation Privacy:** Location data encrypted and only shared with authorized parties during active pickups.