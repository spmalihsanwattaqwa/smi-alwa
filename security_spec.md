# Security Specification - Configs

## Data Invariants
1. Application settings must have valid tahunAjaranAktif and semesterAktif.
2. School profile must have a name.

## The "Dirty Dozen" Payloads
1. Create config without being signed in -> DENIED
2. Update tahunAjaranAktif to an excessively long string -> DENIED
3. Delete app_settings document -> DENIED
4. Update school profile with missing name -> DENIED
5. Update with additional "ghost" fields -> DENIED

## Test Plan
- Verify that only authenticated users can read/write configs.
- Verify that schema validation works.
