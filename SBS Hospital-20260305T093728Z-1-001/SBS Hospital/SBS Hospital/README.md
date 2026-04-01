# SBS Hospital Site

## Run locally

1. Open a terminal in this folder.
2. Start the server:

```powershell
node server.js
```

3. Open:
- Website: [http://127.0.0.1:3000](http://127.0.0.1:3000)
- Admin login: [http://127.0.0.1:3000/login.html](http://127.0.0.1:3000/login.html)
- Admin dashboard: [http://127.0.0.1:3000/admin.html](http://127.0.0.1:3000/admin.html)

## Admin login

Default local credentials:
- Username: `admin`
- Password: `admin123`

Change them before deployment with environment variables:

```powershell
$env:ADMIN_USERNAME = 'your-admin-user'
$env:ADMIN_PASSWORD = 'your-strong-password'
node server.js
```

## Internal DB table

Appointments are stored in an internal DB file:
- `data/internal-db.json`
- Table name: `tables.appointments`

Schema columns:
- `id`
- `createdAt`
- `updatedAt`
- `name`
- `phone`
- `email`
- `dept`
- `date`
- `message`
- `status`
- `adminNotes`

Supported appointment statuses:
- `scheduled`
- `completed`
- `no_show`
- `cancelled`

## Staff workflow

1. Patients submit the form on `contact.html`.
2. New bookings are stored with status `scheduled`.
3. Staff sign in at `login.html`.
4. Staff review the appointment list, search by patient or phone, and update each row.
5. Use `completed` for attended visits, `no_show` when the patient did not come, and `cancelled` for cancelled bookings.
6. Add short internal notes for callback, reschedule, or follow-up details.

The server can still migrate old rows from `data/appointments.json` on first run.
