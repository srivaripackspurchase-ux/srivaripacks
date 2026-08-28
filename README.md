# Muthukumar Box Manufacturing & Inventory Application

A premium, fully responsive full-stack inventory management web application for corrugated box fabrication, featuring high-fidelity dark/light styling, live box calculation projections, dynamic company sizes selection, and CSV log exporting.

---

## 🗄️ Database Setup (Supabase)

The file [supabase_setup.sql](file:///d:/Muthukumar/supabase_setup.sql) has been created. 

1. Go to your [Supabase Dashboard](https://supabase.com/).
2. Open your project, and click on **SQL Editor** in the left sidebar.
3. Click **New Query**, paste the contents of `supabase_setup.sql`, and click **Run**.
4. This will create:
   - `users` table
   - `companies` table
   - `company_sizes` table
   - `customers` (calculation logs) table
   - Seed data including the default user: `muthu_user` (password: `muthu123`) and default Muthukumar dimensions.

---

## 🛠️ Configuration (.env)

Modify [server/.env](file:///d:/Muthukumar/server/.env) with your credentials:

```ini
PORT=5000
JWT_SECRET=supersecretjwtkeyforboxmanufacturingapp12345!
SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
SUPABASE_KEY=YOUR_SUPABASE_ANON_OR_SERVICE_KEY
```

> [!TIP]
> **Mock / Offline Mode:** If you do not configure the Supabase URL and Key, the application will automatically run in **Mock Mode** using in-memory arrays. You can sign in with the username `muthu_user` and password `muthu123` to test the application instantly!

---

## 🚀 Running the Project

Open two terminal windows inside your workspace:

### 1. Start the Backend API Server
```bash
cd server
npm install
npm run dev
```
The server will start at `http://localhost:5000`.

### 2. Start the Frontend React App
```bash
cd client
npm install
npm run dev
```
The application will open in your browser at `http://localhost:3000`.

---

## 📐 Corrugated Calculation Model
The application performs real-time box pricing projections using:
- **Reel Size:** $W + H + 1$ (inches)
- **Cut Size:** $L + W + 2$ (inches)
- **Paper:** $\text{Quantity} \times \text{Paper Plies}$ (from ply config)
- **Flute:** $((\text{Quantity} \times \text{Flute Extra \%}) + \text{Quantity}) \times \text{Flute Plies}$
- **Weight per Unit:** $\frac{\text{Reel Size} \times \text{Cut Size} \times (\text{Paper} + \text{Flute})}{1,550,000}$
- **Box Weight:** $\text{Weight per Unit} \times \text{Quantity of Data Multiplier}$
- **Single Box Price:** $\text{Box Weight} \times \text{Price per KG}$
- **Total Cost:** $\text{Single Box Price} \times \text{Quantity of Boxes}$
- **GST:** $\text{Total Cost} \times \text{GST \%}$
- **Grand Total:** $\text{Total Cost} + \text{GST}$