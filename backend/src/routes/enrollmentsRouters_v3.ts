import { Router, type Response } from "express";
import {
  zEnrollmentBody,
  zEnrollmentPutBody,
} from "../libs/zodValidators.ts";

import type { CustomRequest } from "../libs/types.ts";

// import authentication middleware
import { authenticateToken } from "../middlewares/authenMiddleware.ts";
import { checkRoles } from "../middlewares/checkRolesDBMiddleware.ts";

// import database
import { PrismaClient } from "../../generated/prisma/client.ts";
const prisma = new PrismaClient();

const router = Router();

// GET /api/v3/enrollments
// ADMIN: get all enrollments, STUDENT: get only his own enrollments
router.get(
  "/",
  authenticateToken,
  checkRoles,
  async (req: CustomRequest, res: Response) => {
    try {
      const user = req.user;
      const enrollments = await prisma.enrollment.findMany({
        where:
          user?.role === "STUDENT" ? { studentId: user.studentId ?? "" } : {},
        orderBy: { createdAt: "asc" },
      });

      return res.json({
        success: true,
        data: enrollments,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  },
);

// POST /api/v3/enrollments, body = {studentId, courseId}
// ADMIN: enroll any student, STUDENT: enroll only himself
// ลงทะเบียนนักศึกษาในรายวิชา
router.post(
  "/",
  authenticateToken,
  checkRoles,
  async (req: CustomRequest, res: Response) => {
    try {
      const result = zEnrollmentBody.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }

      const { studentId, courseId } = result.data;
      const user = req.user;

      if (user?.role === "STUDENT" && studentId !== user.studentId) {
        return res.status(403).json({
          success: false,
          message: "Forbidden access",
        });
      }

      const student = await prisma.student.findUnique({
        where: { studentId },
      });
      if (!student) {
        return res.status(404).json({
          success: false,
          message: `Student ${studentId} does not exists`,
        });
      }

      const course = await prisma.course.findUnique({ where: { courseId } });
      if (!course) {
        return res.status(404).json({
          success: false,
          message: `Course ${courseId} does not exists`,
        });
      }

      const enrolled = await prisma.enrollment.findFirst({
        where: { studentId, courseId },
      });
      if (enrolled) {
        return res.status(409).json({
          success: false,
          message: `Student ${studentId} has already enrolled in ${courseId}`,
        });
      }

      const created = await prisma.enrollment.create({
        data: { studentId, courseId },
      });

      return res.status(201).json({
        success: true,
        data: created,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  },
);

// PUT /api/v3/enrollments, body = {studentId, courseId, newCourseId}
// ADMIN can update anyone; STUDENT can update only himself.
router.put(
  "/",
  authenticateToken,
  checkRoles,
  async (req: CustomRequest, res: Response) => {
    try {
      const result = zEnrollmentPutBody.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }

      const { studentId, courseId, newCourseId } = result.data;

      if (
        req.user?.role === "STUDENT" &&
        req.user.studentId !== studentId
      ) {
        return res.status(403).json({
          success: false,
          message: "Forbidden access",
        });
      }

      const enrolled = await prisma.enrollment.findFirst({
        where: { studentId, courseId },
      });

      if (!enrolled) {
        return res.status(404).json({
          success: false,
          message: `Student ${studentId} has not enrolled in ${courseId}`,
        });
      }

      if (newCourseId === courseId) {
        return res.status(400).json({
          success: false,
          message: "New course must be different from the current course",
        });
      }

      const newCourse = await prisma.course.findUnique({
        where: { courseId: newCourseId },
      });

      if (!newCourse) {
        return res.status(404).json({
          success: false,
          message: `Course ${newCourseId} does not exists`,
        });
      }

      const alreadyEnrolled = await prisma.enrollment.findFirst({
        where: { studentId, courseId: newCourseId },
      });

      if (alreadyEnrolled) {
        return res.status(409).json({
          success: false,
          message: `Student ${studentId} has already enrolled in ${newCourseId}`,
        });
      }

      const updated = await prisma.enrollment.update({
        where: { id: enrolled.id },
        data: { courseId: newCourseId },
      });

      return res.status(200).json({
        success: true,
        message: `Student ${studentId} changed course from ${courseId} to ${newCourseId} successfully`,
        data: updated,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  },
);

// DELETE /api/v3/enrollments, body = {studentId, courseId}
// ADMIN can delete anyone; STUDENT can delete only himself.
router.delete(
  "/",
  authenticateToken,
  checkRoles,
  async (req: CustomRequest, res: Response) => {
    try {
      const result = zEnrollmentBody.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }

      const { studentId, courseId } = result.data;

      if (
        req.user?.role === "STUDENT" &&
        req.user.studentId !== studentId
      ) {
        return res.status(403).json({
          success: false,
          message: "Forbidden access",
        });
      }

      const enrolled = await prisma.enrollment.findFirst({
        where: { studentId, courseId },
      });

      if (!enrolled) {
        return res.status(404).json({
          success: false,
          message: `Student ${studentId} has not enrolled in ${courseId}`,
        });
      }

      const deleted = await prisma.enrollment.delete({
        where: { id: enrolled.id },
      });

      return res.status(200).json({
        success: true,
        message: `Student ${studentId} has dropped ${courseId} successfully`,
        data: deleted,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  },
);

export default router;
