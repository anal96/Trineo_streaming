# Trineo SaaS LMS - CRM Integration API Documentation

This API enables external CRM systems (e.g. GFI CRM) to programmatically sync students and manage course assignments within Trineo Stream.

---

## Authentication

All integration endpoints require authentication via an API Key passed in the header.

| Header | Value | Description |
| :--- | :--- | :--- |
| `x-api-key` | `trn_gfi_xxxxxxxxxxxxxxxxx` | Your institute-specific API Key. |

---

## Rate Limiting

API requests are rate limited to **200 requests per 15 minutes** per API Key/IP address. If exceeded, the server responds with:

`429 Too Many Requests`
```json
{
  "message": "Too many requests from this client, please try again later."
}
```

---

## Endpoints

### 1. Student Sync

Create or update a student profile under your institute tenant scope.

* **URL**: `/api/integration/students`
* **Method**: `POST`
* **Headers**:
  * `x-api-key`: `[Your API Key]`
  * `Content-Type`: `application/json`
* **Body**:
  ```json
  {
    "studentId": "STU001",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "9999999999"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "userId": "660c6d7a123abc456def7890",
    "instituteId": "inst_gfi"
  }
  ```
* **Error Responses**:
  * `400 Bad Request`: Missing mandatory fields (`studentId`, `name`, `email`).
  * `401 Unauthorized`: Missing or invalid API key.

---

### 2. Course Assignment

Assign a course to a student. This instantly grants access to the corresponding stream content.

* **URL**: `/api/integration/course-assignments`
* **Method**: `POST`
* **Headers**:
  * `x-api-key`: `[Your API Key]`
  * `Content-Type`: `application/json`
* **Body**:
  ```json
  {
    "studentId": "STU001",
    "courseId": "advanced-react-typescript-masterclass"
  }
  ```
  *(Note: `courseId` can be either the Mongoose ObjectId or the course Slug string)*
* **Success Response (200 OK)**:
  ```json
  {
    "success": true
  }
  ```
* **Error Responses**:
  * `400 Bad Request`: Missing fields.
  * `404 Not Found`: Student or course not found within the authenticated institute scope.

---

### 3. Course Unassignment (Optional/Extension)

Revoke a course assignment from a student.

* **URL**: `/api/integration/course-assignments` (or `/api/integration/course-assignments/unassign`)
* **Method**: `DELETE` (or `POST` to `/unassign`)
* **Headers**:
  * `x-api-key`: `[Your API Key]`
  * `Content-Type`: `application/json`
* **Body**:
  ```json
  {
    "studentId": "STU001",
    "courseId": "advanced-react-typescript-masterclass"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true
  }
  ```

---

### 4. Student Access

Retrieve a student's profile status and their currently assigned courses.

* **URL**: `/api/integration/student-access/:studentId`
* **Method**: `GET`
* **Headers**:
  * `x-api-key`: `[Your API Key]`
* **URL Params**:
  * `studentId`: The CRM `studentId` OR LMS Mongoose `_id` OR LMS 6-digit `user_id`.
* **Success Response (200 OK)**:
  ```json
  {
    "student": {
      "studentId": "STU001",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "9999999999"
    },
    "assignedCourses": [
      {
        "courseId": "660c6d7a123abc456def8888",
        "title": "Advanced React & TypeScript Masterclass",
        "slug": "advanced-react-typescript-masterclass"
      }
    ],
    "accessStatus": "active"
  }
  ```
* **Error Responses**:
  * `404 Not Found`: Student not found in this institute scope.
