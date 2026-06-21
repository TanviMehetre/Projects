# Test Suite Documentation

## Overview

This project uses **Vitest**, **React Testing Library**, and **MSW (Mock Service Worker)** to test the Quadyster application pages: `ListPage` and `DetailsPage`.

The test suite ensures that:

-   Components render correctly under the Redux + Intl + Router context
-   User interactions (clicks, form input, and more) behave as expected
-   Navigation (`useNavigate`) routes correctly (e.g., `/create`, `/edit/:id`, `/view/:id`)
-   Data from the backend (mocked using MSW) is fetched and displayed properly

---

## Running Tests

Run **all tests**:

npm run test

Run tests in watch mode:

npm run test:watch

Run a specific test file:

npx vitest run src/pages/tests/ListPage.test.js

---

Test scenarios that have been tested in the test files are as below:

1. Testing get all timelogs.
2. Testing the creating of a new timelog with time duration entered.
3. Testing switching to view mode and checking for the disabled fields.
4. Testing editing the timelog with the total time entered.
5. Testing creating an entry with the next day/overnight time duration.
6. Testing filtering the data on the list page.
7. Testing no changes made on a time entry.
8. Testing editing in the next day/overnight entry.
9. Testing deleting and navigating to the list page.
10. Database disconnection.
11. Database disconnection on edit page.
12. Network error.
13. Network error on edit page.
14. Check internationalization for Hindi.
15. Check internationalization for Telugu.
16. Testing if yup and formik validations work.
17. Testing editing when no time is filled.
18. Testing editing when time duration and total time is given.
19. Testing editing when the total time exceeds 16 hours for the current date.
20. Internationalization fallback.
