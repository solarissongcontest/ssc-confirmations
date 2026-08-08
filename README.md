# Solaris Entry Hub

Build a clean, modern web app for Solaris Song Contest participation confirmations and song submissions.

The website should be fairly simple and form-focused, but it must have a proper admin dashboard and database so the system can be reused for every future edition.

CORE STRUCTURE

The system should work around:

* Editions, e.g. SSC 22, SSC 23, SSC 24
* Submission rounds inside each edition, e.g.
    * Confirmations Round 1
    * Confirmations Round 2
    * Late Confirmations
    * Song Submissions

Each round must be separately configurable by the admin.

Users should only see rounds that are currently open.

⸻

USER FORM

SECTION 1 — DELEGATION DETAILS

First ask:

Instagram username

Required text field.

Placeholder:
@username

Country

Required text field.

IMPORTANT:
These are fictional countries from the Solaris Song Contest universe, NOT real-world countries.

Do NOT use a country dropdown containing real countries.

The user must manually type their fictional country name.

Does your country have an official country/delegation Instagram account?

Options:

* Yes
* No

If Yes:
Show an optional/required field for:

Country Instagram account
Example:
@solaris.oland

⸻

SECTION 2 — PARTICIPATION

Ask:

Will you participate in the next edition of Solaris Song Contest?

Options:

* Yes
* No

If YES:
Continue to the rest of the form.

If NO:
Immediately stop the form and show a friendly exit screen such as:

Thanks for letting us know!

Your country will not participate in this edition.

You can close this page now.

The user should still be counted as having responded, but their submission status should be stored as Not Participating.

⸻

SECTION 3 — SELECTION METHOD

If they are participating, ask:

How will you select your entry?

Options:

* Internal Selection
* National Final
* I don’t know yet

The questions after this must change depending on their selection.

⸻

INTERNAL SELECTION

If they select Internal Selection, show:

Artist

Text field.

Song title

Text field.

Song link

URL field.

Allow links from:

* YouTube
* Spotify
* SoundCloud
* other valid URLs

Post preview timestamp

Explain:

Choose the part of the song that should be used for the 25-second song reveal / social media preview.

Fields:

Start time:
MM:SS

The system should automatically calculate/display the end time 25 seconds later.

Example:

Start: 01:12
Preview: 01:12–01:37

Final performance clip timestamp

Explain:

Choose the part of the video/song that should be used for the 90-second final performance clip.

Fields:

Start time:
MM:SS

Automatically calculate/display the ending timestamp 90 seconds later.

Example:

Start: 00:48
Clip: 00:48–02:18

Replacement video

Ask:

Do you need a replacement video instead of the main song link for the final clip?

Options:

* Yes
* No

If YES:

Require:

Replacement video link

This field must become mandatory if they selected Yes.

⸻

NATIONAL FINAL

If they select National Final, show a National Final section.

Ask:

National Final name

Text field.

How many entries will compete?

Number field.

Then allow the user to submit every NF entry.

Use a repeatable entry component where they can click:

+ Add entry

For every NF entry collect:

* Artist
* Song title
* Song link

Allow as many entries as needed based on the number of NF entries they selected.

Make the interface easy to edit and reorder.

Also ask:

Expected National Final date

Allow:

* exact date
* approximate date
* I don’t know yet

If exact:
show date picker.

If approximate:
allow text such as:
Late September
Around 20–25 September

When should the winning entry be known?

Same options:

* Exact date
* Approximate date
* I don’t know yet

After the NF has finished, the admin must be able to reopen this participant’s submission so they can update it with the selected winning entry and final song details.

⸻

RELEASE DATE / EMBARGO

For BOTH Internal Selection and National Final participants, ask:

When is the earliest date Solaris is allowed to publicly reveal your song?

Options:

* Select exact date
* Approximate date
* The song can be revealed immediately
* I don’t know yet

If exact:
use a date picker.

If approximate:
allow text.

Examples:

* After 14 September
* Late September
* After my national final
* Around the first week of October

For National Finals also ask:

When will your National Final finish?

Options:

* Exact date
* Approximate date
* I don’t know yet

⸻

UNKNOWN SONGS / ENTRIES

