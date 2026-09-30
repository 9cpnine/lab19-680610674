import { useState } from "react";

import { ConfirmDeleteButton } from "@/components/confirm-button";
import { StudentFormDialog } from "@/components/students/student-form-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEnrollmentStore } from "@/lib/enrollment-store";
import { interestOptions } from "@/lib/schemas/student-schema";

const interestLabel = (id: string) =>
  interestOptions.find((o) => o.id === id)?.label ?? id;

export default function AdminStudentsPage() {
  const { students, enrollments, removeStudent } = useEnrollmentStore();
  // ข้อความ error จาก Backend ตอนลบไม่สำเร็จ
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async (studentId: string) => {
    setDeleteError(null);
    try {
      await removeStudent(studentId); 
    } catch (err) {
      setDeleteError((err as Error).message);
    }
  };

  const enrollmentsOf = (studentId: string) =>
    enrollments.filter((e) => e.studentId === studentId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">จัดการนักศึกษา</h1>
          <p className="text-sm text-muted-foreground">
            {students.length} คน — ข้อมูลจาก Backend (MongoDB)
          </p>
        </div>
        <StudentFormDialog />
      </div>

      {deleteError && (
        <p className="text-sm text-destructive">ลบไม่สำเร็จ: {deleteError}</p>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>รหัสนักศึกษา</TableHead>
              <TableHead>ชื่อ</TableHead>
              <TableHead>นามสกุล</TableHead>
              <TableHead>หลักสูตร</TableHead>
              <TableHead>ความสนใจ</TableHead>
              <TableHead>อีเมล</TableHead>
              <TableHead>วิชาที่ลงทะเบียน</TableHead>
              <TableHead className="w-24 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-20 text-center text-muted-foreground"
                >
                  ยังไม่มีนักศึกษา
                </TableCell>
              </TableRow>
            )}
            {students.map((s) => (
              <TableRow key={s.studentId}>
                <TableCell>{s.studentId}</TableCell>
                <TableCell>{s.firstName}</TableCell>
                <TableCell>{s.lastName}</TableCell>
                <TableCell>{s.program}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {s.interests?.length ? (
                      s.interests.map((id) => (
                        <Badge key={id} variant="outline">
                          {interestLabel(id)}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {s.emails?.length ? (
                    <div className="flex flex-col gap-0.5 text-sm">
                      {s.emails.map((e) => (
                        <span key={e.address}>{e.address}</span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {enrollmentsOf(s.studentId).map((e) => (
                      <Badge key={e.courseId} variant="secondary">
                        {e.courseId}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <StudentFormDialog student={s} />
                  <ConfirmDeleteButton
                    label={`ลบนักศึกษา ${s.studentId}`}
                    title={`ลบนักศึกษา ${s.studentId}?`}
                    description={`${s.firstName} ${s.lastName} — การลงทะเบียน ${enrollmentsOf(s.studentId).length} รายการของนักศึกษาคนนี้จะถูกลบไปด้วย`}
                    onConfirm={() => handleDelete(s.studentId)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
