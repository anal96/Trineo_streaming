/**
 * E2E LMS Verification Script
 * Tests: Admin Login → Create Program → Create Subject → Create Unit →
 *        Create Lesson → Add Content → Enroll Student → Student Login →
 *        View Programs → View Curriculum Tree → Mark Progress
 *
 * Uses httpOnly cookie-based auth (like the real frontend).
 */

import http from 'http';

const BASE = 'http://localhost:5000';

/**
 * Makes an HTTP request that captures and forwards cookies.
 * Returns { status, body, ok, cookies }
 */
const makeRequest = (path, opts = {}, cookies = '') => {
  return new Promise((resolve, reject) => {
    const url = new URL(`/api${path}`, BASE);
    const body = opts.body || null;
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: opts.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(cookies ? { Cookie: cookies } : {})
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }

        // Extract set-cookie headers
        const setCookies = res.headers['set-cookie'] || [];
        const cookieStr = setCookies.map(c => c.split(';')[0]).join('; ');

        resolve({
          status: res.statusCode,
          body: parsed,
          ok: res.statusCode >= 200 && res.statusCode < 300,
          cookies: cookieStr || cookies // pass along existing cookies if none set
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
};

const log = (label, pass, detail = '') => {
  const icon = pass ? '✅' : '❌';
  console.log(`${icon} ${label}${detail ? ` — ${detail}` : ''}`);
};

const run = async () => {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  TRINEO STREAM LMS — END-TO-END VERIFICATION');
  console.log('═══════════════════════════════════════════════════\n');

  let adminCookies = '';
  let studentCookies = '';
  let programId, subjectId, unitId, lessonId, videoContentId, pdfContentId;
  let studentId;
  let failures = 0;

  const check = (label, pass, detail = '') => {
    log(label, pass, detail);
    if (!pass) failures++;
  };

  // ─── 1. ADMIN LOGIN ─────────────────────────────────────────────
  console.log('── PHASE 1: Admin Authentication ──');
  {
    const r = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@institute.com', password: 'admin123' })
    });
    check('Admin login', r.ok && r.body._id, `status=${r.status}, role=${r.body.role}`);
    adminCookies = r.cookies;
    check('  Cookie received', !!adminCookies, adminCookies ? 'token cookie set' : 'NO COOKIE');
  }

  // ─── 2. LIST EXISTING PROGRAMS ──────────────────────────────────
  console.log('\n── PHASE 2: Verify Existing Data ──');
  {
    const r = await makeRequest('/programs', {}, adminCookies);
    check('List programs', r.ok, `count=${Array.isArray(r.body) ? r.body.length : '?'}`);
  }

  // ─── 3. CREATE PROGRAM ──────────────────────────────────────────
  console.log('\n── PHASE 3: Admin Creates Curriculum ──');
  {
    const r = await makeRequest('/programs', {
      method: 'POST',
      body: JSON.stringify({
        name: 'BCA E2E Test Program',
        description: 'End-to-end verification program',
        displayOrder: 99
      })
    }, adminCookies);
    check('Create Program', r.ok && r.body._id, `id=${r.body._id}, name=${r.body.name}`);
    programId = r.body._id;
    if (!programId) {
      console.log('  ERROR body:', JSON.stringify(r.body).substring(0, 300));
    }
  }

  // ─── 4. CREATE SUBJECT ──────────────────────────────────────────
  {
    const r = await makeRequest('/subjects', {
      method: 'POST',
      body: JSON.stringify({
        programId,
        subjectCode: 'MCS-E2E',
        subjectName: 'E2E Test Subject',
        description: 'Subject for E2E verification',
        displayOrder: 1
      })
    }, adminCookies);
    check('Create Subject', r.ok && r.body._id, `id=${r.body._id}, code=${r.body.subjectCode}`);
    subjectId = r.body._id;
    if (!subjectId) {
      console.log('  ERROR body:', JSON.stringify(r.body).substring(0, 300));
    }
  }

  // ─── 5. CREATE UNIT ─────────────────────────────────────────────
  {
    const r = await makeRequest('/units', {
      method: 'POST',
      body: JSON.stringify({
        subjectId,
        name: 'Unit 1: Introduction',
        description: 'First unit',
        displayOrder: 1
      })
    }, adminCookies);
    check('Create Unit', r.ok && r.body._id, `id=${r.body._id}, name=${r.body.name}`);
    unitId = r.body._id;
    if (!unitId) {
      console.log('  ERROR body:', JSON.stringify(r.body).substring(0, 300));
    }
  }

  // ─── 6. CREATE LESSON ───────────────────────────────────────────
  {
    const r = await makeRequest('/lessons', {
      method: 'POST',
      body: JSON.stringify({
        unitId,
        title: 'Lesson 1: Hello World',
        description: 'First lesson in the unit',
        order: 1
      })
    }, adminCookies);
    check('Create Lesson', r.ok && r.body._id, `id=${r.body._id}, title=${r.body.title}`);
    lessonId = r.body._id;
    if (!lessonId) {
      console.log('  ERROR body:', JSON.stringify(r.body).substring(0, 300));
    }
  }

  // ─── 7. ADD VIDEO CONTENT ───────────────────────────────────────
  {
    const r = await makeRequest('/content', {
      method: 'POST',
      body: JSON.stringify({
        lessonId,
        type: 'video',
        title: 'Intro Video',
        description: 'Introduction video lecture',
        order: 1,
        youtubeVideoId: 'Ke90Tje7VS0',
        youtubeThumbnail: 'https://img.youtube.com/vi/Ke90Tje7VS0/hqdefault.jpg',
        youtubeDuration: '12:34',
        videoProvider: 'youtube'
      })
    }, adminCookies);
    check('Add Video Content', r.ok && r.body._id, `id=${r.body._id}, type=${r.body.type}`);
    videoContentId = r.body._id;
    if (!videoContentId) {
      console.log('  ERROR body:', JSON.stringify(r.body).substring(0, 300));
    }
  }

  // ─── 8. ADD PDF CONTENT ─────────────────────────────────────────
  {
    const r = await makeRequest('/content', {
      method: 'POST',
      body: JSON.stringify({
        lessonId,
        type: 'pdf',
        title: 'Intro Notes PDF',
        description: 'PDF notes for the first lesson',
        order: 2,
        attachmentUrl: 'https://example.com/notes.pdf',
        attachmentName: 'intro-notes.pdf'
      })
    }, adminCookies);
    check('Add PDF Content', r.ok && r.body._id, `id=${r.body._id}, type=${r.body.type}`);
    pdfContentId = r.body._id;
    if (!pdfContentId) {
      console.log('  ERROR body:', JSON.stringify(r.body).substring(0, 300));
    }
  }

  // ─── 9. VERIFY PROGRAM TREE (admin GET by ID) ──────────────────
  console.log('\n── PHASE 4: Verify Curriculum Tree ──');
  {
    const r = await makeRequest(`/programs/${programId}`, {}, adminCookies);
    check('Fetch program tree', r.ok && r.body.subjects, `subjects=${r.body.subjects?.length}`);

    if (r.body.subjects && r.body.subjects.length > 0) {
      const sub = r.body.subjects[0];
      check('  Subject in tree', sub.subjectCode === 'MCS-E2E', `code=${sub.subjectCode}`);
      check('  Units in subject', sub.units?.length > 0, `count=${sub.units?.length}`);

      if (sub.units?.length > 0) {
        const unit = sub.units[0];
        check('  Lessons in unit', unit.lessons?.length > 0, `count=${unit.lessons?.length}`);

        if (unit.lessons?.length > 0) {
          const lesson = unit.lessons[0];
          check('  Contents in lesson', lesson.contents?.length >= 2, `count=${lesson.contents?.length}`);

          if (lesson.contents?.length >= 2) {
            const video = lesson.contents.find(c => c.type === 'video');
            const pdf = lesson.contents.find(c => c.type === 'pdf');
            check('  Video content present', !!video, `ytId=${video?.youtubeVideoId}`);
            check('  PDF content present', !!pdf, `url=${pdf?.attachmentUrl}`);
          }
        }
      }
    }
  }

  // ─── 10. STUDENT LOGIN (to get student ID) ─────────────────────
  console.log('\n── PHASE 5: Student Login + Enrollment ──');
  {
    const r = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'ananloseph9744@gmail.com', password: 'password123' })
    });
    check('Student login', r.ok && r.body._id, `status=${r.status}, id=${r.body._id}`);
    studentCookies = r.cookies;
    studentId = r.body._id;
  }

  // ─── 11. ADMIN ENROLLS STUDENT ─────────────────────────────────
  {
    const r = await makeRequest('/enrollments/assign', {
      method: 'POST',
      body: JSON.stringify({ studentId, programId })
    }, adminCookies);
    check('Enroll student', r.ok || (r.body?.message && r.body.message.includes('already')),
      `status=${r.status}, msg=${r.body?.message}`);
  }

  // ─── 12. STUDENT SEES PROGRAMS (re-login to refresh cookie) ────
  console.log('\n── PHASE 6: Student Journey ──');
  {
    // Re-login student since admin session was used in between
    const rl = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'ananloseph9744@gmail.com', password: 'password123' })
    });
    studentCookies = rl.cookies;
    check('Student re-login', rl.ok, `status=${rl.status}`);
  }

  {
    const r = await makeRequest('/programs', {}, studentCookies);
    if (!r.ok || !Array.isArray(r.body)) {
      console.log('DEBUG: Student sees programs failed. Status:', r.status, 'Body:', r.body);
    }
    check('Student sees programs', r.ok && Array.isArray(r.body), `count=${r.body?.length}`);

    if (Array.isArray(r.body)) {
      const e2eProgram = r.body.find(p => p._id === programId || p.name === 'BCA E2E Test Program');
      check('  E2E program visible', !!e2eProgram, `enrolled=${e2eProgram?.isEnrolled}`);
      check('  Progress starts at 0', e2eProgram?.progressPercentage === 0, `progress=${e2eProgram?.progressPercentage}%`);
    }
  }

  // ─── 13. STUDENT VIEWS PROGRAM DETAIL (tree) ───────────────────
  {
    const r = await makeRequest(`/programs/${programId}`, {}, studentCookies);
    check('Student views program tree', r.ok && r.body.subjects, `enrolled=${r.body.isEnrolled}`);
    check('  Has playback token', !!r.body.playbackToken, 'token present');

    if (r.body.subjects?.length > 0) {
      const sub = r.body.subjects[0];
      const unit = sub.units?.[0];
      const lesson = unit?.lessons?.[0];
      const contents = lesson?.contents || [];
      const video = contents.find(c => c.type === 'video');
      const pdf = contents.find(c => c.type === 'pdf');

      check('  Video NOT locked', video && !video.isLocked, `locked=${video?.isLocked}`);
      check('  PDF NOT locked', pdf && !pdf.isLocked, `locked=${pdf?.isLocked}`);
      check('  Video has ytId', !!video?.youtubeVideoId, `id=${video?.youtubeVideoId}`);
      check('  PDF has URL', !!pdf?.attachmentUrl, `url=${pdf?.attachmentUrl}`);
    }
  }

  // ─── 14. MARK VIDEO COMPLETE ────────────────────────────────────
  console.log('\n── PHASE 7: Progress Tracking ──');
  {
    const r = await makeRequest('/progress/update', {
      method: 'POST',
      body: JSON.stringify({ contentId: videoContentId, progress: 100, watchTime: 754, duration: 754 })
    }, studentCookies);
    check('Mark video complete', r.ok, `completed=${r.body?.completed}, status=${r.status}`);
    if (!r.ok) console.log('  ERROR body:', JSON.stringify(r.body).substring(0, 300));
  }

  // ─── 15. MARK PDF COMPLETE ──────────────────────────────────────
  {
    const r = await makeRequest('/progress/update', {
      method: 'POST',
      body: JSON.stringify({ contentId: pdfContentId, progress: 100 })
    }, studentCookies);
    check('Mark PDF complete', r.ok, `completed=${r.body?.completed}, status=${r.status}`);
    if (!r.ok) console.log('  ERROR body:', JSON.stringify(r.body).substring(0, 300));
  }

  // ─── 16. VERIFY PROGRESS UPDATED ───────────────────────────────
  {
    const r = await makeRequest('/programs', {}, studentCookies);
    if (r.ok && Array.isArray(r.body)) {
      const e2eProgram = r.body.find(p => p._id === programId || p.name === 'BCA E2E Test Program');
      check('Progress updated to 100%', e2eProgram?.progressPercentage === 100, `progress=${e2eProgram?.progressPercentage}%`);
      check('Completed count = 2', e2eProgram?.completedCount === 2, `completed=${e2eProgram?.completedCount}`);
    }
  }

  // ─── 17. WATCH HISTORY ──────────────────────────────────────────
  {
    const r = await makeRequest('/progress/history', {}, studentCookies);
    check('Watch history exists', r.ok && Array.isArray(r.body) && r.body.length > 0,
      `entries=${Array.isArray(r.body) ? r.body.length : '?'}`);
  }

  // ─── 18. CLEANUP: Soft-delete the E2E program ──────────────────
  console.log('\n── PHASE 8: Cleanup ──');
  {
    // Re-login admin since student session was used in between
    const rl = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@institute.com', password: 'admin123' })
    });
    adminCookies = rl.cookies;

    const r = await makeRequest(`/programs/${programId}`, {
      method: 'DELETE'
    }, adminCookies);
    check('Soft-delete E2E program', r.ok, `msg=${r.body?.message}, status=${r.status}`);
  }

  // ─── SUMMARY ───────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════');
  if (failures === 0) {
    console.log('  🎉 ALL CHECKS PASSED — LMS is end-to-end functional');
  } else {
    console.log(`  ⚠️  ${failures} CHECK(S) FAILED — see above for details`);
  }
  console.log('═══════════════════════════════════════════════════\n');
};

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
