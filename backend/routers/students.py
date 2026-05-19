import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.classroom import Classroom
from backend.models.student import Student
from backend.models.teacher import Teacher
from backend.schemas.student import StudentCreate, StudentOut
from backend.services.auth_service import get_current_teacher, oauth2_scheme

router = APIRouter(tags=["students"])


async def _teacher(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> Teacher:
    """Dependency: resolve and return the authenticated teacher."""
    return await get_current_teacher(token, db)


@router.get("/api/classrooms/{classroom_id}/students", response_model=list[StudentOut])
async def list_students(
    classroom_id: uuid.UUID,
    teacher: Teacher = Depends(_teacher),
    db: AsyncSession = Depends(get_db),
) -> list[Student]:
    """List all students in a classroom owned by the authenticated teacher."""
    await _owned_classroom(classroom_id, teacher.id, db)
    result = await db.execute(select(Student).where(Student.classroom_id == classroom_id))
    return list(result.scalars().all())


@router.post(
    "/api/classrooms/{classroom_id}/students",
    response_model=StudentOut,
    status_code=status.HTTP_201_CREATED,
)
async def add_student(
    classroom_id: uuid.UUID,
    body: StudentCreate,
    teacher: Teacher = Depends(_teacher),
    db: AsyncSession = Depends(get_db),
) -> Student:
    """Add a student to a classroom; auto-generates a unique session_token."""
    await _owned_classroom(classroom_id, teacher.id, db)
    student = Student(
        classroom_id=classroom_id,
        name=body.name,
        session_token=secrets.token_urlsafe(48),
    )
    db.add(student)
    await db.commit()
    await db.refresh(student)
    return student


@router.delete("/api/students/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student(
    student_id: uuid.UUID,
    teacher: Teacher = Depends(_teacher),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Remove a student, verifying the teacher owns the student's classroom."""
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    await _owned_classroom(student.classroom_id, teacher.id, db)
    await db.delete(student)
    await db.commit()


async def _owned_classroom(classroom_id: uuid.UUID, teacher_id: uuid.UUID, db: AsyncSession) -> Classroom:
    """Verify the teacher owns this classroom, raising 404 if not."""
    result = await db.execute(
        select(Classroom).where(Classroom.id == classroom_id, Classroom.teacher_id == teacher_id)
    )
    classroom = result.scalar_one_or_none()
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
    return classroom
