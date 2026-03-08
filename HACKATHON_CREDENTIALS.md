# AI AWS Hackathon – Retail Tech Demo Credentials

Use these credentials to log in to the **SnapFix** demo for the **AI AWS Hackathon (Retail Tech)** category.

## Main login (share with judges / evaluators)

| Field | Value |
|-------|--------|
| **URL** | Your deployed app login page (e.g. `https://app.snapfix.site/login` or `http://localhost:3000/login`) |
| **Email** | `retail@snapfix.com` |
| **Password** | `Retaildemo2026` |
| **Role** | Client Admin (full access to the “AI Hackathon Retail” demo client) |

## What they will see

- **Client:** AI Hackathon Retail (Demo)  
- **Sites:** Downtown Flagship, Mall Store, Airport Kiosk, Warehouse & Distribution  
- **Locations:** Per-site areas (General, Checkout, Fitting Rooms, Stockroom, Storefront, Sales Floor for stores; Kiosk Area for airport; Loading Dock, Picking Area, Storage for warehouse)  
- **Teams (Departments):** Store Operations, Maintenance, IT & POS, Customer Experience  
- **Categories:** Lighting, HVAC, POS & Checkout, Fitting Room, Storefront, Inventory & Backroom  
- **Users:** Client admin + Head of Staff, Field Staff (2), Tenant, Vendor (all under same client)  
- **Sample issues:** Retail-themed tickets (POS, lighting, AC, fitting room, kiosk, etc.) in open, in-progress, and resolved states  

## Other retail users (same client, same password: `Retaildemo2026`)

| Email | Role | Sites | Teams |
|-------|------|-------|--------|
| `headofstaff@retail.snapfix.com` | Head of Staff | Downtown, Mall, Airport | Store Operations, Maintenance |
| `field1@retail.snapfix.com` | Field Staff | Downtown, Mall | Maintenance |
| `field2@retail.snapfix.com` | Field Staff | Mall, Airport | IT & POS |
| `tenant@retail.snapfix.com` | Tenant | Downtown | Store Operations |
| `vendor@retail.snapfix.com` | Vendor | Downtown, Mall | IT & POS |  

## How to create this data

From the **project root**, with MongoDB running and `.env` set (including `MONGODB_URI`):

```bash
npm run seed:retail
```

This creates (or reuses) the retail client, the demo user above, and sample retail data. If the user already exists, the password is reset to `Retaildemo2026`.

## Summary to share with judges

You can copy something like this when submitting:

- **Demo login:** `retail@snapfix.com` / `Retaildemo2026`  
- **Context:** Retail tech – store operations, POS, lighting, HVAC, fitting room, and storefront issues.  
- **Role:** Client admin – full access to the demo retail organization and its tickets.