Users must be allowed to submit a confirmation even if they do not know their song yet.

For Internal Selection allow:

I don’t know my entry yet

If selected:
Do not require Artist, Song title, Song link, timestamps, or replacement video.

Store their entry status as:
Entry not submitted yet

For National Final:
They should also be able to select:

NF entries not known yet

This should allow them to submit the confirmation without entering NF songs.

⸻

REVIEW PAGE

Before final submission, show a review page containing all answers.

Sections:

* Delegation
* Participation
* Selection method
* Song / NF information
* Release information

Buttons:

Edit answers

Submit confirmation

After submission show:

Confirmation received

Display:

* Country
* Edition
* Submission round
* Confirmation status

⸻

EDITING PREVIOUS RESPONSES

Users should normally not be able to freely edit a submitted response.

The ADMIN must be able to reopen a specific submission.

Admin action:

Allow participant to edit / refill submission

When enabled, the participant can access their previous response and:

* see all previous answers pre-filled
* change answers
* submit the updated version

Do NOT create a completely separate duplicate response.

Update the existing submission and keep version history.

Admin should be able to see:

* original submission time
* latest edit time
* number of edits
* previous versions

Admin should also have:

Lock submission

which prevents further editing.

⸻

IDENTIFYING USERS

For now, use:

* Instagram username
* Country

as the participant identity within the edition.

Do not require account registration unless technically necessary.

Prevent obvious accidental duplicate confirmations from the same country within the same submission round.

If someone already has a submission, show something like:

A confirmation for this country already exists.

If editing has been enabled by the admin, allow them to continue to edit their existing submission.

⸻

ADMIN DASHBOARD

Create a protected admin area.

Example:

/admin

The admin dashboard should have navigation for:

* Editions
* Submission rounds
* Responses
* Countries
* Statistics
* Settings

⸻

EDITIONS

Admin can create editions.

Example:

SSC 22

Fields:

* Edition name
* Edition number
* Optional description
* Status:
    * Draft
    * Active
    * Finished

Inside each edition show all submission rounds.

⸻

SUBMISSION ROUNDS

Admin can create unlimited rounds inside an edition.

Example:

SSC 22

* Confirmations Round 1
* Confirmations Round 2
* Late Confirmations

Each round needs:

Name

Example:
Confirmations Round 1

Status

* Draft
* Open
* Closed
* Automatically Closed

Opening date/time

Optional.

Closing date/time

Optional.

Maximum number of responses

Example:
18

When the number of accepted/submitted responses reaches the maximum, AUTOMATICALLY CLOSE THE FORM.

Show users:

This confirmation round is full.

Manual controls

Admin buttons:

* Open submissions
* Close submissions
* Reopen submissions

The admin must always be able to manually override the automatic status.

⸻

RESPONSE LIMITS

Each submission round can have a maximum number of responses.

Example:

Confirmations Round 2
Maximum responses: 18

Display in admin:

13 / 18 responses

Use a progress bar.

Once it reaches:

18 / 18

automatically change status to:

FULL / CLOSED

Do not allow response 19.

Make this database-safe so two people submitting simultaneously cannot bypass the limit.

⸻

ADMIN RESPONSE VIEW

Admin needs two ways to view responses.

INDIVIDUAL VIEW

List all countries/participants.

Example table:

Country	Instagram	Participation	Selection	Entry Status	Release Date	Submitted

Clicking a country opens the full submission.

Show every answer clearly.

Admin actions:

* Allow editing
* Lock editing
* Edit submission
* Delete submission
* Mark reviewed
* Add internal admin note

Admin notes must NOT be visible to the participant.

⸻

COMBINED RESPONSES VIEW

Create a combined overview where the admin can see everyone together.

Include filters:

* Edition
* Submission round
* Participating
* Not participating
* Internal selection
* National final
* Unknown selection
* Song submitted
* Song missing
* NF entries submitted
* NF entries missing
* Reviewed
* Not reviewed

Include search by:

* Country
* Instagram username
* Artist
* Song

⸻

ADMIN STATISTICS

At the top of a round show summary cards:

Responses
14 / 18

Participating
12

Not participating
2

Internal
7

National Finals
4

Unknown
1

Songs submitted
8

Songs missing
4

