# Haven-Cart-Innovate4Impact-Hackathon
Privacy-preserving disguised safety platform providing covert emergency support, on-device risk assessment, encrypted evidence protection, and intelligent routing to nearby NGOs, medical services, and authorized responders.
# HavenCart

### Privacy-Preserving Disguised Safety & Emergency Support Platform

HavenCart is a privacy-preserving safety platform designed to provide discreet access to emergency assistance, trusted contacts, medical services, shelters, NGOs and authorized responders for people experiencing domestic violence.

The application uses a familiar shopping interface as its visible layer while providing a concealed safety workflow through covert activation.

## Core Workflow

```text
Dummy Shopping Interface
        ↓
Covert Activation
        ↓
Authentication + Secure Session
        ↓
Inactivity Check
        ↓
Safe Dashboard
        ↓
On-Device Risk Assessment
        ↓
High-Risk?
   ↓ YES       ↓ NO
Smart Routing   Complaint?
                  ↓ YES
             File & Escalate
                  ↓
            Smart Routing
                  ↓
       Silent & Smart Escalation
                  ↓
          Responder Dashboard
```

## Key Innovations

* **Disguised Interface** — safety functionality is concealed inside a normal shopping interface.
* **Covert Activation** — coded activation through the application's normal search interface.
* **Offline-First Safety** — critical safety functions and evidence handling continue without connectivity.
* **On-Device Risk Assessment** — quantized ML combined with a rule engine for local risk evaluation.
* **Uber-Like Responder Clustering** — nearby NGOs, medical centres, police and support services are clustered and ranked using location, availability, capacity and risk.
* **Progressive Location Sharing** — location is disclosed according to the emergency workflow rather than continuously.
* **Encrypted Evidence Pipeline** — evidence is encrypted locally and queued for secure synchronization.
* **Tamper-Evident Evidence** — hash-chain verification helps detect unauthorized modification.
* **Role-Based Responder Network** — authorized NGOs, medical personnel, authorities and administrators receive role-specific dashboards.
* **Secure Session Management** — short-lived JWT access tokens, refresh-token handling and inactivity-based session control.

## Technology Stack

### Mobile / PWA

* Android / Kotlin
* Jetpack Compose
* Local encrypted database
* Offline-first architecture

### Backend

* FastAPI
* Python
* PostgreSQL / Supabase
* REST APIs

### Security

* JWT authentication
* Refresh tokens
* AES-256-GCM encryption
* Android Keystore
* Role-Based Access Control
* Row-Level Security
* SHA-256 hash chain
* HTTPS/TLS

### Machine Learning

* Python
* Scikit-learn / PyTorch
* Quantized on-device model
* Hybrid ML + rule-based risk engine

### Location & Routing

* GPS / Android Location Services
* GIS-based proximity queries
* Regional responder clustering
* Availability and capacity-aware routing

### Responder System

* Admin Dashboard
* NGO Dashboard
* Medical Dashboard
* Authority Dashboard

## Privacy Architecture

Sensitive operations are designed to minimize cloud dependency.

```text
User Device
    ↓
Local Risk Assessment
    ↓
Encrypted Local Evidence
    ↓
Offline Queue
    ↓
Network Available
    ↓
Secure Synchronization
    ↓
Authorized Backend
    ↓
Role-Specific Responder
```

The system follows data-minimization principles and avoids exposing sensitive information through ordinary notifications or the visible shopping interface.

## Project Modules

### 1. Disguised Client

Handles the normal shopping interface and covert activation.

### 2. Safety Engine

Handles safety mode, risk assessment, trusted contacts and emergency workflows.

### 3. Evidence Engine

Captures, encrypts, hashes and queues evidence.

### 4. Smart Routing Engine

Clusters and ranks nearby support providers.

### 5. Authentication & Session Engine

Manages JWT access tokens, refresh tokens and inactivity handling.

### 6. Responder Network

Connects cases with authorized NGOs, medical services and authorities.

### 7. Dashboard Layer

Provides role-specific case visibility and response actions.


