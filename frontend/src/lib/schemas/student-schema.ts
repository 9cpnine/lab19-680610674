import { z } from "zod";

import type { Student } from "@/lib/types";

export const MAX_INTERESTS = 3;
export const MAX_EMAILS = 3;

// ใช้ร่วมกันระหว่างฟอร์ม (Checkbox) กับตารางจัดการนักศึกษา (แสดง label)
export const interestOptions = [
  { id: "web", label: "Web Development" },
  { id: "mobile", label: "Mobile Application" },
  { id: "ai", label: "AI / Machine Learning" },
  { id: "network", label: "Network & Security" },
];

export const studentFormSchema = z.object({
  studentId: z
    .string()
    .trim()
    .regex(/^\d{9}$/, "รหัสนักศึกษาต้องเป็นตัวเลข 9 หลัก"),
  firstName: z.string().trim().min(3, "ชื่อต้องมีอย่างน้อย 3 ตัวอักษร"),
  lastName: z.string().trim().min(3, "นามสกุลต้องมีอย่างน้อย 3 ตัวอักษร"),
  program: z.enum(["CPE", "ISNE"], { message: "เลือกหลักสูตร" }),
  // Checkbox หลายตัว → array ของ id
  interests: z
    .array(z.string())
    .min(1, "เลือกความสนใจอย่างน้อย 1 ด้าน")
    .max(MAX_INTERESTS, `เลือกได้ไม่เกิน ${MAX_INTERESTS} ด้าน`),
  emails: z
    .array(
      z.object({
        // trim ก่อน แล้วค่อยตรวจรูปแบบอีเมล
        address: z.string().trim().pipe(z.email("อีเมลไม่ถูกต้อง")), // ← ตรวจทีละแถว
      }),
    )
    // ─── Array Validation: ตรวจทั้งรายการ ───
    .min(1, "ต้องมีอีเมลอย่างน้อย 1 อีเมล")
    .max(MAX_EMAILS, `มีอีเมลได้ไม่เกิน ${MAX_EMAILS} อีเมล`)
    .refine(
      (items) =>
        new Set(items.map((i) => i.address.toLowerCase())).size ===
        items.length,
      "อีเมลซ้ำกัน",
    ),
});

export type StudentFormValues = z.infer<typeof studentFormSchema>;

// สร้าง schema ตรวจข้อมูลนักศึกษาพร้อมเช็กรหัสซ้ำ
export function createStudentFormSchema(
  existingStudents: Student[],
  currentStudentId?: string,
) {
  return studentFormSchema.refine(
    (data) =>
      !existingStudents.some(
        (s) =>
          s.studentId === data.studentId && s.studentId !== currentStudentId,
      ),
    { message: "รหัสนักศึกษานี้มีอยู่แล้ว", path: ["studentId"] },
  );
}
