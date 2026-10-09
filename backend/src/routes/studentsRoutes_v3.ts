import { Router, type Request, type Response } from "express";
import {
  zStudentPostBody,
  zStudentPutBody,
  zStudentId,
} from "../libs/zodValidators.js";

import type { Student, CustomRequest } from "../libs/types.js";

// import authentication middleware
import { authenticateToken } from "../middlewares/authenMiddleware.ts";
import { checkRoleAdmin } from "../middlewares/checkRoleAdminDBMiddleware.ts";
import { checkRoles } from "../middlewares/checkRolesDBMiddleware.ts";

// import database
import { PrismaClient } from "../../generated/prisma/client.ts";
const prisma = new PrismaClient();

const router = Router();

// GET /api/v3/students
// get students (by program) with files
router.get(
  "/",
  authenticateToken,
  checkRoleAdmin,
  async (req: Request, res: Response) => {
    try {
      const students = await prisma.student.findMany({
        include: { files: true },
      });

      const program = req.query.program;
      if (program) {
        const filtered_students = students.filter(
          (student) => student.program === program,
        );

        return res.json({
          success: true,
          data: filtered_students,
        });
      }

      return res.json({
        success: true,
        data: students,
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

// GET /api/v3/students/{studentId}
router.get(
  "/:studentId",
  authenticateToken,
  checkRoles,
  async (req: CustomRequest, res: Response) => {
    try {
      const user = req.user;
      const studentId = req.params.studentId as string;

      const result = zStudentId.safeParse(studentId);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }

      const foundStudent = await prisma.student.findUnique({
        where: { studentId },
      });

      if (!foundStudent) {
        return res.status(404).json({
          success: false,
          message: "Student does not exists",
        });
      }

      if (
        user?.role === "STUDENT" &&
        foundStudent.studentId !== user.studentId
      ) {
        return res.status(403).json({
          success: false,
          message: "Forbidden access",
        });
      }

      return res.json({
        success: true,
        data: foundStudent,
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

// POST /api/v3/students, body = {new student data}
router.post(
  "/",
  authenticateToken,
  checkRoleAdmin,
  async (req: CustomRequest, res: Response) => {
    try {
      const body = req.body as Student;

      const result = zStudentPostBody.safeParse(body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }

      const student = await prisma.student.findUnique({
        where: { studentId: result.data.studentId },
      });

      if (student) {
        return res.status(400).json({
          success: false,
          message: "The StudentID is already taken.",
        });
      }

      const { studentId, firstName, lastName, program, interests, emails } =
        result.data;

      const created = await prisma.student.create({
        data: {
          studentId,
          firstName,
          lastName,
          program,
          interests,
          emails,
        },
      });

      res.set("Link", `/api/v3/students/${created.studentId}`);

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

// PUT /api/v3/students, body = {studentId, firstName?, lastName?, program?, interests?, emails?}
// ADMIN: update any student, STUDENT: update only himself
router.put(
  "/",
  authenticateToken,
  checkRoles,
  async (req: CustomRequest, res: Response) => {
    try {
      const result = zStudentPutBody.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }

      const { studentId, firstName, lastName, program, interests, emails } =
        result.data;

      const student = await prisma.student.findUnique({
        where: { studentId },
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: `Student ${studentId} does not exists`,
        });
      }

      if (
        req.user?.role === "STUDENT" &&
        req.user.studentId !== studentId
      ) {
        return res.status(403).json({
          success: false,
          message: "Forbidden access",
        });
      }

      const updated = await prisma.student.update({
        where: { studentId },
        data: {
          ...(firstName !== undefined && firstName !== null
            ? { firstName }
            : {}),
          ...(lastName !== undefined && lastName !== null
            ? { lastName }
            : {}),
          ...(program !== undefined && program !== null ? { program } : {}),
          ...(interests !== undefined && interests !== null
            ? { interests }
            : {}),
          ...(emails !== undefined && emails !== null ? { emails } : {}),
        },
      });

      return res.status(200).json({
        success: true,
        message: `Student ${studentId} has been updated successfully`,
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

// DELETE /api/v3/students, body = {studentId}
// ADMIN only
router.delete(
  "/",
  authenticateToken,
  checkRoleAdmin,
  async (req: CustomRequest, res: Response) => {
    try {
      const result = zStudentId.safeParse(req.body?.studentId);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }

      const studentId = result.data;

      const student = await prisma.student.findUnique({
        where: { studentId },
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: `Student ${studentId} does not exists`,
        });
      }

      const [, , deleted] = await prisma.$transaction([
        prisma.enrollment.deleteMany({ where: { studentId } }),
        prisma.file.deleteMany({ where: { studentId } }),
        prisma.student.delete({ where: { studentId } }),
      ]);

      return res.status(200).json({
        success: true,
        message: `Student ${studentId} has been deleted successfully`,
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