⸻

ENTRY STATUS SYSTEM

Automatically calculate a useful status for each participant.

Possible statuses:

* Not Participating
* Participation Confirmed
* Selection Method Unknown
* Internal Entry Pending
* Internal Entry Submitted
* National Final Pending
* National Final Entries Submitted
* Awaiting NF Result
* Winning Entry Submitted
* Complete

Display these statuses in the admin dashboard.

⸻

RELEASE CALENDAR

Create an admin view called:

Release Calendar

Show confirmed songs ordered by earliest allowed reveal date.

Example:

September 12
Oland — Can reveal

September 15
Asteria — Can reveal

Unknown
Fennek — Release date not provided

For NF countries also show their expected NF date.

This will help the contest organizer plan song reveal posts.

⸻

FORM AVAILABILITY

Public form page should clearly display:

Solaris Song Contest 22
Confirmations Round 2

Status:

OPEN

12 / 18 spots filled

If closed:

Confirmations are currently closed.

If full:

This confirmation round has reached its maximum number of submissions.

⸻

VALIDATION

Required fields must depend on previous answers.

Examples:

If not participating:
nothing after participation should be required.

If Internal Selection + entry known:
require Artist, Song, Song Link, 25-second timestamp and 90-second timestamp.

If Replacement Video = Yes:
replacement video URL MUST be required.

If National Final + entries known:
require the NF entries.

If user selects “I don’t know yet”:
the relevant fields should no longer be required.

Use clear inline validation instead of generic error popups.

⸻

DATABASE STRUCTURE

Design the database properly around reusable editions.

Recommended tables/entities:

editions

* id
* name
* edition_number
* status
* created_at

submission_rounds

* id
* edition_id
* name
* status
* opens_at
* closes_at
* response_limit
* created_at

submissions

* id
* edition_id
* round_id
* instagram_username
* country
* country_account
* has_country_account
* participating
* selection_method
* entry_unknown
* nf_entries_unknown
* reveal_date_type
* reveal_exact_date
* reveal_approximate_text
* nf_date_type
* nf_exact_date
* nf_approximate_text
* editing_allowed
* reviewed
* admin_notes
* submitted_at
* updated_at

internal_entries

* submission_id
* artist
* song_title
* song_url
* preview_start
* preview_end
* final_clip_start
* final_clip_end
* replacement_video_required
* replacement_video_url

national_finals

* submission_id
* nf_name
* expected_entry_count
* final_date
* final_date_approximate
* winning_entry_id

national_final_entries

* id
* national_final_id
* artist
* song_title
* song_url
* order

submission_versions

Keep historical versions whenever a submitted response is edited.

⸻

DESIGN

Make the design modern, clean and Eurovision/fan-contest inspired without looking childish.

Use:

* dark or slightly tinted background
* clean cards
* large section headings
* good spacing
* subtle gradients
* simple animations
* progress indicator through the form
* mobile-friendly layout

Do NOT make the interface overly complicated.

The public form should feel extremely easy to complete.

Suggested steps:

1. Delegation
2. Participation
3. Selection
4. Entry
5. Release
6. Review

Display progress at the top.

Admin dashboard can use a sidebar.

Prioritize usability and clarity over decorative effects.

⸻

IMPORTANT FUNCTIONAL REQUIREMENTS

The system MUST:

1. Support multiple SSC editions.
2. Support multiple confirmation rounds per edition.
3. Allow admin to open/close each round.
4. Allow automatic closing based on response limit.
5. Prevent exceeding the response limit.
6. Store non-participating responses.
7. Support Internal Selection, National Final and Unknown.
8. Support incomplete/unknown song information.
9. Allow participants to update previous submissions ONLY when admin enables editing.
10. Preserve submission edit/version history.
11. Give admin individual and combined response views.
12. Provide filters and search.
13. Automatically calculate useful submission statuses.
14. Handle reveal/release dates.
15. Support National Final entries and later NF winner updates.
16. Be reusable for all future editions, not hardcoded specifically to SSC 22.

Build the database, frontend, conditional form logic, admin dashboard and validation needed for this system.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ssc-confirmations.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/287353cb-8e6e-4734-8d66-fbdbf86436d0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
