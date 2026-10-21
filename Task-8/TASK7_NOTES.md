# Task 7 – Advanced API Usage and External API Integration

## 1. External API Integration
Integrated the Open Library Search API into the application. The `/api/books` endpoint accepts a search query and returns book titles, authors, and publication years in JSON format.

## 2. OAuth Authentication
OAuth 2.0 is an authorization framework that allows applications to access protected resources with a user's permission without sharing the user's password with the application. It uses access tokens and can involve an authorization server, resource server, and client application.

OAuth 2.0 was studied as part of this task. It has not been implemented as a live login flow in this application.

## 3. Rate Limiting
Implemented rate limiting using `express-rate-limit`. API requests are limited to 100 requests per 15-minute window per client IP address.

## 4. Error Handling
Added input validation, a timeout for external API requests, handling for unsuccessful API responses, and error messages when the external service cannot be reached.

## Conclusion
The application demonstrates external API integration, rate limiting, error handling, and an understanding of OAuth 2.0.
