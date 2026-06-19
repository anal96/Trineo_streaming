import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { Program } from '../src/models/Program.js';
import { Subject } from '../src/models/Subject.js';
import { Unit } from '../src/models/Unit.js';
import { Lesson } from '../src/models/Lesson.js';
import { Content } from '../src/models/Content.js';
import { Enrollment } from '../src/models/Enrollment.js';
import { verifyStudentAccess } from '../src/utils/accessHelper.js';

const withMocks = async (mocks, fn) => {
  const originals = [];
  for (const m of mocks) {
    originals.push({ target: m.target, method: m.method, original: m.target[m.method] });
    m.target[m.method] = m.impl;
  }
  try {
    return await fn();
  } finally {
    for (const orig of originals) {
      orig.target[orig.method] = orig.original;
    }
  }
};

test('LMS Restructure Core Verification', async (t) => {

  await t.test('Program model virtuals & validation defaults', async () => {
    const program = new Program({
      name: 'Computer Applications BCA',
      description: 'Bachelor of Computer Applications'
    });

    assert.equal(program.title, 'Computer Applications BCA', 'Virtual title should return name');
    assert.equal(program.isDeleted, false, 'Default isDeleted should be false');
    assert.equal(program.deletedAt, null, 'Default deletedAt should be null');
    assert.equal(program.displayOrder, 0, 'Default displayOrder should be 0');
    assert.equal(program.status, 'active', 'Default status should be active');
  });

  await t.test('Subject, Unit, Lesson, and Content schema defaults', async () => {
    const subject = new Subject({
      programId: new mongoose.Types.ObjectId(),
      subjectCode: 'MCS-011',
      subjectName: 'Problem Solving and Programming'
    });
    assert.equal(subject.isDeleted, false);
    assert.equal(subject.displayOrder, 0);

    const unit = new Unit({
      subjectId: new mongoose.Types.ObjectId(),
      name: 'Unit 1: Introduction'
    });
    assert.equal(unit.isDeleted, false);
    assert.equal(unit.displayOrder, 0);

    const lesson = new Lesson({
      unitId: new mongoose.Types.ObjectId(),
      title: 'Lesson 1'
    });
    assert.equal(lesson.isDeleted, false);
    assert.equal(lesson.order, 0);

    const content = new Content({
      lessonId: new mongoose.Types.ObjectId(),
      type: 'video',
      title: 'Intro Video'
    });
    assert.equal(content.isDeleted, false);
    assert.equal(content.order, 0);
  });

  await t.test('verifyStudentAccess - grants access with active Program Enrollment', async () => {
    const mockUser = {
      _id: new mongoose.Types.ObjectId(),
      institute: new mongoose.Types.ObjectId(),
      role: 'student',
      status: 'active'
    };
    const mockProgramId = new mongoose.Types.ObjectId();

    const mocks = [
      {
        target: Enrollment,
        method: 'findOne',
        impl: (query) => {
          if (query.studentId.toString() === mockUser._id.toString() && query.programId.toString() === mockProgramId.toString()) {
            return Promise.resolve({
              _id: new mongoose.Types.ObjectId(),
              studentId: mockUser._id,
              programId: mockProgramId,
              status: 'active'
            });
          }
          return Promise.resolve(null);
        }
      }
    ];

    await withMocks(mocks, async () => {
      const access = await verifyStudentAccess({
        user: mockUser,
        courseId: mockProgramId
      });

      assert.equal(access.granted, true, 'Access should be granted via active enrollment');
      assert.equal(access.source, 'enrollment');
    });
  });

  await t.test('verifyStudentAccess - blocks access with suspended Program Enrollment', async () => {
    const mockUser = {
      _id: new mongoose.Types.ObjectId(),
      institute: new mongoose.Types.ObjectId(),
      role: 'student',
      status: 'active'
    };
    const mockProgramId = new mongoose.Types.ObjectId();

    const mocks = [
      {
        target: Enrollment,
        method: 'findOne',
        impl: (query) => {
          if (query.studentId.toString() === mockUser._id.toString() && query.programId.toString() === mockProgramId.toString()) {
            return Promise.resolve({
              _id: new mongoose.Types.ObjectId(),
              studentId: mockUser._id,
              programId: mockProgramId,
              status: 'suspended'
            });
          }
          return Promise.resolve(null);
        }
      }
    ];

    await withMocks(mocks, async () => {
      const access = await verifyStudentAccess({
        user: mockUser,
        courseId: mockProgramId
      });

      assert.equal(access.granted, false, 'Access should be denied for suspended enrollment');
      assert.equal(access.status, 'suspended');
      assert.match(access.reason, /Suspended/);
    });
  });

  await t.test('verifyStudentAccess - resolves programId from lessonId traversing tree hierarchy', async () => {
    const mockUser = {
      _id: new mongoose.Types.ObjectId(),
      institute: new mongoose.Types.ObjectId(),
      role: 'student',
      status: 'active'
    };
    const mockLessonId = new mongoose.Types.ObjectId();
    const mockUnitId = new mongoose.Types.ObjectId();
    const mockSubjectId = new mongoose.Types.ObjectId();
    const mockProgramId = new mongoose.Types.ObjectId();

    const LessonModel = mongoose.model('Lesson');
    const UnitModel = mongoose.model('Unit');
    const SubjectModel = mongoose.model('Subject');

    const mocks = [
      {
        target: LessonModel,
        method: 'findById',
        impl: (id) => {
          if (id.toString() === mockLessonId.toString()) {
            return Promise.resolve({ _id: mockLessonId, unitId: mockUnitId });
          }
          return Promise.resolve(null);
        }
      },
      {
        target: UnitModel,
        method: 'findById',
        impl: (id) => {
          if (id.toString() === mockUnitId.toString()) {
            return Promise.resolve({ _id: mockUnitId, subjectId: mockSubjectId });
          }
          return Promise.resolve(null);
        }
      },
      {
        target: SubjectModel,
        method: 'findById',
        impl: (id) => {
          if (id.toString() === mockSubjectId.toString()) {
            return Promise.resolve({ _id: mockSubjectId, programId: mockProgramId });
          }
          return Promise.resolve(null);
        }
      },
      {
        target: Enrollment,
        method: 'findOne',
        impl: (query) => {
          if (query.studentId.toString() === mockUser._id.toString() && query.programId.toString() === mockProgramId.toString()) {
            return Promise.resolve({
              _id: new mongoose.Types.ObjectId(),
              studentId: mockUser._id,
              programId: mockProgramId,
              status: 'active'
            });
          }
          return Promise.resolve(null);
        }
      }
    ];

    await withMocks(mocks, async () => {
      const access = await verifyStudentAccess({
        user: mockUser,
        lessonId: mockLessonId
      });

      assert.equal(access.granted, true, 'Should successfully resolve programId and grant access');
      assert.equal(access.source, 'enrollment');
    });
  });
});
