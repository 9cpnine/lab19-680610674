import { create } from "zustand";

import { api } from "@/lib/api";
import type { Course, Enrollment, Student, User } from "@/lib/types";

type ApiStudent = Omit<Student, "emails"> & { emails?: string[] };
type ApiEnrollment = Enrollment & { createdAt?: string };

const fromApiStudent = (s: ApiStudent): Student => ({
  studentId: s.studentId,
  firstName: s.firstName,
  lastName: s.lastName,
  program: s.program,
  interests: s.interests ?? [],
  emails: (s.emails ?? []).map((address) => ({ address })),
});

const toApiStudent = (student: Student) => ({
  studentId: student.studentId,
  firstName: student.firstName,
  lastName: student.lastName,
  program: student.program,
  interests: student.interests ?? [],
  emails: (student.emails ?? []).map((email) => email.address),
});

const toCourse = ({ courseId, courseTitle, instructors }: Course): Course => ({
  courseId,
  courseTitle,
  instructors,
});

const fromApiEnrollment = (e: ApiEnrollment): Enrollment => ({
  studentId: e.studentId,
  courseId: e.courseId,
  enrolledAt: e.createdAt,
});

type EnrollmentStore = {
  students: Student[];
  courses: Course[];
  enrollments: Enrollment[];
  loading: boolean;
  error: string | null;
  getAll: (role: User["role"], studentId?: string | null) => Promise<void>;
  reset: () => void;
  addStudent: (student: Student) => Promise<void>;
  updateStudent: (student: Student) => Promise<void>;
  removeStudent: (studentId: string) => Promise<void>;
  addCourse: (course: Course) => Promise<void>;
  updateCourse: (course: Course) => Promise<void>;
  removeCourse: (courseId: string) => Promise<void>;
  enroll: (studentId: string, courseId: string) => Promise<void>;
  updateEnrollment: (
    studentId: string,
    courseId: string,
    newCourseId: string,
  ) => Promise<void>;
  dropEnrollment: (studentId: string, courseId: string) => Promise<void>;
};

export const useEnrollmentStore = create<EnrollmentStore>()((set) => ({
  students: [],
  courses: [],
  enrollments: [],
  loading: false,
  error: null,

  // โหลดข้อมูลตามสิทธิ์ผู้ใช้
  getAll: async (role, studentId) => {
    set({ loading: true, error: null });
    try {
      const studentsRequest =
        role === "ADMIN"
          ? api<ApiStudent[]>("/students")
          : studentId
            ? api<ApiStudent>(`/students/${studentId}`).then((s) => [s])
            : Promise.resolve([] as ApiStudent[]);
      const [students, courses, enrollments] = await Promise.all([
        studentsRequest,
        api<Course[]>("/courses"),
        api<ApiEnrollment[]>("/enrollments"),
      ]);
      set({
        students: students.map(fromApiStudent),
        courses: courses.map(toCourse),
        enrollments: enrollments.map(fromApiEnrollment),
        loading: false,
      });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  reset: () =>
    set({
      students: [],
      courses: [],
      enrollments: [],
      loading: false,
      error: null,
    }),

  addStudent: async (student) => {
    const created = await api<ApiStudent>("/students", {
      method: "POST",
      body: toApiStudent(student),
    });
    set((state) => ({ students: [...state.students, fromApiStudent(created)] }));
  },

  updateStudent: async (student) => {
    const updated = await api<ApiStudent>("/students", {
      method: "PUT",
      body: toApiStudent(student),
    });
    set((state) => ({
      students: state.students.map((s) =>
        s.studentId === updated.studentId ? fromApiStudent(updated) : s,
      ),
    }));
  },

  // ลบนักศึกษาและข้อมูลการลงทะเบียน
  removeStudent: async (studentId) => {
    await api<Student>("/students", {
      method: "DELETE",
      body: { studentId },
    });
    set((state) => ({
      students: state.students.filter((s) => s.studentId !== studentId),
      enrollments: state.enrollments.filter((e) => e.studentId !== studentId),
    }));
  },

  addCourse: async (course) => {
    const created = await api<Course>("/courses", {
      method: "POST",
      body: course,
    });
    set((state) => ({ courses: [...state.courses, toCourse(created)] }));
  },

  updateCourse: async (course) => {
    const updated = await api<Course>("/courses", {
      method: "PUT",
      body: course,
    });
    set((state) => ({
      courses: state.courses.map((c) =>
        c.courseId === updated.courseId ? toCourse(updated) : c,
      ),
    }));
  },

  // ลบรายวิชาและข้อมูลการลงทะเบียน
  removeCourse: async (courseId) => {
    await api<Course>("/courses", {
      method: "DELETE",
      body: { courseId },
    });
    set((state) => ({
      courses: state.courses.filter((c) => c.courseId !== courseId),
      enrollments: state.enrollments.filter((e) => e.courseId !== courseId),
    }));
  },

  enroll: async (studentId, courseId) => {
    const created = await api<ApiEnrollment>("/enrollments", {
      method: "POST",
      body: { studentId, courseId },
    });
    set((state) => ({
      enrollments: [...state.enrollments, fromApiEnrollment(created)],
    }));
  },

  updateEnrollment: async (studentId, courseId, newCourseId) => {
    const updated = await api<ApiEnrollment>("/enrollments", {
      method: "PUT",
      body: { studentId, courseId, newCourseId },
    });
    const next = fromApiEnrollment(updated);
    set((state) => ({
      enrollments: state.enrollments.map((e) =>
        e.studentId === studentId && e.courseId === courseId ? next : e,
      ),
    }));
  },

  dropEnrollment: async (studentId, courseId) => {
    await api<ApiEnrollment>("/enrollments", {
      method: "DELETE",
      body: { studentId, courseId },
    });
    set((state) => ({
      enrollments: state.enrollments.filter(
        (e) => !(e.studentId === studentId && e.courseId === courseId),
      ),
    }));
  },
}));
