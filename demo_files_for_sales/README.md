# Demo CSV Files for Bulk Import

This folder contains demo CSV files for use in sales demonstrations of the bulk import feature.

## Files Included

### 1. `perfect_import.csv`
- **Purpose:** Show successful, error-free import
- **Contents:** 25 members, all with complete data
- **Use Case:** Primary demo file, shows ideal scenario
- **All fields:** Complete with emails, phone numbers, active status

### 2. `with_errors.csv`
- **Purpose:** Demonstrate error handling and validation
- **Contents:** 8 members with intentional errors
- **Use Case:** Show how system catches and reports errors
- **Errors included:**
  - Missing first name (Row 2)
  - Missing last name (Row 3)
  - Invalid email format (Row 4)
  - Invalid phone number (Row 5)
  - Invalid status value (Row 6)
  - Invalid date format (Row 7)

### 3. `mixed_data.csv`
- **Purpose:** Show real-world scenario with optional fields
- **Contents:** 15 members with varying data completeness
- **Use Case:** Demonstrate flexibility (not all fields required)
- **Variations:**
  - Some members with email, some without
  - Some members with phone, some without
  - Mixed statuses (active, inactive, pending)

## How to Use in Demos

### Perfect Import Demo (2-3 minutes)
1. Open bulk import dialog
2. Drag `perfect_import.csv` into drop zone
3. Show validation success
4. Click "Preview Data" to show all 25 members
5. Enable "Send portal invitations"
6. Import and show success screen
7. Navigate to members list to show imported data

### Error Handling Demo (2-3 minutes)
1. Open bulk import dialog
2. Upload `with_errors.csv`
3. Show detailed error list
4. Point out how each error is clearly explained
5. Show the "How to Fix" guide
6. Click "Try Again" to demonstrate recovery
7. Upload `perfect_import.csv` to show success after fix

### Mixed Data Demo (1-2 minutes)
1. Upload `mixed_data.csv`
2. Show validation screen statistics
3. Point out: "15 total, 15 valid, 8 with email"
4. Show preview to demonstrate optional fields
5. Enable invitations - system will only send to 8 members
6. Import and show that only members with emails get invitations

## Demo Script Tips

### Opening Line
> "Let me show you how easy it is to bring all your existing members into the system..."

### During Validation
> "See how the system instantly validates everything? You'll know if there are any issues before anything is imported."

### During Preview
> "You can preview exactly what will be imported. Notice how some members have email addresses and some don't? That's totally fine - email is optional."

### During Import
> "The system tracks progress in real-time. First, it imports all the member profiles, then it sends portal invitations to members with email addresses."

### At Success Screen
> "And you're done! All 25 members are now in your system. 25 portal invitations were sent automatically. Your members can start using their portal right away."

## Customization

To create your own demo files:

1. **Copy one of these files** as a starting point
2. **Modify the data** to match prospect's use case
3. **Keep member counts reasonable** (15-30 for demos)
4. **Include prospect's region** in phone format if relevant
5. **Use realistic gym member names** from prospect's area if helpful

### Required Format
```csv
First Name,Last Name,Email,Phone Number,Status,Join Date
John,Doe,john@example.com,+919876543210,active,2024-01-15
```

### Field Rules
- **Required:** First Name, Last Name
- **Optional:** Email, Phone Number, Status, Join Date
- **Status values:** active, inactive, or pending (default: active)
- **Date format:** YYYY-MM-DD
- **Phone format:** +91XXXXXXXXXX (flexible, but this is preferred)

## Troubleshooting Demo Files

### If validation fails unexpectedly:
1. Check file encoding (should be UTF-8)
2. Verify no extra columns
3. Ensure headers match exactly
4. Check for hidden characters

### If import is slow:
- Files under 50 members should import in seconds
- If using larger files, warn prospect it will take time
- Don't use files over 100 members in live demos

## Post-Demo Follow-up

After the demo, offer to:
1. Email these demo files to the prospect
2. Help them prepare their own member list
3. Guide them through their first real import on trial

---

**Note:** These files use demo email addresses and phone numbers. Update phone formats based on prospect's country if demoing internationally.

