import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.classroom import Classroom
from backend.models.teacher import Teacher
from backend.schemas.classroom import ClassroomCreate, ClassroomOut, ClassroomUpdate
from backend.services.auth_service import get_current_teacher, oauth2_scheme

router = APIRouter(prefix="/api/classrooms", tags=["classrooms"])


async def _teacher(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> Teacher:
    """Dependency: resolve and return the authenticated teacher."""
    return await get_current_teacher(token, db)


@router.get("", response_model=list[ClassroomOut])
async def list_classrooms(teacher: Teacher = Depends(_teacher), db: AsyncSession = Depends(get_db)) -> list[Classroom]:
    """Return all classrooms owned by the authenticated teacher."""
    result = await db.execute(select(Classroom).where(Classroom.teacher_id == teacher.id))
    return list(result.scalars().all())


@router.post("", response_model=ClassroomOut, status_code=status.HTTP_201_CREATED)
async def create_classroom(
    body: ClassroomCreate,
    teacher: Teacher = Depends(_teacher),
    db: AsyncSession = Depends(get_db),
) -> Classroom:
    """Create a new classroom for the authenticated teacher."""
    classroom = Classroom(teacher_id=teacher.id, **body.model_dump())
    db.add(classroom)
    await db.commit()
    await db.refresh(classroom)
    return classroom


@router.get("/{classroom_id}", response_model=ClassroomOut)
async def get_classroom(
    classroom_id: uuid.UUID,
    teacher: Teacher = Depends(_teacher),
    db: AsyncSession = Depends(get_db),
) -> Classroom:
    """Fetch a single classroom by ID (must belong to the authenticated teacher)."""
    classroom = await _owned(classroom_id, teacher.id, db)
    return classroom


@router.patch("/{classroom_id}", response_model=ClassroomOut)
async def update_classroom(
    classroom_id: uuid.UUID,
    body: ClassroomUpdate,
    teacher: Teacher = Depends(_teacher),
    db: AsyncSession = Depends(get_db),
) -> Classroom:
    """Update classroom name or alert thresholds."""
    classroom = await _owned(classroom_id, teacher.id, db)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(classroom, field, value)
    await db.commit()
    await db.refresh(classroom)
    return classroom


@router.delete("/{classroom_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_classroom(
    classroom_id: uuid.UUID,
    teacher: Teacher = Depends(_teacher),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a classroom and all its students and sessions via cascade."""
    classroom = await _owned(classroom_id, teacher.id, db)
    await db.delete(classroom)
    await db.commit()


async def _owned(classroom_id: uuid.UUID, teacher_id: uuid.UUID, db: AsyncSession) -> Classroom:
    """Load a classroom and verify teacher ownership, raising 404 if not found."""
    result = await db.execute(
        select(Classroom).where(Classroom.id == classroom_id, Classroom.teacher_id == teacher_id)
    )
    classroom = result.scalar_one_or_none()
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
    return classroom
