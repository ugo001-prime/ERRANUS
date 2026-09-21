# Erranus — first-version product brief

Erranus is a Nigerian marketplace where people find paid tasks and customers hire workers. Prices are displayed in Nigerian naira (NGN). This document is a proposed product specification, not a functioning application.

## Accounts and profiles

- One account can act as a worker or customer.
- Worker profiles show a display name, photo, skills, service area, completed tasks, ratings and reviews.
- Customer profiles exist but are visible only to the worker assigned to their task after acceptance and signing.
- Before acceptance, a task shows its description, approximate area, agreed price, expected duration and requirements. It must not expose the customer's name, phone number, exact address or profile link.
- Public reviews must not reveal a hidden customer's identity or private task location.
- Private customer data must be withheld by the server, rather than merely hidden in the interface.

## Primary screens

1. Find work: available tasks, prices, categories and approximate areas.
2. Task details: scope, timing, pay, requirements and acceptance conditions.
3. Agreement and acceptance: a plain-language summary, signature confirmation and explicit location-sharing consent.
4. Active task: assigned customer's profile, job instructions, progress, tracking status and completion/cancellation actions.
5. Post a task: scope, category, approximate public area, private address, schedule and offered pay.
6. My tasks: separate views for work accepted and work posted, with current status.
7. Profile and reviews: worker experience and reviews tied to completed jobs; restricted access to customer profiles.

## Proposed task lifecycle

Draft → Open → Accepted → In progress → Completion requested → Completed.

Cancellation and dispute paths are available when appropriate. Acceptance must atomically assign one worker and store the accepted agreement so two workers cannot claim the same task. The customer agrees to the task terms when posting; the worker signs the same version when accepting. A changed scope or price requires a new approved agreement.

## Agreement and price changes

Record the task scope, amount, payer, payee, expected timing, included expenses, completion conditions, cancellation terms, agreement version and each party's acceptance timestamp.

Proposed rule: workers must not request or collect unapproved extra payments from customers or other people involved in the task. Any extra expense requires an in-app change request accepted by both parties before the additional work or expense occurs. The agreement alone cannot guarantee compliance; reporting, transaction records and dispute handling are also needed.

The exact meaning of 'collect extra money from other people' still needs confirmation before final agreement wording. Agreement wording needs appropriate review before launch.

## Location sharing

- Explain who sees location, why it is needed and when sharing ends before consent.
- Start collecting location only after the job is accepted and the worker grants permission.
- Allow only the assigned worker and authorized participants in that task to access its location information.
- Stop collection on completion or cancellation. Handle permission revocation and stale updates explicitly; never show an old point as live.
- Show the worker a persistent sharing indicator and the last successful update time.
- Do not show worker locations publicly or collect off-job location history.
- Define a limited retention period and deletion policy before launch.
- A website cannot promise continuous GPS updates while closed or suspended. An Android implementation needs explicit background-location handling and device testing for that requirement.

## Payments

The product needs a payment provider, verified payment events, payouts, refunds and a dispute process before it can process real money. Do not represent a UI balance or a success page as evidence of payment.

Proposed payment flow: customer funds the task before it becomes available; payment is released after completion is confirmed, subject to an agreed dispute process. The provider and actual availability of a suitable funds-holding arrangement must be verified before implementing this flow. Platform fees, payout timing and cancellation/refund rules remain business decisions.

## Ratings and comments

- Permit one review per participant per completed task.
- Tie each review to real completed work and show the reviewer role without leaking a restricted identity.
- Show rating, comment and date on the appropriate profile.
- Include review reporting and moderation for abuse, private information and unrelated content.
- Prevent users from reviewing themselves or jobs they did not participate in.

## Core records

Accounts; worker profiles; private customer profiles; tasks; assignments; versioned agreements; signatures; price-change requests; payment events; payouts; location updates; reviews; reports; disputes; audit events.

## Acceptance criteria

- A customer can post a task with NGN pay and a private address.
- An unassigned user cannot retrieve private customer profile fields or an exact job address through any endpoint.
- A worker cannot accept without signing the current agreement and acknowledging the tracking requirement.
- Only one worker can successfully claim a task, including simultaneous acceptance attempts.
- Customer details become available only to the assigned worker after successful acceptance.
- Location access is task-specific, consent-based and ends with completion/cancellation.
- A price change cannot take effect without both parties' approval.
- Completion, payment status and reviews correspond to recorded server-side events.
- Failed payments, denied GPS permissions, lost connectivity, cancellations and disputes have clear user-facing states.

## Decisions still needed

Confirmed platform: Android first. Remaining decisions: initial service area and task categories; whether customers choose applicants or the first eligible worker can accept; exact extra-payment policy; payment provider and platform fee; completion confirmation/dispute timing; location retention period.
