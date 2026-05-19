"""
Seed script: creates a demo teacher, classroom, and 5 students.
Run via: docker compose exec backend python scripts/seed_db.py

Demo login: teacher@demo.com / demo1234
"""
import asyncio
import secrets

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import AsyncSessionLocal, engine, Base
from backend.models.teacher import Teacher
from backend.models.classroom import Classroom
from backend.models.student import Student
from backend.services.auth_service import hash_password


DEMO_STUDENTS = ["Ravi Kumar", "Priya Singh", "Arjun Nair", "Divya Menon", "Karthik Raj"]


async def seed() -> None:
    """Create all demo data if it doesn't already exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Create teacher
        result = await db.execute(select(Teacher).where(Teacher.email == "teacher@demo.com"))
        teacher = result.scalar_one_or_none()
        if not teacher:
            teacher = Teacher(
                email="teacher@demo.com",
                hashed_password=hash_password("demo1234"),
                name="Demo Teacher",
            )
            db.add(teacher)
            await db.flush()
            print(f"[seed] Created teacher: teacher@demo.com / demo1234")

        # Create classroom
        result = await db.execute(
            select(Classroom).where(Classroom.teacher_id == teacher.id, Classroom.name == "Demo Class")
        )
        classroom = result.scalar_one_or_none()
        if not classroom:
            classroom = Classroom(
                teacher_id=teacher.id,
                name="Demo Class",
                alert_threshold=40,
                warn_threshold=60,
            )
            db.add(classroom)
            await db.flush()
            print(f"[seed] Created classroom: Demo Class")

        # Create students
        for name in DEMO_STUDENTS:
            result = await db.execute(
                select(Student).where(Student.classroom_id == classroom.id, Student.name == name)
            )
            if not result.scalar_one_or_none():
                student = Student(
                    classroom_id=classroom.id,
                    name=name,
                    session_token=secrets.token_urlsafe(48),
                )
                db.add(student)
                print(f"[seed] Created student: {name}")

        await db.commit()

        # Print student tokens
        students_result = await db.execute(
            select(Student).where(Student.classroom_id == classroom.id)
        )
        print("\n[seed] Student session tokens (share as URLs: /student/<token>):")
        for s in students_result.scalars().all():
            print(f"  {s.name}: {s.session_token}")

    print("\n[seed] Done.")


if __name__ == "__main__":
    asyncio.run(seed())
